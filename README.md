# Raksha AI – Monorepo

Professional structure with separate folders for backend, frontend, databases, and API connection layer.

## Structure
```
new Raksha AI/
├─ backend/              # FastAPI backend service
│  ├─ main.py
│  └─ requirements.txt
├─ frontend/             # React app (CRA + Tailwind)
│  ├─ public/
│  │  ├─ index.html
│  │  ├─ panic.html (redirects to SPA)
│  │  ├─ raksha-logo.png (place your logo here)
│  │  └─ ...
│  └─ src/
│     ├─ api/           # API connection layer
│     │  ├─ client.js   # base URL + helpers
│     │  └─ endpoints.js
│     ├─ App.jsx
│     ├─ App.css
│     └─ ...
├─ databases/            # DB configuration, migrations, seeds (placeholder)
│  └─ README.md
└─ README.md
```

## Setup

1) Backend
- Python 3.10+
- Install dependencies:
  - cd backend
  - python -m venv .venv
  - .venv\\Scripts\\activate (Windows)
  - pip install -r requirements.txt
- Run backend:
  - uvicorn main:app --reload --port 8000

2) Frontend
- Node 18+
- Install and run:
  - cd frontend
  - npm install
  - npm start
- API base URL can be configured in `frontend/.env` via `REACT_APP_API_BASE` (defaults to http://localhost:8000)

3) Databases
- Use the `databases/` folder to add database schemas, migrations, and seed data. You can integrate SQLAlchemy / Alembic or any managed service. Link the backend to your DB here.

## API Connection Layer (Frontend)
- All HTTP requests are centralized in `src/api/client.js` and `src/api/endpoints.js`.
- Replace hardcoded URLs by updating `REACT_APP_API_BASE`.

## Branding / Logo
- Place your app logo as `frontend/public/raksha-logo.png` (we set the splash to load this). If missing, the app falls back to `logo192.png`.

## Splash Screen
- On first load, the app shows a professional splash with the logo and RAKSHA AI brand for 5 seconds, then transitions to the dashboard with panic, anomaly, escalation, guidance, and live alerts.

## CORS
- Backend currently allows all origins for development. Update allow_origins in backend/main.py for production.

## Build
- Frontend: `npm run build`
- Backend: Use uvicorn/gunicorn to deploy. Serve the frontend build via a static host or behind a proxy.
