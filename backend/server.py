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
import csv
import io
from twilio.rest import Client as TwilioClient


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
    referral_code: str = ""


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
    referred_by: Optional[str] = ""


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
    pass_token: str = ""
    checked_in_at: str = ""
    referred_by: str = ""
    reminder_sent_at: str = ""


class PassView(BaseModel):
    booking_id: str
    name: str
    pass_type: str
    pass_variant: str
    quantity: int
    status: str
    checked_in_at: str = ""
    phone: str = ""
    payment_reference: str = ""
    amount: int = 0
    email: str = ""
    can_check_in: bool = False
    venue_address: str = ""


class BookingStatusUpdate(BaseModel):
    status: str


IST = timezone(timedelta(hours=5, minutes=30))
EVENT_YEAR = 2026
PASS_TIERS = {
    "Early Bird Passes": {"start": (1, 1), "end": (10, 5), "single": 1299, "couple": 2199},
    "Not Late Passes": {"start": (10, 6), "end": (10, 20), "single": 1499, "couple": 2599},
    "Last Minute Arrivals": {"start": (10, 21), "end": (10, 25), "single": 1999, "couple": 2999},
}


def validate_pass_selection(pass_type: str, pass_variant: str, amount: int, quantity: int):
    tier = PASS_TIERS.get(pass_type)
    if not tier:
        raise HTTPException(status_code=400, detail="Unknown pass type")
    if pass_variant not in ("single", "couple"):
        raise HTTPException(status_code=400, detail="Pass must be single or couple")
    today = datetime.now(IST).date()
    start = datetime(EVENT_YEAR, *tier["start"], tzinfo=IST).date()
    end = datetime(EVENT_YEAR, *tier["end"], tzinfo=IST).date()
    if today < start:
        raise HTTPException(status_code=400, detail=f"{pass_type} open on {start.strftime('%d %B')}. Please pick the pass that is selling now.")
    if today > end:
        raise HTTPException(status_code=400, detail=f"{pass_type} closed on {end.strftime('%d %B')}. Please pick the pass that is selling now.")
    expected_qty = 2 if pass_variant == "couple" else 1
    if amount != tier[pass_variant] or quantity != expected_qty:
        raise HTTPException(status_code=400, detail="Pass price has changed — please refresh and try again")


class InterestCreate(BaseModel):
    name: str
    phone: str
    notes: Optional[str] = ""


class Interest(InterestCreate):
    interest_id: str
    created_at: str


DEFAULT_SETTINGS = {"upi_id": "7065319679@fam", "whatsapp_number": "917065319679", "venue_address": "Punjabi Bagh, New Delhi (exact venue pin shared here)"}


class SettingsUpdate(BaseModel):
    upi_id: str = Field(min_length=3, max_length=80)
    whatsapp_number: str = Field(min_length=10, max_length=15)
    venue_address: str = Field(default=DEFAULT_SETTINGS["venue_address"], max_length=300)


class Settings(SettingsUpdate):
    alerts_configured: bool = False
    last_alert: str = ""


async def get_settings_doc() -> dict:
    doc = await db.settings.find_one({"key": "site"}, {"_id": 0}) or {}
    return {**DEFAULT_SETTINGS, **doc}


def _twilio_config():
    sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    sender = os.environ.get("TWILIO_WHATSAPP_FROM", "").strip()
    return (sid, token, sender) if sid and token and sender else None


async def send_booking_alert(booking: "Booking"):
    config = _twilio_config()
    if not config:
        return
    settings = await get_settings_doc()
    to_number = settings["whatsapp_number"].lstrip("+")
    body = (
        f"New Solstice '26 booking {booking.booking_id}\n"
        f"{booking.name} · {booking.phone}\n"
        f"{booking.pass_type} ({booking.pass_variant} x{booking.quantity}) · ₹{booking.amount}\n"
        f"UPI ref: {booking.payment_reference}\n"
        f"Screenshot: {'attached' if booking.payment_screenshot else 'none'}\n"
        f"Review at /admin"
    )
    try:
        sid, token, sender = config
        await asyncio.to_thread(
            lambda: TwilioClient(sid, token).messages.create(from_=f"whatsapp:{sender}", to=f"whatsapp:+{to_number}", body=body)
        )
        status = f"sent {booking.booking_id} at {datetime.now(timezone.utc).isoformat()}"
    except Exception as exc:
        logger.warning("WhatsApp alert failed for %s: %s", booking.booking_id, exc)
        status = f"failed {booking.booking_id}: {str(exc)[:160]}"
    await db.settings.update_one({"key": "site"}, {"$set": {"last_alert": status}}, upsert=True)


def _csv_response(rows: List[dict], columns: List[str], filename: str) -> Response:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return Response(
        content=buffer.getvalue(), media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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
    referral_code = (existing or {}).get("referral_code") or f"SOL-{uuid.uuid4().hex[:5].upper()}"
    await db.users.update_one({"user_id": user_id}, {"$set": {**user_doc, "referral_code": referral_code}}, upsert=True)
    user_doc["referral_code"] = referral_code
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
    validate_pass_selection(booking_data["pass_type"], booking_data["pass_variant"], booking_data["amount"], booking_data["quantity"])
    if booking_data.get("payment_screenshot"):
        record = await db.files.find_one({"storage_path": booking_data["payment_screenshot"], "user_id": user["user_id"], "is_deleted": False})
        if not record:
            raise HTTPException(status_code=400, detail="Invalid payment screenshot")
    booking_data.update({"email": user["email"], "user_id": user["user_id"], "profile_picture": user.get("picture", "")})
    referred_by = (booking_data.get("referred_by") or "").strip().upper()
    if referred_by:
        referrer = await db.users.find_one({"referral_code": referred_by}, {"_id": 0, "user_id": 1})
        referred_by = referred_by if referrer and referrer["user_id"] != user["user_id"] else ""
    booking_data["referred_by"] = referred_by
    booking = Booking(
        booking_id=f"SOL26-{uuid.uuid4().hex[:6].upper()}",
        **booking_data,
        created_at=datetime.now(timezone.utc).isoformat(),
        pass_token=uuid.uuid4().hex,
    )
    await db.bookings.insert_one(booking.model_dump())
    asyncio.create_task(send_booking_alert(booking))
    return booking


@api_router.get("/bookings/mine", response_model=List[Booking])
async def get_my_bookings(request: Request):
    user = await current_user(request)
    return await db.bookings.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(request: Request):
    await current_user(request, admin_only=True)
    return await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


BOOKING_CSV_COLUMNS = ["booking_id", "created_at", "status", "checked_in_at", "reminder_sent_at", "referred_by", "name", "phone", "email", "pass_type", "pass_variant", "quantity", "amount", "payment_reference", "payment_screenshot", "notes"]
INTEREST_CSV_COLUMNS = ["interest_id", "created_at", "name", "phone", "notes"]


@api_router.get("/bookings/export")
async def export_bookings(request: Request):
    await current_user(request, admin_only=True)
    rows = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return _csv_response(rows, BOOKING_CSV_COLUMNS, "solstice26-bookings.csv")


@api_router.get("/interests/export")
async def export_interests(request: Request):
    await current_user(request, admin_only=True)
    rows = await db.interests.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return _csv_response(rows, INTEREST_CSV_COLUMNS, "solstice26-group-interests.csv")


async def _optional_admin(request: Request) -> bool:
    try:
        user = await current_user(request)
    except HTTPException:
        return False
    return bool(user.get("is_admin"))


@api_router.get("/pass/{pass_token}", response_model=PassView)
async def view_pass(pass_token: str, request: Request):
    booking = await db.bookings.find_one({"pass_token": pass_token}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Pass not found")
    is_admin = await _optional_admin(request)
    public = {k: booking.get(k, "") for k in ("booking_id", "name", "pass_type", "pass_variant", "quantity", "status", "checked_in_at")}
    if booking["status"] == "confirmed":
        public["venue_address"] = (await get_settings_doc())["venue_address"]
    if is_admin:
        public.update({k: booking.get(k, "") for k in ("phone", "payment_reference", "amount", "email")})
        public["can_check_in"] = booking["status"] == "confirmed" and not booking.get("checked_in_at")
    return PassView(**public)


@api_router.post("/pass/{pass_token}/checkin", response_model=PassView)
async def check_in_pass(pass_token: str, request: Request):
    await current_user(request, admin_only=True)
    booking = await db.bookings.find_one({"pass_token": pass_token}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Pass not found")
    if booking["status"] != "confirmed":
        raise HTTPException(status_code=400, detail="Only confirmed passes can be checked in")
    if booking.get("checked_in_at"):
        raise HTTPException(status_code=400, detail=f"Already checked in at {booking['checked_in_at']}")
    now = datetime.now(timezone.utc).isoformat()
    await db.bookings.update_one({"pass_token": pass_token}, {"$set": {"checked_in_at": now}})
    return await view_pass(pass_token, request)


@api_router.post("/bookings/{booking_id}/checkin", response_model=PassView)
async def check_in_by_reference(booking_id: str, request: Request):
    booking = await db.bookings.find_one({"booking_id": booking_id.strip().upper()}, {"_id": 0, "pass_token": 1})
    if not booking:
        raise HTTPException(status_code=404, detail="No booking with that reference")
    return await check_in_pass(booking["pass_token"], request)


@api_router.post("/bookings/{booking_id}/reminder-sent", response_model=Booking)
async def mark_reminder_sent(booking_id: str, request: Request):
    await current_user(request, admin_only=True)
    result = await db.bookings.find_one_and_update(
        {"booking_id": booking_id}, {"$set": {"reminder_sent_at": datetime.now(timezone.utc).isoformat()}},
        return_document=ReturnDocument.AFTER, projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Booking not found")
    return result


class ReferralStat(BaseModel):
    referral_code: str
    name: str = ""
    email: str = ""
    bookings: int
    guests: int


async def _referral_stats(referred_by: Optional[str] = None) -> List[dict]:
    pipeline = [
        {"$match": {"referred_by": referred_by if referred_by else {"$ne": ""}, "status": {"$ne": "rejected"}}},
        {"$group": {"_id": "$referred_by", "bookings": {"$sum": 1}, "guests": {"$sum": "$quantity"}}},
        {"$sort": {"guests": -1, "bookings": -1}},
    ]
    rows = await db.bookings.aggregate(pipeline).to_list(500)
    codes = [row["_id"] for row in rows]
    users = {u["referral_code"]: u for u in await db.users.find({"referral_code": {"$in": codes}}, {"_id": 0}).to_list(500)}
    return [
        {"referral_code": row["_id"], "name": users.get(row["_id"], {}).get("name", ""), "email": users.get(row["_id"], {}).get("email", ""), "bookings": row["bookings"], "guests": row["guests"]}
        for row in rows
    ]


@api_router.get("/referrals", response_model=List[ReferralStat])
async def referral_leaderboard(request: Request):
    await current_user(request, admin_only=True)
    return await _referral_stats()


@api_router.get("/referrals/mine", response_model=ReferralStat)
async def my_referrals(request: Request):
    user = await current_user(request)
    code = user.get("referral_code", "")
    stats = await _referral_stats(code) if code else []
    if stats:
        return stats[0]
    return ReferralStat(referral_code=code, name=user["name"], email=user["email"], bookings=0, guests=0)


@api_router.get("/settings")
async def get_public_settings():
    settings = await get_settings_doc()
    return {"upi_id": settings["upi_id"], "whatsapp_number": settings["whatsapp_number"]}


@api_router.get("/settings/admin", response_model=Settings)
async def get_admin_settings(request: Request):
    await current_user(request, admin_only=True)
    settings = await get_settings_doc()
    return Settings(**settings, alerts_configured=_twilio_config() is not None)


@api_router.put("/settings", response_model=Settings)
async def update_settings(input: SettingsUpdate, request: Request):
    await current_user(request, admin_only=True)
    whatsapp = "".join(ch for ch in input.whatsapp_number if ch.isdigit())
    if len(whatsapp) < 10 or "@" not in input.upi_id:
        raise HTTPException(status_code=400, detail="Enter a valid UPI ID (name@bank) and WhatsApp number with country code")
    update = {"upi_id": input.upi_id.strip(), "whatsapp_number": whatsapp, "venue_address": input.venue_address.strip(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.settings.update_one({"key": "site"}, {"$set": update}, upsert=True)
    settings = await get_settings_doc()
    return Settings(**settings, alerts_configured=_twilio_config() is not None)


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
