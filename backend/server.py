from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
import httpx
from bson import ObjectId
from bson.errors import InvalidId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'siskamling-secret-key-change-in-production')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Create the main app
app = FastAPI(title="Siskamling API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    nama: str
    alamat: str
    kelurahan: str = "Sukamaju"
    rw: str
    rt: str
    role: str = "warga"  # warga | koordinator_rw | koordinator_kelurahan
    language: str = "id"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    nama: Optional[str] = None
    alamat: Optional[str] = None
    kelurahan: Optional[str] = None
    rw: Optional[str] = None
    rt: Optional[str] = None
    language: Optional[str] = None
    mode: Optional[str] = None
    location: Optional[dict] = None

class EmergencyAlert(BaseModel):
    type: str
    location: dict
    alamat: str
    rw: str
    rt: str
    mode: str
    description: Optional[str] = None

class ChatMessage(BaseModel):
    room_id: str
    text: str

class DisasterReport(BaseModel):
    type: str  # banjir | longsor | gempa | kebakaran | lainnya
    description: str
    location: dict  # {lat, lng}
    alamat: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def user_to_dict(user) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "nama": user["nama"],
        "alamat": user["alamat"],
        "kelurahan": user.get("kelurahan", "Sukamaju"),
        "rw": user["rw"],
        "rt": user["rt"],
        "role": user.get("role", "warga"),
        "mode": user["mode"],
        "language": user.get("language", "id"),
        "location": user.get("location"),
    }

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except InvalidId:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = {
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "nama": user_data.nama,
        "alamat": user_data.alamat,
        "kelurahan": user_data.kelurahan,
        "rw": user_data.rw,
        "rt": user_data.rt,
        "role": user_data.role,
        "mode": "rumah",
        "language": user_data.language,
        "location": None,
        "created_at": datetime.utcnow().isoformat(),
    }
    
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    access_token = create_access_token(data={"sub": user_id})
    
    user_dict["_id"] = result.inserted_id
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_to_dict(user_dict),
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    access_token = create_access_token(data={"sub": user_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_to_dict(user),
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_to_dict(current_user)

# ==================== USER ROUTES ====================

@api_router.put("/users/profile")
async def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if update_dict:
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": update_dict})
    updated_user = await db.users.find_one({"_id": current_user["_id"]})
    return user_to_dict(updated_user)

@api_router.get("/users/members")
async def get_members(current_user: dict = Depends(get_current_user)):
    """List members in the same RW"""
    members = await db.users.find(
        {"rw": current_user["rw"], "kelurahan": current_user.get("kelurahan", "Sukamaju")}
    ).to_list(200)
    
    return [
        {
            "id": str(m["_id"]),
            "nama": m["nama"],
            "alamat": m["alamat"],
            "rt": m["rt"],
            "role": m.get("role", "warga"),
            "mode": m.get("mode", "rumah"),
            "is_me": str(m["_id"]) == str(current_user["_id"]),
        }
        for m in members
    ]

# ==================== EMERGENCY ROUTES ====================

@api_router.post("/emergency/alert")
async def create_emergency_alert(alert: EmergencyAlert, current_user: dict = Depends(get_current_user)):
    # Build routing - includes RW residents + RW coordinators + Kelurahan coordinator
    kelurahan = current_user.get("kelurahan", "Sukamaju")
    
    # Count target audience
    warga_count = await db.users.count_documents({"rw": alert.rw, "kelurahan": kelurahan})
    rw_coord_count = await db.users.count_documents({
        "kelurahan": kelurahan,
        "role": "koordinator_rw"
    })
    kel_coord_count = await db.users.count_documents({
        "kelurahan": kelurahan,
        "role": "koordinator_kelurahan"
    })
    
    routing_info = [
        f"Semua warga RW {alert.rw} ({warga_count} anggota)",
        f"Koordinator RW se-Kelurahan {kelurahan} ({rw_coord_count} koordinator)",
        f"Koordinator Kelurahan {kelurahan} ({kel_coord_count} koordinator)",
        "Lokasi GPS LIVE dikirim bersama notifikasi"
    ]
    
    alert_dict = {
        "user_id": str(current_user["_id"]),
        "user_nama": current_user["nama"],
        "type": alert.type,
        "location": alert.location,  # LIVE GPS coordinates
        "alamat": alert.alamat,
        "kelurahan": kelurahan,
        "rw": alert.rw,
        "rt": alert.rt,
        "mode": alert.mode,
        "description": alert.description,
        "status": "active",
        "routing_info": routing_info,
        "created_at": datetime.utcnow().isoformat(),
    }
    
    result = await db.emergency_alerts.insert_one(alert_dict)
    return {
        "id": str(result.inserted_id),
        "message": "Emergency alert created with live location",
        "routing_info": routing_info,
        "location": alert.location,
    }

@api_router.get("/emergency/history")
async def get_emergency_history(current_user: dict = Depends(get_current_user)):
    alerts = await db.emergency_alerts.find(
        {"user_id": str(current_user["_id"])}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return [
        {
            "id": str(a["_id"]),
            "type": a["type"],
            "alamat": a["alamat"],
            "rw": a["rw"],
            "rt": a["rt"],
            "mode": a["mode"],
            "status": a["status"],
            "location": a.get("location"),
            "created_at": a["created_at"],
        }
        for a in alerts
    ]

@api_router.get("/emergency/active")
async def get_active_alerts(current_user: dict = Depends(get_current_user)):
    alerts = await db.emergency_alerts.find(
        {"kelurahan": current_user.get("kelurahan", "Sukamaju"), "status": "active"}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return [
        {
            "id": str(a["_id"]),
            "user_nama": a["user_nama"],
            "type": a["type"],
            "alamat": a["alamat"],
            "rw": a["rw"],
            "rt": a["rt"],
            "location": a.get("location"),
            "created_at": a["created_at"],
        }
        for a in alerts
    ]

# ==================== WEATHER ROUTES (MOCK) ====================

@api_router.get("/weather/current")
async def get_current_weather():
    return {
        "temp": 28,
        "feels_like": 31,
        "condition": "Cerah berawan",
        "condition_en": "Partly cloudy",
        "icon": "sun",
        "humidity": 72,
        "wind_speed": 18,
        "visibility": 8,
        "uv_index": 7,
        "uv_level": "Tinggi",
        "uv_level_en": "High",
        "rain_chance": 20,
        "aqi": 87,
        "aqi_level": "Sedang",
        "aqi_level_en": "Moderate",
        "location": "Kel. Sukamaju, Bandung",
        "updated_at": datetime.utcnow().isoformat(),
    }

@api_router.get("/weather/forecast")
async def get_weather_forecast():
    days = ["Sen", "Sel", "Rab", "Kam", "Jum"]
    days_en = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    temps = [29, 27, 28, 30, 28]
    icons = ["sun", "cloud-rain", "cloud", "sun", "cloud"]
    return [
        {"day": days[i], "day_en": days_en[i], "temp": temps[i], "icon": icons[i]}
        for i in range(5)
    ]

@api_router.get("/weather/recommendations")
async def get_weather_recommendations():
    weather = await get_current_weather()
    return {
        "sunscreen": {
            "needed": weather["uv_index"] >= 6,
            "level": "Wajib SPF 30+" if weather["uv_index"] >= 6 else "Opsional",
            "level_en": "Required SPF 30+" if weather["uv_index"] >= 6 else "Optional",
        },
        "payung": {
            "needed": weather["rain_chance"] >= 30,
            "level": "Bawa cadangan" if weather["rain_chance"] >= 30 else "Tidak perlu",
            "level_en": "Bring umbrella" if weather["rain_chance"] >= 30 else "Not needed",
        },
        "masker": {
            "needed": weather["aqi"] >= 100,
            "level": "Wajib" if weather["aqi"] >= 150 else "Disarankan" if weather["aqi"] >= 50 else "Tidak perlu",
            "level_en": "Required" if weather["aqi"] >= 150 else "Recommended" if weather["aqi"] >= 50 else "Not needed",
        },
    }

# ==================== BENCANA (DISASTER) ROUTES ====================

@api_router.get("/bencana/earthquakes")
async def get_earthquakes():
    """Proxy to BMKG API for latest earthquakes"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client_http:
            # Latest earthquake
            r_latest = await client_http.get("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json")
            # Recent felt earthquakes
            r_felt = await client_http.get("https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json")
            
            latest_data = r_latest.json() if r_latest.status_code == 200 else None
            felt_data = r_felt.json() if r_felt.status_code == 200 else None
            
            return {
                "latest": latest_data.get("Infogempa", {}).get("gempa") if latest_data else None,
                "recent_felt": felt_data.get("Infogempa", {}).get("gempa", []) if felt_data else [],
            }
    except Exception as e:
        logger.error(f"BMKG API error: {e}")
        # Fallback mock data
        return {
            "latest": {
                "Tanggal": datetime.utcnow().strftime("%d %b %Y"),
                "Jam": datetime.utcnow().strftime("%H:%M:%S WIB"),
                "Magnitude": "4.2",
                "Kedalaman": "10 km",
                "Wilayah": "47 km Barat Laut Bandung",
                "Lintang": "-6.5 LS",
                "Bujur": "107.5 BT",
                "Potensi": "Tidak berpotensi tsunami",
            },
            "recent_felt": [],
        }

@api_router.get("/bencana/status")
async def get_bencana_status():
    """Disaster threat levels per type"""
    return [
        {"type": "gempa", "name": "Gempa Bumi", "name_en": "Earthquake", "status": "waspada", "icon": "pulse"},
        {"type": "tsunami", "name": "Tsunami", "name_en": "Tsunami", "status": "aman", "icon": "water"},
        {"type": "gunung", "name": "Gunung Meletus", "name_en": "Volcano", "status": "waspada", "icon": "triangle", "detail": "G. Tangkuban Perahu"},
        {"type": "longsor", "name": "Tanah Longsor", "name_en": "Landslide", "status": "siaga", "icon": "trending-down", "detail": "Curah hujan tinggi"},
        {"type": "banjir", "name": "Banjir", "name_en": "Flood", "status": "waspada", "icon": "rainy", "detail": "DAS Cikapundung"},
        {"type": "angin", "name": "Angin Kencang", "name_en": "Strong Wind", "status": "aman", "icon": "leaf"},
    ]

@api_router.post("/bencana/reports")
async def create_disaster_report(report: DisasterReport, current_user: dict = Depends(get_current_user)):
    report_dict = {
        "user_id": str(current_user["_id"]),
        "user_nama": current_user["nama"],
        "type": report.type,
        "description": report.description,
        "location": report.location,
        "alamat": report.alamat,
        "kelurahan": current_user.get("kelurahan", "Sukamaju"),
        "rw": current_user["rw"],
        "rt": current_user["rt"],
        "created_at": datetime.utcnow().isoformat(),
        "status": "active",
    }
    result = await db.disaster_reports.insert_one(report_dict)
    return {"id": str(result.inserted_id), "message": "Disaster report submitted"}

@api_router.get("/bencana/reports")
async def get_disaster_reports(current_user: dict = Depends(get_current_user)):
    reports = await db.disaster_reports.find(
        {"kelurahan": current_user.get("kelurahan", "Sukamaju"), "status": "active"}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    return [
        {
            "id": str(r["_id"]),
            "user_nama": r["user_nama"],
            "type": r["type"],
            "description": r["description"],
            "location": r["location"],
            "alamat": r["alamat"],
            "rw": r["rw"],
            "rt": r["rt"],
            "created_at": r["created_at"],
        }
        for r in reports
    ]

# ==================== CHAT ROUTES ====================

def get_accessible_rooms(user: dict) -> List[dict]:
    """Determine which chat rooms user can access based on role"""
    role = user.get("role", "warga")
    kelurahan = user.get("kelurahan", "Sukamaju")
    rw = user["rw"]
    
    rooms = []
    
    # All users get RW group
    rooms.append({
        "id": f"warga_rw_{kelurahan}_{rw}",
        "name": f"Warga RW {rw}",
        "name_en": f"RW {rw} Residents",
        "description": f"Chat warga RW {rw} {kelurahan}",
        "level": "rw",
        "level_label": "RW",
    })
    
    # Coordinators get RW coordinator group
    if role in ["koordinator_rw", "koordinator_kelurahan"]:
        rooms.append({
            "id": f"koord_rw_{kelurahan}",
            "name": f"Koordinator RW {kelurahan}",
            "name_en": f"RW Coordinators {kelurahan}",
            "description": "Grup koordinator RW se-Kelurahan",
            "level": "koord_rw",
            "level_label": "KOORD",
        })
    
    # Kelurahan coordinators get top-level group
    if role == "koordinator_kelurahan":
        rooms.append({
            "id": f"koord_kel_{kelurahan}",
            "name": f"Koordinator Kelurahan",
            "name_en": "Kelurahan Coordinators",
            "description": f"Grup koordinator Kelurahan {kelurahan}",
            "level": "koord_kel",
            "level_label": "PUSAT",
        })
    
    return rooms

@api_router.get("/chat/rooms")
async def get_chat_rooms(current_user: dict = Depends(get_current_user)):
    return get_accessible_rooms(current_user)

@api_router.get("/chat/messages/{room_id}")
async def get_chat_messages(room_id: str, current_user: dict = Depends(get_current_user)):
    # Verify user has access to this room
    accessible_rooms = get_accessible_rooms(current_user)
    if not any(r["id"] == room_id for r in accessible_rooms):
        raise HTTPException(status_code=403, detail="No access to this room")
    
    messages = await db.chat_messages.find(
        {"room_id": room_id}
    ).sort("created_at", 1).limit(100).to_list(100)
    
    return [
        {
            "id": str(m["_id"]),
            "user_id": m["user_id"],
            "user_nama": m["user_nama"],
            "user_role": m.get("user_role", "warga"),
            "text": m["text"],
            "created_at": m["created_at"],
            "is_me": m["user_id"] == str(current_user["_id"]),
        }
        for m in messages
    ]

@api_router.post("/chat/messages")
async def send_chat_message(message: ChatMessage, current_user: dict = Depends(get_current_user)):
    # Verify access
    accessible_rooms = get_accessible_rooms(current_user)
    if not any(r["id"] == message.room_id for r in accessible_rooms):
        raise HTTPException(status_code=403, detail="No access to this room")
    
    msg_dict = {
        "room_id": message.room_id,
        "user_id": str(current_user["_id"]),
        "user_nama": current_user["nama"],
        "user_role": current_user.get("role", "warga"),
        "text": message.text,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await db.chat_messages.insert_one(msg_dict)
    return {
        "id": str(result.inserted_id),
        "user_nama": current_user["nama"],
        "user_role": current_user.get("role", "warga"),
        "text": message.text,
        "created_at": msg_dict["created_at"],
        "is_me": True,
    }

# ==================== INCLUDE ROUTER ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
