import asyncio
import websockets
import json

SESSION_ID = "demo_session_1"
WS_URL = f"ws://127.0.0.1:8000/ws/workshop/{SESSION_ID}"

# Mock workshop data (Speaker talking, then a student asking a question)
WORKSHOP_SCRIPT = [
    {
        "type": "transcript",
        "text": "Welcome to our ML workshop. Today we discuss Gradient Descent. It optimizes the loss function.",
    },
    {
        "type": "transcript",
        "text": "To update the model, we use the learning rate. The learning rate determines the step size.",
    },
    # Simulate a student getting confused here
    {
        "type": "question",
        "text": "My model keeps bouncing around the minimum. Why is that happening?",
        "student_id": "stu_42",
    },
    {
        "type": "transcript",
        "text": "If the learning rate is too high, the model will overshoot the minimum.",
    },
]


async def simulate():
    print(f"Connecting to Attune server at {WS_URL}...")

    try:
        async with websockets.connect(WS_URL) as websocket:
            print("🟢 Connected! Starting live simulation...\n")

            for packet in WORKSHOP_SCRIPT:
                print(f"📤 SENDING [{packet['type'].upper()}]: {packet['text']}")

                # Send the data to the FastAPI server
                await websocket.send(json.dumps(packet))

                # Wait for the server's response
                response = await websocket.recv()
                print(f"📥 RECEIVED: {response}\n")

                # Pause to simulate real-time speech pace
                await asyncio.sleep(2)

            print("🏁 Simulation finished.")

    except ConnectionRefusedError:
        print(
            "❌ Error: Could not connect. Is the FastAPI server running? (uvicorn main:app --reload)"
        )
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(simulate())
