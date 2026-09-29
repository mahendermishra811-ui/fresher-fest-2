from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
import requests


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: str = ""
    is_admin: bool = False

class SessionExchange(BaseModel):
    session_id: str

class BookingCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    pass_type: str
    pass_variant: str
    quantity: int = 1
    amount: int
    payment_reference: str
    notes: Optional[str] = ""

class Booking(BaseModel):
    booking_id: str
    name: str
    phone: str
    email: str = ""
    pass_type: str
    pass_variant: str
    quantity: int
    amount: int
    payment_reference: str
    notes: str = ""
    status: str = "pending_review"
    created_at: str
    user_id: str = ""
    profile_picture: str = ""

class InterestCreate(BaseModel):
    name: str
    phone: str
    notes: Optional[str] = ""

class Interest(InterestCreate):
    interest_id: str
    created_at: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "DU SOL Freshers 2026 booking API"}

def _is_admin(email: str) -> bool:
    allowed = {item.strip().lower() for item in os.environ.get("ADMIN_EMAILS", "").split(",") if item.strip()}
    return email.lower() in allowed

async def current_user(request: Request, admin_only: bool = False) -> dict:
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Sign-in required")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if admin_only and not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Organiser access required")
    return user

@api_router.post("/auth/session", response_model=User)
async def exchange_session(input: SessionExchange):
    try:
        auth_response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": input.session_id}, timeout=15,
        )
        auth_response.raise_for_status()
        profile = auth_response.json()
    except requests.RequestException as exc:
        logger.warning("Emergent auth exchange failed: %s", exc)
        raise HTTPException(status_code=401, detail="Google sign-in could not be completed") from exc
    email = profile.get("email", "").strip().lower()
    if not email or not profile.get("id") or not profile.get("session_token"):
        raise HTTPException(status_code=401, detail="Incomplete Google profile")
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    user_id = existing.get("user_id") if existing else f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id, "email": email, "name": profile.get("name", "DU SOL Guest"),
        "picture": profile.get("picture", ""), "is_admin": _is_admin(email),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.update_one({"user_id": user_id}, {"$set": user_doc}, upsert=True)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({"user_id": user_id, "session_token": profile["session_token"], "expires_at": expires_at.isoformat(), "created_at": datetime.now(timezone.utc).isoformat()})
    response = JSONResponse(content=User(**user_doc).model_dump())
    response.set_cookie("session_token", profile["session_token"], max_age=604800, httponly=True, secure=True, samesite="none", path="/")
    return response

@api_router.get("/auth/me", response_model=User)
async def auth_me(request: Request):
    return await current_user(request)

@api_router.post("/auth/logout")
async def auth_logout(request: Request):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response = JSONResponse(content={"ok": True})
    response.delete_cookie("session_token", path="/")
    return response

@api_router.post("/bookings", response_model=Booking)
async def create_booking(input: BookingCreate, request: Request):
    user = await current_user(request)
    booking_data = input.model_dump()
    booking_data.update({"email": user["email"], "user_id": user["user_id"], "profile_picture": user.get("picture", "")})
    booking = Booking(
        booking_id=f"SOL26-{uuid.uuid4().hex[:6].upper()}",
        **booking_data,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    await db.bookings.insert_one(booking.model_dump())
    return booking

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(request: Request):
    await current_user(request, admin_only=True)
    return await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.post("/interests", response_model=Interest)
async def create_interest(input: InterestCreate):
    interest = Interest(
        interest_id=f"GROUP-{uuid.uuid4().hex[:6].upper()}",
        **input.model_dump(),
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    await db.interests.insert_one(interest.model_dump())
    return interest

@api_router.get("/interests", response_model=List[Interest])
async def get_interests(request: Request):
    await current_user(request, admin_only=True)
    return await db.interests.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[origin for origin in os.environ.get('CORS_ORIGINS', '*').split(',') if origin != '*'],
    allow_origin_regex=r"https://.*",
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()