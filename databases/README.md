# Databases

This folder is reserved for database configuration, schemas, migrations, and seed data for Raksha AI.

Suggested layout:
```
databases/
├─ migrations/          # Alembic or migration files
├─ seeds/               # Seed scripts / CSVs
├─ schemas/             # SQL schemas or ORM models (if kept separate)
└─ README.md
```

Backend integration (FastAPI + SQLAlchemy example):
- Install requirements in backend (add to backend/requirements.txt):
  - SQLAlchemy
  - alembic (optional)
- Create `backend/db.py` with an engine pointing to a local SQLite file in `databases/raksha.db`, or configure Postgres via env vars.

Example `backend/db.py` outline:
```
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

DB_URL = os.getenv("RAKSHA_DB_URL", "sqlite:///../databases/raksha.db")
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

Then in your endpoints, create a session and persist alerts/anomalies as needed. Keep credentials in environment variables, not in code.

Note: The current app functions without a DB; adding persistence is optional and can be done incrementally.
