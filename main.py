"""FastAPI entry point for the Attune real-time workshop backend."""

from __future__ import annotations

from typing import Annotated, Final, Literal, TypeAlias

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
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

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        """Accept and register a client for a workshop session."""
        await websocket.accept()
        self._connections.setdefault(session_id, []).append(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        """Remove a disconnected client and clean up empty sessions."""
        connections = self._connections.get(session_id)
        if connections is None:
            return
        if websocket in connections:
            connections.remove(websocket)
        if not connections:
            del self._connections[session_id]

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


class TranscriptMessage(BaseModel):
    """A transcript chunk emitted during a workshop."""

    type: Literal["transcript"]
    text: str = Field(min_length=1)


class QuestionMessage(BaseModel):
    """A question submitted by a workshop participant."""

    type: Literal["question"]
    text: str = Field(min_length=1)
    student_id: str = Field(default="attendee", min_length=1)


IncomingMessage: TypeAlias = Annotated[
    TranscriptMessage | QuestionMessage,
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


@app.get("/health")
async def health() -> dict[str, str]:
    """Return a lightweight service health response."""
    return {"status": "ok"}


@app.websocket("/ws/workshop/{session_id}")
async def workshop_websocket(websocket: WebSocket, session_id: str) -> None:
    """Receive transcript and question events for one workshop session."""
    await manager.connect(session_id, websocket)
    presenter_type = websocket.query_params.get("presenter_type", "educator")
    causal_graph = CausalGraph()
    transcript_chunks: list[str] = []

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
                await manager.broadcast(
                    session_id,
                    {"status": "error", "message": "Agent failed to process"},
                )
                continue

            try:
                if isinstance(message, TranscriptMessage):
                    transcript_chunks.append(message.text)
                    extraction_prompt = (
                        f"Transcript Chunk:\n{message.text}\n\nExtract the JSON:"
                    )
                    raw_relationships = await get_completion(
                        extraction_prompt,
                        RELATIONSHIP_EXTRACTION_PROMPT,
                    )
                    causal_graph.add_relationships(raw_relationships)
                    await manager.broadcast(
                        session_id,
                        {
                            "status": "graph_updated",
                            "transcript": message.text,
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
                        },
                    )
                    continue

                routing_result = await process_question(
                    question=message.text,
                    transcript_context="\n".join(transcript_chunks),
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
                await manager.broadcast(
                    session_id,
                    {
                        "status": "question_routed",
                        "student_id": message.student_id,
                        "question": message.text,
                        "routing_mode": routing_result["routing_mode"],
                        "priority_score": routing_result["priority_score"],
                        "reasoning": routing_result["reasoning"],
                        "root_cause_concept": routing_result["root_cause_concept"],
                    },
                )
            except Exception as error:
                print(f"Workshop processing failed for session {session_id}: {error}")
                await manager.broadcast(
                    session_id,
                    {"status": "error", "message": "Agent failed to process"},
                )
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(session_id, websocket)
