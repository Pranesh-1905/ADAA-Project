from fastapi import APIRouter, Request, Depends, HTTPException
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.responses import RedirectResponse
from app.config import settings
from app.auth import create_access_token
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import timedelta
from pydantic import BaseModel

class CompleteProfileRequest(BaseModel):
    email: str
    username: str

router = APIRouter()
config = Config('.env')
oauth = OAuth(config)

# MongoDB client
client = AsyncIOMotorClient(settings.MONGO_URI)
db = client["adaa_db"]
oauth.register(
    name='google',
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

@router.get('/auth/google/login')
async def login_via_google(request: Request):
    redirect_uri = request.url_for('auth_google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get('/auth/google/callback')
async def auth_google_callback(request: Request):
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get('userinfo')
    if not user_info:
        user_info = await oauth.google.userinfo(token=token)
    
    # Extract user data from Google
    email = user_info.get('email')
    name = user_info.get('name')
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Google")
    
    # Check if user exists in DB
    user = await db.users.find_one({"email": email})
    if user:
        # User exists, log them in
        access_token = create_access_token(
            data={"sub": user["username"]}, 
            expires_delta=timedelta(minutes=60 * 24)
        )
        frontend_url = f"http://localhost:5173/auth/callback?token={access_token}"
        return RedirectResponse(url=frontend_url)
    else:
        # New user, redirect to complete profile page
        frontend_url = f"http://localhost:5173/complete-profile?email={email}&name={name or ''}"
        return RedirectResponse(url=frontend_url)

@router.post('/auth/google/complete')
async def complete_oauth_profile(profile: CompleteProfileRequest):
    """Complete OAuth user profile with username"""
    # Check if username already exists
    existing = await db.users.find_one({"username": profile.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email already registered
    email_user = await db.users.find_one({"email": profile.email})
    if email_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new OAuth user
    await db.users.insert_one({
        "username": profile.username,
        "email": profile.email,
        "oauth_provider": "google",
        "hashed_password": ""  # No password for OAuth users
    })
    
    # Create JWT token
    access_token = create_access_token(
        data={"sub": profile.username}, 
        expires_delta=timedelta(minutes=60 * 24)
    )
    
    return {"access_token": access_token, "token_type": "bearer"}