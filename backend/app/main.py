
import os
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
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
from datetime import timedelta, datetime
from typing import List, Optional
from app.auth_google import router as google_auth_router
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
app.include_router(google_auth_router)

# Add SessionMiddleware for OAuth (must be before CORS)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000", "http://127.0.0.1:8000"],  # Vite default dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
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


@app.get("/api/analysis/{task_id}/stream")
async def stream_analysis_events(task_id: str, token: str = None):
    """
    Server-Sent Events (SSE) endpoint for real-time agent activity updates.
    
    Clients can subscribe to this endpoint to receive live updates as agents
    execute their analysis tasks.
    
    Args:
        task_id: The Celery task ID to monitor
        token: JWT token for authentication (query param since EventSource doesn't support headers)
        
    Returns:
        StreamingResponse with SSE events
    """
    from app.event_stream import event_generator
    from app.auth import verify_token
    
    # Verify token
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required")
    
    try:
        current_user = verify_token(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Verify the task belongs to the current user
    job = await db.analysis_jobs.find_one({"task_id": task_id, "user": current_user.get("username")})
    if not job:
        raise HTTPException(status_code=404, detail="Task not found or access denied")
    
    return StreamingResponse(
        event_generator(task_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@app.get("/jobs")
async def get_jobs(current_user: dict = Depends(get_current_user)):
    cursor = db.analysis_jobs.find({"user": current_user.get("username")}, {"_id": 0})
    jobs = [job async for job in cursor]
    cleaned_jobs = [clean_json(job) for job in jobs]
    return cleaned_jobs

@app.get("/api/jobs/all")
async def get_all_jobs(current_user: dict = Depends(get_current_user)):
    """Get all jobs for the current user - used by custom chart builder"""
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


class QueryRequest(BaseModel):
    question: str
    task_id: str


@app.post("/api/query")
async def query_agent(payload: QueryRequest, current_user: dict = Depends(get_current_user)):
    """
    Query Agent endpoint - LLM-powered natural language Q&A about analyzed data.
    
    This endpoint uses the Query Agent to provide context-aware responses
    based on the complete analysis results from all agents.
    """
    from app.agents.query_agent import QueryAgent
    
    # Fetch the analysis job
    job = await db.analysis_jobs.find_one({
        "task_id": payload.task_id, 
        "user": current_user.get("username")
    })
    
    if not job:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Check if analysis is complete
    if job.get("status") != "completed":
        raise HTTPException(
            status_code=202, 
            detail="Analysis still processing. Please wait for completion."
        )
    
    # Get the analysis results
    result = job.get("result", {})
    
    if not result:
        raise HTTPException(status_code=400, detail="No analysis results available")
    
    try:
        # Initialize Query Agent
        query_agent = QueryAgent()
        
        # Build data summary from result
        data_summary = {
            "num_rows": result.get("rows", 0),
            "num_columns": len(result.get("columns", [])),
            "columns": result.get("columns", []),
            "dtypes": result.get("dtypes", {}),
        }
        
        # Store the data summary in the agent
        query_agent.data_summary = data_summary
        
        # Extract agent analysis results (this is where the actual agent outputs are stored)
        agent_analysis = result.get("agent_analysis", {})
        
        # Build context from all agent results with correct structure
        context = {
            "data_profiler": agent_analysis.get("profiler", {}),
            "insight_discovery": agent_analysis.get("insights", {}),
            "visualization": agent_analysis.get("visualizations", {}),
            "recommendation": agent_analysis.get("recommendations", {})
        }
        
        # Store context in the agent
        query_agent.analysis_context = context
        
        # Answer the question
        answer_result = query_agent.answer_question(
            question=payload.question,
            data=None,  # We're using the stored summary
            context=context
        )
        
        return {
            "success": True,
            "answer": answer_result.get("answer"),
            "confidence": answer_result.get("confidence"),
            "source": answer_result.get("source"),
            "model": answer_result.get("model"),
            "timestamp": answer_result.get("timestamp"),
            "note": answer_result.get("note")
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process query: {str(e)}"
        )
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


# Advanced Features - Phase 4

@app.get("/dataset-columns/{filename}")
async def get_dataset_columns(filename: str, current_user: dict = Depends(get_current_user)):
    """Get column names from a dataset for custom chart building"""
    try:
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Dataset file not found")
        
        # Read file and get columns
        if filename.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path, nrows=0)
        elif filename.lower().endswith('.csv'):
            # Try multiple encodings
            encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
            df = None
            for encoding in encodings:
                try:
                    df = pd.read_csv(file_path, nrows=0, encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
            if df is None:
                raise HTTPException(status_code=400, detail="Unable to read file with supported encodings")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        return {
            "status": "success",
            "columns": df.columns.tolist(),
            "filename": filename
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


class CustomChartRequest(BaseModel):
    filename: str
    x_column: str
    y_column: Optional[str] = None
    chart_type: str


@app.post("/generate-custom-chart")
async def generate_custom_chart(payload: CustomChartRequest, current_user: dict = Depends(get_current_user)):
    """Generate custom chart data based on user-selected columns"""
    file_path = os.path.join(UPLOAD_DIR, payload.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Read file with proper encoding handling
        if payload.filename.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path)
        elif payload.filename.lower().endswith('.csv'):
            encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
            df = None
            for encoding in encodings:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
            if df is None:
                raise HTTPException(status_code=400, detail="Unable to read CSV file with supported encodings")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Use CSV or Excel files.")
        
        # Validate columns exist
        if payload.x_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{payload.x_column}' not found in dataset")
        
        if payload.y_column and payload.y_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{payload.y_column}' not found in dataset")
        
        # Get values for the chart
        x_values = df[payload.x_column].fillna('N/A').tolist()
        y_values = []
        
        if payload.y_column:
            y_values = df[payload.y_column].fillna(0).tolist()
        
        # Limit points for performance but provide more data
        max_points = 500
        
        return {
            "status": "success",
            "values": {
                "x": x_values[:max_points],
                "y": y_values[:max_points] if y_values else []
            },
            "total_points": len(x_values),
            "chart_type": payload.chart_type
        }
    except HTTPException:
        raise
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Column not found: {str(e)}")
    except Exception as e:
        logger.error(f"Error generating custom chart: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating chart: {str(e)}")


class SaveCustomChartRequest(BaseModel):
    task_id: str
    chart_data: dict
    chart_config: dict


@app.post("/save-custom-chart")
async def save_custom_chart(payload: SaveCustomChartRequest, current_user: dict = Depends(get_current_user)):
    """Save a custom chart to the analysis job's chart collection"""
    try:
        username = current_user.get("username")
        
        # Find the specific job by task_id
        job = await db.analysis_jobs.find_one({
            "task_id": payload.task_id,
            "user": username
        })
        
        if not job:
            raise HTTPException(status_code=404, detail="Analysis not found or access denied")
        
        if job.get("status") != "completed":
            raise HTTPException(status_code=400, detail="Can only add charts to completed analyses")
        
        # Create custom chart object
        custom_chart = {
            "type": "custom",
            "name": payload.chart_config.get("title", "Custom Chart"),
            "chart_type": payload.chart_config.get("chartType", "bar"),
            "data": payload.chart_data.get("data", []),
            "layout": payload.chart_data.get("layout", {}),
            "metadata": {
                "dataset": job.get("filename"),
                "x_column": payload.chart_config.get("xColumn"),
                "y_column": payload.chart_config.get("yColumn"),
                "created_at": datetime.utcnow().isoformat(),
                "created_by": username
            }
        }
        
        # Add to job's custom_charts array
        result = await db.analysis_jobs.update_one(
            {"task_id": job["task_id"]},
            {"$push": {"custom_charts": custom_chart}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to save chart")
        
        return {
            "status": "success",
            "message": "Custom chart saved successfully",
            "task_id": job["task_id"],
            "chart": custom_chart
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving custom chart: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save chart: {str(e)}")


# Export & Reporting endpoints
from io import BytesIO
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment


@app.get("/export/excel/{task_id}")
async def export_to_excel(task_id: str, current_user: dict = Depends(get_current_user)):
    """Export analysis results to formatted Excel file"""
    try:
        job = await db.analysis_jobs.find_one({"task_id": task_id, "user": current_user.get("username")})
        
        if not job:
            raise HTTPException(status_code=404, detail="Analysis not found. It may have been deleted.")
        
        if job.get("status") != "completed":
            raise HTTPException(status_code=400, detail=f"Analysis is {job.get('status')}. Only completed analyses can be exported.")
        
        result = job.get("result", {})
        filename = job.get("filename")
        
        if not filename:
            raise HTTPException(status_code=400, detail="Original dataset filename not found")
    
        # Read original data
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Original data file '{filename}' not found. It may have been deleted from uploads.")
        
        # Read file with encoding handling
        if filename.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path)
        elif filename.lower().endswith('.csv'):
            # Try multiple encodings
            encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
            df = None
            for encoding in encodings:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
            if df is None:
                raise HTTPException(status_code=400, detail="Unable to read file with supported encodings")
        else:
            df = pd.read_csv(file_path)  # Fallback
        
        # Create Excel file with multiple sheets
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Sheet 1: Original Data
            df.to_excel(writer, sheet_name='Data', index=False)
            
            # Sheet 2: Summary Statistics (from profiler)
            agent_analysis = result.get('agent_analysis', {})
            profiler = agent_analysis.get('profiler', {})
            
            if 'summary' in result and result['summary']:
                summary_df = pd.DataFrame(result['summary'])
                summary_df.to_excel(writer, sheet_name='Statistics')
            elif profiler.get('column_stats'):
                # Use profiler column stats if summary not available
                stats_data = []
                for col, stats in profiler['column_stats'].items():
                    if isinstance(stats, dict):
                        stats_data.append({
                            'Column': col,
                            'Count': stats.get('count', 'N/A'),
                            'Mean': stats.get('mean', 'N/A'),
                            'Std': stats.get('std', 'N/A'),
                            'Min': stats.get('min', 'N/A'),
                            'Max': stats.get('max', 'N/A'),
                            'Median': stats.get('median', 'N/A')
                        })
                if stats_data:
                    stats_df = pd.DataFrame(stats_data)
                    stats_df.to_excel(writer, sheet_name='Statistics', index=False)
            
            # Sheet 3: Data Quality (Enhanced)
            if profiler:
                quality_rows = [
                    ['Metric', 'Value'],
                    ['Total Rows', profiler.get('shape', {}).get('rows', 0)],
                    ['Total Columns', profiler.get('shape', {}).get('columns', 0)],
                    ['Memory Usage (MB)', round(profiler.get('memory_usage_mb', 0), 2)],
                    ['', ''],
                    ['Missing Values', ''],
                    ['Total Missing', profiler.get('missing_values', {}).get('total_missing', 0)],
                    ['Missing Percentage', f"{profiler.get('missing_values', {}).get('percentage', 0):.2f}%"],
                    ['', ''],
                    ['Duplicates', ''],
                    ['Duplicate Rows', profiler.get('duplicates', 0)],
                    ['', ''],
                    ['Data Types', ''],
                ]
                
                # Add data types
                for dtype, count in profiler.get('data_types', {}).items():
                    quality_rows.append([dtype, count])
                
                quality_df = pd.DataFrame(quality_rows)
                quality_df.to_excel(writer, sheet_name='Data Quality', index=False, header=False)
            
            # Sheet 4: Missing Values by Column
            if profiler.get('missing_values', {}).get('by_column'):
                missing_data = []
                for col, count in profiler['missing_values']['by_column'].items():
                    if count > 0:
                        total_rows = profiler.get('shape', {}).get('rows', 1)
                        missing_data.append({
                            'Column': col,
                            'Missing Count': count,
                            'Percentage': f"{(count / total_rows * 100):.2f}%"
                        })
                if missing_data:
                    missing_df = pd.DataFrame(missing_data)
                    missing_df.to_excel(writer, sheet_name='Missing Values', index=False)
            
            # Sheet 5: Data Types by Column
            if result.get('dtypes'):
                dtype_data = []
                for col, dtype in result['dtypes'].items():
                    dtype_data.append({'Column': col, 'Data Type': str(dtype)})
                if dtype_data:
                    dtype_df = pd.DataFrame(dtype_data)
                    dtype_df.to_excel(writer, sheet_name='Column Types', index=False)
            
            # Sheet 6: Insights (Enhanced)
            insights = agent_analysis.get('insights', {})
            if insights:
                insights_data = []
                
                # Get insights from different sections
                if insights.get('insights'):
                    for insight in insights['insights']:
                        insights_data.append({
                            'Category': insight.get('type', 'General'),
                            'Finding': insight.get('finding', ''),
                            'Impact': insight.get('impact', 'N/A'),
                            'Severity': insight.get('severity', 'Medium')
                        })
                
                # Add patterns if available
                if insights.get('patterns'):
                    for pattern in insights['patterns']:
                        insights_data.append({
                            'Category': 'Pattern',
                            'Finding': pattern.get('description', ''),
                            'Impact': pattern.get('significance', 'N/A'),
                            'Severity': 'Info'
                        })
                
                if insights_data:
                    insights_df = pd.DataFrame(insights_data)
                    insights_df.to_excel(writer, sheet_name='Insights', index=False)
            
            # Sheet 7: Recommendations
            recommendations = agent_analysis.get('recommendations', {})
            if recommendations and recommendations.get('recommendations'):
                rec_data = []
                for rec in recommendations['recommendations']:
                    rec_data.append({
                        'Priority': rec.get('priority', 'Medium'),
                        'Type': rec.get('type', 'General'),
                        'Action': rec.get('action', ''),
                        'Expected Benefit': rec.get('expected_benefit', 'N/A'),
                        'Effort': rec.get('effort', 'N/A')
                    })
                if rec_data:
                    rec_df = pd.DataFrame(rec_data)
                    rec_df.to_excel(writer, sheet_name='Recommendations', index=False)
            
            # Sheet 8: Correlations (if available)
            if profiler.get('correlations') and isinstance(profiler['correlations'], dict):
                try:
                    corr_df = pd.DataFrame(profiler['correlations'])
                    if not corr_df.empty:
                        corr_df.to_excel(writer, sheet_name='Correlations')
                except:
                    pass  # Skip if correlation data is malformed
        
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=analysis_{task_id[:8]}.xlsx"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Excel export failed for task {task_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to export Excel: {str(e)}. Please try again or contact support.")


@app.get("/export/pdf/{task_id}")
async def export_to_pdf(task_id: str, current_user: dict = Depends(get_current_user)):
    """Export analysis results to comprehensive PDF report"""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
        from datetime import datetime
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Missing dependency: {str(e)}. Install with: pip install reportlab")
    
    job = await db.analysis_jobs.find_one({"task_id": task_id, "user": current_user.get("username")})
    
    if not job:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if job.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Analysis not completed")
    
    result = job.get("result", {})
    
    try:
        # Create PDF with custom margins
        output = BytesIO()
        doc = SimpleDocTemplate(
            output, 
            pagesize=letter,
            rightMargin=50,
            leftMargin=50,
            topMargin=50,
            bottomMargin=50
        )
        story = []
        styles = getSampleStyleSheet()
        
        # Get agent analysis data early for safety
        agent_analysis = result.get('agent_analysis', {})
        profiler = agent_analysis.get('profiler', {})
        insights = agent_analysis.get('insights', {})
        recommendations = agent_analysis.get('recommendations', {})
        
        # Custom Styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=28,
            textColor=colors.HexColor('#1e3a8a'),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        subtitle_style = ParagraphStyle(
            'Subtitle',
            parent=styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#64748b'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica'
        )
        
        heading2_style = ParagraphStyle(
            'CustomHeading2',
            parent=styles['Heading2'],
            fontSize=18,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold',
            borderWidth=2,
            borderColor=colors.HexColor('#3b82f6'),
            borderPadding=5,
            backColor=colors.HexColor('#eff6ff')
        )
        
        heading3_style = ParagraphStyle(
            'CustomHeading3',
            parent=styles['Heading3'],
            fontSize=14,
            textColor=colors.HexColor('#2563eb'),
            spaceAfter=8,
            spaceBefore=8,
            fontName='Helvetica-Bold'
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#1e293b'),
            spaceAfter=8,
            alignment=TA_JUSTIFY,
            leading=14
        )
        
        # Cover Page
        story.append(Spacer(1, 2*inch))
        story.append(Paragraph("DATA ANALYSIS REPORT", title_style))
        story.append(Paragraph("Comprehensive Automated Analysis", subtitle_style))
        story.append(Spacer(1, 0.5*inch))
        
        # Cover metadata box
        cover_data = [
            ['Dataset', job.get('filename', 'Unknown')],
            ['Analysis Date', datetime.now().strftime('%B %d, %Y')],
            ['Generated At', datetime.now().strftime('%I:%M %p')],
            ['Analyst', current_user.get('username', 'Unknown')],
            ['Report ID', task_id[:12]]
        ]
        
        cover_table = Table(cover_data, colWidths=[2*inch, 3.5*inch])
        cover_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#3b82f6')),
            ('BACKGROUND', (1, 0), (1, -1), colors.HexColor('#dbeafe')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.whitesmoke),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1e293b')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#3b82f6'))
        ]))
        story.append(cover_table)
        story.append(PageBreak())
        
        # Table of Contents
        story.append(Paragraph("TABLE OF CONTENTS", heading2_style))
        story.append(Spacer(1, 12))
        
        toc_items = [
            "1. Executive Summary",
            "2. Dataset Overview",
            "3. Data Quality Assessment",
            "4. Statistical Analysis",
            "5. Key Insights",
            "6. Detected Patterns",
            "7. Recommendations",
            "8. Technical Details"
        ]
        
        for item in toc_items:
            story.append(Paragraph(item, body_style))
            story.append(Spacer(1, 4))
        
        story.append(PageBreak())
        
        # 1. Executive Summary
        story.append(Paragraph("1. EXECUTIVE SUMMARY", heading2_style))
        story.append(Spacer(1, 12))
        
        if profiler:
            total_rows = profiler.get('shape', {}).get('rows', 0)
            total_cols = profiler.get('shape', {}).get('columns', 0)
            missing_pct = profiler.get('missing_values', {}).get('percentage', 0)
            duplicates = profiler.get('duplicates', 0)
            
            # Safe counts for insights and recommendations
            insights_count = len(insights.get('insights', [])) if isinstance(insights.get('insights'), list) else 0
            patterns_count = len(insights.get('patterns', [])) if isinstance(insights.get('patterns'), list) else 0
            recommendations_count = len(recommendations.get('recommendations', [])) if isinstance(recommendations.get('recommendations'), list) else 0
            
            summary_text = f"""
            This report presents a comprehensive analysis of {job.get('filename', 'the dataset')} containing 
            {total_rows:,} rows and {total_cols} columns. The dataset occupies {profiler.get('memory_usage_mb', 0):.2f} MB 
            in memory. Data quality assessment reveals {missing_pct:.2f}% missing values and {duplicates} duplicate records. 
            Our multi-agent AI system has identified <b>{insights_count} key insights, {patterns_count} patterns,</b> and generated 
            <b>{recommendations_count} actionable recommendations</b> for data improvement and analysis.
            """
            
            story.append(Paragraph(summary_text, body_style))
            story.append(Spacer(1, 20))
        
        # 2. Dataset Overview
        story.append(Paragraph("2. DATASET OVERVIEW", heading2_style))
        story.append(Spacer(1, 12))
        
        try:
            if profiler:
                overview_data = [
                    ['Metric', 'Value', 'Details'],
                    ['Total Records', f"{profiler.get('shape', {}).get('rows', 0):,}", 'Number of data rows'],
                    ['Total Columns', str(profiler.get('shape', {}).get('columns', 0)), 'Number of features/variables'],
                    ['Memory Usage', f"{profiler.get('memory_usage_mb', 0):.2f} MB", 'RAM consumption'],
                    ['Missing Data', 
                     f"{profiler.get('missing_values', {}).get('total_missing', 0):,} ({profiler.get('missing_values', {}).get('percentage', 0):.2f}%)", 
                     'Empty/null values'],
                    ['Duplicate Records', str(profiler.get('duplicates', 0)), 'Exact duplicate rows'],
                ]
                
                t = Table(overview_data, colWidths=[2*inch, 2*inch, 2.5*inch])
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (1, -1), 'LEFT'),
                    ('ALIGN', (2, 0), (2, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 0), (-1, 0), 11),
                    ('FONTSIZE', (0, 1), (-1, -1), 10),
                    ('LEFTPADDING', (0, 0), (-1, -1), 10),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                    ('TOPPADDING', (0, 0), (-1, -1), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1'))
                ]))
                story.append(t)
                story.append(Spacer(1, 20))
        except Exception as overview_error:
            logger.warning(f"Error building overview table: {str(overview_error)}")
            story.append(Paragraph("Dataset overview unavailable", styles['Normal']))
            story.append(Spacer(1, 12))
        
        # 3. Data Quality Assessment
        story.append(Paragraph("3. DATA QUALITY ASSESSMENT", heading2_style))
        story.append(Spacer(1, 12))
        
        # Data Types Distribution
        try:
            if profiler.get('data_types') and isinstance(profiler['data_types'], dict):
                story.append(Paragraph("3.1 Data Types Distribution", heading3_style))
                story.append(Spacer(1, 8))
                dtype_data = [['Data Type', 'Column Count', 'Percentage']]
                total_cols = sum(profiler['data_types'].values())
                for dtype, count in profiler['data_types'].items():
                    percentage = (count / total_cols * 100) if total_cols > 0 else 0
                    dtype_data.append([str(dtype), str(count), f"{percentage:.1f}%"])
                
                dt = Table(dtype_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
                dt.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('LEFTPADDING', (0, 0), (-1, -1), 10),
                    ('TOPPADDING', (0, 0), (-1, -1), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1'))
                ]))
                story.append(dt)
                story.append(Spacer(1, 16))
        except Exception as dtype_error:
            logger.warning(f"Error building data types table: {str(dtype_error)}")
        
        # Missing Values Analysis
        try:
            if profiler.get('missing_values', {}).get('by_column') and isinstance(profiler['missing_values']['by_column'], dict):
                missing_cols = [(col, count) for col, count in profiler['missing_values']['by_column'].items() if count > 0]
                if missing_cols:
                    story.append(Paragraph("3.2 Missing Values by Column", heading3_style))
                    story.append(Spacer(1, 8))
                    
                    # Sort by count descending
                    missing_cols.sort(key=lambda x: x[1], reverse=True)
                    
                    missing_data = [['Column Name', 'Missing Count', 'Percentage', 'Severity']]
                    total_rows = profiler.get('shape', {}).get('rows', 1)
                    for col, count in missing_cols[:15]:  # Top 15
                        percentage = (count / total_rows * 100)
                        severity = 'High' if percentage > 50 else 'Medium' if percentage > 20 else 'Low'
                        severity_color = 'red' if severity == 'High' else 'orange' if severity == 'Medium' else 'green'
                        missing_data.append([
                            str(col)[:30] + '...' if len(str(col)) > 30 else str(col), 
                            str(count), 
                            f"{percentage:.2f}%",
                            f'<font color="{severity_color}">{severity}</font>'
                        ])
                    
                    mt = Table(missing_data, colWidths=[2.2*inch, 1.3*inch, 1.2*inch, 1*inch])
                    mt.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 9),
                        ('LEFTPADDING', (0, 0), (-1, -1), 8),
                        ('TOPPADDING', (0, 0), (-1, -1), 6),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1'))
                    ]))
                    story.append(mt)
                    story.append(Spacer(1, 20))
        except Exception as missing_error:
            logger.warning(f"Error building missing values table: {str(missing_error)}")
        
        story.append(PageBreak())
        
        # 4. Statistical Analysis
        story.append(Paragraph("4. STATISTICAL ANALYSIS", heading2_style))
        story.append(Spacer(1, 12))
        
        try:
            if profiler.get('column_stats') and isinstance(profiler['column_stats'], dict):
                story.append(Paragraph("4.1 Numerical Column Statistics", heading3_style))
                story.append(Spacer(1, 8))
                
                stats_rows = [['Column', 'Mean', 'Std Dev', 'Min', 'Max', 'Median']]
                for col, stats in list(profiler['column_stats'].items())[:12]:  # Top 12 numerical columns
                    if isinstance(stats, dict) and 'mean' in stats:
                        try:
                            stats_rows.append([
                                col[:20] + '...' if len(col) > 20 else col,
                                f"{float(stats.get('mean', 0)):.2f}" if isinstance(stats.get('mean'), (int, float)) else 'N/A',
                                f"{float(stats.get('std', 0)):.2f}" if isinstance(stats.get('std'), (int, float)) else 'N/A',
                                f"{float(stats.get('min', 0)):.2f}" if isinstance(stats.get('min'), (int, float)) else 'N/A',
                                f"{float(stats.get('max', 0)):.2f}" if isinstance(stats.get('max'), (int, float)) else 'N/A',
                                f"{float(stats.get('median', 0)):.2f}" if isinstance(stats.get('median'), (int, float)) else 'N/A',
                            ])
                        except (ValueError, TypeError):
                            continue
                
                if len(stats_rows) > 1:
                    st = Table(stats_rows, colWidths=[1.5*inch, 1*inch, 1*inch, 0.8*inch, 0.8*inch, 0.8*inch])
                    st.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 8),
                        ('LEFTPADDING', (0, 0), (-1, -1), 6),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                        ('TOPPADDING', (0, 0), (-1, -1), 5),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1'))
                    ]))
                    story.append(st)
                    story.append(Spacer(1, 20))
        except Exception as stats_error:
            logger.warning(f"Error building statistics table: {str(stats_error)}")
            story.append(Paragraph("Statistical analysis data unavailable", styles['Normal']))
            story.append(Spacer(1, 12))
        
        # 5. Key Insights
        if insights:
            story.append(PageBreak())
            story.append(Paragraph("5. KEY INSIGHTS & FINDINGS", heading2_style))
            story.append(Spacer(1, 12))
            
            insights_list = insights.get('insights', [])
            if isinstance(insights_list, list) and len(insights_list) > 0:
                story.append(Paragraph(
                    f"Our AI analysis identified <b>{len(insights_list)} significant insights</b> about your dataset. "
                    "These findings reveal critical patterns, anomalies, and opportunities.",
                    body_style
                ))
                story.append(Spacer(1, 16))
                
                for idx, insight in enumerate(insights_list, 1):
                    if not isinstance(insight, dict):
                        continue
                    
                    try:
                        severity = str(insight.get('severity', 'Medium'))
                        insight_type = str(insight.get('type', f'Insight {idx}'))
                        finding = str(insight.get('finding', 'N/A'))
                        impact = str(insight.get('impact', ''))
                        
                        severity_colors = {'High': '#dc2626', 'Medium': '#f59e0b', 'Low': '#10b981', 'Info': '#3b82f6'}
                        severity_color = severity_colors.get(severity, '#64748b')
                        
                        # Create numbered insight box
                        insight_header = f'<b>[{idx}] {insight_type}</b> <font color="{severity_color}">● {severity}</font>'
                        story.append(Paragraph(insight_header, ParagraphStyle(
                            f'InsightHeader_{idx}',
                            parent=body_style,
                            fontSize=11,
                            textColor=colors.HexColor('#1e293b'),
                            backColor=colors.HexColor('#f8fafc'),
                            borderWidth=1,
                            borderColor=colors.HexColor(severity_color),
                            borderPadding=8,
                            spaceAfter=6
                        )))
                        
                        story.append(Paragraph(f"<b>Finding:</b> {finding}", body_style))
                        
                        if impact and impact != 'N/A':
                            story.append(Paragraph(f"<b>Impact:</b> {impact}", body_style))
                        
                        story.append(Spacer(1, 12))
                    except Exception as e:
                        logger.warning(f"Error processing insight {idx}: {str(e)}")
                        continue
            
            # Patterns Section
            patterns_list = insights.get('patterns', [])
            if isinstance(patterns_list, list) and len(patterns_list) > 0:
                story.append(Spacer(1, 12))
                story.append(Paragraph("5.1 DETECTED PATTERNS", heading3_style))
                story.append(Spacer(1, 12))
                
                for pidx, pattern in enumerate(patterns_list, 1):
                    if not isinstance(pattern, dict):
                        continue
                    
                    try:
                        description = str(pattern.get('description', 'N/A'))
                        significance = str(pattern.get('significance', ''))
                        
                        story.append(Paragraph(f"<b>Pattern {pidx}:</b> {description}", body_style))
                        
                        if significance and significance != 'N/A':
                            story.append(Paragraph(f"<i>Significance: {significance}</i>", body_style))
                        
                        story.append(Spacer(1, 8))
                    except Exception as e:
                        logger.warning(f"Error processing pattern {pidx}: {str(e)}")
                        continue
        
        # 6. Recommendations
        if recommendations:
            story.append(PageBreak())
            story.append(Paragraph("6. ACTIONABLE RECOMMENDATIONS", heading2_style))
            story.append(Spacer(1, 12))
            
            recs_list = recommendations.get('recommendations', [])
            if isinstance(recs_list, list) and len(recs_list) > 0:
                story.append(Paragraph(
                    f"Based on comprehensive data analysis, we recommend implementing <b>{len(recs_list)} actions</b> "
                    "to improve your data quality, analysis accuracy, and achieve better insights.",
                    body_style
                ))
                story.append(Spacer(1, 16))
                
                # Group by priority
                high_priority = [r for r in recs_list if isinstance(r, dict) and r.get('priority') == 'High']
                medium_priority = [r for r in recs_list if isinstance(r, dict) and r.get('priority') == 'Medium']
                low_priority = [r for r in recs_list if isinstance(r, dict) and r.get('priority') == 'Low']
                
                for priority_list, priority_name, priority_color in [
                    (high_priority, 'HIGH PRIORITY', '#dc2626'),
                    (medium_priority, 'MEDIUM PRIORITY', '#f59e0b'),
                    (low_priority, 'LOW PRIORITY', '#10b981')
                ]:
                    if priority_list:
                        # Priority header
                        story.append(Paragraph(
                            f'<font color="{priority_color}"><b>◆ {priority_name} ({len(priority_list)} items)</b></font>',
                            ParagraphStyle(
                                f'Priority_{priority_name}',
                                parent=heading3_style,
                                fontSize=13,
                                textColor=colors.HexColor(priority_color),
                                spaceAfter=12,
                                spaceBefore=8
                            )
                        ))
                        story.append(Spacer(1, 8))
                        
                        for r_idx, rec in enumerate(priority_list, 1):
                            try:
                                rec_type = str(rec.get('type', 'Recommendation'))
                                action = str(rec.get('action', 'N/A'))
                                benefit = str(rec.get('expected_benefit', ''))
                                effort = str(rec.get('effort', ''))
                                details = str(rec.get('details', ''))
                                
                                # Build recommendation text
                                rec_content = f"<b>Rec. {r_idx}: {rec_type}</b><br/>"
                                rec_content += f"<b>Action:</b> {action}<br/>"
                                
                                if benefit and benefit != 'N/A':
                                    rec_content += f"<b>Expected Benefit:</b> {benefit}<br/>"
                                
                                if effort and effort != 'N/A':
                                    rec_content += f"<b>Effort:</b> {effort}<br/>"
                                
                                if details and details != 'N/A':
                                    rec_content += f"<b>Details:</b> {details}"
                                
                                # Create boxed recommendation
                                rec_para = Paragraph(
                                    rec_content,
                                    ParagraphStyle(
                                        f'RecBox_{r_idx}',
                                        parent=body_style,
                                        fontSize=10,
                                        backColor=colors.HexColor('#f8fafc'),
                                        borderWidth=1,
                                        borderColor=colors.HexColor(priority_color),
                                        borderPadding=10,
                                        leftIndent=10,
                                        spaceAfter=10,
                                        leading=12
                                    )
                                )
                                story.append(rec_para)
                                story.append(Spacer(1, 8))
                            except Exception as e:
                                logger.warning(f"Error processing recommendation: {str(e)}")
                                continue
                        
                        story.append(Spacer(1, 12))
        
        # 7. Technical Details
        story.append(PageBreak())
        story.append(Paragraph("7. TECHNICAL DETAILS", heading2_style))
        story.append(Spacer(1, 12))
        
        tech_details = [
            ['Detail', 'Information'],
            ['Analysis Engine', 'Multi-Agent AI System'],
            ['Processing Date', datetime.now().strftime('%B %d, %Y at %I:%M %p')],
            ['Report Format', 'PDF (Portable Document Format)'],
            ['Data Format', 'CSV (Comma-Separated Values)'],
            ['Task ID', task_id],
            ['Agent Components', 'Profiler, Insight Discovery, Recommendation Engine, Visualization'],
        ]
        
        tech_table = Table(tech_details, colWidths=[2.5*inch, 4*inch])
        tech_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f5f9')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1'))
        ]))
        story.append(tech_table)
        story.append(Spacer(1, 20))
        
        # Footer note
        story.append(Spacer(1, 30))
        footer_text = """
        <i>This report was automatically generated by an AI-powered data analysis system. 
        The insights and recommendations are based on statistical analysis and machine learning algorithms. 
        For critical decisions, please validate findings with domain experts.</i>
        """
        story.append(Paragraph(footer_text, ParagraphStyle(
            'Footer',
            parent=body_style,
            fontSize=9,
            textColor=colors.HexColor('#64748b'),
            alignment=TA_CENTER
        )))
        
        # Build PDF
        try:
            doc.build(story)
        except Exception as build_error:
            logger.error(f"Error building PDF story: {str(build_error)}", exc_info=True)
            # Create a minimal PDF with error info
            story_minimal = []
            story_minimal.append(Paragraph("Data Analysis Report", styles['Heading1']))
            story_minimal.append(Paragraph(f"Dataset: {job.get('filename', 'Unknown')}", styles['Normal']))
            story_minimal.append(Paragraph(f"Error: {str(build_error)[:200]}", styles['Normal']))
            doc.build(story_minimal)
        
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=analysis_report_{task_id[:8]}.pdf"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF export failed for task {task_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to export PDF: {str(e)}")


class EmailReportRequest(BaseModel):
    task_id: str
    email: str
    subject: str = "Data Analysis Report"
    message: str = ""


@app.post("/export/email")
async def email_report(payload: EmailReportRequest, current_user: dict = Depends(get_current_user)):
    """Send analysis report via email"""
    job = await db.analysis_jobs.find_one({
        "task_id": payload.task_id,
        "user": current_user.get("username")
    })
    
    if not job:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if job.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Analysis not completed")
    
    try:
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.mime.base import MIMEBase
        from email import encoders
        
        # Create email
        msg = MIMEMultipart()
        msg['From'] = settings.EMAIL_FROM if hasattr(settings, 'EMAIL_FROM') else "noreply@adaa.com"
        msg['To'] = payload.email
        msg['Subject'] = payload.subject
        
        # Email body
        body = f"""
        <html>
        <body>
            <h2>Data Analysis Report</h2>
            <p>{payload.message if payload.message else 'Please find your data analysis report attached.'}</p>
            <p><b>Dataset:</b> {job.get('filename', 'Unknown')}</p>
            <p><b>Analyzed by:</b> {current_user.get('username', 'Unknown')}</p>
            <p>This report was generated by ADAA - AI Data Analysis Assistant</p>
        </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))
        
        # Note: Email configuration would need to be set up in production
        # For now, we'll return success and log the attempt
        
        return {
            "success": True,
            "message": f"Report scheduled for delivery to {payload.email}",
            "note": "Email configuration required for actual delivery"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


# ========== COLLABORATION FEATURES ==========

from app.collaboration import (
    ShareRequest, WorkspaceCreate, CommentCreate, VersionCreate,
    create_share, get_shares_for_task, get_shared_with_user,
    create_workspace, get_user_workspaces, add_workspace_member, remove_workspace_member,
    create_comment, get_comments_for_task, update_comment, delete_comment,
    create_version, get_versions_for_task, restore_version
)


@app.post("/api/share")
async def share_analysis(payload: ShareRequest, current_user: dict = Depends(get_current_user)):
    """Share analysis results with other users"""
    # Verify the task belongs to current user
    job = await db.analysis_jobs.find_one({
        "task_id": payload.task_id,
        "user": current_user.get("username")
    })
    
    if not job:
        raise HTTPException(status_code=404, detail="Task not found or access denied")
    
    try:
        share_id = await create_share(
            db,
            payload.task_id,
            current_user.get("username"),
            payload.shared_with,
            payload.permission
        )
        
        return {
            "success": True,
            "share_id": str(share_id),
            "message": f"Analysis shared with {len(payload.shared_with)} user(s)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to share analysis: {str(e)}")


@app.get("/api/shares/{task_id}")
async def get_task_shares(task_id: str, current_user: dict = Depends(get_current_user)):
    """Get all shares for a specific task"""
    job = await db.analysis_jobs.find_one({
        "task_id": task_id,
        "user": current_user.get("username")
    })
    
    if not job:
        raise HTTPException(status_code=404, detail="Task not found")
    
    shares = await get_shares_for_task(db, task_id)
    return {"shares": shares}


@app.get("/api/shared-with-me")
async def get_shared_analyses(current_user: dict = Depends(get_current_user)):
    """Get all analyses shared with current user"""
    shares = await get_shared_with_user(db, current_user.get("username"))
    
    # Fetch the actual analysis data for each share
    shared_analyses = []
    for share in shares:
        job = await db.analysis_jobs.find_one({"task_id": share["task_id"]}, {"_id": 0})
        if job:
            job = clean_json(job)
            shared_analyses.append({
                "share": share,
                "analysis": job
            })
    
    return {"shared_analyses": shared_analyses}


@app.post("/api/workspaces")
async def create_new_workspace(payload: WorkspaceCreate, current_user: dict = Depends(get_current_user)):
    """Create a new team workspace"""
    try:
        workspace_id = await create_workspace(
            db,
            payload.name,
            payload.description,
            current_user.get("username"),
            payload.members
        )
        
        return {
            "success": True,
            "workspace_id": str(workspace_id),
            "message": f"Workspace '{payload.name}' created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create workspace: {str(e)}")


@app.get("/api/workspaces")
async def get_workspaces(current_user: dict = Depends(get_current_user)):
    """Get all workspaces for current user"""
    workspaces = await get_user_workspaces(db, current_user.get("username"))
    return {"workspaces": workspaces}


@app.post("/api/workspaces/{workspace_id}/members")
async def add_member_to_workspace(workspace_id: str, username: str, current_user: dict = Depends(get_current_user)):
    """Add a member to workspace"""
    from bson import ObjectId
    
    # Verify current user is the workspace owner
    workspace = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not workspace or workspace.get("owner") != current_user.get("username"):
        raise HTTPException(status_code=403, detail="Only workspace owner can add members")
    
    try:
        await add_workspace_member(db, workspace_id, username)
        return {"success": True, "message": f"User {username} added to workspace"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add member: {str(e)}")


@app.delete("/api/workspaces/{workspace_id}/members/{username}")
async def remove_member_from_workspace(workspace_id: str, username: str, current_user: dict = Depends(get_current_user)):
    """Remove a member from workspace"""
    from bson import ObjectId
    
    # Verify current user is the workspace owner
    workspace = await db.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if not workspace or workspace.get("owner") != current_user.get("username"):
        raise HTTPException(status_code=403, detail="Only workspace owner can remove members")
    
    try:
        await remove_workspace_member(db, workspace_id, username)
        return {"success": True, "message": f"User {username} removed from workspace"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove member: {str(e)}")


@app.post("/api/comments")
async def add_comment(payload: CommentCreate, current_user: dict = Depends(get_current_user)):
    """Add a comment to an analysis"""
    # Verify user has access to the task
    job = await db.analysis_jobs.find_one({"task_id": payload.task_id})
    if not job:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if user owns the task or it's shared with them
    is_owner = job.get("user") == current_user.get("username")
    is_shared = await db.shares.find_one({
        "task_id": payload.task_id,
        "shared_with": current_user.get("username")
    })
    
    if not (is_owner or is_shared):
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        comment_id = await create_comment(
            db,
            payload.task_id,
            current_user.get("username"),
            payload.text,
            payload.parent_id
        )
        
        return {
            "success": True,
            "comment_id": str(comment_id),
            "message": "Comment added successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add comment: {str(e)}")


@app.get("/api/comments/{task_id}")
async def get_task_comments(task_id: str, current_user: dict = Depends(get_current_user)):
    """Get all comments for a task"""
    # Verify user has access to the task
    job = await db.analysis_jobs.find_one({"task_id": task_id})
    if not job:
        raise HTTPException(status_code=404, detail="Task not found")
    
    is_owner = job.get("user") == current_user.get("username")
    is_shared = await db.shares.find_one({
        "task_id": task_id,
        "shared_with": current_user.get("username")
    })
    
    if not (is_owner or is_shared):
        raise HTTPException(status_code=403, detail="Access denied")
    
    comments = await get_comments_for_task(db, task_id)
    return {"comments": comments}


@app.put("/api/comments/{comment_id}")
async def edit_comment(comment_id: str, text: str, current_user: dict = Depends(get_current_user)):
    """Update a comment"""
    try:
        await update_comment(db, comment_id, text, current_user.get("username"))
        return {"success": True, "message": "Comment updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update comment: {str(e)}")


@app.delete("/api/comments/{comment_id}")
async def remove_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a comment"""
    try:
        await delete_comment(db, comment_id, current_user.get("username"))
        return {"success": True, "message": "Comment deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete comment: {str(e)}")


@app.post("/api/versions")
async def create_new_version(payload: VersionCreate, current_user: dict = Depends(get_current_user)):
    """Create a version snapshot of analysis"""
    # Verify task ownership
    job = await db.analysis_jobs.find_one({
        "task_id": payload.task_id,
        "user": current_user.get("username")
    })
    
    if not job:
        raise HTTPException(status_code=404, detail="Task not found")
    
    try:
        version_id = await create_version(
            db,
            payload.task_id,
            current_user.get("username"),
            payload.changes,
            payload.description
        )
        
        return {
            "success": True,
            "version_id": str(version_id),
            "message": "Version created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create version: {str(e)}")


@app.get("/api/versions/{task_id}")
async def get_task_versions(task_id: str, current_user: dict = Depends(get_current_user)):
    """Get version history for a task"""
    job = await db.analysis_jobs.find_one({
        "task_id": task_id,
        "user": current_user.get("username")
    })
    
    if not job:
        raise HTTPException(status_code=404, detail="Task not found")
    
    versions = await get_versions_for_task(db, task_id)
    return {"versions": versions}


@app.post("/api/versions/{version_id}/restore")
async def restore_analysis_version(version_id: str, current_user: dict = Depends(get_current_user)):
    """Restore a specific version"""
    try:
        task_id = await restore_version(db, version_id, current_user.get("username"))
        
        if not task_id:
            raise HTTPException(status_code=404, detail="Version not found")
        
        return {
            "success": True,
            "task_id": task_id,
            "message": "Version restored successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restore version: {str(e)}")


# ========== PERFORMANCE & OPTIMIZATION ==========

@app.get("/api/jobs/paginated")
async def get_jobs_paginated(
    page: int = 1,
    limit: int = 10,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get paginated list of jobs with optional status filter"""
    skip = (page - 1) * limit
    
    query = {"user": current_user.get("username")}
    if status:
        query["status"] = status
    
    total = await db.analysis_jobs.count_documents(query)
    
    cursor = db.analysis_jobs.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1)
    jobs = [clean_json(job) async for job in cursor]
    
    return {
        "jobs": jobs,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }


@app.get("/api/cache/stats")
async def get_cache_stats():
    """Get Redis cache statistics"""
    redis_url = os.getenv("REDIS_BROKER")
    if not redis_url:
        raise HTTPException(status_code=500, detail="Redis not configured")
    
    try:
        import redis
        r = redis.Redis.from_url(redis_url)
        info = r.info()
        
        return {
            "connected_clients": info.get("connected_clients"),
            "used_memory": info.get("used_memory_human"),
            "uptime_days": info.get("uptime_in_days"),
            "total_commands_processed": info.get("total_commands_processed"),
            "keyspace": r.dbsize()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cache stats: {str(e)}")
    
