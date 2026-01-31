
import os
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.middleware.sessions import SessionMiddleware
from app.config import settings
from app.ai import ask_groq
from pydantic import BaseModel
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
from app.worker import analyze_dataset, generate_visuals, celery
from celery.result import AsyncResult
from app.auth import get_current_user, get_password_hash, create_access_token, authenticate_user
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas import UserCreate, Token
from fastapi import Depends
from datetime import timedelta
from app.auth_google import router as google_auth_router
app = FastAPI()
app.include_router(google_auth_router)

# Add SessionMiddleware for OAuth (must be before CORS)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

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


@app.get("/api/charts/{chart_filename}")
async def get_chart(chart_filename: str):
    """
    Serve chart JSON files from the static/charts directory.
    Chart configs are stored on disk to avoid MongoDB document size limits.
    """
    chart_path = os.path.join("static", "charts", chart_filename)
    
    if not os.path.exists(chart_path):
        raise HTTPException(status_code=404, detail="Chart not found")
    
    return FileResponse(chart_path, media_type="application/json")


@app.get("/jobs")
async def get_jobs(current_user: dict = Depends(get_current_user)):
    cursor = db.analysis_jobs.find({"user": current_user.get("username")}, {"_id": 0})
    jobs = [job async for job in cursor]
    cleaned_jobs = [clean_json(job) for job in jobs]
    return cleaned_jobs


class RenameRequest(BaseModel):
    filename: str


@app.get("/preview/{task_id}")
async def preview_dataset(task_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.analysis_jobs.find_one({"task_id": task_id, "user": current_user.get("username")})
    if not job:
        raise HTTPException(status_code=404, detail="Task not found")

    filename = job["filename"]
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    if filename.lower().endswith(('.xlsx', '.xls')):
        df = pd.read_excel(file_path)
    elif filename.lower().endswith('.csv'):
        df = pd.read_csv(file_path)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    df = df.head(10)
    df = df.where(pd.notnull(df), None)
    return {"columns": list(df.columns), "rows": df.to_dict(orient="records")}


@app.delete("/jobs/{task_id}")
async def delete_job(task_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.analysis_jobs.find_one({"task_id": task_id, "user": current_user.get("username")})
    if not job:
        raise HTTPException(status_code=404, detail="Task not found")

    filename = job.get("filename")
    if filename:
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)

    await db.analysis_jobs.delete_one({"task_id": task_id, "user": current_user.get("username")})
    return {"message": "Job deleted"}


@app.post("/jobs/{task_id}/rename")
async def rename_job(task_id: str, payload: RenameRequest, current_user: dict = Depends(get_current_user)):
    job = await db.analysis_jobs.find_one({"task_id": task_id, "user": current_user.get("username")})
    if not job:
        raise HTTPException(status_code=404, detail="Task not found")

    old_filename = job["filename"]
    old_path = os.path.join(UPLOAD_DIR, old_filename)
    if not os.path.exists(old_path):
        raise HTTPException(status_code=404, detail="File not found")

    new_filename = payload.filename.strip()
    if not new_filename:
        raise HTTPException(status_code=400, detail="New filename required")

    old_root, old_ext = os.path.splitext(old_filename)
    new_root, new_ext = os.path.splitext(new_filename)
    if not new_ext:
        new_filename = f"{new_filename}{old_ext}"
    elif new_ext.lower() != old_ext.lower():
        raise HTTPException(status_code=400, detail="File extension cannot be changed")

    new_path = os.path.join(UPLOAD_DIR, new_filename)
    if os.path.exists(new_path):
        raise HTTPException(status_code=400, detail="A file with that name already exists")

    os.rename(old_path, new_path)
    await db.analysis_jobs.update_one(
        {"task_id": task_id, "user": current_user.get("username")},
        {"$set": {"filename": new_filename}}
    )

    return {"message": "Renamed", "filename": new_filename}


@app.post("/jobs/{task_id}/cancel")
async def cancel_job(task_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.analysis_jobs.find_one({"task_id": task_id, "user": current_user.get("username")})
    if not job:
        raise HTTPException(status_code=404, detail="Task not found")

    AsyncResult(task_id, app=celery).revoke(terminate=True)
    await db.analysis_jobs.update_one(
        {"task_id": task_id, "user": current_user.get("username")},
        {"$set": {"status": "failed", "error": "Cancelled by user"}}
    )
    return {"message": "Job cancelled"}

@app.post("/ask")
async def ask(question: str, task_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.analysis_jobs.find_one({"task_id": task_id, "user": current_user.get("username")})

    if not job:
        raise HTTPException(status_code=404, detail="No analysis found for given task")

    # Check if analysis is still processing
    if job.get("status") != "completed":
        raise HTTPException(status_code=202, detail="Analysis still processing. Please wait.")

    # Check if result exists
    if "result" not in job or not job["result"]:
        raise HTTPException(status_code=400, detail="No analysis results available")

    result = job["result"]

    prompt = f"""
    You are a data analyst expert. Analyze the following dataset and answer the user's question.
    
    Dataset Summary:
    - Total Rows: {result.get('rows', 'Unknown')}
    - Columns: {', '.join(result.get('columns', [])) if result.get('columns') else 'Unknown'}
    - Statistics: {result.get('summary', {})}
    
    User Question: {question}
    
    Provide a clear, concise, and insightful answer based on the dataset.
    """

    try:
        answer = ask_groq(prompt)
        return {"answer": answer}
    except Exception as e:
        logger.error(f"Error in ask endpoint: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Failed to generate answer: {str(e)}")
from app.worker import generate_visuals

@app.get("/visualize/{task_id}")
async def visualize(task_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.analysis_jobs.find_one({"task_id": task_id, "user": current_user.get("username")})

    if not job:
        return {"error": "Task not found"}

    filename = job["filename"]

    # Pass task_id to the worker
    task = generate_visuals.delay(task_id, filename, current_user.get("username"))

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
    
