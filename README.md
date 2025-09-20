# RAKSHA AI Hackathon Prototype

## Structure

- `backend/` — FastAPI backend (API + WebSocket)
- `frontend/` — React dashboard & panic trigger demo

## How to Run

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
npx create-react-app frontend
cd frontend
npm install tailwindcss
# Replace src/App.jsx with provided code
npm start
```

### Panic Trigger

Open `frontend/public/panic.html` in your browser and click the button.

## Demo Flow

1. Trigger panic (HTML or API).
2. Backend generates multilingual alert.
3. Dashboard receives real-time alert via WebSocket.
