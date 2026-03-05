# create_users_fixed.py
# One-time user creation script for Nucleo-vir Therapeutics Portal
import os
import secrets
import string
import datetime
from passlib.context import CryptContext
from pymongo import MongoClient

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "nucleovir_portal")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
users = db.users

def gen_password(length=12):
    """Generate secure temporary password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%&*?"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def create_user(email, role, name=None):
    """Create or update user with given role"""
    password = gen_password(12)
    hashed = pwd_ctx.hash(password)
    
    if name is None:
        name = email.split("@")[0].replace(".", " ").title()
    
    user_doc = {
        "user_id": "user_" + secrets.token_hex(6),
        "email": email.lower(),
        "name": name,
        "role": role,
        "password_hash": hashed,
        "must_change_password": True,
        "created_at": datetime.datetime.utcnow(),
        "updated_at": datetime.datetime.utcnow()
    }
    
    # Upsert - update if exists, insert if not
    users.update_one(
        {"email": user_doc["email"]}, 
        {"$set": user_doc}, 
        upsert=True
    )
    return email, password, role

# Role Assignments:
# - CA: nikita@nucleovir.com (procurement full access)
# - Admin: yogesh, ayush, sunil, shahebaz (system-wide access + they are also directors in backend config)
# - Employee: all other staff

# Note: yogesh, sunil, ayush are configured as DIRECTORS in procurement.py 
# so they can approve/reject even with Admin role

print("=" * 70)
print("NUCLEO-VIR THERAPEUTICS - USER CREATION SCRIPT")
print("=" * 70)
print()

created = []

# CA - Procurement full access
print("Creating CA account...")
created.append(create_user("nikita@nucleovir.com", "CA", "Nikita"))

# Admins - System-wide access (these users are also directors via DIRECTORS list in procurement.py)
print("Creating Admin accounts...")
created.append(create_user("yogesh.ostwal@nucleovir.com", "Admin", "Yogesh Ostwal"))
created.append(create_user("ayush@nucleovir.com", "Admin", "Ayush"))
created.append(create_user("Sunil.k@nucleovir.com", "Admin", "Sunil K"))
created.append(create_user("shahebaz.kazi@nucleovir.com", "Admin", "Shahebaz Kazi"))

# Employees - Normal access
print("Creating Employee accounts...")
created.append(create_user("adwait.joshi@nucleovir.com", "Employee", "Adwait Joshi"))
created.append(create_user("apurva.kochar@nucleovir.com", "Employee", "Apurva Kochar"))
created.append(create_user("Sayali.Chakre@nucleovir.com", "Employee", "Sayali Chakre"))
created.append(create_user("jayesh.daga@nucleovir.com", "Employee", "Jayesh Daga"))
created.append(create_user("Aruna@nucleovir.com", "Employee", "Aruna"))
created.append(create_user("khushi.rathi@nucleovir.com", "Employee", "Khushi Rathi"))
created.append(create_user("yashika.bramhankar@nucleovir.com", "Employee", "Yashika Bramhankar"))
created.append(create_user("prapti.subhedar@nucleovir.com", "Employee", "Prapti Subhedar"))
created.append(create_user("darshana.ghebad@nucleovir.com", "Employee", "Darshana Ghebad"))
created.append(create_user("rutuja.thul@nucleovir.com", "Employee", "Rutuja Thul"))

print()
print("=" * 70)
print("CREATED USERS AND TEMPORARY PASSWORDS")
print("=" * 70)
print()
print(f"{'EMAIL':<45} {'ROLE':<12} PASSWORD")
print("-" * 70)
for email, pwd, role in created:
    print(f"{email:<45} {role:<12} {pwd}")
print("-" * 70)
print()
print("IMPORTANT: All users have must_change_password=true")
print("           Users must reset password on first login")
print()
print(f"Total users created/updated: {len(created)}")
print("=" * 70)

client.close()
