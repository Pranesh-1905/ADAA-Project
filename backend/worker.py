# backend/worker.py

import os
from celery import Celery
from pymongo import MongoClient

REDIS_BROKER = os.getenv("REDIS_BROKER", "redis://localhost:6379/0")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# --- Celery App Initialization ---
# The name 'worker' must match the '-A worker' in docker-compose command
worker = Celery('worker', broker=REDIS_BROKER, include=['worker'])

# --- MongoDB Client (Synchronous for Celery Tasks) ---
mongo_client = MongoClient(MONGO_URI)
db = mongo_client.get_database("adaa_db")
analysis_jobs_collection = db.analysis_jobs # Define the collection

@worker.task(name='process_analysis_job')
def process_analysis_job(job_id: str):
    """Placeholder for the core Agent execution loop."""
    print(f"Starting analysis for Job ID: {job_id}")
    
    # Placeholder: Update status to demonstrate connection to DB
    analysis_jobs_collection.update_one(
        {'_id': job_id}, # Note: In practice, we'll use ObjectId or string UUID here
        {'$set': {'status': 'RUNNING', 'test_log': 'Task started successfully'}}
    )

    # Simulate work
    import time
    time.sleep(3)
    
    analysis_jobs_collection.update_one(
        {'_id': job_id},
        {'$set': {'status': 'COMPLETED', 'test_log': 'Task finished successfully'}}
    )
    print(f"Finished analysis for Job ID: {job_id}")
    return f"Job {job_id} done."