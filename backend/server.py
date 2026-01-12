from fastapi import FastAPI, APIRouter, HTTPException, Cookie, Response, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import resend
import csv
import io
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend configuration
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
SENDER_EMAIL = os.getenv('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Admin whitelist
ADMIN_WHITELIST = [
    'yogesh.ostwal@nucleovir.com',
    'ayush@nucleovir.com',
    'sunil.k@nucleovir.com',
    'nikita@nucleovir.com',
    'shahebaz.kazi@nucleovir.com'
]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    role: str = "Employee"  # Admin, HR, Employee, Accountant, CA
    created_at: datetime

class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    user_id: Optional[str] = None
    name: str
    email: EmailStr
    role: str
    department: str
    join_date: datetime
    phone: Optional[str] = None
    address: Optional[str] = None
    salary: Optional[float] = None
    created_at: datetime

class AttendanceRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    attendance_id: str
    user_id: str
    date: str  # YYYY-MM-DD
    status: str  # Present, Absent, Leave, Holiday
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    created_at: datetime

class LeaveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    leave_id: str
    user_id: str
    leave_type: str  # Sick, Casual, Vacation
    start_date: str
    end_date: str
    reason: str
    status: str  # Pending, Approved, Rejected
    approved_by: Optional[str] = None
    created_at: datetime

class PayrollRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    payroll_id: str
    employee_id: str
    month: str  # YYYY-MM
    basic_salary: float
    deductions: float
    bonuses: float
    net_salary: float
    payment_date: Optional[datetime] = None
    created_at: datetime

class PaymentRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    payment_id: str
    ca_user_id: str
    ca_name: str
    amount: float
    description: str
    status: str  # Pending, Approved, Rejected, Paid
    created_at: datetime
    file_url: Optional[str] = None

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    project_id: str
    title: str
    description: str
    status: str  # Todo, In Progress, Done
    assigned_to: Optional[List[str]] = []
    created_by: str
    created_at: datetime

class LabNotebookEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    entry_id: str
    user_id: str
    date: str
    title: str
    content: str
    tags: Optional[List[str]] = []
    created_at: datetime

class InventoryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_id: str
    name: str
    category: str  # Equipment, Reagent
    quantity: int
    unit: str
    location: str
    created_at: datetime

class InventoryRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    request_id: str
    user_id: str
    item_id: str
    quantity: int
    reason: str
    status: str  # Pending, Approved, Rejected
    created_at: datetime

class EquipmentBooking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    booking_id: str
    user_id: str
    equipment_name: str
    start_time: datetime
    end_time: datetime
    purpose: str
    created_at: datetime

class ChatGroup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    group_id: str
    name: str
    created_by: str
    members: List[str]
    created_at: datetime

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    message_id: str
    group_id: str
    user_id: str
    user_name: str
    content: str
    file_url: Optional[str] = None
    created_at: datetime

class CalendarEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_id: str
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    attendees: List[str]
    created_by: str
    created_at: datetime

class HelpdeskTicket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ticket_id: str
    user_id: str
    subject: str
    description: str
    category: str  # Technical, HR, Admin, Other
    status: str  # Open, In Progress, Resolved, Closed
    priority: str  # Low, Medium, High
    created_at: datetime

class ContactForm(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

# ==================== HELPER FUNCTIONS ====================

async def get_user_from_token(token: Optional[str]) -> Optional[User]:
    """Validate session token and return user"""
    if not token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    # Get user
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    
    # Convert ISO string to datetime
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

async def send_email_async(recipient: str, subject: str, html_content: str):
    """Send email using Resend"""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set, skipping email")
        return
    
    params = {
        "from": SENDER_EMAIL,
        "to": [recipient],
        "subject": subject,
        "html": html_content
    }
    
    try:
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {recipient}")
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")

# ==================== AUTHENTICATION ROUTES ====================

@api_router.get("/auth/session-data")
async def get_session_data(session_id: str):
    """Exchange session_id for user data from Emergent Auth"""
    import httpx
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            response.raise_for_status()
            data = response.json()
            
            # Check domain restriction
            email = data.get('email', '')
            if not email.endswith('@nucleovir.com'):
                raise HTTPException(status_code=403, detail="Access restricted to @nucleovir.com emails only")
            
            # Determine role based on whitelist
            role = "Admin" if email in ADMIN_WHITELIST else "Employee"
            
            # Create or update user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user_doc = await db.users.find_one({"email": email}, {"_id": 0})
            
            if not user_doc:
                user_data = {
                    "user_id": user_id,
                    "email": email,
                    "name": data.get('name', ''),
                    "picture": data.get('picture', ''),
                    "role": role,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.users.insert_one(user_data)
            else:
                user_id = user_doc['user_id']
                # Update role if changed
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {"role": role, "name": data.get('name', ''), "picture": data.get('picture', '')}}
                )
            
            # Create session
            session_token = data.get('session_token', '')
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            
            await db.user_sessions.insert_one({
                "user_id": user_id,
                "session_token": session_token,
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {
                "user_id": user_id,
                "email": email,
                "name": data.get('name', ''),
                "picture": data.get('picture', ''),
                "role": role,
                "session_token": session_token
            }
            
        except httpx.HTTPError as e:
            logger.error(f"Auth error: {str(e)}")
            raise HTTPException(status_code=401, detail="Invalid session")

@api_router.get("/auth/me")
async def get_current_user(session_token: Optional[str] = Cookie(None), authorization: Optional[str] = None):
    """Get current authenticated user"""
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    token = session_token
    if not token and authorization:
        token = authorization.replace("Bearer ", "")
    
    user = await get_user_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return user

@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    """Logout user"""
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie("session_token")
    return {"message": "Logged out successfully"}

# ==================== CONTACT FORM ====================

@api_router.post("/contact")
async def submit_contact_form(form: ContactForm):
    """Handle contact form submission"""
    # Save to database
    contact_doc = {
        "contact_id": f"contact_{uuid.uuid4().hex[:12]}",
        "name": form.name,
        "email": form.email,
        "subject": form.subject,
        "message": form.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contact_submissions.insert_one(contact_doc)
    
    # Send email notification to admin
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>New Contact Form Submission</h2>
            <p><strong>From:</strong> {form.name} ({form.email})</p>
            <p><strong>Subject:</strong> {form.subject}</p>
            <p><strong>Message:</strong></p>
            <p>{form.message}</p>
        </body>
    </html>
    """
    
    await send_email_async("nikita@nucleovir.com", f"Contact Form: {form.subject}", html_content)
    
    return {"message": "Form submitted successfully"}

# ==================== EMPLOYEE MANAGEMENT ====================

@api_router.post("/employees")
async def create_employee(employee_data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Create new employee (Admin/HR only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role not in ['Admin', 'HR']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    employee_id = f"EMP{datetime.now().year}{str(uuid.uuid4().hex[:6]).upper()}"
    
    employee_doc = {
        "employee_id": employee_id,
        "name": employee_data['name'],
        "email": employee_data['email'],
        "role": employee_data['role'],
        "department": employee_data['department'],
        "join_date": datetime.now(timezone.utc).isoformat(),
        "phone": employee_data.get('phone'),
        "address": employee_data.get('address'),
        "salary": employee_data.get('salary'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.employees.insert_one(employee_doc)
    
    # Send onboarding email
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Welcome to Nucleo-vir Therapeutics!</h2>
            <p>Dear {employee_data['name']},</p>
            <p>Your employee ID is: <strong>{employee_id}</strong></p>
            <p>Department: {employee_data['department']}</p>
            <p>Role: {employee_data['role']}</p>
            <p>Please access the portal to complete your onboarding.</p>
        </body>
    </html>
    """
    
    await send_email_async(employee_data['email'], "Welcome to Nucleo-vir Therapeutics", html_content)
    
    return {"employee_id": employee_id, "message": "Employee created successfully"}

@api_router.get("/employees")
async def get_employees(session_token: Optional[str] = Cookie(None)):
    """Get all employees"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    employees = await db.employees.find({}, {"_id": 0}).to_list(1000)
    return employees

@api_router.get("/employees/{employee_id}")
async def get_employee(employee_id: str, session_token: Optional[str] = Cookie(None)):
    """Get employee by ID"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    employee = await db.employees.find_one({"employee_id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return employee

@api_router.put("/employees/{employee_id}")
async def update_employee(employee_id: str, employee_data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Update employee (Admin/HR only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role not in ['Admin', 'HR']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.employees.update_one(
        {"employee_id": employee_id},
        {"$set": employee_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return {"message": "Employee updated successfully"}

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, session_token: Optional[str] = Cookie(None)):
    """Delete employee (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can delete employees")
    
    result = await db.employees.delete_one({"employee_id": employee_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return {"message": "Employee deleted successfully"}

# ==================== ATTENDANCE & LEAVE ====================

@api_router.post("/attendance")
async def mark_attendance(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Mark attendance"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    attendance_doc = {
        "attendance_id": f"att_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "status": data.get('status', 'Present'),
        "check_in": datetime.now(timezone.utc).isoformat(),
        "check_out": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.attendance.insert_one(attendance_doc)
    return {"message": "Attendance marked"}

@api_router.get("/attendance/heatmap")
async def get_attendance_heatmap(session_token: Optional[str] = Cookie(None)):
    """Get attendance heatmap data"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get last 365 days of attendance
    records = await db.attendance.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    return records

@api_router.post("/leave-requests")
async def create_leave_request(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Submit leave request"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    leave_doc = {
        "leave_id": f"leave_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "leave_type": data['leave_type'],
        "start_date": data['start_date'],
        "end_date": data['end_date'],
        "reason": data['reason'],
        "status": "Pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.leave_requests.insert_one(leave_doc)
    return {"message": "Leave request submitted"}

@api_router.get("/leave-requests")
async def get_leave_requests(session_token: Optional[str] = Cookie(None)):
    """Get leave requests"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.role in ['Admin', 'HR']:
        requests = await db.leave_requests.find({}, {"_id": 0}).to_list(1000)
    else:
        requests = await db.leave_requests.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    
    return requests

@api_router.patch("/leave-requests/{leave_id}")
async def update_leave_request(leave_id: str, data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Approve/reject leave request"""
    user = await get_user_from_token(session_token)
    if not user or user.role not in ['Admin', 'HR']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.leave_requests.update_one(
        {"leave_id": leave_id},
        {"$set": {"status": data['status'], "approved_by": user.user_id}}
    )
    
    return {"message": "Leave request updated"}

# ==================== PAYROLL ====================

@api_router.post("/payroll")
async def create_payroll(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Create payroll record (Admin/HR only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role not in ['Admin', 'HR']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    net_salary = data['basic_salary'] - data.get('deductions', 0) + data.get('bonuses', 0)
    
    payroll_doc = {
        "payroll_id": f"pay_{uuid.uuid4().hex[:12]}",
        "employee_id": data['employee_id'],
        "month": data['month'],
        "basic_salary": data['basic_salary'],
        "deductions": data.get('deductions', 0),
        "bonuses": data.get('bonuses', 0),
        "net_salary": net_salary,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payroll.insert_one(payroll_doc)
    return {"message": "Payroll created", "payroll_id": payroll_doc['payroll_id']}

@api_router.get("/payroll")
async def get_payroll(session_token: Optional[str] = Cookie(None)):
    """Get payroll records"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.role in ['Admin', 'HR', 'Accountant']:
        records = await db.payroll.find({}, {"_id": 0}).to_list(1000)
    else:
        # Get employee_id from email match
        employee = await db.employees.find_one({"email": user.email}, {"_id": 0})
        if employee:
            records = await db.payroll.find({"employee_id": employee['employee_id']}, {"_id": 0}).to_list(1000)
        else:
            records = []
    
    return records

# ==================== PAYMENT REQUESTS ====================

@api_router.post("/payment-requests")
async def create_payment_request(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Create payment request (CA only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'CA':
        raise HTTPException(status_code=403, detail="Only CA can create payment requests")
    
    payment_doc = {
        "payment_id": f"pmt_{uuid.uuid4().hex[:12]}",
        "ca_user_id": user.user_id,
        "ca_name": user.name,
        "amount": data['amount'],
        "description": data['description'],
        "status": "Pending",
        "file_url": data.get('file_url'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_requests.insert_one(payment_doc)
    
    # Send email to accountant
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>New Payment Request</h2>
            <p><strong>From:</strong> {user.name}</p>
            <p><strong>Amount:</strong> ₹{data['amount']}</p>
            <p><strong>Description:</strong> {data['description']}</p>
            <p><strong>Payment ID:</strong> {payment_doc['payment_id']}</p>
        </body>
    </html>
    """
    
    await send_email_async("nikita@nucleovir.com", "New Payment Request", html_content)
    
    return {"message": "Payment request submitted", "payment_id": payment_doc['payment_id']}

@api_router.get("/payment-requests")
async def get_payment_requests(session_token: Optional[str] = Cookie(None)):
    """Get payment requests"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.role in ['Admin', 'Accountant']:
        requests = await db.payment_requests.find({}, {"_id": 0}).to_list(1000)
    elif user.role == 'CA':
        requests = await db.payment_requests.find({"ca_user_id": user.user_id}, {"_id": 0}).to_list(1000)
    else:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return requests

@api_router.patch("/payment-requests/{payment_id}")
async def update_payment_request(payment_id: str, data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Update payment request status"""
    user = await get_user_from_token(session_token)
    if not user or user.role not in ['Admin', 'Accountant']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.payment_requests.update_one(
        {"payment_id": payment_id},
        {"$set": {"status": data['status']}}
    )
    
    return {"message": "Payment request updated"}

# ==================== PROJECTS ====================

@api_router.post("/projects")
async def create_project(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Create project"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    project_doc = {
        "project_id": f"proj_{uuid.uuid4().hex[:12]}",
        "title": data['title'],
        "description": data['description'],
        "status": data.get('status', 'Todo'),
        "assigned_to": data.get('assigned_to', []),
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.projects.insert_one(project_doc)
    return {"message": "Project created", "project_id": project_doc['project_id']}

@api_router.get("/projects")
async def get_projects(session_token: Optional[str] = Cookie(None)):
    """Get all projects"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    return projects

@api_router.patch("/projects/{project_id}")
async def update_project(project_id: str, data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Update project"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    await db.projects.update_one({"project_id": project_id}, {"$set": data})
    return {"message": "Project updated"}

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, session_token: Optional[str] = Cookie(None)):
    """Delete project (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can delete projects")
    
    result = await db.projects.delete_one({"project_id": project_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project deleted successfully"}

# ==================== LAB NOTEBOOK ====================

@api_router.post("/lab-notebook")
async def create_notebook_entry(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Create lab notebook entry"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    entry_doc = {
        "entry_id": f"entry_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "title": data['title'],
        "content": data['content'],
        "tags": data.get('tags', []),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.lab_notebook.insert_one(entry_doc)
    return {"message": "Entry created", "entry_id": entry_doc['entry_id']}

@api_router.get("/lab-notebook")
async def get_notebook_entries(session_token: Optional[str] = Cookie(None)):
    """Get lab notebook entries"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    entries = await db.lab_notebook.find({}, {"_id": 0}).sort([("created_at", -1)]).to_list(1000)
    return entries

@api_router.delete("/lab-notebook/{entry_id}")
async def delete_notebook_entry(entry_id: str, session_token: Optional[str] = Cookie(None)):
    """Delete lab notebook entry (Admin or owner)"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if user is admin or owner
    entry = await db.lab_notebook.find_one({"entry_id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if user.role != 'Admin' and entry['user_id'] != user.user_id:
        raise HTTPException(status_code=403, detail="Only admins or entry owners can delete entries")
    
    await db.lab_notebook.delete_one({"entry_id": entry_id})
    return {"message": "Entry deleted successfully"}

# ==================== LAB INVENTORY ====================

@api_router.post("/inventory")
async def create_inventory_item(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Add inventory item (Admin/HR only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role not in ['Admin', 'HR']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    item_doc = {
        "item_id": f"item_{uuid.uuid4().hex[:12]}",
        "name": data['name'],
        "category": data['category'],
        "quantity": data['quantity'],
        "unit": data['unit'],
        "location": data['location'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.inventory.insert_one(item_doc)
    return {"message": "Item added", "item_id": item_doc['item_id']}

@api_router.get("/inventory")
async def get_inventory(session_token: Optional[str] = Cookie(None)):
    """Get inventory items"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    items = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    return items

@api_router.delete("/inventory/{item_id}")
async def delete_inventory_item(item_id: str, session_token: Optional[str] = Cookie(None)):
    """Delete inventory item (Admin/HR only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role not in ['Admin', 'HR']:
        raise HTTPException(status_code=403, detail="Only admins/HR can delete inventory items")
    
    result = await db.inventory.delete_one({"item_id": item_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item deleted successfully"}

@api_router.post("/inventory-requests")
async def create_inventory_request(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Request inventory item"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    request_doc = {
        "request_id": f"req_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "item_id": data['item_id'],
        "quantity": data['quantity'],
        "reason": data['reason'],
        "status": "Pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.inventory_requests.insert_one(request_doc)
    return {"message": "Request submitted"}

@api_router.get("/inventory-requests")
async def get_inventory_requests(session_token: Optional[str] = Cookie(None)):
    """Get inventory requests"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.role in ['Admin', 'HR']:
        requests = await db.inventory_requests.find({}, {"_id": 0}).to_list(1000)
    else:
        requests = await db.inventory_requests.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    
    return requests

@api_router.patch("/inventory-requests/{request_id}")
async def update_inventory_request(request_id: str, data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Approve/reject inventory request"""
    user = await get_user_from_token(session_token)
    if not user or user.role not in ['Admin', 'HR']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.inventory_requests.update_one(
        {"request_id": request_id},
        {"$set": {"status": data['status']}}
    )
    
    return {"message": "Request updated"}

# ==================== EQUIPMENT SCHEDULING ====================

@api_router.post("/equipment-bookings")
async def create_booking(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Book equipment"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    booking_doc = {
        "booking_id": f"book_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "equipment_name": data['equipment_name'],
        "start_time": data['start_time'],
        "end_time": data['end_time'],
        "purpose": data['purpose'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.equipment_bookings.insert_one(booking_doc)
    return {"message": "Equipment booked"}

@api_router.get("/equipment-bookings")
async def get_bookings(session_token: Optional[str] = Cookie(None)):
    """Get equipment bookings"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    bookings = await db.equipment_bookings.find({}, {"_id": 0}).to_list(1000)
    return bookings

# ==================== CHAT ====================

@api_router.post("/chat/groups")
async def create_chat_group(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Create chat group (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can create groups")
    
    group_doc = {
        "group_id": f"grp_{uuid.uuid4().hex[:12]}",
        "name": data['name'],
        "created_by": user.user_id,
        "members": data.get('members', []),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_groups.insert_one(group_doc)
    return {"message": "Group created", "group_id": group_doc['group_id']}

@api_router.get("/chat/groups")
async def get_chat_groups(session_token: Optional[str] = Cookie(None)):
    """Get chat groups"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    groups = await db.chat_groups.find({}, {"_id": 0}).to_list(1000)
    return groups

@api_router.delete("/chat/groups/{group_id}")
async def delete_chat_group(group_id: str, session_token: Optional[str] = Cookie(None)):
    """Delete chat group (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can delete groups")
    
    await db.chat_groups.delete_one({"group_id": group_id})
    await db.chat_messages.delete_many({"group_id": group_id})
    return {"message": "Group deleted"}

@api_router.post("/chat/messages")
async def send_message(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Send chat message"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    message_doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "group_id": data['group_id'],
        "user_id": user.user_id,
        "user_name": user.name,
        "content": data['content'],
        "file_url": data.get('file_url'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_messages.insert_one(message_doc)
    return {"message": "Message sent"}

@api_router.get("/chat/messages/{group_id}")
async def get_messages(group_id: str, session_token: Optional[str] = Cookie(None)):
    """Get messages in a group"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    messages = await db.chat_messages.find({"group_id": group_id}, {"_id": 0}).sort([("created_at", 1)]).to_list(1000)
    return messages

# ==================== CALENDAR ====================

@api_router.post("/calendar/events")
async def create_event(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Create calendar event (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can create events")
    
    event_doc = {
        "event_id": f"evt_{uuid.uuid4().hex[:12]}",
        "title": data['title'],
        "description": data['description'],
        "start_time": data['start_time'],
        "end_time": data['end_time'],
        "attendees": data.get('attendees', []),
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.calendar_events.insert_one(event_doc)
    
    # TODO: Send email notifications to attendees
    # TODO: Schedule automated reminders (24h and 1h before)
    
    return {"message": "Event created", "event_id": event_doc['event_id']}

@api_router.get("/calendar/events")
async def get_events(session_token: Optional[str] = Cookie(None)):
    """Get calendar events"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    events = await db.calendar_events.find({}, {"_id": 0}).to_list(1000)
    return events

# ==================== HELPDESK ====================

@api_router.post("/helpdesk/tickets")
async def create_ticket(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Create helpdesk ticket"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    ticket_doc = {
        "ticket_id": f"tick_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "subject": data['subject'],
        "description": data['description'],
        "category": data['category'],
        "status": "Open",
        "priority": data.get('priority', 'Medium'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.helpdesk_tickets.insert_one(ticket_doc)
    return {"message": "Ticket created", "ticket_id": ticket_doc['ticket_id']}

@api_router.get("/helpdesk/tickets")
async def get_tickets(session_token: Optional[str] = Cookie(None)):
    """Get helpdesk tickets"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.role in ['Admin', 'HR']:
        tickets = await db.helpdesk_tickets.find({}, {"_id": 0}).to_list(1000)
    else:
        tickets = await db.helpdesk_tickets.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    
    return tickets

@api_router.patch("/helpdesk/tickets/{ticket_id}")
async def update_ticket(ticket_id: str, data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Update ticket status"""
    user = await get_user_from_token(session_token)
    if not user or user.role not in ['Admin', 'HR']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.helpdesk_tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": data}
    )
    
    return {"message": "Ticket updated"}

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(session_token: Optional[str] = Cookie(None)):
    """Get dashboard statistics"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    stats = {
        "total_employees": await db.employees.count_documents({}),
        "pending_leave_requests": await db.leave_requests.count_documents({"status": "Pending"}),
        "open_tickets": await db.helpdesk_tickets.count_documents({"status": "Open"}),
        "pending_payment_requests": await db.payment_requests.count_documents({"status": "Pending"}),
        "active_projects": await db.projects.count_documents({"status": {"$ne": "Done"}}),
        "inventory_items": await db.inventory.count_documents({})
    }
    
    return stats

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
