from celery import Celery
import pandas as pd
import logging
from app.config import settings
from pymongo import MongoClient
import os

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


# ==========================================================
#   MAIN ANALYSIS TASK
# ==========================================================
@celery.task(bind=True)
def analyze_dataset(self, filename, user: str):
    try:
        logger.info(f"Received task for file: {filename}")

        file_path = os.path.join(UPLOAD_DIR, filename)

        # Detect file type and read accordingly
        if filename.lower().endswith('.xlsx') or filename.lower().endswith('.xls'):
            logger.info(f"Reading Excel file: {filename}")
            df = pd.read_excel(file_path)
        elif filename.lower().endswith('.csv'):
            logger.info(f"Reading CSV file: {filename}")
            df = pd.read_csv(file_path)
        else:
            raise ValueError(f"Unsupported file type: {filename}. Please upload CSV or Excel files.")

        result = {
            "rows": len(df),
            "columns": list(df.columns),
            "summary": df.describe(include="all").to_dict(),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()}
        }

        # Save in MongoDB and associate with user
        db.analysis_jobs.insert_one({
            "task_id": self.request.id,
            "filename": filename,
            "result": result,
            "status": "completed",
            "user": user
        })

        logger.info(f"Analysis completed for: {filename}")
        return result

    except Exception as e:
        error_message = str(e)

        db.analysis_jobs.insert_one({
            "task_id": self.request.id,
            "filename": filename,
            "error": error_message,
            "status": "failed",
            "user": user
        })

        logger.error(f"Analysis failed for {filename} - {error_message}")
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
            df = pd.read_csv(file_path)
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
