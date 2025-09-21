# Raksha AI – Women Safety App

A proactive women-safety web app that provides:
- Instant Panic/SOS and Anomaly alerts
- Real-time live alerts via WebSocket
- AI explanations for transparency
- Personalized safety guidance and nearest support

This README is a judge-friendly guide with exact steps to run and evaluate the project.

---

## Quick Start (Windows)

1) Backend (FastAPI)
- Open a terminal
- Run:
  - cd backend
  - py -m pip install -r requirements.txt
  - py -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
- Verify: http://localhost:8000/health should return {"status":"ok", ...}

2) Frontend (React)
- Open a second terminal
- Run:
  - cd frontend
  - npm install
  - set REACT_APP_API_BASE=http://localhost:8000 && npm start
- Open: http://localhost:3000

That’s it. Splash appears, then Login/Sign Up, then the app pages.

---

## Project Structure

```
new Raksha AI/
├─ backend/
│  ├─ main.py                # FastAPI app (REST + WebSocket)
│  └─ requirements.txt       # fastapi, uvicorn
├─ frontend/
│  ├─ public/
│  │  ├─ Raksha logo.jpg     # Your splash/logo image (place here)
│  │  ├─ favicon.ico, logo192.png, logo512.png
│  │  └─ index.html, manifest.json, robots.txt
│  └─ src/
│     ├─ api/
│     │  ├─ client.js        # API base + http utils + wsUrl
│     │  └─ endpoints.js     # URLs + API helpers
│     ├─ App.jsx             # App flow + UI pages
│     ├─ App.css             # Theme + buttons + animations
│     └─ index.js, index.css, ...
└─ README.md (this file)
```

---

## Backend – Run and Endpoints

- Start server (Windows):
```
cd backend
py -m pip install -r requirements.txt
py -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
- Health check: http://localhost:8000/health
- Root: http://localhost:8000/
- WebSocket: ws://localhost:8000/ws

Available endpoints (JSON):
- POST /panic
- POST /anomaly
- POST /escalate
- GET  /explanation?reason=...
- GET  /guidance?location=...&risk=...&lat=...&lng=...&vehicle_id=...
- GET  /alerts/recent?limit=20

Example requests (curl):

Send Panic
```
curl -X POST http://localhost:8000/panic -H "Content-Type: application/json" -d "{\"user_id\":\"Neha\",\"vehicle_id\":\"Bus #17\",\"lang\":\"en\",\"location\":\"Metro Station XYZ\"}"
```

Send Anomaly
```
curl -X POST http://localhost:8000/anomaly -H "Content-Type: application/json" -d "{\"anomaly_type\":\"route_deviation\",\"vehicle_id\":\"Bus #17\",\"lang\":\"en\",\"current_location\":\"Metro Station XYZ\"}"
```

Escalate
```
curl -X POST http://localhost:8000/escalate -H "Content-Type: application/json" -d "{\"anomaly_type\":\"distress_voice\",\"contacts\":[\"family@example.com\"],\"vehicle_id\":\"Bus #17\",\"lang\":\"en\",\"escalation_level\":\"family\"}"
```

Explanation
```
curl "http://localhost:8000/explanation?reason=distress_voice&vehicle_id=Bus%20%2317"
```

Guidance
```
curl "http://localhost:8000/guidance?location=Metro%20Station%20XYZ&risk=medium"
```

---

## Frontend – Run and Configure

- Start dev server (Windows):
```
cd frontend
npm install
set REACT_APP_API_BASE=http://localhost:8000 && npm start
```
- Default dev URL: http://localhost:3000

Environment variable (required):
- REACT_APP_API_BASE: Base URL for backend, e.g. http://localhost:8000

Optional branding assets:
- Place your logo image at: frontend/public/Raksha logo.jpg
- For favicons/PWA images, replace: frontend/public/favicon.ico, logo192.png, logo512.png

Production build:
```
cd frontend
npm run build
```
Serve the contents of frontend/build with any static hosting or reverse-proxy.

---

## Demo Flow (What To Show the Judges)

1) Splash Screen (5 seconds)
- App starts with a large centered Raksha AI logo and name, then auto-advances.

2) Auth Page
- Two buttons on the top-right: Login and Sign Up.
- Login: Email + Password. Sign Up: Name + Email + Password.
- After submit, you enter the app.

3) Home Page
- Welcome text and three primary actions:
  - Explore Features: opens a simple list of what the app can do.
  - Open Dashboard: goes to the live, interactive safety dashboard.
  - About Raksha AI: shows a short project description.

4) Features Page
- Bullet list of capabilities:
  - Instant Panic/SOS alerts + live broadcast
  - Anomaly detection (route deviation, unsafe driving, distress voice)
  - AI explanations of alerts
  - Safety guidance (nearest support + safe route hints)
  - Real-time WebSocket dashboard

5) Dashboard (Core Demo)
- Panic Alert section
  - Field: "User ID" – examples: Neha, SOS-Neha, RakshaUser01 (used only to route alerts; not public)
  - Button: "Panic Trigger" – sends a POST /panic; a live alert appears instantly below via WebSocket
  - Button: "Enable Voice Panic" – starts listening for "help", "SOS", or "bachao" and then triggers the same panic alert automatically (Chrome recommended)

- Anomaly Alert section
  - Dropdown: Route Deviation, Unsafe Driving, Distress Voice
  - Button: "Send Anomaly" – posts to /anomaly and pushes a live alert

- Escalation section
  - Input: comma-separated contacts (emails/phones)
  - Dropdowns: Anomaly Type and Escalation Level (Family, Fleet, Police)
  - Button: "Send Escalation" – calls /escalate and shows simulated recipients

- AI Explanation section
  - Button: "Get Explanation for [anomaly]" – GET /explanation returns a human-friendly reason

- Safety Guidance section
  - Dropdown: Risk (Low, Medium, High)
  - Button: "Get Guidance" – GET /guidance returns advice, nearest support, and safe route coordinates

- Live Alerts Dashboard
  - Displays real-time alerts from the WebSocket /ws with message, vehicle, and location

6) About Page
- Short overview of the project and its purpose.

Suggested 2–3 minute live script:
1. Show splash → auth → login.
2. Go to Dashboard.
3. Enter "Neha" and click Panic Trigger; point out instant WebSocket alert.
4. Enable Voice Panic and say “help” to auto-trigger.
5. Send an Anomaly alert; show it live.
6. Get Explanation; read the reason text.
7. Set risk to High and Get Guidance; show advice + nearest support + safe route.
8. Show Features list and About page; then back to Home.

---

## How It Works (Brief Technical Overview)

- Frontend: React (react-scripts), connects to REST and WebSocket.
- Backend: FastAPI + Uvicorn.
  - REST:
    - POST /panic – broadcast panic alert
    - POST /anomaly – broadcast anomaly alert
    - POST /escalate – simulate contacts notified
    - GET  /explanation – human-friendly reason
    - GET  /guidance – advice + nearest support + safe route
    - GET  /alerts/recent – last N alerts
  - WebSocket /ws – push live alerts to all connected dashboards
- State: in-memory stores for recent alerts and last-known locations (demo).
- CORS: enabled for development; open for localhost.

---

## Troubleshooting

- "powershell not recognized" or command syntax errors
  - Use the exact commands shown (Windows CMD examples). If using PowerShell:
    - $env:REACT_APP_API_BASE="http://localhost:8000"; npm start

- Frontend cannot reach backend (no alerts, buttons failing)
  - Ensure backend is running: http://localhost:8000/health
  - Ensure REACT_APP_API_BASE is set to http://localhost:8000
  - Restart the dev server after changing the env var

- Port already in use
  - Frontend: runs on 3000 by default; accept the prompt to use another port
  - Backend: run uvicorn on a free port and set REACT_APP_API_BASE accordingly

- Voice recognition not working
  - Use Chrome (Web Speech API supported)
  - Click “Enable Voice Panic” and keep the tab focused; speak clearly: “help”, “SOS”, “bachao”

- NPM warnings (react-scripts deprecation messages)
  - These are safe to ignore during judging; app runs normally

- CSS or lint warnings
  - The app compiles and runs; warnings do not block functionality

---

## Configuration Summary

- Frontend env var: REACT_APP_API_BASE
  - Example (Windows CMD):
    - set REACT_APP_API_BASE=http://localhost:8000 && npm start
  - Example (PowerShell):
    - $env:REACT_APP_API_BASE="http://localhost:8000"; npm start

- Branding asset (optional):
  - frontend/public/Raksha logo.jpg – shown on the splash screen

---

## Judge Checklist

- Backend running on port 8000
- Frontend running on port 3000 and configured to reach backend
- Splash shows for 5 seconds → Auth → Home
- Dashboard:
  - Panic Trigger adds a live alert instantly
  - Voice Panic triggers on keywords (in supported browsers)
  - Anomaly, Escalation, Explanation, Guidance all work
  - Live alerts visible below

If all boxes are checked, the build is correct and complete.
