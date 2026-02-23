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

class StationaryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_id: str
    name: str
    category: str  # Pens, Notebooks, Lab Stationery, Office Supplies
    quantity: int
    unit: str
    min_stock_level: int
    location: str
    created_at: datetime

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    task_id: str
    title: str
    description: str
    assigned_to: str  # employee_id or user_id
    assigned_by: str  # user_id
    due_date: str
    priority: str  # Low, Medium, High
    status: str  # Today, In Progress, Completed
    created_at: datetime

class Announcement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    announcement_id: str
    title: str
    message: str
    type: str  # Meeting, General, Urgent
    created_by: str  # user_id
    created_at: datetime

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

# Email/Password Login Model
class LoginRequest(BaseModel):
    email: str
    password: str

# Password hashing with bcrypt
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@api_router.post("/auth/login")
async def login_with_password(login_data: LoginRequest, response: Response):
    """Email/password login - users must be pre-created in database"""
    email = login_data.email.lower().strip()
    password = login_data.password
    
    # Find user by email
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password with bcrypt
    stored_hash = user_doc.get("password_hash", "")
    if not stored_hash or not pwd_context.verify(password, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if must change password
    must_change = user_doc.get("must_change_password", False)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7*24*60*60,
        path="/",
        secure=True,
        httponly=True,
        samesite="none"
    )
    
    return {
        "user_id": user_doc["user_id"],
        "email": user_doc["email"],
        "name": user_doc.get("name", ""),
        "picture": user_doc.get("picture", ""),
        "role": user_doc.get("role", "Employee"),
        "session_token": session_token,
        "must_change_password": must_change
    }

@api_router.get("/auth/session-data")
async def get_session_data(session_id: str):
    """Exchange session_id for user data from Emergent Auth"""
    import httpx
    
    logger.info(f"Processing session exchange for session_id: {session_id[:20]}...")
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        try:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            logger.info(f"Auth response status: {response.status_code}")
            
            if response.status_code == 404:
                error_data = response.json()
                logger.error(f"Auth 404 response: {error_data}")
                raise HTTPException(status_code=401, detail="Session expired or invalid. Please try logging in again.")
            
            response.raise_for_status()
            data = response.json()
            logger.info(f"Auth successful for email: {data.get('email', 'unknown')}")
            
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
            logger.error(f"Auth HTTP error: {str(e)}, Response: {e.response.text if hasattr(e, 'response') and e.response else 'No response'}")
            raise HTTPException(status_code=401, detail="Invalid session")
        except Exception as e:
            logger.error(f"Auth unexpected error: {str(e)}")
            raise HTTPException(status_code=401, detail="Authentication failed")

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

@api_router.get("/attendance/export")
async def export_attendance(session_token: Optional[str] = Cookie(None)):
    """Export attendance data as CSV (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can export attendance data")
    
    # Get all attendance records
    attendance_records = await db.attendance.find({}, {"_id": 0}).to_list(10000)
    
    # Get all employees to map user_id to employee details
    employees = await db.employees.find({}, {"_id": 0}).to_list(1000)
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    
    # Create user_id to employee mapping
    user_map = {}
    for emp in employees:
        if 'user_id' in emp:
            user_map[emp['user_id']] = emp
    
    # Create user_id to user name mapping
    user_name_map = {u['user_id']: u['name'] for u in users}
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Employee Name', 'Employee ID', 'Date', 'Check-in Time', 'Check-out Time', 'Status'])
    
    for record in attendance_records:
        user_id = record.get('user_id', '')
        employee = user_map.get(user_id, {})
        employee_name = employee.get('name', user_name_map.get(user_id, 'Unknown'))
        employee_id = employee.get('employee_id', 'N/A')
        date = record.get('date', '')
        check_in = record.get('check_in', '')
        check_out = record.get('check_out', '')
        status = record.get('status', '')
        
        # Format times if available
        if check_in:
            try:
                check_in = datetime.fromisoformat(check_in).strftime('%H:%M:%S')
            except:
                pass
        if check_out:
            try:
                check_out = datetime.fromisoformat(check_out).strftime('%H:%M:%S')
            except:
                pass
        
        writer.writerow([employee_name, employee_id, date, check_in, check_out, status])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance_export.csv"}
    )

@api_router.get("/attendance/statistics")
async def get_attendance_statistics(
    user_id: Optional[str] = None,
    month: Optional[str] = None,
    session_token: Optional[str] = Cookie(None)
):
    """Get attendance statistics for a user"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # If user_id provided, only admin can view other users
    target_user_id = user_id if user_id and user.role == 'Admin' else user.user_id
    
    # Build query
    query = {"user_id": target_user_id}
    if month:
        # Filter by month (YYYY-MM format)
        query["date"] = {"$regex": f"^{month}"}
    
    # Get attendance records
    records = await db.attendance.find(query, {"_id": 0}).to_list(1000)
    
    # Get leave requests for the same period
    leave_query = {"user_id": target_user_id, "status": "Approved"}
    if month:
        # Filter leaves that fall in this month
        leave_query["$or"] = [
            {"start_date": {"$regex": f"^{month}"}},
            {"end_date": {"$regex": f"^{month}"}}
        ]
    leave_records = await db.leave_requests.find(leave_query, {"_id": 0}).to_list(1000)
    
    # Calculate statistics
    total_days = len(records)
    present_days = len([r for r in records if r.get('status') == 'Present'])
    absent_days = len([r for r in records if r.get('status') == 'Absent'])
    leave_days = len([r for r in records if r.get('status') == 'Leave'])
    
    # Calculate leave days from approved leave requests
    approved_leave_days = 0
    for leave in leave_records:
        try:
            start = datetime.fromisoformat(leave['start_date'])
            end = datetime.fromisoformat(leave['end_date'])
            approved_leave_days += (end - start).days + 1
        except:
            pass
    
    return {
        "user_id": target_user_id,
        "month": month,
        "total_days": total_days,
        "present_days": present_days,
        "absent_days": absent_days,
        "leave_days": leave_days,
        "approved_leave_days": approved_leave_days,
        "attendance_rate": round((present_days / total_days * 100) if total_days > 0 else 0, 2),
        "records": records
    }

@api_router.get("/attendance/search")
async def search_attendance(
    user_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    session_token: Optional[str] = Cookie(None)
):
    """Search attendance records by date range"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # If user_id provided, only admin can view other users
    target_user_id = user_id if user_id and user.role == 'Admin' else user.user_id
    
    query = {"user_id": target_user_id}
    
    # Add date range filter
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["date"] = {"$gte": start_date}
    elif end_date:
        query["date"] = {"$lte": end_date}
    
    records = await db.attendance.find(query, {"_id": 0}).sort([("date", -1)]).to_list(1000)
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

@api_router.delete("/inventory-requests/{request_id}")
async def delete_inventory_request(request_id: str, session_token: Optional[str] = Cookie(None)):
    """Delete inventory request (Admin/HR or request owner)"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get request to check ownership
    request = await db.inventory_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Allow Admin/HR or the person who created the request to delete
    if user.role not in ['Admin', 'HR'] and request['user_id'] != user.user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own requests")
    
    result = await db.inventory_requests.delete_one({"request_id": request_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {"message": "Request deleted successfully"}

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

# ==================== ANNOUNCEMENTS ====================

@api_router.post("/announcements")
async def create_announcement(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Create announcement (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can create announcements")
    
    announcement_doc = {
        "announcement_id": f"ann_{uuid.uuid4().hex[:12]}",
        "title": data['title'],
        "message": data['message'],
        "type": data.get('type', 'General'),
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.announcements.insert_one(announcement_doc)
    return {"message": "Announcement created", "announcement_id": announcement_doc['announcement_id']}

@api_router.get("/announcements")
async def get_announcements(session_token: Optional[str] = Cookie(None)):
    """Get all announcements"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get recent announcements (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    announcements = await db.announcements.find(
        {"created_at": {"$gte": thirty_days_ago}},
        {"_id": 0}
    ).sort([("created_at", -1)]).to_list(100)
    
    return announcements

@api_router.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, session_token: Optional[str] = Cookie(None)):
    """Delete announcement (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can delete announcements")
    
    result = await db.announcements.delete_one({"announcement_id": announcement_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    return {"message": "Announcement deleted successfully"}

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications")
async def get_notifications(session_token: Optional[str] = Cookie(None)):
    """Get notifications for current user"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    notifications = []
    
    # Get announcements
    announcements = await db.announcements.find({}, {"_id": 0}).sort([("created_at", -1)]).limit(5).to_list(5)
    for ann in announcements:
        notifications.append({
            "type": "announcement",
            "title": ann['title'],
            "message": ann['message'],
            "announcement_type": ann.get('type', 'General'),
            "created_at": ann['created_at']
        })
    
    # If admin, add pending requests
    if user.role in ['Admin', 'HR', 'Accountant']:
        pending_leaves = await db.leave_requests.count_documents({"status": "Pending"})
        if pending_leaves > 0:
            notifications.append({
                "type": "pending_request",
                "title": "Pending Leave Requests",
                "message": f"{pending_leaves} leave request(s) pending approval",
                "count": pending_leaves,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        pending_inventory = await db.inventory_requests.count_documents({"status": "Pending"})
        if pending_inventory > 0:
            notifications.append({
                "type": "pending_request",
                "title": "Pending Inventory Requests",
                "message": f"{pending_inventory} inventory request(s) pending approval",
                "count": pending_inventory,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        if user.role in ['Admin', 'Accountant']:
            pending_payments = await db.payment_requests.count_documents({"status": "Pending"})
            if pending_payments > 0:
                notifications.append({
                    "type": "pending_request",
                    "title": "Pending Payment Requests",
                    "message": f"{pending_payments} payment request(s) pending approval",
                    "count": pending_payments,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
        
        # Low stock alerts
        low_stock_items = []
        items = await db.stationary.find({}, {"_id": 0}).to_list(1000)
        for item in items:
            if item['quantity'] <= item['min_stock_level']:
                low_stock_items.append(item['name'])
        
        if low_stock_items:
            notifications.append({
                "type": "alert",
                "title": "Low Stock Alert",
                "message": f"{len(low_stock_items)} item(s) running low: {', '.join(low_stock_items[:3])}{'...' if len(low_stock_items) > 3 else ''}",
                "count": len(low_stock_items),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    return notifications

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

# ==================== STATIONARY INVENTORY ====================

@api_router.post("/stationary")
async def create_stationary_item(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Create stationary item (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can add stationary items")
    
    item_doc = {
        "item_id": f"stat_{uuid.uuid4().hex[:12]}",
        "name": data['name'],
        "category": data['category'],
        "quantity": data['quantity'],
        "unit": data['unit'],
        "min_stock_level": data.get('min_stock_level', 10),
        "location": data.get('location', ''),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.stationary.insert_one(item_doc)
    return {"message": "Item added", "item_id": item_doc['item_id']}

@api_router.get("/stationary")
async def get_stationary(session_token: Optional[str] = Cookie(None)):
    """Get all stationary items"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    items = await db.stationary.find({}, {"_id": 0}).to_list(1000)
    return items

@api_router.put("/stationary/{item_id}")
async def update_stationary_item(item_id: str, data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Update stationary item (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can update stationary items")
    
    result = await db.stationary.update_one(
        {"item_id": item_id},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item updated successfully"}

@api_router.delete("/stationary/{item_id}")
async def delete_stationary_item(item_id: str, session_token: Optional[str] = Cookie(None)):
    """Delete stationary item (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can delete stationary items")
    
    result = await db.stationary.delete_one({"item_id": item_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item deleted successfully"}

# ==================== WORK ASSIGNMENTS / TASKS ====================

@api_router.post("/tasks")
async def create_task(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Create task (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can create tasks")
    
    task_doc = {
        "task_id": f"task_{uuid.uuid4().hex[:12]}",
        "title": data['title'],
        "description": data['description'],
        "assigned_to": data['assigned_to'],
        "assigned_by": user.user_id,
        "due_date": data['due_date'],
        "priority": data.get('priority', 'Medium'),
        "status": data.get('status', 'Today'),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tasks.insert_one(task_doc)
    return {"message": "Task created", "task_id": task_doc['task_id']}

@api_router.get("/tasks")
async def get_tasks(session_token: Optional[str] = Cookie(None)):
    """Get tasks (Admins see all, Employees see only their tasks)"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if user.role == 'Admin':
        tasks = await db.tasks.find({}, {"_id": 0}).to_list(1000)
    else:
        tasks = await db.tasks.find({"assigned_to": user.user_id}, {"_id": 0}).to_list(1000)
    
    return tasks

@api_router.get("/tasks/{employee_id}")
async def get_tasks_by_employee(employee_id: str, session_token: Optional[str] = Cookie(None)):
    """Get tasks for specific employee (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can view employee tasks")
    
    tasks = await db.tasks.find({"assigned_to": employee_id}, {"_id": 0}).to_list(1000)
    return tasks

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Update task (Admin or assigned employee can update status)"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if user is admin or the assigned employee
    task = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if user.role != 'Admin' and task['assigned_to'] != user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # If employee is updating, only allow status changes
    if user.role != 'Admin':
        allowed_keys = {'status'}
        data = {k: v for k, v in data.items() if k in allowed_keys}
    
    result = await db.tasks.update_one(
        {"task_id": task_id},
        {"$set": data}
    )
    
    return {"message": "Task updated successfully"}

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, session_token: Optional[str] = Cookie(None)):
    """Delete task (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can delete tasks")
    
    result = await db.tasks.delete_one({"task_id": task_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted successfully"}

# Health check endpoint for Kubernetes deployment
@api_router.get("/health")
async def health_check():
    """Health check endpoint for deployment readiness"""
    try:
        # Verify MongoDB connection
        await client.admin.command('ping')
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "disconnected", "error": str(e)}
        )

# ==================== USER PREFERENCES ====================

@api_router.get("/user/preferences")
async def get_user_preferences(session_token: Optional[str] = Cookie(None)):
    """Get user preferences (theme, quick_actions)"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    prefs = await db.user_preferences.find_one({"user_id": user.user_id}, {"_id": 0})
    if not prefs:
        prefs = {
            "user_id": user.user_id,
            "theme": "light",
            "quick_actions": ["mark_attendance", "request_leave", "create_ticket", "request_material"]
        }
    return prefs

@api_router.put("/user/preferences")
async def update_user_preferences(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Update user preferences"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    await db.user_preferences.update_one(
        {"user_id": user.user_id},
        {"$set": data},
        upsert=True
    )
    return {"message": "Preferences updated"}

# ==================== LEAVE BALANCE ====================

@api_router.get("/leave-balance")
async def get_leave_balance(user_id: Optional[str] = None, session_token: Optional[str] = Cookie(None)):
    """Get leave balance for user"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    target_user_id = user_id if user_id and user.role == 'Admin' else user.user_id
    
    # Get or create leave balance
    balance = await db.leave_balances.find_one({"user_id": target_user_id}, {"_id": 0})
    
    if not balance:
        # Create default balance
        current_year = datetime.now().year
        balance = {
            "user_id": target_user_id,
            "year": current_year,
            "earned_leave": {"total": 15, "used": 0, "remaining": 15},
            "casual_leave": {"total": 10, "used": 0, "remaining": 10},
            "sick_leave": {"total": 10, "used": 0, "remaining": 10}
        }
        await db.leave_balances.insert_one(balance)
    
    # Calculate used leaves from approved requests
    approved_leaves = await db.leave_requests.find({
        "user_id": target_user_id,
        "status": "Approved"
    }, {"_id": 0}).to_list(1000)
    
    earned_used = 0
    casual_used = 0
    sick_used = 0
    
    for leave in approved_leaves:
        try:
            start = datetime.fromisoformat(leave['start_date'])
            end = datetime.fromisoformat(leave['end_date'])
            days = (end - start).days + 1
            
            if leave['leave_type'] in ['Earned Leave', 'Privilege Leave', 'EL', 'PL']:
                earned_used += days
            elif leave['leave_type'] in ['Casual Leave', 'CL']:
                casual_used += days
            elif leave['leave_type'] in ['Sick Leave', 'SL']:
                sick_used += days
        except:
            pass
    
    return {
        "user_id": target_user_id,
        "earned_leave": {
            "total": 15,
            "used": earned_used,
            "remaining": max(0, 15 - earned_used)
        },
        "casual_leave": {
            "total": 10,
            "used": casual_used,
            "remaining": max(0, 10 - casual_used)
        },
        "sick_leave": {
            "total": 10,
            "used": sick_used,
            "remaining": max(0, 10 - sick_used)
        }
    }

# ==================== ATTENDANCE CSV UPLOAD ====================

@api_router.post("/attendance/upload-csv")
async def upload_attendance_csv(file: UploadFile = File(...), session_token: Optional[str] = Cookie(None)):
    """Upload biometric attendance CSV (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can upload attendance CSV")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Please upload a CSV file")
    
    contents = await file.read()
    decoded = contents.decode('utf-8')
    
    # Parse CSV - Expected format: Emp ID, Date and Time, In Time, Out Time
    reader = csv.DictReader(io.StringIO(decoded))
    
    imported_count = 0
    errors = []
    
    # Get employee mapping
    employees = await db.employees.find({}, {"_id": 0}).to_list(1000)
    emp_map = {emp['employee_id']: emp for emp in employees}
    
    for row in reader:
        try:
            # Handle different column name variations
            emp_id = row.get('Emp ID') or row.get('Emp id') or row.get('emp_id') or row.get('Employee ID') or ''
            emp_id = emp_id.strip()
            
            date_str = row.get('Date and Time') or row.get('Date') or row.get('date') or ''
            in_time = row.get('In Time') or row.get('in_time') or row.get('Check In') or ''
            out_time = row.get('Out Time') or row.get('out_time') or row.get('Check Out') or ''
            
            if not emp_id or not date_str:
                continue
            
            # Parse date - handle various formats
            try:
                if 'T' in date_str:
                    date_obj = datetime.fromisoformat(date_str.split('T')[0])
                elif ' ' in date_str:
                    date_obj = datetime.strptime(date_str.split(' ')[0], '%Y-%m-%d')
                else:
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                date_formatted = date_obj.strftime('%Y-%m-%d')
            except:
                try:
                    date_obj = datetime.strptime(date_str, '%d-%m-%Y')
                    date_formatted = date_obj.strftime('%Y-%m-%d')
                except:
                    errors.append(f"Invalid date format: {date_str}")
                    continue
            
            # Find employee
            employee = emp_map.get(emp_id)
            target_user_id = employee.get('user_id', emp_id) if employee else emp_id
            
            # Parse times
            check_in = None
            check_out = None
            
            if in_time:
                try:
                    check_in = datetime.strptime(f"{date_formatted} {in_time.strip()}", '%Y-%m-%d %H:%M:%S').isoformat()
                except:
                    try:
                        check_in = datetime.strptime(f"{date_formatted} {in_time.strip()}", '%Y-%m-%d %H:%M').isoformat()
                    except:
                        pass
            
            if out_time:
                try:
                    check_out = datetime.strptime(f"{date_formatted} {out_time.strip()}", '%Y-%m-%d %H:%M:%S').isoformat()
                except:
                    try:
                        check_out = datetime.strptime(f"{date_formatted} {out_time.strip()}", '%Y-%m-%d %H:%M').isoformat()
                    except:
                        pass
            
            # Check if record exists
            existing = await db.attendance.find_one({
                "user_id": target_user_id,
                "date": date_formatted
            })
            
            if existing:
                # Update existing record
                await db.attendance.update_one(
                    {"attendance_id": existing['attendance_id']},
                    {"$set": {
                        "check_in": check_in or existing.get('check_in'),
                        "check_out": check_out or existing.get('check_out'),
                        "status": "Present"
                    }}
                )
            else:
                # Create new record
                attendance_doc = {
                    "attendance_id": f"att_{uuid.uuid4().hex[:12]}",
                    "user_id": target_user_id,
                    "employee_id": emp_id,
                    "date": date_formatted,
                    "status": "Present",
                    "check_in": check_in,
                    "check_out": check_out,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "source": "csv_upload"
                }
                await db.attendance.insert_one(attendance_doc)
            
            imported_count += 1
            
        except Exception as e:
            errors.append(str(e))
    
    return {
        "message": f"Imported {imported_count} attendance records",
        "imported_count": imported_count,
        "errors": errors[:10] if errors else []
    }

# ==================== KANBAN BOARD COLUMNS ====================

@api_router.get("/kanban/columns")
async def get_kanban_columns(session_token: Optional[str] = Cookie(None)):
    """Get kanban board columns"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    columns = await db.kanban_columns.find({}, {"_id": 0}).sort([("order", 1)]).to_list(100)
    
    if not columns:
        # Create default columns
        default_columns = [
            {"id": "backlog", "name": "Backlog", "order": 0},
            {"id": "today", "name": "Today", "order": 1},
            {"id": "in-progress", "name": "In Progress", "order": 2},
            {"id": "review", "name": "Review", "order": 3},
            {"id": "completed", "name": "Completed", "order": 4}
        ]
        for col in default_columns:
            await db.kanban_columns.insert_one(col)
        columns = default_columns
    
    return columns

@api_router.post("/kanban/columns")
async def create_kanban_column(data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Create kanban column (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can create columns")
    
    column_doc = {
        "id": data.get('id', f"col_{uuid.uuid4().hex[:8]}"),
        "name": data['name'],
        "order": data.get('order', 99)
    }
    
    await db.kanban_columns.insert_one(column_doc)
    return {"message": "Column created", "column": column_doc}

@api_router.delete("/kanban/columns/{column_id}")
async def delete_kanban_column(column_id: str, session_token: Optional[str] = Cookie(None)):
    """Delete kanban column (Admin only)"""
    user = await get_user_from_token(session_token)
    if not user or user.role != 'Admin':
        raise HTTPException(status_code=403, detail="Only admins can delete columns")
    
    # Check column count
    count = await db.kanban_columns.count_documents({})
    if count <= 3:
        raise HTTPException(status_code=400, detail="Cannot delete column. Minimum 3 columns required.")
    
    await db.kanban_columns.delete_one({"id": column_id})
    return {"message": "Column deleted"}

# ==================== ENHANCED LAB NOTEBOOK ====================

@api_router.put("/lab-notebook/{entry_id}")
async def update_notebook_entry(entry_id: str, data: Dict[str, Any], session_token: Optional[str] = Cookie(None)):
    """Update lab notebook entry with version tracking"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get existing entry
    entry = await db.lab_notebook.find_one({"entry_id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Save version to history
    current_version = entry.get('version', 1)
    version_doc = {
        "version_id": f"ver_{uuid.uuid4().hex[:12]}",
        "entry_id": entry_id,
        "version": current_version,
        "title": entry.get('title'),
        "content": entry.get('content'),
        "tags": entry.get('tags'),
        "modified_by": user.user_id,
        "modified_by_name": user.name,
        "modified_at": datetime.now(timezone.utc).isoformat(),
        "change_summary": f"Updated by {user.name}"
    }
    await db.lab_notebook_versions.insert_one(version_doc)
    
    # Update entry
    update_data = {
        "title": data.get('title', entry['title']),
        "content": data.get('content', entry['content']),
        "tags": data.get('tags', entry.get('tags', [])),
        "version": current_version + 1,
        "last_modified_by": user.user_id,
        "last_modified_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.lab_notebook.update_one(
        {"entry_id": entry_id},
        {"$set": update_data}
    )
    
    return {"message": "Entry updated", "version": current_version + 1}

@api_router.get("/lab-notebook/{entry_id}/history")
async def get_notebook_history(entry_id: str, session_token: Optional[str] = Cookie(None)):
    """Get version history for a lab notebook entry"""
    user = await get_user_from_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    versions = await db.lab_notebook_versions.find(
        {"entry_id": entry_id},
        {"_id": 0}
    ).sort([("version", -1)]).to_list(100)
    
    return versions

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
