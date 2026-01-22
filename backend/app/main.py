
import os
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.ai import ask_groq
from motor.motor_asyncio import AsyncIOMotorClient
from app.worker import analyze_dataset, generate_visuals
from celery.result import AsyncResult
from app.auth import get_current_user, get_password_hash, create_access_token, authenticate_user
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas import UserCreate, Token
from fastapi import Depends
from datetime import timedelta
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite default dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncIOMotorClient(settings.MONGO_URI)
db = client["adaa_db"]

@app.get("/")
async def root():
    return {
        "message": "Backend Running",
        "mongo_connected": True
    }


UPLOAD_DIR = "data_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    ALLOWED_TYPES = ["text/csv", 
                 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only CSV or Excel allowed")

    path = os.path.join(UPLOAD_DIR, file.filename)
    with open(path, "wb") as f:
        f.write(await file.read())

    return {"message": "Uploaded", "filename": file.filename}
@app.post("/analyze")
async def analyze(filename: str, current_user: dict = Depends(get_current_user)):
    username = current_user.get("username")
    task = analyze_dataset.delay(filename, username)
    return {"task_id": task.id}

import math
def clean_json(obj):
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, dict):
        return {k: clean_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_json(i) for i in obj]
    return obj

# Status endpoints are handled via DB documents to ensure user scoping
from app.ai import ask_groq
@app.get("/ai")
async def ai():
    return {"response": ask_groq("Say hi")}
import redis
from fastapi import APIRouter

@app.get("/redis-health")
def redis_health():
    redis_url = os.getenv("REDIS_BROKER")
    if not redis_url:
        return {"status": "error", "message": "REDIS_BROKER environment variable not set"}
    try:
        r = redis.Redis.from_url(redis_url)
        if r.ping():
            return {"status": "ok", "message": "Redis is reachable"}
        else:
            return {"status": "fail", "message": "Redis did not respond"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
@app.get("/status/{task_id}")
async def get_status(task_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.analysis_jobs.find_one({"task_id": task_id, "user": current_user.get("username")}, {"_id": 0})

    if not job:
        return {"status": "processing"}

    job = clean_json(job)
    return {"status": job.get("status"), "result": job.get("result"), "error": job.get("error")}


@app.get("/jobs")
async def get_jobs(current_user: dict = Depends(get_current_user)):
    cursor = db.analysis_jobs.find({"user": current_user.get("username")}, {"_id": 0})
    jobs = [job async for job in cursor]
    cleaned_jobs = [clean_json(job) for job in jobs]
    return cleaned_jobs

@app.post("/ask")
async def ask(question: str, task_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.analysis_jobs.find_one({"task_id": task_id, "user": current_user.get("username")})

    if not job:
        return {"error": "No analysis found for given task"}

    result = job["result"]

    prompt = f"""
    You are a data analyst.
    Based on this analysis result: {result}
    Answer this question: {question}
    """

    try:
        answer = ask_groq(prompt)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
from app.worker import generate_visuals

@app.get("/visualize/{task_id}")
async def visualize(task_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.analysis_jobs.find_one({"task_id": task_id, "user": current_user.get("username")})

    if not job:
        return {"error": "Task not found"}

    filename = job["filename"]

    task = generate_visuals.delay(filename, current_user.get("username"))

    return {"message": "Visualization started", "visual_task_id": task.id}


@app.post("/register")
async def register(user: UserCreate):
    try:
        existing = await db.users.find_one({"username": user.username})
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        hashed = get_password_hash(user.password)
        await db.users.insert_one({"username": user.username, "hashed_password": hashed})
        return {"message": "user created"}
    except HTTPException:
        # re-raise known HTTP errors
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {e}")


@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=60 * 24)
    access_token = create_access_token(data={"sub": user.get("username")}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/me")
async def read_me(current_user: dict = Depends(get_current_user)):
    # return public user info (omit hashed password)
    user = dict(current_user)
    user.pop("hashed_password", None)
    return {"user": user}


@app.post("/login", response_model=Token)
async def login_json(credentials: UserCreate):
    """JSON login endpoint: accepts {username, password} and returns access token."""
    user = await authenticate_user(credentials.username, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=60 * 24)
    access_token = create_access_token(data={"sub": user.get("username")}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}
from fastapi.responses import FileResponse

@app.get("/charts/{image_name}")
async def get_chart(image_name: str):
    path = f"charts/{image_name}"
    return FileResponse(path)
    
