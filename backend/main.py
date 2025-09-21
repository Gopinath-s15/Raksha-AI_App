from fastapi import FastAPI, WebSocket, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import uuid

app = FastAPI(title="Raksha AI Backend")

# ------------------------------
# CORS Setup
# ------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace "*" with frontend origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------
# Global Stores
# ------------------------------
dashboard_clients: list[WebSocket] = []
last_known_locations: dict[str, dict] = {}  # vehicle_id -> {"lat": x, "lng": y}

# ------------------------------
# Helper: Multilingual Alert Message
# ------------------------------
def generate_alert_message(language: str, location: dict, vehicle_id: str, reason: str) -> str:
    messages = {
        "en": f"🚨 {reason} in {vehicle_id}. Location: {location}. Suggested Action: Call police & notify family.",
        "hi": f"🚨 {reason} का पता चला {vehicle_id} में। स्थान: {location}. सुझाव: पुलिस को कॉल करें और परिवार को सूचित करें।",
        "ta": f"🚨 {reason} {vehicle_id} இல் கண்டறியப்பட்டது. இடம்: {location}. பரிந்துரை: போலீசை அழைக்கவும், குடும்பத்தினரை அறிவிக்கவும்."
    }
    return messages.get(language, messages["en"])

# ------------------------------
# Helper: Update vehicle location
# ------------------------------
def update_vehicle_location(vehicle_id: str, lat: float, lng: float):
    last_known_locations[vehicle_id] = {"lat": lat, "lng": lng}

# ------------------------------
# 1. Panic Endpoint
# ------------------------------
@app.post("/panic")
async def panic_event(request: Request):
    try:
        data = await request.json()
        user_id = data.get("user_id", "Unknown User")
        location = data.get("location", "Unknown")
        vehicle_id = data.get("vehicle_id", "Bus #17")
        language = data.get("lang", "en")

        # Use last known location if unknown
        if location == "Unknown" and vehicle_id in last_known_locations:
            location = last_known_locations[vehicle_id]

        # Update last known location if coordinates are given
        if isinstance(location, dict):
            update_vehicle_location(vehicle_id, location.get("lat"), location.get("lng"))

        alert_msg = generate_alert_message(language, location, vehicle_id, "Distress Detected")
        alert = {
            "user_id": user_id,
            "location": location,
            "vehicle_id": vehicle_id,
            "message": alert_msg
        }

        # Broadcast to all connected WebSocket clients
        for client in dashboard_clients:
            await client.send_json(alert)

        return JSONResponse({"status": "alert sent", "alert": alert})

    except Exception as e:
        print(f"Error in /panic: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

# ------------------------------
# 2. Anomaly Detection Endpoint
# ------------------------------
@app.post("/anomaly")
async def anomaly_event(request: Request):
    try:
        data = await request.json()
        anomaly_type = data.get("anomaly_type", "route_deviation")
        location = data.get("current_location", "Unknown")
        vehicle_id = data.get("vehicle_id", "Bus #17")
        language = data.get("lang", "en")

        # Use last known location if unknown
        if location == "Unknown" and vehicle_id in last_known_locations:
            location = last_known_locations[vehicle_id]

        # Update last known location if coordinates given
        if isinstance(location, dict):
            update_vehicle_location(vehicle_id, location.get("lat"), location.get("lng"))

        reason = anomaly_type.replace("_", " ").title()
        alert_msg = generate_alert_message(language, location, vehicle_id, reason)

        alert = {
            "location": location,
            "vehicle_id": vehicle_id,
            "message": alert_msg
        }

        # Broadcast alert
        for client in dashboard_clients:
            await client.send_json(alert)

        return JSONResponse({"status": "anomaly alert sent", "alert": alert})

    except Exception as e:
        print(f"Error in /anomaly: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

# ------------------------------
# 3. Escalation Endpoint (Updated)
# ------------------------------
@app.post("/escalate")
async def escalate_event(request: Request):
    try:
        data = await request.json()
        anomaly_type = data.get("anomaly_type", "distress_voice")
        contacts = data.get("contacts", [])
        vehicle_id = data.get("vehicle_id", "Unknown Vehicle")
        language = data.get("lang", "en")
        escalation_level = data.get("escalation_level", "family")

        # Decide whom to notify
        def decide_escalation(anomaly_type: str):
            mapping = {
                "distress_voice": ["family", "fleet", "police"],
                "route_deviation": ["family", "fleet"],
                "unsafe_driving": ["fleet"]
            }
            return mapping.get(anomaly_type, ["family"])

        to_notify = decide_escalation(anomaly_type)

        # Filter contacts by requested escalation_level if needed
        notified_contacts = [c for c in contacts]  # Real system could filter by level

        # Generate a unique alert ID
        alert_id = f"ALERT-{uuid.uuid4().hex[:6].upper()}"

        # Simulate sending alert (console log)
        print(f"Escalation Alert Sent to {notified_contacts} for {vehicle_id}")

        return JSONResponse({
            "status": "escalation_sent",
            "alert_id": alert_id,
            "notified": notified_contacts
        })

    except Exception as e:
        print(f"Error in /escalate: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

# ------------------------------
# 4. AI Explanation Endpoint
# ------------------------------
@app.get("/explanation")
async def explanation(reason: str = "distress_voice"):
    explanations = {
        "distress_voice": "Alert triggered due to detection of distress in passenger's voice.",
        "route_deviation": "Alert triggered because the vehicle deviated from its expected route.",
        "unsafe_driving": "Alert triggered due to unsafe driving patterns detected."
    }
    return {"explanation": explanations.get(reason, "Alert triggered for safety.")}

# ------------------------------
# 5. Personalized Safety Guidance Endpoint (Updated)
# ------------------------------
@app.get("/guidance")
async def guidance(location: str = "Unknown", risk: str = "medium"):
    guidance_data = {
        "high": {
            "guidance": f"Move to the station office; avoid isolated platforms. Nearest police station: ABC (1.2 km). Contact family and share live location.",
            "recommended_action": "contact_police",
            "safe_route": [
                {"lat": 12.9719, "lng": 77.5941},
                {"lat": 12.9721, "lng": 77.5945}
            ]
        },
        "medium": {
            "guidance": f"Medium risk near {location}. Suggest alternate safe route.",
            "recommended_action": "move_to_safe_area",
            "safe_route": [
                {"lat": 12.9718, "lng": 77.5940},
                {"lat": 12.9720, "lng": 77.5943}
            ]
        },
        "low": {
            "guidance": f"Low risk near {location}. Continue monitoring.",
            "recommended_action": "monitor",
            "safe_route": []
        }
    }

    return guidance_data.get(risk, guidance_data["medium"])

# ------------------------------
# 6. WebSocket Endpoint for Live Dashboard
# ------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    dashboard_clients.append(websocket)
    try:
        while True:
            await asyncio.sleep(1)  # keep alive
    except Exception as e:
        print(f"WebSocket disconnected: {e}")
    finally:
        if websocket in dashboard_clients:
            dashboard_clients.remove(websocket)

# ------------------------------
# 7. Root Endpoint
# ------------------------------
@app.get("/")
def read_root():
    return {"message": "Raksha AI backend is running."}
