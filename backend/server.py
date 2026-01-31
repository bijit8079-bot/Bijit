from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, File, UploadFile, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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

# Payment Configuration
MEMBERSHIP_FEE = 299.00  # Annual membership fee in INR

# Owner credentials
OWNER_CONTACT = os.environ['OWNER_CONTACT']
OWNER_PASSWORD = os.environ['OWNER_PASSWORD']

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Define Models
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
    payment_status: str = "unpaid"  # unpaid, pending, paid
    role: str = "student"  # student, owner
    photo: Optional[str] = None

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

class UserUpdate(BaseModel):
    name: Optional[str] = None
    college: Optional[str] = None
    class_name: Optional[str] = None
    stream: Optional[str] = None

class AdminUserUpdate(BaseModel):
    payment_paid: Optional[bool] = None
    payment_status: Optional[str] = None

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        'user_id': user_id,
        'exp': expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def verify_owner(user_id: str = Depends(verify_token)) -> str:
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return user_id

# Routes
@api_router.get("/")
async def root():
    return {"message": "StudentsNet API"}

@api_router.post("/register", response_model=LoginResponse)
async def register(
    name: str = Form(...),
    college: str = Form(...),
    class_name: str = Form(..., alias="class"),
    stream: str = Form(...),
    contact: str = Form(...),
    password: str = Form(...),
    photo: Optional[UploadFile] = File(None)
):
    # Check if user already exists
    existing_user = await db.users.find_one({"contact": contact}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this contact already exists")
    
    # Process photo if provided
    photo_base64 = None
    if photo:
        photo_data = await photo.read()
        photo_base64 = base64.b64encode(photo_data).decode('utf-8')
    
    # Create user document
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": name,
        "college": college,
        "class_name": class_name,
        "stream": stream,
        "contact": contact,
        "password_hash": hash_password(password),
        "payment_paid": False,
        "payment_status": "unpaid",
        "role": "student",
        "photo": photo_base64,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create token
    token = create_token(user_id)
    
    # Return user without password
    user = User(
        id=user_doc["id"],
        name=user_doc["name"],
        college=user_doc["college"],
        class_name=user_doc["class_name"],
        stream=user_doc["stream"],
        contact=user_doc["contact"],
        created_at=user_doc["created_at"],
        payment_paid=user_doc["payment_paid"],
        payment_status=user_doc["payment_status"],
        role=user_doc["role"],
        photo=user_doc["photo"]
    )
    
    return LoginResponse(token=token, user=user)

@api_router.post("/login", response_model=LoginResponse)
async def login(login_data: UserLogin):
    # Find user by contact
    user_doc = await db.users.find_one({"contact": login_data.contact}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(login_data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    token = create_token(user_doc["id"])
    
    # Return user without password
    user = User(
        id=user_doc["id"],
        name=user_doc["name"],
        college=user_doc["college"],
        class_name=user_doc["class_name"],
        stream=user_doc["stream"],
        contact=user_doc["contact"],
        created_at=user_doc["created_at"],
        payment_paid=user_doc.get("payment_paid", False),
        payment_status=user_doc.get("payment_status", "unpaid"),
        role=user_doc.get("role", "student"),
        photo=user_doc.get("photo")
    )
    
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
    photo: Optional[UploadFile] = File(None)
):
    update_data = {}
    
    if name:
        update_data["name"] = name
    if college:
        update_data["college"] = college
    if class_name:
        update_data["class_name"] = class_name
    if stream:
        update_data["stream"] = stream
    if photo:
        photo_data = await photo.read()
        update_data["photo"] = base64.b64encode(photo_data).decode('utf-8')
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    return {"message": "Profile updated successfully"}

@api_router.get("/students", response_model=List[StudentProfile])
async def get_students(stream: Optional[str] = None, user_id: str = Depends(verify_token)):
    query = {"role": "student"}
    if stream:
        query["stream"] = stream
    
    # Exclude current user and password
    students = await db.users.find(
        {**query, "id": {"$ne": user_id}},
        {"_id": 0, "password_hash": 0, "contact": 0, "created_at": 0}
    ).to_list(1000)
    
    return [StudentProfile(**student) for student in students]

@api_router.get("/students/all", response_model=List[StudentProfile])
async def get_all_students(user_id: str = Depends(verify_token)):
    # Get all students (excluding current user)
    students = await db.users.find(
        {"role": "student", "id": {"$ne": user_id}},
        {"_id": 0, "password_hash": 0, "contact": 0, "created_at": 0, "payment_status": 0, "payment_paid": 0}
    ).to_list(1000)
    
    return [StudentProfile(**student) for student in students]

# UPI Payment Routes
@api_router.post("/payment/submit-upi")
async def submit_upi_payment(
    transaction_id: str = Form(...),
    screenshot: UploadFile = File(...),
    user_id: str = Depends(verify_token)
):
    # Check if user already paid
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_doc.get("payment_paid", False):
        raise HTTPException(status_code=400, detail="Payment already completed")
    
    # Check if payment is already pending verification
    if user_doc.get("payment_status") == "pending":
        raise HTTPException(status_code=400, detail="Payment already submitted and pending verification")
    
    # Read screenshot file
    screenshot_data = await screenshot.read()
    screenshot_base64 = base64.b64encode(screenshot_data).decode('utf-8')
    
    # Create payment transaction record
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
    
    # Update user payment status to pending
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"payment_status": "pending"}}
    )
    
    return {
        "message": "Payment submitted for verification",
        "status": "pending",
        "transaction_id": transaction_id
    }

@api_router.get("/payment/status")
async def get_payment_status(user_id: str = Depends(verify_token)):
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "payment_paid": user_doc.get("payment_paid", False),
        "payment_status": user_doc.get("payment_status", "unpaid")
    }

# Owner/Admin Routes
@api_router.get("/admin/users")
async def get_all_users(owner_id: str = Depends(verify_owner)):
    users = await db.users.find(
        {},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    return users

@api_router.get("/admin/payments")
async def get_pending_payments(owner_id: str = Depends(verify_owner)):
    payments = await db.payment_transactions.find(
        {"payment_status": "pending"},
        {"_id": 0}
    ).to_list(1000)
    
    return payments

@api_router.put("/admin/user/{user_id}/payment")
async def approve_payment(user_id: str, update_data: AdminUserUpdate, owner_id: str = Depends(verify_owner)):
    update_fields = {}
    
    if update_data.payment_paid is not None:
        update_fields["payment_paid"] = update_data.payment_paid
    if update_data.payment_status:
        update_fields["payment_status"] = update_data.payment_status
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_fields}
    )
    
    # Update payment transaction if approving
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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Create owner account if doesn't exist
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
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(owner_doc)
        logger.info(f"Owner account created: {OWNER_CONTACT}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()