
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
from datetime import timedelta
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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

client = AsyncIOMotorClient(settings.MONGO_URI)
db = client["adaa_db"]

# ... (rest of the existing code remains the same) ...

# ========== CUSTOM CHART ENDPOINTS ==========

class CustomChartRequest(BaseModel):
    filename: str
    x_column: str
    y_column: Optional[str] = None
    chart_type: str = "bar"

@app.get("/dataset-columns/{filename}")
async def get_dataset_columns(filename: str, current_user: dict = Depends(get_current_user)):
    """Get column names from a dataset"""
    try:
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Read file and get columns
        if filename.lower().endswith('.csv'):
            df = pd.read_csv(file_path, nrows=0)
        elif filename.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path, nrows=0)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        return {
            "columns": df.columns.tolist(),
            "filename": filename
        }
    except Exception as e:
        logger.error(f"Error getting columns: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get columns: {str(e)}")


@app.post("/generate-custom-chart")
async def generate_custom_chart(payload: CustomChartRequest, current_user: dict = Depends(get_current_user)):
    """Generate custom chart data"""
    try:
        file_path = os.path.join(UPLOAD_DIR, payload.filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        # Read file
        if payload.filename.lower().endswith('.csv'):
            df = pd.read_csv(file_path)
        elif payload.filename.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Validate columns
        if payload.x_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{payload.x_column}' not found")
        
        if payload.chart_type != 'histogram' and payload.y_column:
            if payload.y_column not in df.columns:
                raise HTTPException(status_code=400, detail=f"Column '{payload.y_column}' not found")
        
        # Prepare data based on chart type
        if payload.chart_type == 'histogram':
            # For histogram, only need x values
            x_values = df[payload.x_column].dropna().tolist()
            y_values = []
        else:
            # For other charts, need both x and y
            if not payload.y_column:
                raise HTTPException(status_code=400, detail="Y column required for this chart type")
            
            # Remove rows with NaN in either column
            clean_df = df[[payload.x_column, payload.y_column]].dropna()
            x_values = clean_df[payload.x_column].tolist()
            y_values = clean_df[payload.y_column].tolist()
        
        # Limit data points for performance
        max_points = 1000
        if len(x_values) > max_points:
            step = len(x_values) // max_points
            x_values = x_values[::step]
            if y_values:
                y_values = y_values[::step]
        
        return {
            "values": {
                "x": x_values,
                "y": y_values
            },
            "chart_type": payload.chart_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating custom chart: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate chart: {str(e)}")
