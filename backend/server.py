from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
import bcrypt
import jwt
import httpx
from bson import ObjectId
from bson.errors import InvalidId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'siskamling-secret-key-change-in-production')
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', '')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

app = FastAPI(title="Siskamling API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    nama: str
    alamat: str
    kelurahan: str = "Sukamaju"
    rw: str
    rt: str
    role: str = "warga"
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
    type: str
    description: str
    location: dict
    alamat: str

class RoleRequest(BaseModel):
    requested_role: str  # koordinator_rt | koordinator_rw | koordinator_kelurahan
    reason: str

class ApprovalAction(BaseModel):
    user_id: str
    action: str  # approve | reject

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)})
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
        "approval_status": user.get("approval_status", "approved"),
        "mode": user["mode"],
        "language": user.get("language", "id"),
        "location": user.get("location"),
    }

def haversine_km(lat1, lon1, lat2, lon2):
    """Calculate distance between 2 GPS coords in km"""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return round(R * c, 2)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, InvalidId):
        raise HTTPException(status_code=401, detail="Invalid token")

async def create_notification(user_id: str, ntype: str, title: str, body: str, meta: dict = None):
    await db.notifications.insert_one({
        "user_id": user_id,
        "type": ntype,
        "title": title,
        "body": body,
        "meta": meta or {},
        "read": False,
        "created_at": datetime.utcnow().isoformat(),
    })

# ==================== AUTH ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    if await db.users.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # First user in this RT becomes auto-approved koordinator_rt
    existing_rt_count = await db.users.count_documents({
        "kelurahan": user_data.kelurahan, "rw": user_data.rw, "rt": user_data.rt
    })
    
    is_first = existing_rt_count == 0
    role = user_data.role
    approval_status = "approved"
    
    if is_first:
        # First in RT auto-promoted to koordinator_rt for bootstrap
        if role == "warga":
            role = "koordinator_rt"
        approval_status = "approved"
    else:
        # Subsequent users need approval from koordinator_rt
        approval_status = "pending"
    
    user_dict = {
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "nama": user_data.nama,
        "alamat": user_data.alamat,
        "kelurahan": user_data.kelurahan,
        "rw": user_data.rw,
        "rt": user_data.rt,
        "role": role,
        "approval_status": approval_status,
        "mode": "rumah",
        "language": user_data.language,
        "location": None,
        "created_at": datetime.utcnow().isoformat(),
    }
    
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    user_dict["_id"] = result.inserted_id
    
    # Notify koordinator RT of pending member
    if approval_status == "pending":
        rt_coords = await db.users.find({
            "kelurahan": user_data.kelurahan, "rw": user_data.rw, "rt": user_data.rt,
            "role": "koordinator_rt", "approval_status": "approved"
        }).to_list(10)
        for coord in rt_coords:
            await create_notification(
                str(coord["_id"]),
                "approval_request",
                f"Permintaan persetujuan anggota baru",
                f"{user_data.nama} mendaftar di RT {user_data.rt}/RW {user_data.rw}",
                {"new_user_id": user_id, "new_user_nama": user_data.nama}
            )
    
    access_token = create_access_token(data={"sub": user_id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_to_dict(user_dict),
        "is_first_in_rt": is_first,
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    return {
        "access_token": create_access_token(data={"sub": user_id}),
        "token_type": "bearer",
        "user": user_to_dict(user),
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_to_dict(current_user)

# ==================== USERS ====================

@api_router.put("/users/profile")
async def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if update_dict:
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": update_dict})
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return user_to_dict(updated)

@api_router.get("/users/members")
async def get_members(current_user: dict = Depends(get_current_user)):
    members = await db.users.find({
        "kelurahan": current_user.get("kelurahan", "Sukamaju"),
        "rw": current_user["rw"],
    }).to_list(500)
    return [
        {
            "id": str(m["_id"]),
            "nama": m["nama"],
            "alamat": m["alamat"],
            "rt": m["rt"],
            "role": m.get("role", "warga"),
            "approval_status": m.get("approval_status", "approved"),
            "mode": m.get("mode", "rumah"),
            "is_me": str(m["_id"]) == str(current_user["_id"]),
        }
        for m in members
    ]

@api_router.get("/users/pending-approvals")
async def get_pending_approvals(current_user: dict = Depends(get_current_user)):
    """Get list of users awaiting approval that current coordinator can approve"""
    role = current_user.get("role", "warga")
    query = {"approval_status": "pending", "kelurahan": current_user.get("kelurahan", "Sukamaju")}
    
    if role == "koordinator_rt":
        query["rw"] = current_user["rw"]
        query["rt"] = current_user["rt"]
    elif role == "koordinator_rw":
        query["rw"] = current_user["rw"]
        # RW coord approves new RT coords
        query["role"] = "koordinator_rt"
    elif role == "koordinator_kelurahan":
        # Kel coord approves new RW coords
        query["role"] = "koordinator_rw"
    else:
        return []
    
    pending = await db.users.find(query).to_list(100)
    return [
        {
            "id": str(p["_id"]),
            "nama": p["nama"],
            "email": p["email"],
            "alamat": p["alamat"],
            "rt": p["rt"],
            "rw": p["rw"],
            "role": p.get("role", "warga"),
            "created_at": p["created_at"],
        }
        for p in pending
    ]

@api_router.post("/users/approve")
async def approve_user(action: ApprovalAction, current_user: dict = Depends(get_current_user)):
    role = current_user.get("role", "warga")
    if role not in ["koordinator_rt", "koordinator_rw", "koordinator_kelurahan"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        target_user = await db.users.find_one({"_id": ObjectId(action.user_id)})
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user id")
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = "approved" if action.action == "approve" else "rejected"
    await db.users.update_one({"_id": ObjectId(action.user_id)}, {"$set": {"approval_status": new_status}})
    
    await create_notification(
        action.user_id,
        "approval_result",
        "Status anggota" if action.action == "approve" else "Pengajuan ditolak",
        f"Pendaftaran Anda telah {'disetujui' if action.action == 'approve' else 'ditolak'} oleh {current_user['nama']}",
        {"action": action.action}
    )
    return {"message": f"User {action.action}d", "status": new_status}

# ==================== ROLE UPGRADE REQUESTS ====================

@api_router.post("/users/request-role")
async def request_role_upgrade(req: RoleRequest, current_user: dict = Depends(get_current_user)):
    if req.requested_role not in ["koordinator_rt", "koordinator_rw", "koordinator_kelurahan"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    request_dict = {
        "user_id": str(current_user["_id"]),
        "user_nama": current_user["nama"],
        "current_role": current_user.get("role", "warga"),
        "requested_role": req.requested_role,
        "reason": req.reason,
        "kelurahan": current_user.get("kelurahan", "Sukamaju"),
        "rw": current_user["rw"],
        "rt": current_user["rt"],
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.role_requests.insert_one(request_dict)
    
    # Notify appropriate approver
    approver_role = {
        "koordinator_rt": "koordinator_rw",
        "koordinator_rw": "koordinator_kelurahan",
        "koordinator_kelurahan": "koordinator_kelurahan",
    }[req.requested_role]
    
    approvers = await db.users.find({
        "kelurahan": current_user.get("kelurahan", "Sukamaju"),
        "role": approver_role,
        "approval_status": "approved",
    }).to_list(10)
    for a in approvers:
        await create_notification(
            str(a["_id"]),
            "role_request",
            "Pengajuan jabatan baru",
            f"{current_user['nama']} mengajukan menjadi {req.requested_role.replace('koordinator_', 'Koord. ').upper()}",
            {"requester_id": str(current_user["_id"])}
        )
    
    return {"message": "Request submitted"}

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifs = await db.notifications.find({
        "user_id": str(current_user["_id"])
    }).sort("created_at", -1).limit(50).to_list(50)
    return [
        {
            "id": str(n["_id"]),
            "type": n["type"],
            "title": n["title"],
            "body": n["body"],
            "meta": n.get("meta", {}),
            "read": n.get("read", False),
            "created_at": n["created_at"],
        }
        for n in notifs
    ]

@api_router.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    try:
        await db.notifications.update_one(
            {"_id": ObjectId(notif_id), "user_id": str(current_user["_id"])},
            {"$set": {"read": True}}
        )
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid id")
    return {"message": "Marked as read"}

# ==================== EMERGENCY ====================

@api_router.post("/emergency/alert")
async def create_emergency_alert(alert: EmergencyAlert, current_user: dict = Depends(get_current_user)):
    kelurahan = current_user.get("kelurahan", "Sukamaju")
    lat = alert.location.get("lat", 0)
    lng = alert.location.get("lng", 0)
    
    # Reverse geocode to get street address (simple version using Nominatim)
    street_address = alert.alamat
    try:
        async with httpx.AsyncClient(timeout=5.0) as client_http:
            r = await client_http.get(
                f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json&zoom=18&accept-language=id",
                headers={"User-Agent": "Siskamling/1.0"}
            )
            if r.status_code == 200:
                data = r.json()
                if data.get("display_name"):
                    street_address = data["display_name"]
    except Exception as e:
        logger.warning(f"Reverse geocode failed: {e}")
    
    # Build Google Maps link
    google_maps_url = f"https://www.google.com/maps?q={lat},{lng}"
    
    warga_count = await db.users.count_documents({"rw": alert.rw, "kelurahan": kelurahan, "approval_status": "approved"})
    
    routing_info = [
        f"Semua warga RT {alert.rt}/RW {alert.rw} ({warga_count} anggota)",
        f"Koordinator RT {alert.rt}, RW {alert.rw}",
        f"Koordinator Kelurahan {kelurahan}",
        "GPS LIVE + Google Maps link dikirim",
    ]
    
    alert_dict = {
        "user_id": str(current_user["_id"]),
        "user_nama": current_user["nama"],
        "type": alert.type,
        "location": alert.location,
        "street_address": street_address,
        "google_maps_url": google_maps_url,
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
        "message": "Emergency alert sent with location details",
        "routing_info": routing_info,
        "location": alert.location,
        "street_address": street_address,
        "google_maps_url": google_maps_url,
    }

@api_router.get("/emergency/history")
async def get_emergency_history(current_user: dict = Depends(get_current_user)):
    user_loc = current_user.get("location") or {}
    user_lat = user_loc.get("lat")
    user_lng = user_loc.get("lng")
    
    alerts = await db.emergency_alerts.find({
        "user_id": str(current_user["_id"])
    }).sort("created_at", -1).limit(20).to_list(20)
    
    result = []
    for a in alerts:
        loc = a.get("location", {})
        distance = None
        if user_lat is not None and loc.get("lat") is not None:
            distance = haversine_km(user_lat, user_lng, loc["lat"], loc["lng"])
        result.append({
            "id": str(a["_id"]),
            "type": a["type"],
            "alamat": a["alamat"],
            "street_address": a.get("street_address", a["alamat"]),
            "google_maps_url": a.get("google_maps_url"),
            "rw": a["rw"],
            "rt": a["rt"],
            "mode": a["mode"],
            "status": a["status"],
            "location": loc,
            "distance_km": distance,
            "description": a.get("description"),
            "created_at": a["created_at"],
        })
    return result

@api_router.get("/emergency/active")
async def get_active_alerts(current_user: dict = Depends(get_current_user)):
    user_loc = current_user.get("location") or {}
    user_lat = user_loc.get("lat")
    user_lng = user_loc.get("lng")
    
    alerts = await db.emergency_alerts.find({
        "kelurahan": current_user.get("kelurahan", "Sukamaju"),
        "status": "active",
    }).sort("created_at", -1).limit(20).to_list(20)
    
    result = []
    for a in alerts:
        loc = a.get("location", {})
        distance = None
        if user_lat is not None and loc.get("lat") is not None:
            distance = haversine_km(user_lat, user_lng, loc["lat"], loc["lng"])
        result.append({
            "id": str(a["_id"]),
            "user_nama": a["user_nama"],
            "type": a["type"],
            "alamat": a["alamat"],
            "street_address": a.get("street_address", a["alamat"]),
            "google_maps_url": a.get("google_maps_url"),
            "rw": a["rw"],
            "rt": a["rt"],
            "location": loc,
            "distance_km": distance,
            "created_at": a["created_at"],
        })
    return result

@api_router.post("/emergency/{alert_id}/resolve")
async def resolve_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    try:
        await db.emergency_alerts.update_one(
            {"_id": ObjectId(alert_id), "user_id": str(current_user["_id"])},
            {"$set": {"status": "resolved", "resolved_at": datetime.utcnow().isoformat()}}
        )
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid id")
    return {"message": "Alert resolved"}

# ==================== WEATHER (OpenWeather Real API) ====================

# Default location: Bandung
DEFAULT_LAT, DEFAULT_LON = -6.9175, 107.6191

async def fetch_openweather(lat: float, lon: float):
    if not OPENWEATHER_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client_http:
            current_r = await client_http.get(
                f"https://api.openweathermap.org/data/2.5/weather",
                params={"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "metric", "lang": "id"}
            )
            uv_r = await client_http.get(
                f"https://api.openweathermap.org/data/2.5/uvi",
                params={"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY}
            )
            aqi_r = await client_http.get(
                f"http://api.openweathermap.org/data/2.5/air_pollution",
                params={"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY}
            )
            forecast_r = await client_http.get(
                f"https://api.openweathermap.org/data/2.5/forecast",
                params={"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "metric", "lang": "id"}
            )
            
            return {
                "current": current_r.json() if current_r.status_code == 200 else None,
                "uv": uv_r.json() if uv_r.status_code == 200 else None,
                "aqi": aqi_r.json() if aqi_r.status_code == 200 else None,
                "forecast": forecast_r.json() if forecast_r.status_code == 200 else None,
            }
    except Exception as e:
        logger.error(f"OpenWeather fetch failed: {e}")
        return None

def map_weather_icon(icon_code: str) -> str:
    """Map OpenWeather icon code to our icon name"""
    mapping = {
        "01": "sun", "02": "partly-sunny", "03": "cloud", "04": "cloud",
        "09": "cloud-rain", "10": "cloud-rain", "11": "thunderstorm",
        "13": "snow", "50": "cloud",
    }
    return mapping.get(icon_code[:2], "partly-sunny")

@api_router.get("/weather/current")
async def get_current_weather(lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON):
    data = await fetch_openweather(lat, lon)
    
    if data and data.get("current"):
        c = data["current"]
        main = c.get("main", {})
        wind = c.get("wind", {})
        weather = (c.get("weather") or [{}])[0]
        clouds = c.get("clouds", {}).get("all", 0)
        
        # AQI
        aqi_val = 0
        aqi_level = "Baik"
        aqi_level_en = "Good"
        if data.get("aqi"):
            try:
                aqi_idx = data["aqi"]["list"][0]["main"]["aqi"]
                # OpenWeather AQI is 1-5; convert to approx US AQI scale
                aqi_map = {1: 25, 2: 75, 3: 125, 4: 175, 5: 250}
                aqi_val = aqi_map.get(aqi_idx, 50)
                aqi_labels = {1: ("Baik", "Good"), 2: ("Sedang", "Moderate"), 3: ("Tidak Sehat (Sensitif)", "Unhealthy for Sensitive"), 4: ("Tidak Sehat", "Unhealthy"), 5: ("Sangat Tidak Sehat", "Very Unhealthy")}
                aqi_level, aqi_level_en = aqi_labels.get(aqi_idx, ("Baik", "Good"))
            except Exception:
                pass
        
        # UV
        uv_index = 0
        if data.get("uv"):
            uv_index = round(data["uv"].get("value", 0))
        
        if uv_index >= 8:
            uv_level, uv_level_en = "Sangat Tinggi", "Very High"
        elif uv_index >= 6:
            uv_level, uv_level_en = "Tinggi", "High"
        elif uv_index >= 3:
            uv_level, uv_level_en = "Sedang", "Moderate"
        else:
            uv_level, uv_level_en = "Rendah", "Low"
        
        # Rain probability from clouds %
        rain_chance = min(clouds, 100)
        if c.get("rain") or c.get("snow"):
            rain_chance = max(rain_chance, 60)
        
        return {
            "temp": round(main.get("temp", 0)),
            "feels_like": round(main.get("feels_like", 0)),
            "condition": weather.get("description", "").capitalize() or "Cerah",
            "condition_en": weather.get("main", "Clear"),
            "icon": map_weather_icon(weather.get("icon", "01d")),
            "humidity": main.get("humidity", 0),
            "wind_speed": round(wind.get("speed", 0) * 3.6),  # m/s to km/h
            "visibility": round(c.get("visibility", 10000) / 1000),
            "uv_index": uv_index,
            "uv_level": uv_level,
            "uv_level_en": uv_level_en,
            "rain_chance": rain_chance,
            "aqi": aqi_val,
            "aqi_level": aqi_level,
            "aqi_level_en": aqi_level_en,
            "location": c.get("name", "Bandung"),
            "lat": lat,
            "lon": lon,
            "updated_at": datetime.utcnow().isoformat(),
            "source": "openweathermap",
        }
    
    # Fallback mock
    return {
        "temp": 28, "feels_like": 31, "condition": "Cerah berawan", "condition_en": "Partly cloudy",
        "icon": "sun", "humidity": 72, "wind_speed": 18, "visibility": 8,
        "uv_index": 7, "uv_level": "Tinggi", "uv_level_en": "High",
        "rain_chance": 20, "aqi": 87, "aqi_level": "Sedang", "aqi_level_en": "Moderate",
        "location": "Bandung", "lat": lat, "lon": lon,
        "updated_at": datetime.utcnow().isoformat(), "source": "mock",
    }

@api_router.get("/weather/forecast")
async def get_weather_forecast(lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON):
    data = await fetch_openweather(lat, lon)
    
    if data and data.get("forecast"):
        forecast_list = data["forecast"].get("list", [])
        # Group by day, take noon entry
        days_dict = {}
        for entry in forecast_list:
            dt_txt = entry.get("dt_txt", "")
            if "12:00:00" in dt_txt:
                date_str = dt_txt.split(" ")[0]
                days_dict[date_str] = entry
        
        day_id = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
        day_en = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        
        result = []
        for date_str, entry in list(days_dict.items())[:5]:
            try:
                dt = datetime.fromisoformat(date_str)
                result.append({
                    "day": day_id[dt.weekday() if dt.weekday() < 6 else 6],
                    "day_en": day_en[dt.weekday() if dt.weekday() < 6 else 6],
                    "temp": round(entry["main"]["temp"]),
                    "icon": map_weather_icon((entry.get("weather") or [{}])[0].get("icon", "01d")),
                })
            except Exception:
                continue
        if result:
            return result
    
    # Fallback
    return [
        {"day": "Sen", "day_en": "Mon", "temp": 29, "icon": "sun"},
        {"day": "Sel", "day_en": "Tue", "temp": 27, "icon": "cloud-rain"},
        {"day": "Rab", "day_en": "Wed", "temp": 28, "icon": "cloud"},
        {"day": "Kam", "day_en": "Thu", "temp": 30, "icon": "sun"},
        {"day": "Jum", "day_en": "Fri", "temp": 28, "icon": "cloud"},
    ]

@api_router.get("/weather/recommendations")
async def get_weather_recommendations(lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON):
    weather = await get_current_weather(lat, lon)
    return {
        "weather_summary": {
            "temp": weather["temp"], "condition": weather["condition"],
            "condition_en": weather["condition_en"], "icon": weather["icon"],
        },
        "sunscreen": {
            "needed": weather["uv_index"] >= 6,
            "level": "Wajib SPF 30+" if weather["uv_index"] >= 6 else "Opsional",
            "level_en": "Required SPF 30+" if weather["uv_index"] >= 6 else "Optional",
            "reason": f"UV Index: {weather['uv_index']} ({weather['uv_level']})",
            "reason_en": f"UV Index: {weather['uv_index']} ({weather['uv_level_en']})",
        },
        "payung": {
            "needed": weather["rain_chance"] >= 30,
            "level": "Wajib bawa" if weather["rain_chance"] >= 60 else "Bawa cadangan" if weather["rain_chance"] >= 30 else "Tidak perlu",
            "level_en": "Must bring" if weather["rain_chance"] >= 60 else "Bring umbrella" if weather["rain_chance"] >= 30 else "Not needed",
            "reason": f"Peluang hujan: {weather['rain_chance']}%",
            "reason_en": f"Rain chance: {weather['rain_chance']}%",
        },
        "masker": {
            "needed": weather["aqi"] >= 100,
            "level": "Wajib" if weather["aqi"] >= 150 else "Disarankan" if weather["aqi"] >= 50 else "Tidak perlu",
            "level_en": "Required" if weather["aqi"] >= 150 else "Recommended" if weather["aqi"] >= 50 else "Not needed",
            "reason": f"AQI: {weather['aqi']} ({weather['aqi_level']})",
            "reason_en": f"AQI: {weather['aqi']} ({weather['aqi_level_en']})",
        },
    }

# ==================== BENCANA ====================

@api_router.get("/bencana/earthquakes")
async def get_earthquakes():
    try:
        async with httpx.AsyncClient(timeout=10.0) as client_http:
            r_latest = await client_http.get("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json")
            r_felt = await client_http.get("https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json")
            latest_data = r_latest.json() if r_latest.status_code == 200 else None
            felt_data = r_felt.json() if r_felt.status_code == 200 else None
            return {
                "latest": latest_data.get("Infogempa", {}).get("gempa") if latest_data else None,
                "recent_felt": felt_data.get("Infogempa", {}).get("gempa", []) if felt_data else [],
            }
    except Exception as e:
        logger.error(f"BMKG error: {e}")
        return {"latest": None, "recent_felt": []}

@api_router.get("/bencana/status")
async def get_bencana_status():
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
    lat = report.location.get("lat", 0)
    lng = report.location.get("lng", 0)
    google_maps_url = f"https://www.google.com/maps?q={lat},{lng}"
    
    report_dict = {
        "user_id": str(current_user["_id"]),
        "user_nama": current_user["nama"],
        "type": report.type,
        "description": report.description,
        "location": report.location,
        "google_maps_url": google_maps_url,
        "alamat": report.alamat,
        "kelurahan": current_user.get("kelurahan", "Sukamaju"),
        "rw": current_user["rw"],
        "rt": current_user["rt"],
        "created_at": datetime.utcnow().isoformat(),
        "status": "active",
    }
    result = await db.disaster_reports.insert_one(report_dict)
    return {"id": str(result.inserted_id), "message": "Report submitted"}

@api_router.get("/bencana/reports")
async def get_disaster_reports(current_user: dict = Depends(get_current_user)):
    reports = await db.disaster_reports.find({
        "kelurahan": current_user.get("kelurahan", "Sukamaju"),
        "status": "active",
    }).sort("created_at", -1).limit(50).to_list(50)
    return [
        {
            "id": str(r["_id"]),
            "user_nama": r["user_nama"],
            "type": r["type"],
            "description": r["description"],
            "location": r["location"],
            "google_maps_url": r.get("google_maps_url"),
            "alamat": r["alamat"],
            "rw": r["rw"],
            "rt": r["rt"],
            "created_at": r["created_at"],
        }
        for r in reports
    ]

# ==================== CHAT ====================

def get_accessible_rooms(user: dict) -> List[dict]:
    role = user.get("role", "warga")
    kelurahan = user.get("kelurahan", "Sukamaju")
    rw = user["rw"]
    rt = user["rt"]
    
    rooms = []
    # All approved users get RT-level group (lowest level)
    rooms.append({
        "id": f"warga_rt_{kelurahan}_{rw}_{rt}",
        "name": f"Warga RT {rt}/RW {rw}",
        "name_en": f"RT {rt}/RW {rw}",
        "description": f"Chat warga RT {rt}/RW {rw}",
        "level": "rt",
        "level_label": "RT",
    })
    
    if role in ["koordinator_rt", "koordinator_rw", "koordinator_kelurahan"]:
        rooms.append({
            "id": f"koord_rt_{kelurahan}_{rw}",
            "name": f"Koord. RT di RW {rw}",
            "name_en": f"RT Coords RW {rw}",
            "description": f"Koordinator RT se-RW {rw}",
            "level": "koord_rt",
            "level_label": "KOORD-RT",
        })
    
    if role in ["koordinator_rw", "koordinator_kelurahan"]:
        rooms.append({
            "id": f"koord_rw_{kelurahan}",
            "name": f"Koord. RW Kelurahan",
            "name_en": f"RW Coords {kelurahan}",
            "description": "Koordinator RW se-Kelurahan",
            "level": "koord_rw",
            "level_label": "KOORD-RW",
        })
    
    if role == "koordinator_kelurahan":
        rooms.append({
            "id": f"koord_kel_{kelurahan}",
            "name": f"Koord. Kelurahan",
            "name_en": "Kelurahan Coords",
            "description": f"Grup koordinator Kelurahan {kelurahan}",
            "level": "koord_kel",
            "level_label": "PUSAT",
        })
    
    return rooms

@api_router.get("/chat/rooms")
async def get_chat_rooms(current_user: dict = Depends(get_current_user)):
    if current_user.get("approval_status", "approved") != "approved":
        return []
    return get_accessible_rooms(current_user)

@api_router.get("/chat/messages/{room_id}")
async def get_chat_messages(room_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("approval_status", "approved") != "approved":
        raise HTTPException(status_code=403, detail="Account pending approval")
    accessible = get_accessible_rooms(current_user)
    if not any(r["id"] == room_id for r in accessible):
        raise HTTPException(status_code=403, detail="No access to this room")
    messages = await db.chat_messages.find({"room_id": room_id}).sort("created_at", 1).limit(100).to_list(100)
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
    if current_user.get("approval_status", "approved") != "approved":
        raise HTTPException(status_code=403, detail="Account pending approval")
    accessible = get_accessible_rooms(current_user)
    if not any(r["id"] == message.room_id for r in accessible):
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

# ==================== INCLUDE ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
