# backend/app/main.py

import os
from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient

# --- Configuration ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

app = FastAPI()

# --- Database Connection (Async) ---
@app.on_event("startup")
async def startup_db_client():
    app.mongodb_client = AsyncIOMotorClient(MONGO_URI)
    app.mongodb = app.mongodb_client.get_database("adaa_db")
    # Ping the database to confirm connection
    try:
        await app.mongodb.command('ping')
        print("Connected to MongoDB successfully!")
    except Exception as e:
        print(f"MongoDB connection failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    app.mongodb_client.close()
    print("Disconnected from MongoDB.")

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "db": "connected"}