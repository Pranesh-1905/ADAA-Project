from celery import Celery
import pandas as pd
import numpy as np
import logging
from app.config import settings
from pymongo import MongoClient
import os
import asyncio

# Import multi-agent system
from app.agents import get_orchestrator

# ---------------- Logging ----------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------- Celery App ----------------
celery = Celery(
    "worker",
    broker=settings.REDIS_BROKER,
    backend=settings.REDIS_BROKER
)

# ---------------- MongoDB Client ----------------
mongo_client = MongoClient(settings.MONGO_URI)
db = mongo_client["adaa_db"]

# ---------------- Ensure Upload Folder Exists ----------------
UPLOAD_DIR = "data_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------------- Helper Functions ----------------
def convert_numpy_types(obj):
    """
    Recursively convert numpy types to Python native types for MongoDB compatibility.
    """
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_numpy_types(item) for item in obj)
    else:
        return obj


# ==========================================================
#   MAIN ANALYSIS TASK (WITH MULTI-AGENT SYSTEM)
# ==========================================================
@celery.task(bind=True)
def analyze_dataset(self, filename, user: str):
    try:
        logger.info(f"[MULTI-AGENT] Received task for file: {filename}")

        file_path = os.path.join(UPLOAD_DIR, filename)

        # Detect file type and read accordingly
        if filename.lower().endswith('.xlsx') or filename.lower().endswith('.xls'):
            logger.info(f"Reading Excel file: {filename}")
            df = pd.read_excel(file_path)
        elif filename.lower().endswith('.csv'):
            logger.info(f"Reading CSV file: {filename}")
            # Try different encodings
            encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252', 'utf-16']
            df = None
            last_error = None
            
            for encoding in encodings:
                try:
                    logger.info(f"Trying encoding: {encoding}")
                    df = pd.read_csv(file_path, encoding=encoding)
                    logger.info(f"Successfully read CSV with encoding: {encoding}")
                    break
                except (UnicodeDecodeError, UnicodeError) as e:
                    last_error = e
                    continue
            
            if df is None:
                raise ValueError(f"Could not read CSV file with any supported encoding. Last error: {last_error}")
        else:
            raise ValueError(f"Unsupported file type: {filename}. Please upload CSV or Excel files.")

        # ==========================================================
        #   RUN MULTI-AGENT ANALYSIS
        # ==========================================================
        logger.info(f"[MULTI-AGENT] Starting orchestrated analysis")
        
        # Get orchestrator instance
        orchestrator = get_orchestrator()
        orchestrator.reset()  # Reset for fresh analysis
        
        # Create event callback for real-time streaming
        def create_event_callback(task_id):
            """Create a callback that publishes events to Redis"""
            def callback(activity):
                try:
                    # Import here to avoid circular dependency
                    import asyncio
                    from app.event_stream import publish_event_async
                    
                    # Try to get the current event loop
                    try:
                        loop = asyncio.get_running_loop()
                        # Schedule the async publish as a background task
                        loop.create_task(publish_event_async(task_id, activity.to_dict()))
                    except RuntimeError:
                        # No running loop, create a new one for this operation
                        try:
                            asyncio.run(publish_event_async(task_id, activity.to_dict()))
                        except Exception as inner_e:
                            logger.warning(f"Failed to publish event via asyncio.run: {inner_e}")
                except Exception as e:
                    # Log but don't fail the analysis if event publishing fails
                    logger.warning(f"Failed to publish event (non-critical): {e}")
            return callback
        
        event_callback = create_event_callback(self.request.id)
        
        # Run all agents asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        agent_results = loop.run_until_complete(
            orchestrator.analyze(
                data=df,
                context={"filename": filename, "user": user},
                event_callback=event_callback
            )
        )
        
        loop.close()
        
        logger.info(f"[MULTI-AGENT] Analysis completed. Agents run: {agent_results.get('agents_run', [])}")
        
        # ==========================================================
        #   EXTRACT RESULTS FROM EACH AGENT
        # ==========================================================
        results = agent_results.get("results", {})
        
        # Basic dataset info (for backward compatibility)
        basic_result = {
            "rows": len(df),
            "columns": list(df.columns),
            "summary": df.describe(include="all").to_dict(),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()}
        }
        
        # Data Profiler results
        profiler_data = results.get("data_profiler", {}).get("results", {})
        
        # Insight Discovery results
        insights_data = results.get("insight_discovery", {}).get("results", {})
        
        # Visualization results
        viz_data = results.get("visualization", {}).get("results", {})
        
        # Recommendation results
        rec_data = results.get("recommendation", {}).get("results", {})
        
        # ==========================================================
        #   OPTIMIZE FOR MONGODB (Remove large chart configs)
        # ==========================================================
        # Chart configs can be very large (contains all data points)
        # We keep the chart files on disk and only store metadata in MongoDB
        if viz_data and "charts" in viz_data:
            for chart in viz_data["charts"]:
                # Remove the large 'config' field, keep only metadata
                if "config" in chart:
                    del chart["config"]
        
        # Combine all results
        combined_result = {
            **basic_result,
            "agent_analysis": {
                "status": agent_results.get("status"),
                "duration": agent_results.get("duration"),
                "summary": agent_results.get("summary"),
                "profiler": profiler_data,
                "insights": insights_data,
                "visualizations": viz_data,
                "recommendations": rec_data,
                "activities": agent_results.get("activities", [])
            }
        }

        # Save in MongoDB with all agent results (convert numpy types first)
        db.analysis_jobs.insert_one({
            "task_id": self.request.id,
            "filename": filename,
            "result": convert_numpy_types(combined_result),
            "status": "completed",
            "user": user,
            "agent_summary": convert_numpy_types(agent_results.get("summary", {}))
        })

        logger.info(f"[MULTI-AGENT] Analysis completed and saved for: {filename}")
        return combined_result

    except Exception as e:
        error_message = str(e)

        db.analysis_jobs.insert_one({
            "task_id": self.request.id,
            "filename": filename,
            "error": error_message,
            "status": "failed",
            "user": user
        })

        logger.error(f"[MULTI-AGENT] Analysis failed for {filename} - {error_message}")
        return {"error": error_message}

import matplotlib.pyplot as plt
import seaborn as sns
import base64
from io import BytesIO

@celery.task(bind=True)
def generate_visuals(self, task_id, filename, user: str):
    try:
        logger.info(f"Generating charts for: {filename}")

        file_path = os.path.join("data_uploads", filename)
        
        # Detect file type and read accordingly
        if filename.lower().endswith('.xlsx') or filename.lower().endswith('.xls'):
            df = pd.read_excel(file_path)
        elif filename.lower().endswith('.csv'):
            # Try different encodings
            encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252', 'utf-16']
            df = None
            
            for encoding in encodings:
                try:
                    df = pd.read_csv(file_path, encoding=encoding)
                    break
                except (UnicodeDecodeError, UnicodeError):
                    continue
            
            if df is None:
                raise ValueError(f"Could not read CSV file with any supported encoding")
        else:
            raise ValueError(f"Unsupported file type: {filename}")

        charts = []

        # ===== Chart 1: Columns Count =====
        plt.figure(figsize=(6,4))
        df.count().plot(kind="bar")
        plt.title("Non-Null Value Count Per Column")
        plt.tight_layout()
        buffer1 = BytesIO()
        plt.savefig(buffer1, format='png', dpi=100, bbox_inches='tight')
        buffer1.seek(0)
        chart1_base64 = base64.b64encode(buffer1.getvalue()).decode('utf-8')
        plt.close()
        charts.append({
            "name": "countplot",
            "title": "Non-Null Value Count Per Column",
            "data": f"data:image/png;base64,{chart1_base64}"
        })

        # ===== Chart 2: Numerical Distribution =====
        numeric = df.select_dtypes(include=["int64", "float64"])
        if not numeric.empty:
            plt.figure(figsize=(6,4))
            sns.histplot(numeric.iloc[:,0], kde=True)
            plt.title(f"Distribution of {numeric.columns[0]}")
            plt.tight_layout()
            buffer2 = BytesIO()
            plt.savefig(buffer2, format='png', dpi=100, bbox_inches='tight')
            buffer2.seek(0)
            chart2_base64 = base64.b64encode(buffer2.getvalue()).decode('utf-8')
            plt.close()
            charts.append({
                "name": "distribution",
                "title": f"Distribution of {numeric.columns[0]}",
                "data": f"data:image/png;base64,{chart2_base64}"
            })

        # ===== Chart 3: Correlation Heatmap =====
        if numeric.shape[1] > 1:
            plt.figure(figsize=(6,4))
            sns.heatmap(numeric.corr(), annot=True, cmap="coolwarm")
            plt.title("Correlation Heatmap")
            plt.tight_layout()
            buffer3 = BytesIO()
            plt.savefig(buffer3, format='png', dpi=100, bbox_inches='tight')
            buffer3.seek(0)
            chart3_base64 = base64.b64encode(buffer3.getvalue()).decode('utf-8')
            plt.close()
            charts.append({
                "name": "heatmap",
                "title": "Correlation Heatmap",
                "data": f"data:image/png;base64,{chart3_base64}"
            })


        db.analysis_jobs.update_one(
            {"task_id": task_id, "user": user},
            {"$set": {"charts": charts, "charts_status": "completed"}}
        )

        logger.info("Charts generated successfully")
        return {"charts": charts}

    except Exception as e:
        logger.error(str(e))
        return {"error": str(e)}
