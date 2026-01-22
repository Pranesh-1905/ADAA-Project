# ADAA Project — Backend

Quick notes to run the backend locally for development.

Prerequisites
- Python 3.11+ (virtualenv recommended)
- Redis (or Memurai) running on `localhost:6379`
- MongoDB Atlas or local MongoDB and a `MONGO_URI`

Setup
```pwsh
python -m venv .venv_backend
.\.venv_backend\Scripts\Activate.ps1
python -m pip install -U pip
python -m pip install -r requirements.txt
cp .env.example .env     # fill in values
```

Run services
- Start FastAPI:
```pwsh
uvicorn app.main:app --reload
```

- Start Celery worker (from backend folder):
```pwsh
celery -A app.worker worker -l info -P solo
```

Endpoints of interest
- `POST /upload` — upload CSV/Excel files
- `POST /analyze?filename=...` — dispatch analysis task
- `GET /visualize/{task_id}` — dispatch charts generation task
- `GET /jobs` — list analysis jobs (cleaned of NaN values)

Notes & next improvements
- Pin dependencies in `requirements.txt` for reproducible installs.
- Add Dockerfile and `docker-compose.yml` for local Redis/Mongo services.
- Add unit tests (pytest) and CI.
- Implement retries/backoff for Celery tasks and better task-result correlation.
- Secure `.env` values and rotate secrets.
