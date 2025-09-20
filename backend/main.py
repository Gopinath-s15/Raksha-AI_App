from fastapi import FastAPI, WebSocket, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

dashboard_clients = []

def generate_alert_message(language, location, vehicle_id):
    messages = {
        "en": f"🚨 Distress Detected! Passenger triggered panic in {vehicle_id}. Location: {location}. Suggested Action: Call police & notify family.",
        "hi": f"🚨 संकट का पता चला! यात्री ने {vehicle_id} में पैनिक बटन दबाया। स्थान: {location}. सुझाव: पुलिस को कॉल करें और परिवार को सूचित करें।"
    }
    return messages.get(language, messages["en"])

@app.post("/panic")
async def panic_event(request: Request):
    data = await request.json()
    location = data.get("location", "Unknown")
    vehicle_id = data.get("vehicle_id", "Bus #17")
    language = data.get("language", "en")
    alert_msg = generate_alert_message(language, location, vehicle_id)
    alert = {
        "location": location,
        "vehicle_id": vehicle_id,
        "message": alert_msg
    }
    for client in dashboard_clients:
        await client.send_json(alert)
    return JSONResponse({"status": "alert sent", "alert": alert})

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    dashboard_clients.append(websocket)
    try:
        while True:
            await asyncio.sleep(1)
    except Exception:
        dashboard_clients.remove(websocket)
@app.get("/")
def read_root():
    return {"message": "RAKSHA AI backend is running."}