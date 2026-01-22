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

        # Read CSV
        df = pd.read_csv(file_path)

        result = {
            "rows": len(df),
            "columns": list(df.columns),
            "summary": df.describe(include="all").to_dict()
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

@celery.task(bind=True)
def generate_visuals(self, filename, user: str):
    try:
        logger.info(f"Generating charts for: {filename}")

        file_path = os.path.join("data_uploads", filename)
        df = pd.read_csv(file_path)

        charts = []

        # ===== Chart 1: Columns Count =====
        plt.figure(figsize=(6,4))
        df.count().plot(kind="bar")
        plt.title("Non-Null Value Count Per Column")
        chart1 = f"{self.request.id}_countplot.png"
        plt.savefig(f"charts/{chart1}")
        plt.close()
        charts.append(chart1)

        # ===== Chart 2: Numerical Distribution =====
        numeric = df.select_dtypes(include=["int64", "float64"])
        if not numeric.empty:
            plt.figure(figsize=(6,4))
            sns.histplot(numeric.iloc[:,0], kde=True)
            plt.title(f"Distribution of {numeric.columns[0]}")
            chart2 = f"{self.request.id}_distribution.png"
            plt.savefig(f"charts/{chart2}")
            plt.close()
            charts.append(chart2)

        # ===== Chart 3: Correlation Heatmap =====
        if numeric.shape[1] > 1:
            plt.figure(figsize=(6,4))
            sns.heatmap(numeric.corr(), annot=True, cmap="coolwarm")
            plt.title("Correlation Heatmap")
            chart3 = f"{self.request.id}_heatmap.png"
            plt.savefig(f"charts/{chart3}")
            plt.close()
            charts.append(chart3)

        db.analysis_jobs.update_one(
            {"filename": filename, "user": user},
            {"$set": {"charts": charts, "charts_status": "completed"}}
        )

        logger.info("Charts generated successfully")
        return {"charts": charts}

    except Exception as e:
        logger.error(str(e))
        return {"error": str(e)}
