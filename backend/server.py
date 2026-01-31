from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
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
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'studentsnet_secret_key_2025')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
MEMBERSHIP_FEE = 299.00  # Annual membership fee

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

class PaymentSessionRequest(BaseModel):
    origin_url: str

class PaymentSessionResponse(BaseModel):
    url: str
    session_id: str
    amount: float

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

# Routes
@api_router.get("/")
async def root():
    return {"message": "StudentsNet API"}

@api_router.post("/register", response_model=LoginResponse)
async def register(user_data: UserRegister):
    # Check if user already exists
    existing_user = await db.users.find_one({"contact": user_data.contact}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this contact already exists")
    
    # Create user document
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": user_data.name,
        "college": user_data.college,
        "class_name": user_data.class_name,
        "stream": user_data.stream,
        "contact": user_data.contact,
        "password_hash": hash_password(user_data.password),
        "payment_paid": False,
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
        payment_paid=user_doc["payment_paid"]
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
        created_at=user_doc["created_at"]
    )
    
    return LoginResponse(token=token, user=user)

@api_router.get("/profile", response_model=User)
async def get_profile(user_id: str = Depends(verify_token)):
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user_doc)

@api_router.get("/students", response_model=List[StudentProfile])
async def get_students(stream: Optional[str] = None, user_id: str = Depends(verify_token)):
    query = {}
    if stream:
        query["stream"] = stream
    
    # Exclude current user and password
    students = await db.users.find(
        {**query, "id": {"$ne": user_id}},
        {"_id": 0, "password_hash": 0, "contact": 0, "created_at": 0}
    ).to_list(1000)
    
    return [StudentProfile(**student) for student in students]

# Payment Routes
@api_router.post("/payment/create-session", response_model=PaymentSessionResponse)
async def create_payment_session(payment_request: PaymentSessionRequest, user_id: str = Depends(verify_token)):
    # Check if user already paid
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_doc.get("payment_paid", False):
        raise HTTPException(status_code=400, detail="Payment already completed")
    
    # Initialize Stripe
    origin_url = payment_request.origin_url
    webhook_url = f"{origin_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Create URLs
    success_url = f"{origin_url}/payment-success?session_id={{{{CHECKOUT_SESSION_ID}}}}"
    cancel_url = f"{origin_url}/payment"
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=MEMBERSHIP_FEE,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user_id,
            "purpose": "annual_membership"
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user_id,
        "amount": MEMBERSHIP_FEE,
        "currency": "usd",
        "payment_status": "pending",
        "purpose": "annual_membership",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_transactions.insert_one(transaction_doc)
    
    return PaymentSessionResponse(
        url=session.url,
        session_id=session.session_id,
        amount=MEMBERSHIP_FEE
    )

@api_router.get("/payment/status/{session_id}")
async def check_payment_status(session_id: str, user_id: str = Depends(verify_token)):
    # Check transaction in database
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If already marked as paid, return success
    if transaction.get("payment_status") == "paid":
        return {
            "status": "complete",
            "payment_status": "paid",
            "message": "Payment completed successfully"
        }
    
    # Check with Stripe
    webhook_url = "dummy_webhook"  # Not used for status check
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        checkout_status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction and user if payment is successful
        if checkout_status.payment_status == "paid" and transaction.get("payment_status") != "paid":
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "payment_status": "paid",
                        "status": checkout_status.status,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Update user payment status
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"payment_paid": True}}
            )
        
        return {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "amount_total": checkout_status.amount_total,
            "currency": checkout_status.currency
        }
    except Exception as e:
        logger.error(f"Error checking payment status: {e}")
        raise HTTPException(status_code=500, detail="Failed to check payment status")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        webhook_url = "dummy_webhook"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Handle successful payment
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            metadata = webhook_response.metadata
            user_id = metadata.get("user_id")
            
            if user_id:
                # Check if already processed
                transaction = await db.payment_transactions.find_one(
                    {"session_id": session_id},
                    {"_id": 0}
                )
                
                if transaction and transaction.get("payment_status") != "paid":
                    # Update transaction
                    await db.payment_transactions.update_one(
                        {"session_id": session_id},
                        {
                            "$set": {
                                "payment_status": "paid",
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }
                        }
                    )
                    
                    # Update user
                    await db.users.update_one(
                        {"id": user_id},
                        {"$set": {"payment_paid": True}}
                    )
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()