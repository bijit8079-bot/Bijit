from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, File, UploadFile, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64
from security import (
    InputValidator, 
    RateLimitConfig, 
    SECURITY_HEADERS, 
    PASSWORD_HASH_ROUNDS,
    DataEncryption,
    AuditLogger,
    QuerySanitizer,
    SESSION_TIMEOUT_MINUTES
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24
JWT_REMEMBER_ME_DAYS = 30  # 30 days for remember me

# Payment Configuration
MEMBERSHIP_FEE = 299.00

# Owner credentials
OWNER_CONTACT = os.environ['OWNER_CONTACT']
OWNER_PASSWORD = os.environ['OWNER_PASSWORD']
OWNER_NAME = os.environ.get('OWNER_NAME', 'Owner')

# Create the main app
app = FastAPI()

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        for header, value in SECURITY_HEADERS.items():
            response.headers[header] = value
        return response

app.add_middleware(SecurityHeadersMiddleware)

api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Define Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    name: str
    college: str
    class_name: str
    stream: str
    contact: str
    created_at: str
    payment_paid: bool = False
    payment_status: str = "unpaid"
    role: str = "student"
    photo: Optional[str] = None
    coaching_center: Optional[str] = None

class LoginResponse(BaseModel):
    token: str
    user: User

class StudentProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    name: str
    college: str
    class_name: str
    stream: str
    photo: Optional[str] = None
    coaching_center: Optional[str] = None

class CoachingCenter(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    stream: str  # Arts, Commerce, Science
    description: Optional[str] = None
    created_at: str

class Gym(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    created_at: str

class AdminUserUpdate(BaseModel):
    payment_paid: Optional[bool] = None
    payment_status: Optional[str] = None

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=PASSWORD_HASH_ROUNDS)).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def create_token(user_id: str, remember_me: bool = False) -> str:
    if remember_me:
        expiration = datetime.now(timezone.utc) + timedelta(days=JWT_REMEMBER_ME_DAYS)
    else:
        expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {'user_id': user_id, 'exp': expiration, 'iat': datetime.now(timezone.utc)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Check token expiration
        exp = payload.get('exp')
        if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Token expired")
        
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")

async def verify_owner(user_id: str = Depends(verify_token)) -> str:
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return user_id

def get_client_ip(request: Request) -> str:
    """Get client IP address"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0]
    return request.client.host if request.client else "unknown"

# Auth Routes
class UserRegister(BaseModel):
    name: str
    college: str
    class_name: str = Field(alias="class")
    stream: str
    contact: str
    password: str

class UserLogin(BaseModel):
    contact: str
    password: str
    remember_me: bool = False

@api_router.get("/")
async def root():
    return {"message": "StudentsNet API"}

@api_router.post("/register", response_model=LoginResponse)
@limiter.limit(RateLimitConfig.REGISTER_LIMIT)
async def register(
    request: Request,
    name: str = Form(...),
    college: str = Form(...),
    class_name: str = Form(..., alias="class"),
    stream: str = Form(...),
    contact: str = Form(...),
    password: str = Form(...),
    photo: Optional[UploadFile] = File(None)
):
    client_ip = get_client_ip(request)
    
    # Input validation and sanitization
    name = InputValidator.sanitize_string(name, 100)
    college = InputValidator.sanitize_string(college, 200)
    class_name = InputValidator.sanitize_string(class_name, 50)
    stream = InputValidator.sanitize_string(stream, 50)
    contact = InputValidator.sanitize_string(contact, 20)
    
    # Validate inputs
    if not InputValidator.validate_name(name):
        raise HTTPException(status_code=400, detail="Invalid name format")
    
    if not InputValidator.validate_phone(contact):
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    is_valid_password, password_error = InputValidator.validate_password(password)
    if not is_valid_password:
        raise HTTPException(status_code=400, detail=password_error)
    
    if stream not in ["Arts", "Commerce", "Science"]:
        raise HTTPException(status_code=400, detail="Invalid stream selection")
    
    # Sanitize contact for database query
    sanitized_contact = QuerySanitizer.sanitize_mongodb_query(contact)
    
    # Check if user already exists
    existing_user = await db.users.find_one({"contact": sanitized_contact}, {"_id": 0})
    if existing_user:
        AuditLogger.log_security_event("DUPLICATE_REGISTRATION", f"Contact: {contact}", client_ip)
        raise HTTPException(status_code=400, detail="User with this contact already exists")
    
    # Process photo if provided
    photo_base64 = None
    if photo:
        is_valid_file, file_error = InputValidator.validate_file_upload(
            photo.filename, 
            photo.content_type
        )
        if not is_valid_file:
            raise HTTPException(status_code=400, detail=file_error)
        
        photo_data = await photo.read()
        
        # Check file size (max 5MB)
        if len(photo_data) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum 5MB allowed")
        
        photo_base64 = base64.b64encode(photo_data).decode('utf-8')
    
    # Create user document
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": name,
        "college": college,
        "class_name": class_name,
        "stream": stream,
        "contact": sanitized_contact,
        "password_hash": hash_password(password),
        "payment_paid": False,
        "payment_status": "unpaid",
        "role": "student",
        "photo": photo_base64,
        "coaching_center": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login": None,
        "failed_login_attempts": 0
    }
    
    await db.users.insert_one(user_doc)
    
    # Audit log
    AuditLogger.log_data_access(user_id, "CREATE", "USER", client_ip)
    
    token = create_token(user_id)
    user = User(**{k: v for k, v in user_doc.items() if k != 'password_hash'})
    return LoginResponse(token=token, user=user)

@api_router.post("/login", response_model=LoginResponse)
@limiter.limit(RateLimitConfig.LOGIN_LIMIT)
async def login(request: Request, login_data: UserLogin):
    client_ip = get_client_ip(request)
    
    # Sanitize input
    contact = QuerySanitizer.sanitize_mongodb_query(login_data.contact)
    
    # Find user
    user_doc = await db.users.find_one({"contact": contact}, {"_id": 0})
    if not user_doc:
        AuditLogger.log_login_attempt("unknown", False, client_ip)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if account is locked
    failed_attempts = user_doc.get("failed_login_attempts", 0)
    if failed_attempts >= 5:
        last_failed = user_doc.get("last_failed_login")
        if last_failed:
            lockout_time = datetime.fromisoformat(last_failed) + timedelta(minutes=30)
            if datetime.now(timezone.utc) < lockout_time:
                AuditLogger.log_security_event("ACCOUNT_LOCKED", f"User: {user_doc['id']}", client_ip)
                raise HTTPException(status_code=429, detail="Account locked. Try again in 30 minutes")
            else:
                # Reset failed attempts after lockout period
                await db.users.update_one(
                    {"id": user_doc["id"]},
                    {"$set": {"failed_login_attempts": 0}}
                )
    
    # Verify password
    if not verify_password(login_data.password, user_doc["password_hash"]):
        # Increment failed attempts
        await db.users.update_one(
            {"id": user_doc["id"]},
            {
                "$inc": {"failed_login_attempts": 1},
                "$set": {"last_failed_login": datetime.now(timezone.utc).isoformat()}
            }
        )
        AuditLogger.log_login_attempt(user_doc["id"], False, client_ip)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Reset failed attempts on successful login
    await db.users.update_one(
        {"id": user_doc["id"]},
        {
            "$set": {
                "failed_login_attempts": 0,
                "last_login": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Audit log
    AuditLogger.log_login_attempt(user_doc["id"], True, client_ip)
    
    token = create_token(user_doc["id"], login_data.remember_me)
    user = User(**{k: v for k, v in user_doc.items() if k != 'password_hash'})
    return LoginResponse(token=token, user=user)

@api_router.get("/profile", response_model=User)
async def get_profile(user_id: str = Depends(verify_token)):
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user_doc)

@api_router.put("/profile")
async def update_profile(
    user_id: str = Depends(verify_token),
    name: Optional[str] = Form(None),
    college: Optional[str] = Form(None),
    class_name: Optional[str] = Form(None),
    stream: Optional[str] = Form(None),
    coaching_center: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None)
):
    update_data = {}
    if name: update_data["name"] = name
    if college: update_data["college"] = college
    if class_name: update_data["class_name"] = class_name
    if stream: update_data["stream"] = stream
    if coaching_center: update_data["coaching_center"] = coaching_center
    if photo:
        photo_data = await photo.read()
        update_data["photo"] = base64.b64encode(photo_data).decode('utf-8')
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    return {"message": "Profile updated successfully"}

# Students Routes
@api_router.get("/students", response_model=List[StudentProfile])
async def get_students(
    stream: Optional[str] = None,
    coaching_center: Optional[str] = None,
    user_id: str = Depends(verify_token)
):
    query = {"role": "student"}
    if stream:
        query["stream"] = stream
    if coaching_center:
        query["coaching_center"] = coaching_center
    
    students = await db.users.find(
        {**query, "id": {"$ne": user_id}},
        {"_id": 0, "password_hash": 0, "contact": 0, "created_at": 0}
    ).to_list(1000)
    
    return [StudentProfile(**student) for student in students]

@api_router.get("/students/all", response_model=List[StudentProfile])
async def get_all_students(user_id: str = Depends(verify_token)):
    students = await db.users.find(
        {"role": "student", "id": {"$ne": user_id}},
        {"_id": 0, "password_hash": 0, "contact": 0, "created_at": 0, "payment_status": 0, "payment_paid": 0}
    ).to_list(1000)
    return [StudentProfile(**student) for student in students]

# Coaching Centers Routes
@api_router.get("/coaching-centers", response_model=List[CoachingCenter])
async def get_coaching_centers(stream: Optional[str] = None, user_id: str = Depends(verify_token)):
    query = {}
    if stream:
        query["stream"] = stream
    centers = await db.coaching_centers.find(query, {"_id": 0}).to_list(1000)
    return [CoachingCenter(**center) for center in centers]

@api_router.post("/coaching-centers")
async def create_coaching_center(
    name: str = Form(...),
    stream: str = Form(...),
    description: str = Form(None),
    owner_id: str = Depends(verify_owner)
):
    center_id = str(uuid.uuid4())
    center_doc = {
        "id": center_id,
        "name": name,
        "stream": stream,
        "description": description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.coaching_centers.insert_one(center_doc)
    return CoachingCenter(**center_doc)

@api_router.delete("/coaching-centers/{center_id}")
async def delete_coaching_center(center_id: str, owner_id: str = Depends(verify_owner)):
    result = await db.coaching_centers.delete_one({"id": center_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coaching center not found")
    return {"message": "Coaching center deleted"}

# Gyms Routes
@api_router.get("/gyms", response_model=List[Gym])
async def get_gyms(user_id: str = Depends(verify_token)):
    gyms = await db.gyms.find({}, {"_id": 0}).to_list(1000)
    return [Gym(**gym) for gym in gyms]

@api_router.post("/gyms")
async def create_gym(name: str = Form(...), description: str = Form(None), owner_id: str = Depends(verify_owner)):
    gym_id = str(uuid.uuid4())
    gym_doc = {
        "id": gym_id,
        "name": name,
        "description": description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.gyms.insert_one(gym_doc)
    return Gym(**gym_doc)

@api_router.delete("/gyms/{gym_id}")
async def delete_gym(gym_id: str, owner_id: str = Depends(verify_owner)):
    result = await db.gyms.delete_one({"id": gym_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gym not found")
    return {"message": "Gym deleted"}

# Payment Routes
@api_router.post("/payment/submit-upi")
@limiter.limit(RateLimitConfig.PAYMENT_LIMIT)
async def submit_upi_payment(
    request: Request,
    transaction_id: str = Form(...),
    screenshot: UploadFile = File(...),
    user_id: str = Depends(verify_token)
):
    client_ip = get_client_ip(request)
    
    # Validate and sanitize transaction ID
    transaction_id = InputValidator.sanitize_string(transaction_id, 50)
    if not transaction_id or len(transaction_id) < 8:
        raise HTTPException(status_code=400, detail="Invalid transaction ID")
    
    # Validate file upload
    is_valid_file, file_error = InputValidator.validate_file_upload(
        screenshot.filename, 
        screenshot.content_type
    )
    if not is_valid_file:
        raise HTTPException(status_code=400, detail=file_error)
    
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_doc.get("payment_paid", False):
        raise HTTPException(status_code=400, detail="Payment already completed")
    
    if user_doc.get("payment_status") == "pending":
        raise HTTPException(status_code=400, detail="Payment already submitted and pending verification")
    
    screenshot_data = await screenshot.read()
    
    # Check file size
    if len(screenshot_data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 5MB")
    
    screenshot_base64 = base64.b64encode(screenshot_data).decode('utf-8')
    
    # Audit log
    AuditLogger.log_data_access(user_id, "SUBMIT_PAYMENT", "PAYMENT_TRANSACTION", client_ip)
    
    transaction_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "transaction_id": transaction_id,
        "amount": MEMBERSHIP_FEE,
        "currency": "INR",
        "payment_method": "UPI",
        "payment_status": "pending",
        "screenshot": screenshot_base64,
        "screenshot_filename": screenshot.filename,
        "purpose": "annual_membership",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_transactions.insert_one(transaction_doc)
    await db.users.update_one({"id": user_id}, {"$set": {"payment_status": "pending"}})
    
    return {"message": "Payment submitted for verification", "status": "pending", "transaction_id": transaction_id}

@api_router.get("/payment/status")
async def get_payment_status(user_id: str = Depends(verify_token)):
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "payment_paid": user_doc.get("payment_paid", False),
        "payment_status": user_doc.get("payment_status", "unpaid")
    }

# Admin Routes
@api_router.get("/admin/users")
async def get_all_users(owner_id: str = Depends(verify_owner)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.get("/admin/payments")
async def get_pending_payments(owner_id: str = Depends(verify_owner)):
    payments = await db.payment_transactions.find({"payment_status": "pending"}, {"_id": 0}).to_list(1000)
    return payments

@api_router.get("/admin/stats")
async def get_admin_stats(owner_id: str = Depends(verify_owner)):
    total_users = await db.users.count_documents({"role": "student"})
    paid_users = await db.users.count_documents({"role": "student", "payment_paid": True})
    pending_payments = await db.payment_transactions.count_documents({"payment_status": "pending"})
    total_coaching = await db.coaching_centers.count_documents({})
    total_gyms = await db.gyms.count_documents({})
    
    return {
        "total_users": total_users,
        "paid_users": paid_users,
        "unpaid_users": total_users - paid_users,
        "pending_payments": pending_payments,
        "total_coaching_centers": total_coaching,
        "total_gyms": total_gyms
    }

@api_router.put("/admin/user/{user_id}/payment")
async def approve_payment(user_id: str, update_data: AdminUserUpdate, owner_id: str = Depends(verify_owner)):
    update_fields = {}
    if update_data.payment_paid is not None:
        update_fields["payment_paid"] = update_data.payment_paid
    if update_data.payment_status:
        update_fields["payment_status"] = update_data.payment_status
    
    await db.users.update_one({"id": user_id}, {"$set": update_fields})
    
    if update_data.payment_paid:
        await db.payment_transactions.update_many(
            {"user_id": user_id, "payment_status": "pending"},
            {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"message": "Payment status updated"}

@api_router.delete("/admin/user/{user_id}")
async def delete_user(user_id: str, owner_id: str = Depends(verify_owner)):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    owner = await db.users.find_one({"contact": OWNER_CONTACT}, {"_id": 0})
    if not owner:
        owner_doc = {
            "id": str(uuid.uuid4()),
            "name": "Owner",
            "college": "Admin",
            "class_name": "Admin",
            "stream": "Admin",
            "contact": OWNER_CONTACT,
            "password_hash": hash_password(OWNER_PASSWORD),
            "payment_paid": True,
            "payment_status": "paid",
            "role": "owner",
            "photo": None,
            "coaching_center": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(owner_doc)
        logger.info(f"Owner account created: {OWNER_CONTACT}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()