# create_nucleovir_users.py
import os, secrets, string, datetime
from passlib.context import CryptContext
from pymongo import MongoClient

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "nucleovir_portal")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
users = db.users

def gen_password(length=12):
    alphabet = string.ascii_letters + string.digits + "!@#$%&*?"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def create_user(email, role):
    password = gen_password(12)
    hashed = pwd_ctx.hash(password)
    user_doc = {
        "user_id": "user_" + secrets.token_hex(6),
        "email": email.lower(),
        "name": email.split("@")[0],
        "role": role,
        "password_hash": hashed,
        "must_change_password": True,
        "created_at": datetime.datetime.utcnow()
    }
    users.update_one({"email": user_doc["email"]}, {"$set": user_doc}, upsert=True)
    return email, password

admins = [
  "yogesh.ostwal@nucleovir.com",
  "ayush@nucleovir.com",
  "Sunil.k@nucleovir.com",
  "shahebaz.kazi@nucleovir.com",
  "nikita@nucleovir.com"
]

directors = [
  "yogesh.ostwal@nucleovir.com",
  "Sunil.k@nucleovir.com",
  "ayush@nucleovir.com"
]

ca = ["nikita@nucleovir.com"]

employees = [
  "adwait.joshi@nucleovir.com",
  "apurva.kochar@nucleovir.com",
  "Sayali.Chakre@nucleovir.com",
  "jayesh.daga@nucleovir.com",
  "Aruna@nucleovir.com",
  "khushi.rathi@nucleovir.com",
  "yashika.bramhankar@nucleovir.com",
  "prapti.subhedar@nucleovir.com",
  "darshana.ghebad@nucleovir.com",
  "rutuja.thul@nucleovir.com"
]

created = []
for a in admins:
    created.append(create_user(a, "Admin"))
for d in directors:
    created.append(create_user(d, "Director"))
for c in ca:
    created.append(create_user(c, "CA"))
for e in employees:
    created.append(create_user(e, "Employee"))

print("Created users and temporary passwords:")
for email, pwd in created:
    print(f"{email}  ->  {pwd}")
