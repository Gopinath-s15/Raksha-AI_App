from fastapi import FastAPI, WebSocket, Request, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime
import asyncio
import uuid
import math
import random
import os

app = FastAPI(
    title="Raksha AI Backend",
    description="Women safety backend with real-time alerts, contextual guidance, and escalation.",
    version="1.1.0",
)

# ------------------------------
# CORS Setup (loose for dev)
# ------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with frontend origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------
# Global Stores (in-memory)
# ------------------------------
DashboardClient = WebSocket

dashboard_clients: List[DashboardClient] = []
last_known_locations: Dict[str, Dict[str, float]] = {}  # vehicle_id -> {"lat": x, "lng": y}
alerts_log: List[Dict[str, Any]] = []  # capped log of recent alerts
MAX_ALERTS = 200

# Known POIs for demo (name -> lat/lng + type)
POIS = [
    {"name": "ABC Police Station", "lat": 12.9723, "lng": 77.5950, "type": "police"},
    {"name": "City Women Helpline", "lat": 12.9734, "lng": 77.5921, "type": "helpline"},
    {"name": "Metro Office", "lat": 12.9716, "lng": 77.5946, "type": "office"},
]

# Simple geocode for demo names
GEOCODE = {
    "Metro Station XYZ": {"lat": 12.9719, "lng": 77.5941},
    "Central Bus Depot": {"lat": 12.9770, "lng": 77.5900},
}

# ------------------------------
# Helpers
# ------------------------------
def clamp_log():
    while len(alerts_log) > MAX_ALERTS:
        alerts_log.pop(0)


def loc_to_display(location: Any) -> str:
    if isinstance(location, dict) and "lat" in location and "lng" in location:
        return f"({location['lat']:.4f}, {location['lng']:.4f})"
    return str(location)


def generate_alert_message(language: str, location: Any, vehicle_id: str, reason: str) -> str:
    disp = loc_to_display(location)
    messages = {
        "en": f"🚨 {reason} in {vehicle_id}. Location: {disp}. Suggested Action: Call police & notify family.",
        "hi": f"🚨 {reason} का पता चला {vehicle_id} में। स्थान: {disp}. सुझाव: पुलिस को कॉल करें और परिवार को सूचित करें।",
        "ta": f"🚨 {reason} {vehicle_id} இல் கண்டறியப்பட்டது. இடம்: {disp}. பரிந்துரை: போலீசை அழைக்கவும், குடும்பத்தினரை அறிவிக்கவும்.",
    }
    return messages.get(language, messages["en"])


def update_vehicle_location(vehicle_id: str, lat: Optional[float], lng: Optional[float]):
    if lat is None or lng is None:
        return
    last_known_locations[vehicle_id] = {"lat": lat, "lng": lng}


async def broadcast_alert(payload: dict):
    stale: List[WebSocket] = []
    for client in list(dashboard_clients):
        try:
            await client.send_json(payload)
        except Exception as e:
            print(f"WebSocket send failed, removing client: {e}")
            stale.append(client)
    for c in stale:
        if c in dashboard_clients:
            dashboard_clients.remove(c)


def nearest_poi(lat: float, lng: float) -> Dict[str, Any]:
    def dist(p):
        return math.hypot(p["lat"] - lat, p["lng"] - lng)
    poi = min(POIS, key=dist)
    d_km = dist(poi) * 111  # approx degrees->km
    return {"name": poi["name"], "type": poi["type"], "approx_distance_km": round(d_km, 2)}


def compute_risk(lat: float, lng: float, base: Optional[str] = None, anomaly: Optional[str] = None) -> str:
    hour = datetime.now().hour
    score = 0
    score += (abs(lat) + abs(lng)) % 3
    score += 2 if hour >= 21 or hour <= 5 else 0
    if anomaly == "distress_voice":
        score += 2
    elif anomaly == "unsafe_driving":
        score += 1
    if base == "high":
        score += 2
    elif base == "low":
        score -= 1
    if score >= 4:
        return "high"
    if score >= 2:
        return "medium"
    return "low"


def make_safe_route(lat: float, lng: float) -> List[Dict[str, float]]:
    route = []
    for i in range(4):
        route.append({"lat": lat + 0.0003 * i + random.uniform(-0.0001, 0.0001),
                      "lng": lng + 0.0004 * i + random.uniform(-0.0001, 0.0001)})
    return route


# ------------------------------
# Schemas
# ------------------------------
class PanicPayload(BaseModel):
    user_id: Optional[str] = "Unknown User"
    vehicle_id: Optional[str] = "Bus #17"
    lang: Optional[str] = "en"
    location: Optional[Any] = "Unknown"


class AnomalyPayload(BaseModel):
    anomaly_type: str = "route_deviation"
    vehicle_id: Optional[str] = "Bus #17"
    lang: Optional[str] = "en"
    current_location: Optional[Any] = "Unknown"


class EscalationPayload(BaseModel):
    anomaly_type: str = "distress_voice"
    contacts: List[str] = []
    vehicle_id: Optional[str] = "Bus #17"
    lang: Optional[str] = "en"
    escalation_level: str = "family"


# ------------------------------
# Health Endpoint
# ------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "clients": len(dashboard_clients), "alerts": len(alerts_log)}


# ------------------------------
# Panic Endpoint
# ------------------------------
@app.post("/panic")
async def panic_event(payload: PanicPayload):
    user_id = payload.user_id or "Unknown User"
    vehicle_id = payload.vehicle_id or "Unknown Vehicle"
    language = payload.lang or "en"
    location = payload.location or "Unknown"

    if isinstance(location, str) and location in GEOCODE:
        location = GEOCODE[location]
    if isinstance(location, dict):
        update_vehicle_location(vehicle_id, location.get("lat"), location.get("lng"))

    alert_msg = generate_alert_message(language, location, vehicle_id, "Distress Detected")
    alert = {
        "type": "panic",
        "id": f"ALERT-{uuid.uuid4().hex[:6].upper()}",
        "user_id": user_id,
        "location": location,
        "vehicle_id": vehicle_id,
        "message": alert_msg,
        "ts": datetime.utcnow().isoformat() + "Z",
    }

    alerts_log.append(alert)
    clamp_log()
    await broadcast_alert(alert)
    return JSONResponse({"status": "alert sent", "alert": alert})


# ------------------------------
# Anomaly Detection Endpoint
# ------------------------------
@app.post("/anomaly")
async def anomaly_event(payload: AnomalyPayload):
    anomaly_type = payload.anomaly_type or "route_deviation"
    location = payload.current_location or "Unknown"
    vehicle_id = payload.vehicle_id or "Bus #17"
    language = payload.lang or "en"

    if isinstance(location, str) and location in GEOCODE:
        location = GEOCODE[location]
    if isinstance(location, dict):
        update_vehicle_location(vehicle_id, location.get("lat"), location.get("lng"))

    reason = anomaly_type.replace("_", " ").title()
    alert_msg = generate_alert_message(language, location, vehicle_id, reason)
    alert = {
        "type": "anomaly",
        "id": f"ALERT-{uuid.uuid4().hex[:6].upper()}",
        "anomaly_type": anomaly_type,
        "location": location,
        "vehicle_id": vehicle_id,
        "message": alert_msg,
        "ts": datetime.utcnow().isoformat() + "Z",
    }

    alerts_log.append(alert)
    clamp_log()
    await broadcast_alert(alert)
    return JSONResponse({"status": "anomaly alert sent", "alert": alert})


# ------------------------------
# Escalation Endpoint
# ------------------------------
@app.post("/escalate")
async def escalate_event(payload: EscalationPayload):
    anomaly_type = payload.anomaly_type
    contacts = payload.contacts or []
    vehicle_id = payload.vehicle_id or "Unknown Vehicle"
    escalation_level = payload.escalation_level or "family"

    mapping = {
        "distress_voice": ["family", "fleet", "police"],
        "route_deviation": ["family", "fleet"],
        "unsafe_driving": ["fleet"],
    }
    to_notify_levels = mapping.get(anomaly_type, ["family"])
    notified_contacts = [c for c in contacts]

    alert_id = f"ALERT-{uuid.uuid4().hex[:6].upper()}"
    print(f"Escalation Alert Sent to {notified_contacts} for {vehicle_id} at level {escalation_level}")

    return JSONResponse(
        {
            "status": "escalation_sent",
            "alert_id": alert_id,
            "levels": to_notify_levels,
            "notified": notified_contacts,
        }
    )


# ------------------------------
# AI Explanation Endpoint
# ------------------------------
@app.get("/explanation")
async def explanation(reason: str = "distress_voice", vehicle_id: Optional[str] = None):
    base = {
        "distress_voice": "Alert triggered due to detection of distress in passenger's voice.",
        "route_deviation": "Alert triggered because the vehicle deviated from its expected route.",
        "unsafe_driving": "Alert triggered due to unsafe driving patterns detected.",
    }
    msg = base.get(reason, "Alert triggered for safety.")

    context = {}
    if vehicle_id and vehicle_id in last_known_locations:
        context["last_known_location"] = last_known_locations[vehicle_id]
        msg += f" Last known location for {vehicle_id}: {loc_to_display(context['last_known_location'])}."

    return {"explanation": msg, "context": context}


# ------------------------------
# Personalized Safety Guidance
# ------------------------------
@app.get("/guidance")
async def guidance(location: Optional[str] = None, risk: Optional[str] = None, lat: Optional[float] = None, lng: Optional[float] = None, vehicle_id: Optional[str] = None):
    coord = None
    if lat is not None and lng is not None:
        coord = {"lat": lat, "lng": lng}
    elif location and location in GEOCODE:
        coord = GEOCODE[location]
    elif vehicle_id and vehicle_id in last_known_locations:
        coord = last_known_locations[vehicle_id]

    if coord is None:
        coord = GEOCODE["Metro Station XYZ"]

    risk_level = risk
    if risk_level not in ("low", "medium", "high"):
        risk_level = compute_risk(coord["lat"], coord["lng"], base=risk, anomaly=None)

    if risk_level == "high":
        action = "contact_police"
        guidance_text = "High risk detected. Move to the nearest office/security and call the police immediately. Share live location."
    elif risk_level == "medium":
        action = "move_to_safe_area"
        guidance_text = "Medium risk in your vicinity. Prefer well-lit, crowded areas and consider an alternate route."
    else:
        action = "monitor"
        guidance_text = "Low risk around you. Stay alert and continue normal monitoring."

    poi = nearest_poi(coord["lat"], coord["lng"])
    route = make_safe_route(coord["lat"], coord["lng"]) if risk_level != "low" else []

    return {
        "guidance": guidance_text,
        "recommended_action": action,
        "risk": risk_level,
        "reference_location": coord,
        "nearest_support": poi,
        "safe_route": route,
    }


# ------------------------------
# Recent Alerts
# ------------------------------
@app.get("/alerts/recent")
async def recent_alerts(limit: int = 20):
    limit = max(1, min(100, limit))
    return list(reversed(alerts_log[-limit:]))


# ------------------------------
# WebSocket Endpoint
# ------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    dashboard_clients.append(websocket)
    try:
        while True:
            await asyncio.sleep(1)
    except Exception as e:
        print(f"WebSocket disconnected: {e}")
    finally:
        if websocket in dashboard_clients:
            dashboard_clients.remove(websocket)


# ------------------------------
# Simulation Utilities
# ------------------------------
@app.post("/simulate/panic")
async def simulate_panic():
    payload = PanicPayload(user_id="demo", vehicle_id="Bus #17", lang="en", location=GEOCODE["Metro Station XYZ"])
    return await panic_event(payload)


@app.post("/simulate/burst")
async def simulate_burst(count: int = 5):
    for i in range(max(1, min(20, count))):
        await anomaly_event(AnomalyPayload(anomaly_type=random.choice(["route_deviation", "unsafe_driving", "distress_voice"]),
                                           vehicle_id="Bus #17",
                                           current_location=GEOCODE["Metro Station XYZ"]))
    return {"status": "ok", "generated": count}


# ------------------------------
# Serve React build (NEW BLOCK)
# ------------------------------
if os.path.isdir("build"):
    # Serve static assets (CSS/JS)
    app.mount("/static", StaticFiles(directory="build/static"), name="static")

    # Serve other public files (logo, manifest, favicon, etc.)
    app.mount("/assets", StaticFiles(directory="build"), name="assets")

    # Catch-all: return index.html
    @app.get("/", include_in_schema=False)
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str = ""):
        return FileResponse(os.path.join("build", "index.html"))
