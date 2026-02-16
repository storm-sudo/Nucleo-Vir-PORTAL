"""
Backend API Tests for Nucleo-vir Therapeutics Portal
Tests all major API endpoints including auth, employees, attendance, leave, projects, etc.
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test session token created via mongosh
TEST_SESSION_TOKEN = "test_session_admin_1771239739268"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Cookie": f"session_token={TEST_SESSION_TOKEN}"
    })
    return session


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_check(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_auth_me_with_valid_session(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "role" in data
        assert data["role"] == "Admin"
    
    def test_auth_me_without_session(self):
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401


class TestDashboardEndpoints:
    """Dashboard stats endpoint tests"""
    
    def test_dashboard_stats(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_employees" in data
        assert "pending_leave_requests" in data
        assert "open_tickets" in data
        assert "pending_payment_requests" in data
        assert "active_projects" in data
        assert "inventory_items" in data


class TestEmployeesCRUD:
    """Employee management CRUD tests"""
    
    created_employee_id = None
    
    def test_create_employee(self, api_client):
        payload = {
            "name": "TEST_Employee_" + str(datetime.now().timestamp()),
            "email": f"test.employee.{datetime.now().timestamp()}@nucleovir.com",
            "role": "Employee",
            "department": "Research",
            "phone": "1234567890"
        }
        response = api_client.post(f"{BASE_URL}/api/employees", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "employee_id" in data
        assert data["message"] == "Employee created successfully"
        TestEmployeesCRUD.created_employee_id = data["employee_id"]
    
    def test_get_employees_list(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/employees")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_employee_by_id(self, api_client):
        if not TestEmployeesCRUD.created_employee_id:
            pytest.skip("No employee created")
        response = api_client.get(f"{BASE_URL}/api/employees/{TestEmployeesCRUD.created_employee_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["employee_id"] == TestEmployeesCRUD.created_employee_id
    
    def test_update_employee(self, api_client):
        if not TestEmployeesCRUD.created_employee_id:
            pytest.skip("No employee created")
        payload = {"department": "Development"}
        response = api_client.put(
            f"{BASE_URL}/api/employees/{TestEmployeesCRUD.created_employee_id}",
            json=payload
        )
        assert response.status_code == 200
        
        # Verify update persisted
        get_response = api_client.get(f"{BASE_URL}/api/employees/{TestEmployeesCRUD.created_employee_id}")
        assert get_response.json()["department"] == "Development"
    
    def test_delete_employee(self, api_client):
        if not TestEmployeesCRUD.created_employee_id:
            pytest.skip("No employee created")
        response = api_client.delete(f"{BASE_URL}/api/employees/{TestEmployeesCRUD.created_employee_id}")
        assert response.status_code == 200
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/employees/{TestEmployeesCRUD.created_employee_id}")
        assert get_response.status_code == 404


class TestAttendanceEndpoints:
    """Attendance endpoint tests"""
    
    def test_mark_attendance(self, api_client):
        payload = {"status": "Present"}
        response = api_client.post(f"{BASE_URL}/api/attendance", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Attendance marked"
    
    def test_get_attendance_heatmap(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/attendance/heatmap")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_attendance_statistics(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/attendance/statistics")
        assert response.status_code == 200
        data = response.json()
        assert "total_days" in data
        assert "present_days" in data
        assert "attendance_rate" in data
    
    def test_search_attendance(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/attendance/search")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestLeaveRequestsCRUD:
    """Leave requests CRUD tests"""
    
    created_leave_id = None
    
    def test_create_leave_request(self, api_client):
        payload = {
            "leave_type": "Casual",
            "start_date": "2026-02-20",
            "end_date": "2026-02-21",
            "reason": "TEST_Personal work"
        }
        response = api_client.post(f"{BASE_URL}/api/leave-requests", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Leave request submitted"
    
    def test_get_leave_requests(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/leave-requests")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Store leave_id for update test
        if data:
            TestLeaveRequestsCRUD.created_leave_id = data[-1].get("leave_id")
    
    def test_update_leave_request_status(self, api_client):
        if not TestLeaveRequestsCRUD.created_leave_id:
            pytest.skip("No leave request found")
        payload = {"status": "Approved"}
        response = api_client.patch(
            f"{BASE_URL}/api/leave-requests/{TestLeaveRequestsCRUD.created_leave_id}",
            json=payload
        )
        assert response.status_code == 200


class TestProjectsCRUD:
    """Projects CRUD tests"""
    
    created_project_id = None
    
    def test_create_project(self, api_client):
        payload = {
            "title": "TEST_Project_" + str(datetime.now().timestamp()),
            "description": "Test project description",
            "status": "Todo"
        }
        response = api_client.post(f"{BASE_URL}/api/projects", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "project_id" in data
        TestProjectsCRUD.created_project_id = data["project_id"]
    
    def test_get_projects(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_project(self, api_client):
        if not TestProjectsCRUD.created_project_id:
            pytest.skip("No project created")
        payload = {"status": "In Progress"}
        response = api_client.patch(
            f"{BASE_URL}/api/projects/{TestProjectsCRUD.created_project_id}",
            json=payload
        )
        assert response.status_code == 200
    
    def test_delete_project(self, api_client):
        if not TestProjectsCRUD.created_project_id:
            pytest.skip("No project created")
        response = api_client.delete(f"{BASE_URL}/api/projects/{TestProjectsCRUD.created_project_id}")
        assert response.status_code == 200


class TestLabNotebookCRUD:
    """Lab notebook CRUD tests"""
    
    created_entry_id = None
    
    def test_create_notebook_entry(self, api_client):
        payload = {
            "title": "TEST_Experiment_" + str(datetime.now().timestamp()),
            "content": "Test experiment content",
            "tags": ["test", "experiment"]
        }
        response = api_client.post(f"{BASE_URL}/api/lab-notebook", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "entry_id" in data
        TestLabNotebookCRUD.created_entry_id = data["entry_id"]
    
    def test_get_notebook_entries(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/lab-notebook")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_notebook_entry(self, api_client):
        if not TestLabNotebookCRUD.created_entry_id:
            pytest.skip("No entry created")
        response = api_client.delete(f"{BASE_URL}/api/lab-notebook/{TestLabNotebookCRUD.created_entry_id}")
        assert response.status_code == 200


class TestInventoryEndpoints:
    """Lab inventory endpoint tests"""
    
    created_item_id = None
    
    def test_create_inventory_item(self, api_client):
        payload = {
            "name": "TEST_Reagent_" + str(datetime.now().timestamp()),
            "category": "Reagent",
            "quantity": 100,
            "unit": "ml",
            "location": "Lab A"
        }
        response = api_client.post(f"{BASE_URL}/api/inventory", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "item_id" in data
        TestInventoryEndpoints.created_item_id = data["item_id"]
    
    def test_get_inventory(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/inventory")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_inventory_item(self, api_client):
        if not TestInventoryEndpoints.created_item_id:
            pytest.skip("No item created")
        response = api_client.delete(f"{BASE_URL}/api/inventory/{TestInventoryEndpoints.created_item_id}")
        assert response.status_code == 200


class TestStationaryEndpoints:
    """Stationary inventory endpoint tests"""
    
    created_item_id = None
    
    def test_create_stationary_item(self, api_client):
        payload = {
            "name": "TEST_Pen_" + str(datetime.now().timestamp()),
            "category": "Pens",
            "quantity": 50,
            "unit": "pieces",
            "min_stock_level": 10,
            "location": "Office"
        }
        response = api_client.post(f"{BASE_URL}/api/stationary", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "item_id" in data
        TestStationaryEndpoints.created_item_id = data["item_id"]
    
    def test_get_stationary(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/stationary")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_stationary_item(self, api_client):
        if not TestStationaryEndpoints.created_item_id:
            pytest.skip("No item created")
        response = api_client.delete(f"{BASE_URL}/api/stationary/{TestStationaryEndpoints.created_item_id}")
        assert response.status_code == 200


class TestEquipmentBookings:
    """Equipment booking endpoint tests"""
    
    def test_create_booking(self, api_client):
        payload = {
            "equipment_name": "TEST_Microscope",
            "start_time": "2026-02-20T09:00:00",
            "end_time": "2026-02-20T12:00:00",
            "purpose": "Test experiment"
        }
        response = api_client.post(f"{BASE_URL}/api/equipment-bookings", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Equipment booked"
    
    def test_get_bookings(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/equipment-bookings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestChatEndpoints:
    """Chat endpoint tests"""
    
    created_group_id = None
    
    def test_create_chat_group(self, api_client):
        payload = {
            "name": "TEST_Group_" + str(datetime.now().timestamp()),
            "members": []
        }
        response = api_client.post(f"{BASE_URL}/api/chat/groups", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "group_id" in data
        TestChatEndpoints.created_group_id = data["group_id"]
    
    def test_get_chat_groups(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/chat/groups")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_send_message(self, api_client):
        if not TestChatEndpoints.created_group_id:
            pytest.skip("No group created")
        payload = {
            "group_id": TestChatEndpoints.created_group_id,
            "content": "TEST_Message"
        }
        response = api_client.post(f"{BASE_URL}/api/chat/messages", json=payload)
        assert response.status_code == 200
    
    def test_get_messages(self, api_client):
        if not TestChatEndpoints.created_group_id:
            pytest.skip("No group created")
        response = api_client.get(f"{BASE_URL}/api/chat/messages/{TestChatEndpoints.created_group_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_chat_group(self, api_client):
        if not TestChatEndpoints.created_group_id:
            pytest.skip("No group created")
        response = api_client.delete(f"{BASE_URL}/api/chat/groups/{TestChatEndpoints.created_group_id}")
        assert response.status_code == 200


class TestCalendarEndpoints:
    """Calendar event endpoint tests"""
    
    def test_create_event(self, api_client):
        payload = {
            "title": "TEST_Meeting_" + str(datetime.now().timestamp()),
            "description": "Test meeting",
            "start_time": "2026-02-20T14:00:00",
            "end_time": "2026-02-20T15:00:00",
            "attendees": []
        }
        response = api_client.post(f"{BASE_URL}/api/calendar/events", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "event_id" in data
    
    def test_get_events(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/calendar/events")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestHelpdeskEndpoints:
    """Helpdesk ticket endpoint tests"""
    
    created_ticket_id = None
    
    def test_create_ticket(self, api_client):
        payload = {
            "subject": "TEST_Ticket_" + str(datetime.now().timestamp()),
            "description": "Test ticket description",
            "category": "Technical",
            "priority": "Medium"
        }
        response = api_client.post(f"{BASE_URL}/api/helpdesk/tickets", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "ticket_id" in data
        TestHelpdeskEndpoints.created_ticket_id = data["ticket_id"]
    
    def test_get_tickets(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/helpdesk/tickets")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_ticket(self, api_client):
        if not TestHelpdeskEndpoints.created_ticket_id:
            pytest.skip("No ticket created")
        payload = {"status": "In Progress"}
        response = api_client.patch(
            f"{BASE_URL}/api/helpdesk/tickets/{TestHelpdeskEndpoints.created_ticket_id}",
            json=payload
        )
        assert response.status_code == 200


class TestTasksEndpoints:
    """Work assignments/tasks endpoint tests"""
    
    created_task_id = None
    
    def test_create_task(self, api_client):
        payload = {
            "title": "TEST_Task_" + str(datetime.now().timestamp()),
            "description": "Test task description",
            "assigned_to": "test-admin-1771239739268",
            "due_date": "2026-02-25",
            "priority": "High"
        }
        response = api_client.post(f"{BASE_URL}/api/tasks", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "task_id" in data
        TestTasksEndpoints.created_task_id = data["task_id"]
    
    def test_get_tasks(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/tasks")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_task(self, api_client):
        if not TestTasksEndpoints.created_task_id:
            pytest.skip("No task created")
        payload = {"status": "In Progress"}
        response = api_client.put(
            f"{BASE_URL}/api/tasks/{TestTasksEndpoints.created_task_id}",
            json=payload
        )
        assert response.status_code == 200
    
    def test_delete_task(self, api_client):
        if not TestTasksEndpoints.created_task_id:
            pytest.skip("No task created")
        response = api_client.delete(f"{BASE_URL}/api/tasks/{TestTasksEndpoints.created_task_id}")
        assert response.status_code == 200


class TestAnnouncementsEndpoints:
    """Announcements endpoint tests"""
    
    created_announcement_id = None
    
    def test_create_announcement(self, api_client):
        payload = {
            "title": "TEST_Announcement_" + str(datetime.now().timestamp()),
            "message": "Test announcement message",
            "type": "General"
        }
        response = api_client.post(f"{BASE_URL}/api/announcements", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "announcement_id" in data
        TestAnnouncementsEndpoints.created_announcement_id = data["announcement_id"]
    
    def test_get_announcements(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/announcements")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_delete_announcement(self, api_client):
        if not TestAnnouncementsEndpoints.created_announcement_id:
            pytest.skip("No announcement created")
        response = api_client.delete(
            f"{BASE_URL}/api/announcements/{TestAnnouncementsEndpoints.created_announcement_id}"
        )
        assert response.status_code == 200


class TestNotificationsEndpoint:
    """Notifications endpoint tests"""
    
    def test_get_notifications(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestContactForm:
    """Contact form endpoint tests"""
    
    def test_submit_contact_form(self, api_client):
        payload = {
            "name": "Test User",
            "email": "test@example.com",
            "subject": "Test Subject",
            "message": "Test message content"
        }
        response = api_client.post(f"{BASE_URL}/api/contact", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Form submitted successfully"
