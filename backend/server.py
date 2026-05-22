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
from bson import ObjectId

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
    rw: str
    rt: str
    language: str = "id"  # id or en

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    nama: str
    alamat: str
    rw: str
    rt: str
    role: str
    mode: str
    language: str
    location: Optional[dict] = None
    created_at: str

class UserUpdate(BaseModel):
    nama: Optional[str] = None
    alamat: Optional[str] = None
    rw: Optional[str] = None
    rt: Optional[str] = None
    language: Optional[str] = None
    mode: Optional[str] = None
    location: Optional[dict] = None

class EmergencyAlert(BaseModel):
    type: str  # sos, medis, kriminal, kebakaran
    location: dict
    alamat: str
    rw: str
    rt: str
    mode: str
    description: Optional[str] = None

class EmergencyResponse(BaseModel):
    id: str
    user_id: str
    user_nama: str
    type: str
    location: dict
    alamat: str
    rw: str
    rt: str
    mode: str
    description: Optional[str] = None
    status: str
    created_at: str
    routing_info: List[str]

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

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = {
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "nama": user_data.nama,
        "alamat": user_data.alamat,
        "rw": user_data.rw,
        "rt": user_data.rt,
        "role": "warga",  # default role
        "mode": "rumah",  # di_rumah or pergi
        "language": user_data.language,
        "location": None,
        "created_at": datetime.utcnow().isoformat(),
    }
    
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user_data.email,
            "nama": user_data.nama,
            "alamat": user_data.alamat,
            "rw": user_data.rw,
            "rt": user_data.rt,
            "role": "warga",
            "mode": "rumah",
            "language": user_data.language,
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    # Find user
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create access token
    user_id = str(user["_id"])
    access_token = create_access_token(data={"sub": user_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user["email"],
            "nama": user["nama"],
            "alamat": user["alamat"],
            "rw": user["rw"],
            "rt": user["rt"],
            "role": user["role"],
            "mode": user["mode"],
            "language": user.get("language", "id"),
            "location": user.get("location"),
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "email": current_user["email"],
        "nama": current_user["nama"],
        "alamat": current_user["alamat"],
        "rw": current_user["rw"],
        "rt": current_user["rt"],
        "role": current_user["role"],
        "mode": current_user["mode"],
        "language": current_user.get("language", "id"),
        "location": current_user.get("location"),
    }

# ==================== USER ROUTES ====================

@api_router.put("/users/profile")
async def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    
    if update_dict:
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": update_dict}
        )
    
    updated_user = await db.users.find_one({"_id": current_user["_id"]})
    
    return {
        "id": str(updated_user["_id"]),
        "email": updated_user["email"],
        "nama": updated_user["nama"],
        "alamat": updated_user["alamat"],
        "rw": updated_user["rw"],
        "rt": updated_user["rt"],
        "role": updated_user["role"],
        "mode": updated_user["mode"],
        "language": updated_user.get("language", "id"),
        "location": updated_user.get("location"),
    }

# ==================== EMERGENCY ROUTES ====================

@api_router.post("/emergency/alert")
async def create_emergency_alert(alert: EmergencyAlert, current_user: dict = Depends(get_current_user)):
    # Create routing info based on mode and RW
    routing_info = []
    if alert.mode == "rumah":
        routing_info = [
            f"Semua warga RW {alert.rw}",
            f"Ketua RW {alert.rw} — koordinator respons",
            f"Penjaga Patroli — siaga area RW {alert.rw}",
            "Ketua Kelurahan — eskalasi otomatis"
        ]
    else:
        routing_info = [
            "Kontak darurat pribadi",
            f"Ketua RW {alert.rw}",
            "Pusat Kendali Kelurahan"
        ]
    
    alert_dict = {
        "user_id": str(current_user["_id"]),
        "user_nama": current_user["nama"],
        "type": alert.type,
        "location": alert.location,
        "alamat": alert.alamat,
        "rw": alert.rw,
        "rt": alert.rt,
        "mode": alert.mode,
        "description": alert.description,
        "status": "active",
        "routing_info": routing_info,
        "created_at": datetime.utcnow().isoformat(),
    }
    
    result = await db.emergency_alerts.insert_one(alert_dict)
    alert_id = str(result.inserted_id)
    
    return {
        "id": alert_id,
        "message": "Emergency alert created successfully",
        "routing_info": routing_info,
    }

@api_router.get("/emergency/history")
async def get_emergency_history(current_user: dict = Depends(get_current_user)):
    alerts = await db.emergency_alerts.find(
        {"user_id": str(current_user["_id"])}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return [
        {
            "id": str(alert["_id"]),
            "type": alert["type"],
            "alamat": alert["alamat"],
            "rw": alert["rw"],
            "rt": alert["rt"],
            "mode": alert["mode"],
            "status": alert["status"],
            "created_at": alert["created_at"],
        }
        for alert in alerts
    ]

@api_router.get("/emergency/active")
async def get_active_alerts(current_user: dict = Depends(get_current_user)):
    # Get active alerts for the user's RW
    alerts = await db.emergency_alerts.find(
        {
            "rw": current_user["rw"],
            "status": "active"
        }
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return [
        {
            "id": str(alert["_id"]),
            "user_nama": alert["user_nama"],
            "type": alert["type"],
            "alamat": alert["alamat"],
            "rt": alert["rt"],
            "created_at": alert["created_at"],
        }
        for alert in alerts
    ]

# ==================== WEATHER ROUTES (MOCK DATA) ====================

@api_router.get("/weather/current")
async def get_current_weather():
    # Mock weather data
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
    # Mock 5-day forecast
    days = ["Sen", "Sel", "Rab", "Kam", "Jum"]
    days_en = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    temps = [29, 27, 28, 30, 28]
    icons = ["sun", "cloud-rain", "cloud", "sun", "cloud"]
    
    return [
        {
            "day": days[i],
            "day_en": days_en[i],
            "temp": temps[i],
            "icon": icons[i],
        }
        for i in range(5)
    ]

@api_router.get("/weather/recommendations")
async def get_weather_recommendations():
    # Get current weather for recommendations
    weather = await get_current_weather()
    
    # Calculate recommendations
    sunscreen = {
        "needed": weather["uv_index"] >= 6,
        "level": "Wajib SPF 30+" if weather["uv_index"] >= 6 else "Opsional",
        "level_en": "Required SPF 30+" if weather["uv_index"] >= 6 else "Optional",
    }
    
    payung = {
        "needed": weather["rain_chance"] >= 30,
        "level": "Bawa cadangan" if weather["rain_chance"] >= 30 else "Tidak perlu",
        "level_en": "Bring umbrella" if weather["rain_chance"] >= 30 else "Not needed",
    }
    
    masker = {
        "needed": weather["aqi"] >= 100,
        "level": "Wajib" if weather["aqi"] >= 150 else "Disarankan" if weather["aqi"] >= 50 else "Tidak perlu",
        "level_en": "Required" if weather["aqi"] >= 150 else "Recommended" if weather["aqi"] >= 50 else "Not needed",
    }
    
    return {
        "sunscreen": sunscreen,
        "payung": payung,
        "masker": masker,
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
