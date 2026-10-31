"""FastAPI entry point for the Attune real-time workshop backend."""

from __future__ import annotations

import json
import traceback
from typing import Annotated, Final, Literal, TypeAlias

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from openai import APIError, APITimeoutError
from pydantic import BaseModel, Field, TypeAdapter, ValidationError

from services.causal_graph import CausalGraph
from services.llm_service import get_completion
from services.router_agent import process_question


app = FastAPI(title="Attune API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    """Track WebSocket clients connected to each workshop session."""

    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = {}
        self._transcript_chunks: dict[str, list[str]] = {}
        self._routed_questions: dict[str, list[dict[str, object]]] = {}

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        """Register an already-accepted client for a workshop session."""
        self._connections.setdefault(session_id, []).append(websocket)
        self._transcript_chunks.setdefault(session_id, [])
        self._routed_questions.setdefault(session_id, [])

    def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        """Remove a disconnected client and clean up empty sessions."""
        connections = self._connections.get(session_id)
        if connections is None:
            return
        if websocket in connections:
            connections.remove(websocket)
        if not connections:
            del self._connections[session_id]
            self._transcript_chunks.pop(session_id, None)
            self._routed_questions.pop(session_id, None)

    def add_transcript(self, session_id: str, text: str) -> None:
        """Store a transcript chunk for the active session report."""
        self._transcript_chunks.setdefault(session_id, []).append(text)

    def transcript_context(self, session_id: str) -> str:
        """Return all transcript chunks for a session as one context string."""
        return "\n".join(self._transcript_chunks.get(session_id, []))

    def add_routed_question(self, session_id: str, question: dict[str, object]) -> None:
        """Store a routed audience question for the active session report."""
        self._routed_questions.setdefault(session_id, []).append(question)

    def routed_questions(self, session_id: str) -> list[dict[str, object]]:
        """Return a snapshot of all routed questions for a session."""
        return list(self._routed_questions.get(session_id, []))

    async def broadcast(self, session_id: str, message: dict[str, object]) -> None:
        """Send a session update to every connected client."""
        disconnected: list[WebSocket] = []
        for websocket in tuple(self._connections.get(session_id, [])):
            try:
                await websocket.send_json(message)
            except Exception as error:
                print(f"WebSocket broadcast failed for session {session_id}: {error}")
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(session_id, websocket)


manager = ConnectionManager()
# The graph belongs to the workshop session, rather than to an individual
# WebSocket. This lets speakers and attendees contribute to and query the same
# causal context while they are connected to the same session ID.
session_graphs: dict[str, CausalGraph] = {}
# Keep session history independent from live WebSocket connections so a browser
# refresh does not erase the workshop UI.
session_transcripts: dict[str, list[str]] = {}
session_questions: dict[str, list[dict[str, object]]] = {}


async def send_processing_error(websocket: WebSocket, error: Exception) -> None:
    """Report a per-message failure without ending the active receive loop."""
    print(traceback.format_exc())
    try:
        await websocket.send_json({"status": "error", "message": str(error)})
    except WebSocketDisconnect:
        raise
    except Exception as send_error:
        print(f"Unable to send WebSocket error response: {send_error}")


def graph_payload(causal_graph: CausalGraph) -> dict[str, list[dict[str, str]]]:
    """Serialize one session graph into the frontend's expected shape."""
    return {
        "nodes": [
            {"id": node, "label": node.replace("_", " ").title()}
            for node in causal_graph.graph.nodes()
        ],
        "edges": [
            {
                "id": f"{source}-{target}",
                "from": source,
                "to": target,
                "label": edge_data.get("relation", ""),
            }
            for source, target, edge_data in causal_graph.graph.edges(data=True)
        ],
    }


class TranscriptMessage(BaseModel):
    """A transcript chunk emitted during a workshop."""

    type: Literal["transcript"]
    text: str = Field(min_length=1)


class QuestionMessage(BaseModel):
    """A question submitted by a workshop participant."""

    type: Literal["question"]
    text: str = Field(min_length=1)
    student_id: str = Field(default="attendee", min_length=1)


class GenerateReportMessage(BaseModel):
    """Request a post-session audience-attention report."""

    type: Literal["generate_report"]


class SeedSessionRequest(BaseModel):
    """Slide or outline text used to pre-build a session's concept graph."""

    text: str = Field(min_length=1)


IncomingMessage: TypeAlias = Annotated[
    TranscriptMessage | QuestionMessage | GenerateReportMessage,
    Field(discriminator="type"),
]
MESSAGE_ADAPTER: Final[TypeAdapter[IncomingMessage]] = TypeAdapter(IncomingMessage)

RELATIONSHIP_EXTRACTION_PROMPT: Final[str] = """
You are an expert knowledge engineer. Your job is to extract concepts and their relationships from a transcript chunk.
Rules:
1. Extract the main technical concepts.
2. Identify how they relate to each other.
3. Valid relationships are: "depends_on", "is_part_of", "optimizes", "controls", "causes".
4. Output ONLY a valid JSON array. No markdown, no extra text.
Format:
[
    {"source": "concept A", "relationship": "depends_on", "target": "concept B"}
]
"""

REPORT_SYSTEM_PROMPT: Final[str] = """You are Attune's post-session analyst.
Using the transcript and routed audience questions, write exactly three concise bullet
points: what the audience struggled with most, the supporting signal from questions,
and what the speaker should review next. Be practical and specific."""


@app.get("/health")
async def health() -> dict[str, str]:
    """Return a lightweight service health response."""
    return {"status": "ok"}


@app.post("/api/session/{session_id}/seed")
async def seed_session(
    session_id: str,
    payload: SeedSessionRequest,
) -> dict[str, object]:
    """Extract and store a session graph before its WebSocket is opened."""
    seed_text = payload.text.strip()
    causal_graph = CausalGraph()
    try:
        raw_relationships = await get_completion(
            f"Slide text or lesson outline:\n{seed_text}\n\nExtract the JSON:",
            RELATIONSHIP_EXTRACTION_PROMPT,
        )
    except (APIError, APITimeoutError, TimeoutError) as error:
        print(f"Session seed LLM failed for {session_id}: {error}")
        raw_relationships = "[]"

    if raw_relationships.startswith("ERROR:"):
        print(f"Session seed LLM returned an error for {session_id}: {raw_relationships}")
        raw_relationships = "[]"
    causal_graph.add_relationships(raw_relationships)
    session_graphs[session_id] = causal_graph
    session_transcripts[session_id] = [seed_text]
    session_questions.setdefault(session_id, [])
    print(
        f"Seeded session {session_id}: {causal_graph.graph.number_of_nodes()} nodes, "
        f"{causal_graph.graph.number_of_edges()} edges"
    )
    return {"status": "seeded", **graph_payload(causal_graph)}


@app.websocket("/ws/workshop/{session_id}")
async def workshop_websocket(websocket: WebSocket, session_id: str) -> None:
    """Receive transcript and question events for one workshop session."""
    await websocket.accept()
    print("BACKEND ACCEPTED WEBSOCKET CONNECTION")
    print(f"WS CONNECT ATTEMPT: {websocket.url}")
    try:
        await manager.connect(session_id, websocket)
    except Exception as error:
        print(f"WS CONNECT FAILED for session {session_id}: {error}")
        return
    presenter_type = websocket.query_params.get("presenter_type", "educator")
    has_existing_session = (
        session_id in session_graphs
        or session_id in session_transcripts
        or session_id in session_questions
    )
    if session_id not in session_graphs:
        session_graphs[session_id] = CausalGraph()
    session_transcripts.setdefault(session_id, [])
    session_questions.setdefault(session_id, [])
    causal_graph = session_graphs[session_id]

    if has_existing_session:
        await websocket.send_json(
            {
                "status": "session_sync",
                "transcript": session_transcripts[session_id],
                "questions": session_questions[session_id],
                **graph_payload(causal_graph),
            }
        )

    try:
        while True:
            try:
                raw_message = await websocket.receive_json()
                message = MESSAGE_ADAPTER.validate_python(raw_message)
            except ValidationError as error:
                await manager.broadcast(
                    session_id,
                    {
                        "status": "validation_error",
                        "detail": error.errors(include_url=False),
                    },
                )
                continue
            except WebSocketDisconnect:
                raise
            except Exception as error:
                print(f"Workshop processing failed for session {session_id}: {error}")
                await send_processing_error(websocket, error)
                continue

            try:
                if isinstance(message, GenerateReportMessage):
                    report_prompt = (
                        f"Presenter type: {presenter_type}\n\n"
                        f"Transcript:\n{' '.join(session_transcripts[session_id])}\n\n"
                        f"Routed questions:\n{json.dumps(session_questions[session_id])}"
                    )
                    report = await get_completion(report_prompt, REPORT_SYSTEM_PROMPT)
                    await websocket.send_json(
                        {"status": "report_generated", "report": report}
                    )
                    continue

                if isinstance(message, TranscriptMessage):
                    print("Processing transcript:", message.text)
                    # setdefault makes this safe even if session state was
                    # cleared or the process received a new session ID.
                    session_transcripts.setdefault(session_id, [])
                    session_graphs.setdefault(session_id, CausalGraph())
                    manager.add_transcript(session_id, message.text)
                    session_transcripts[session_id].append(message.text)
                    extraction_prompt = (
                        f"Transcript Chunk:\n{message.text}\n\nExtract the JSON:"
                    )
                    try:
                        raw_relationships = await get_completion(
                            extraction_prompt,
                            RELATIONSHIP_EXTRACTION_PROMPT,
                        )
                    except (APIError, APITimeoutError, TimeoutError) as error:
                        # Keep the microphone pipeline alive even if the model
                        # provider is briefly unavailable.
                        print(f"Graph extraction LLM failed for session {session_id}: {error}")
                        raw_relationships = "[]"
                    if raw_relationships.startswith("ERROR:"):
                        print(f"Graph extraction LLM returned an error: {raw_relationships}")
                        raw_relationships = "[]"
                    session_graphs[session_id].add_relationships(raw_relationships)
                    causal_graph = session_graphs[session_id]
                    print(
                        f"Graph extraction complete: {causal_graph.graph.number_of_nodes()} nodes, "
                        f"{causal_graph.graph.number_of_edges()} edges"
                    )
                    print("Broadcasting graph update")
                    await manager.broadcast(
                        session_id,
                        {
                            "status": "graph_updated",
                            "transcript": message.text,
                            **graph_payload(causal_graph),
                        },
                    )
                    continue

                routing_result = await process_question(
                    question=message.text,
                    transcript_context="\n".join(session_transcripts[session_id]),
                    causal_graph_edges=[
                        {
                            "source": source,
                            "relationship": edge_data.get("relation", ""),
                            "target": target,
                        }
                        for source, target, edge_data in causal_graph.graph.edges(data=True)
                    ],
                    presenter_type=presenter_type,
                )
                routed_question = {
                    "student_id": message.student_id,
                    "question": message.text,
                    **routing_result,
                }
                manager.add_routed_question(session_id, routed_question)
                session_questions[session_id].append(routed_question)
                await manager.broadcast(
                    session_id,
                    {
                        "status": "question_routed",
                        **routed_question,
                    },
                )
            except Exception as error:
                print(f"Workshop processing failed for session {session_id}: {error}")
                await send_processing_error(websocket, error)
                continue
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(session_id, websocket)
