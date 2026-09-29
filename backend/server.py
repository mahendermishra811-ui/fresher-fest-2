from fastapi import FastAPI, APIRouter, HTTPException, Request, File, UploadFile, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
import asyncio
from datetime import datetime, timedelta, timezone
import requests


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "du-sol-freshers-2026"
storage_key = None


def _init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def _put_object(path: str, data: bytes, content_type: str) -> dict:
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": _init_storage(), "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": _init_storage(force=True), "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def _get_object(path: str):
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": _init_storage()}, timeout=60)
    if resp.status_code == 404:
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": _init_storage(force=True)}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
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
    payment_screenshot: Optional[str] = ""
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
    payment_screenshot: str = ""
    notes: str = ""
    status: str = "pending_review"
    created_at: str
    user_id: str = ""
    profile_picture: str = ""


class BookingStatusUpdate(BaseModel):
    status: str


class InterestCreate(BaseModel):
    name: str
    phone: str
    notes: Optional[str] = ""


class Interest(InterestCreate):
    interest_id: str
    created_at: str


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
        def fetch_session_data():
            return requests.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": input.session_id}, timeout=15,
            )
        auth_response = await asyncio.to_thread(fetch_session_data)
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


ALLOWED_IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


@api_router.post("/uploads/payment-screenshot")
async def upload_payment_screenshot(request: Request, file: UploadFile = File(...)):
    user = await current_user(request)
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG or WEBP images are allowed")
    data = await file.read()
    if not data or len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image must be under 8 MB")
    path = f"{APP_NAME}/payments/{user['user_id']}/{uuid.uuid4().hex}.{ALLOWED_IMAGE_TYPES[file.content_type]}"
    result = await asyncio.to_thread(_put_object, path, data, file.content_type)
    await db.files.insert_one({
        "storage_path": result["path"], "user_id": user["user_id"],
        "original_filename": file.filename or "screenshot", "content_type": file.content_type,
        "size": result["size"], "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"]}


@api_router.get("/files/{path:path}")
async def download_file(path: str, request: Request):
    user = await current_user(request)
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    if not user.get("is_admin") and record.get("user_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    data, content_type = await asyncio.to_thread(_get_object, path)
    return Response(content=data, media_type=record.get("content_type", content_type))


@api_router.post("/bookings", response_model=Booking)
async def create_booking(input: BookingCreate, request: Request):
    user = await current_user(request)
    booking_data = input.model_dump()
    if booking_data.get("payment_screenshot"):
        record = await db.files.find_one({"storage_path": booking_data["payment_screenshot"], "user_id": user["user_id"], "is_deleted": False})
        if not record:
            raise HTTPException(status_code=400, detail="Invalid payment screenshot")
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


@api_router.patch("/bookings/{booking_id}", response_model=Booking)
async def update_booking_status(booking_id: str, input: BookingStatusUpdate, request: Request):
    await current_user(request, admin_only=True)
    if input.status not in {"pending_review", "confirmed", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    result = await db.bookings.find_one_and_update(
        {"booking_id": booking_id}, {"$set": {"status": input.status}},
        return_document=ReturnDocument.AFTER, projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Booking not found")
    return result


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
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[origin for origin in os.environ.get('CORS_ORIGINS', '*').split(',') if origin != '*'],
    allow_origin_regex=r"https://.*",
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    try:
        await asyncio.to_thread(_init_storage)
        logger.info("Object storage initialized")
    except Exception as exc:
        logger.error("Storage init failed: %s", exc)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
