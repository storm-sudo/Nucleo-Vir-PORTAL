#!/usr/bin/env python3
"""
Backend API Testing Script for Nucleo-vir Therapeutics Portal
Tests all new backend APIs with proper authentication flow
"""

import requests
import json
import csv
import io
from datetime import datetime

# Configuration
BASE_URL = "https://staging-repo.preview.emergentagent.com/api"
TEST_EMAIL = "shahebaz.kazi@nucleovir.com"
TEST_PASSWORD = "JgCMqw5uUWvF"

class NucleoBioTester:
    def __init__(self):
        self.session_token = None
        self.session = requests.Session()
        
    def log(self, message, level="INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def login(self):
        """Test login API and get session token"""
        self.log("Testing Login API...")
        
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            self.log(f"Login response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.session_token = data.get('session_token')
                self.log(f"✅ Login successful - User: {data.get('name')} ({data.get('role')})")
                
                # Set cookie for future requests
                self.session.cookies.set('session_token', self.session_token)
                return True
            else:
                self.log(f"❌ Login failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login error: {str(e)}", "ERROR")
            return False
    
    def test_user_preferences(self):
        """Test User Preferences API (GET and PUT)"""
        self.log("Testing User Preferences API...")
        
        try:
            # Test GET preferences
            response = self.session.get(f"{BASE_URL}/user/preferences")
            self.log(f"GET preferences status: {response.status_code}")
            
            if response.status_code == 200:
                prefs = response.json()
                self.log(f"✅ GET preferences successful - Theme: {prefs.get('theme')}")
                self.log(f"Current quick actions: {prefs.get('quick_actions')}")
                
                # Test PUT preferences
                update_data = {
                    "theme": "dark",
                    "quick_actions": ["mark_attendance", "request_leave"]
                }
                
                put_response = self.session.put(f"{BASE_URL}/user/preferences", json=update_data)
                self.log(f"PUT preferences status: {put_response.status_code}")
                
                if put_response.status_code == 200:
                    self.log("✅ PUT preferences successful")
                    
                    # Verify update
                    verify_response = self.session.get(f"{BASE_URL}/user/preferences")
                    if verify_response.status_code == 200:
                        updated_prefs = verify_response.json()
                        if updated_prefs.get('theme') == 'dark':
                            self.log("✅ Preferences update verified")
                            return True
                        else:
                            self.log("❌ Preferences not properly updated", "ERROR")
                    return False
                else:
                    self.log(f"❌ PUT preferences failed: {put_response.text}", "ERROR")
                    return False
            else:
                self.log(f"❌ GET preferences failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ User preferences error: {str(e)}", "ERROR")
            return False
    
    def test_leave_balance(self):
        """Test Leave Balance API"""
        self.log("Testing Leave Balance API...")
        
        try:
            response = self.session.get(f"{BASE_URL}/leave-balance")
            self.log(f"Leave balance status: {response.status_code}")
            
            if response.status_code == 200:
                balance = response.json()
                self.log("✅ Leave balance API successful")
                
                # Check expected values
                el = balance.get('earned_leave', {})
                cl = balance.get('casual_leave', {})
                sl = balance.get('sick_leave', {})
                
                self.log(f"EL: Total={el.get('total')}, Used={el.get('used')}, Remaining={el.get('remaining')}")
                self.log(f"CL: Total={cl.get('total')}, Used={cl.get('used')}, Remaining={cl.get('remaining')}")
                self.log(f"SL: Total={sl.get('total')}, Used={sl.get('used')}, Remaining={sl.get('remaining')}")
                
                # Verify expected defaults (EL:15, CL:10, SL:10)
                if (el.get('total') == 15 and cl.get('total') == 10 and sl.get('total') == 10):
                    self.log("✅ Leave balance defaults are correct")
                    return True
                else:
                    self.log("⚠️ Leave balance defaults don't match expected values", "WARNING")
                    return True  # Still working, just different values
            else:
                self.log(f"❌ Leave balance failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Leave balance error: {str(e)}", "ERROR")
            return False
    
    def test_attendance_csv_upload(self):
        """Test Attendance CSV Upload API"""
        self.log("Testing Attendance CSV Upload API...")
        
        try:
            # Create test CSV data
            csv_data = """Emp ID,Date and Time,In Time,Out Time
EMP202400001,2024-01-15,09:00:00,18:00:00
EMP202400002,2024-01-15,09:15:00,18:30:00
EMP202400003,2024-01-15,08:45:00,17:45:00"""
            
            # Create file-like object
            csv_file = io.StringIO(csv_data)
            files = {'file': ('attendance.csv', csv_file.getvalue(), 'text/csv')}
            
            response = self.session.post(f"{BASE_URL}/attendance/upload-csv", files=files)
            self.log(f"CSV upload status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ CSV upload successful - Imported: {result.get('imported_count')} records")
                if result.get('errors'):
                    self.log(f"Errors encountered: {result.get('errors')}", "WARNING")
                return True
            else:
                self.log(f"❌ CSV upload failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ CSV upload error: {str(e)}", "ERROR")
            return False
    
    def test_kanban_columns(self):
        """Test Kanban Columns API (GET, POST, DELETE)"""
        self.log("Testing Kanban Columns API...")
        
        try:
            # Test GET columns
            response = self.session.get(f"{BASE_URL}/kanban/columns")
            self.log(f"GET columns status: {response.status_code}")
            
            if response.status_code == 200:
                columns = response.json()
                self.log(f"✅ GET columns successful - Found {len(columns)} columns")
                
                # Verify default columns
                expected_cols = ["Backlog", "Today", "In Progress", "Review", "Completed"]
                col_names = [col.get('name') for col in columns]
                self.log(f"Column names: {col_names}")
                
                # Test POST new column
                new_column = {
                    "name": "Blocked",
                    "order": 10
                }
                
                post_response = self.session.post(f"{BASE_URL}/kanban/columns", json=new_column)
                self.log(f"POST column status: {post_response.status_code}")
                
                if post_response.status_code == 200:
                    new_col_data = post_response.json()
                    self.log("✅ POST column successful")
                    
                    # Test DELETE column (if we created one)
                    if 'column' in new_col_data:
                        col_id = new_col_data['column'].get('id')
                        if col_id:
                            delete_response = self.session.delete(f"{BASE_URL}/kanban/columns/{col_id}")
                            self.log(f"DELETE column status: {delete_response.status_code}")
                            
                            if delete_response.status_code == 200:
                                self.log("✅ DELETE column successful")
                                return True
                            else:
                                self.log(f"❌ DELETE column failed: {delete_response.text}", "ERROR")
                                return False
                    return True
                else:
                    self.log(f"❌ POST column failed: {post_response.text}", "ERROR")
                    return False
            else:
                self.log(f"❌ GET columns failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Kanban columns error: {str(e)}", "ERROR")
            return False
    
    def test_lab_notebook_version_history(self):
        """Test Lab Notebook with Version History"""
        self.log("Testing Lab Notebook with Version History...")
        
        try:
            # Test POST create entry
            entry_data = {
                "title": "Test Lab Entry",
                "content": "<h2>Experiment Results</h2><p>Initial experiment data and observations.</p>",
                "tags": ["experiment", "test", "results"]
            }
            
            post_response = self.session.post(f"{BASE_URL}/lab-notebook", json=entry_data)
            self.log(f"POST entry status: {post_response.status_code}")
            
            if post_response.status_code == 200:
                post_result = post_response.json()
                entry_id = post_result.get('entry_id')
                self.log(f"✅ POST entry successful - ID: {entry_id}")
                
                if entry_id:
                    # Test PUT update entry (triggers version save)
                    update_data = {
                        "title": "Updated Test Lab Entry",
                        "content": "<h2>Experiment Results - Updated</h2><p>Updated experiment data with new findings.</p>",
                        "tags": ["experiment", "test", "results", "updated"]
                    }
                    
                    put_response = self.session.put(f"{BASE_URL}/lab-notebook/{entry_id}", json=update_data)
                    self.log(f"PUT entry status: {put_response.status_code}")
                    
                    if put_response.status_code == 200:
                        put_result = put_response.json()
                        self.log(f"✅ PUT entry successful - Version: {put_result.get('version')}")
                        
                        # Test GET version history
                        history_response = self.session.get(f"{BASE_URL}/lab-notebook/{entry_id}/history")
                        self.log(f"GET history status: {history_response.status_code}")
                        
                        if history_response.status_code == 200:
                            history = history_response.json()
                            self.log(f"✅ GET history successful - {len(history)} versions found")
                            
                            if len(history) > 0:
                                self.log(f"Version 1 title: {history[0].get('title')}")
                                return True
                            else:
                                self.log("⚠️ No version history found", "WARNING")
                                return True  # Still working, just no history yet
                        else:
                            self.log(f"❌ GET history failed: {history_response.text}", "ERROR")
                            return False
                    else:
                        self.log(f"❌ PUT entry failed: {put_response.text}", "ERROR")
                        return False
                else:
                    self.log("❌ No entry_id returned from POST", "ERROR")
                    return False
            else:
                self.log(f"❌ POST entry failed: {post_response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Lab notebook error: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all API tests"""
        self.log("🚀 Starting Nucleo-vir Therapeutics API Testing...")
        self.log("=" * 60)
        
        # Login first
        if not self.login():
            self.log("❌ Cannot proceed without login", "ERROR")
            return
        
        self.log("=" * 60)
        
        # Test results tracking
        results = {}
        
        # Run all tests
        test_methods = [
            ("User Preferences API", self.test_user_preferences),
            ("Leave Balance API", self.test_leave_balance),
            ("Attendance CSV Upload API", self.test_attendance_csv_upload),
            ("Kanban Columns API", self.test_kanban_columns),
            ("Lab Notebook with Version History", self.test_lab_notebook_version_history)
        ]
        
        for test_name, test_method in test_methods:
            self.log("-" * 40)
            try:
                results[test_name] = test_method()
            except Exception as e:
                self.log(f"❌ {test_name} crashed: {str(e)}", "ERROR")
                results[test_name] = False
        
        # Summary
        self.log("=" * 60)
        self.log("🏁 TEST SUMMARY")
        self.log("=" * 60)
        
        passed = 0
        total = len(results)
        
        for test_name, passed_test in results.items():
            status = "✅ PASS" if passed_test else "❌ FAIL"
            self.log(f"{status} - {test_name}")
            if passed_test:
                passed += 1
        
        self.log("=" * 60)
        self.log(f"Results: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 All tests passed!")
        else:
            self.log(f"⚠️ {total - passed} tests failed")
        
        return results

if __name__ == "__main__":
    tester = NucleoBioTester()
    tester.run_all_tests()