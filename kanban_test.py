#!/usr/bin/env python3
"""
Quick test for Kanban API fix
"""

import requests
import json

BASE_URL = "https://edit-central-3.preview.emergentagent.com/api"
TEST_EMAIL = "shahebaz.kazi@nucleovir.com"
TEST_PASSWORD = "JgCMqw5uUWvF"

# Login first
session = requests.Session()
login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
login_response = session.post(f"{BASE_URL}/auth/login", json=login_data)

if login_response.status_code == 200:
    print("✅ Login successful")
    
    # Test GET columns
    get_response = session.get(f"{BASE_URL}/kanban/columns")
    print(f"GET columns status: {get_response.status_code}")
    
    if get_response.status_code == 200:
        print("✅ GET columns working")
        
        # Test POST new column
        new_column = {"name": "Testing", "order": 10}
        post_response = session.post(f"{BASE_URL}/kanban/columns", json=new_column)
        print(f"POST column status: {post_response.status_code}")
        
        if post_response.status_code == 200:
            print("✅ POST column fixed!")
            result = post_response.json()
            print(f"Created column: {result}")
            
            # Test DELETE
            col_id = result['column']['id']
            delete_response = session.delete(f"{BASE_URL}/kanban/columns/{col_id}")
            print(f"DELETE status: {delete_response.status_code}")
            
            if delete_response.status_code == 200:
                print("✅ DELETE column working")
            else:
                print(f"❌ DELETE failed: {delete_response.text}")
        else:
            print(f"❌ POST still failing: {post_response.text}")
    else:
        print(f"❌ GET failed: {get_response.text}")
else:
    print(f"❌ Login failed: {login_response.text}")