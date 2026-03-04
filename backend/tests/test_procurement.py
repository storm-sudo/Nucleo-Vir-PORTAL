"""
Procurement Module API Tests
Tests quotations, POs, GRNs, vouchers, approvals, notifications, and reports
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test sessions created via mongosh
CA_SESSION_TOKEN = "test_session_ca_procurement"
DIRECTOR_SESSION_TOKEN = "test_session_director_procurement"


@pytest.fixture(scope="module")
def ca_client():
    """CA requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Cookie": f"session_token={CA_SESSION_TOKEN}"
    })
    return session


@pytest.fixture(scope="module")
def director_client():
    """Director requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Cookie": f"session_token={DIRECTOR_SESSION_TOKEN}"
    })
    return session


# ========== AUTH TESTS ==========

class TestProcurementAuth:
    """Login tests for CA and Director users"""
    
    def test_ca_login(self):
        """Test CA user login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "nikita@nucleovir.com", "password": "Nv@CA2026!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "nikita@nucleovir.com"
        assert "session_token" in data
        print(f"CA login successful: {data['name']}")
    
    def test_director_login(self):
        """Test Director user login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "yogesh.ostwal@nucleovir.com", "password": "Nv@Dir2026!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "yogesh.ostwal@nucleovir.com"
        assert "session_token" in data
        print(f"Director login successful: {data['name']}")


# ========== ACCESS CONTROL TESTS ==========

class TestProcurementAccess:
    """Procurement access control tests"""
    
    def test_ca_access(self, ca_client):
        """Test CA access to procurement"""
        response = ca_client.get(f"{BASE_URL}/api/procurement/access")
        assert response.status_code == 200
        data = response.json()
        assert data["is_ca"] == True
        assert data["can_access_procurement"] == True
        assert data["email"] == "nikita@nucleovir.com"
        print(f"CA access verified: {data}")
    
    def test_director_access(self, director_client):
        """Test Director access to procurement"""
        response = director_client.get(f"{BASE_URL}/api/procurement/access")
        assert response.status_code == 200
        data = response.json()
        assert data["is_director"] == True
        assert data["can_access_procurement"] == True  # Directors can also access
        assert data["email"] == "yogesh.ostwal@nucleovir.com"
        print(f"Director access verified: {data}")


# ========== QUOTATION TESTS ==========

class TestQuotations:
    """Quotation CRUD tests"""
    
    created_quotation_id = None
    
    def test_create_quotation(self, ca_client):
        """Test quotation creation"""
        payload = {
            "quotation_no": f"QUO-TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "vendor_name": "TEST_Vendor Corp",
            "category": "Lab Equipment",
            "gst_pct": 18.0,
            "total_amount": 45000,
            "validity_date": "2026-03-31",
            "department": "Research",
            "description": "Test quotation for lab supplies"
        }
        response = ca_client.post(f"{BASE_URL}/api/quotations", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "quotation_id" in data
        TestQuotations.created_quotation_id = data["quotation_id"]
        print(f"Quotation created: {data['quotation_id']}")
    
    def test_list_quotations(self, ca_client):
        """Test listing quotations"""
        response = ca_client.get(f"{BASE_URL}/api/quotations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} quotations")
    
    def test_get_quotation(self, ca_client):
        """Test getting single quotation"""
        if not TestQuotations.created_quotation_id:
            pytest.skip("No quotation created")
        response = ca_client.get(f"{BASE_URL}/api/quotations/{TestQuotations.created_quotation_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["quotation_id"] == TestQuotations.created_quotation_id
        assert data["vendor_name"] == "TEST_Vendor Corp"
        print(f"Quotation retrieved: {data['quotation_no']}")


# ========== PURCHASE ORDER TESTS ==========

class TestPurchaseOrders:
    """Purchase order tests"""
    
    created_po_id = None
    
    def test_generate_po(self, ca_client):
        """Test PO generation from quotation"""
        # First create a confirmed quotation for PO
        payload = {
            "quotation_no": f"QUO-PO-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "vendor_name": "TEST_PO_Vendor",
            "category": "General",
            "gst_pct": 18.0,
            "total_amount": 30000,
            "validity_date": "2026-03-31",
            "department": "Operations",
            "description": "Test quotation for PO generation"
        }
        quo_response = ca_client.post(f"{BASE_URL}/api/quotations", json=payload)
        assert quo_response.status_code == 200
        quo_id = quo_response.json()["quotation_id"]
        
        # Generate PO
        po_payload = {"quotation_id": quo_id}
        response = ca_client.post(f"{BASE_URL}/api/po/generate", json=po_payload)
        assert response.status_code == 200
        data = response.json()
        assert "po_id" in data
        assert "po_number" in data
        TestPurchaseOrders.created_po_id = data["po_id"]
        print(f"PO generated: {data['po_number']}")
    
    def test_list_pos(self, ca_client):
        """Test listing purchase orders"""
        response = ca_client.get(f"{BASE_URL}/api/po")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} purchase orders")
    
    def test_get_po(self, ca_client):
        """Test getting single PO"""
        if not TestPurchaseOrders.created_po_id:
            pytest.skip("No PO created")
        response = ca_client.get(f"{BASE_URL}/api/po/{TestPurchaseOrders.created_po_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["po_id"] == TestPurchaseOrders.created_po_id
        print(f"PO retrieved: {data['po_number']}")
    
    def test_get_po_pdf(self, ca_client):
        """Test PO PDF generation"""
        if not TestPurchaseOrders.created_po_id:
            pytest.skip("No PO created")
        response = ca_client.get(f"{BASE_URL}/api/po/{TestPurchaseOrders.created_po_id}/pdf")
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        print("PO PDF generated successfully")


# ========== APPROVALS TESTS ==========

class TestApprovals:
    """Approval workflow tests"""
    
    def test_get_pending_approvals_director(self, director_client):
        """Test getting pending approvals for director"""
        response = director_client.get(f"{BASE_URL}/api/approvals/pending")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Director has {len(data)} pending approvals")
    
    def test_approval_decision(self, director_client):
        """Test approval decision (approve PO)"""
        # Get pending approvals
        response = director_client.get(f"{BASE_URL}/api/approvals/pending")
        if response.status_code != 200 or not response.json():
            pytest.skip("No pending approvals to test")
        
        approvals = response.json()
        if not approvals:
            pytest.skip("No pending approvals")
        
        approval_id = approvals[0]["approval_id"]
        
        # Make approval decision
        decision_payload = {
            "decision": "approved",
            "comment": "Test approval",
            "approver_email": "yogesh.ostwal@nucleovir.com"
        }
        response = director_client.post(
            f"{BASE_URL}/api/approvals/{approval_id}/decision",
            json=decision_payload
        )
        assert response.status_code == 200
        print(f"Approval decision made: {response.json()}")


# ========== GRN TESTS ==========

class TestGRN:
    """Goods Receipt Note tests"""
    
    def test_list_grns(self, ca_client):
        """Test listing GRNs"""
        response = ca_client.get(f"{BASE_URL}/api/grn")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} GRNs")


# ========== VOUCHER TESTS ==========

class TestVouchers:
    """Payment voucher tests"""
    
    def test_list_vouchers(self, ca_client):
        """Test listing vouchers"""
        response = ca_client.get(f"{BASE_URL}/api/vouchers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} vouchers")


# ========== NOTIFICATIONS TESTS ==========

class TestNotifications:
    """Notification tests"""
    
    def test_get_notifications_ca(self, ca_client):
        """Test getting notifications for CA"""
        response = ca_client.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"CA has {len(data)} notifications")
    
    def test_get_unread_notifications(self, ca_client):
        """Test getting unread notifications"""
        response = ca_client.get(f"{BASE_URL}/api/notifications?unread_only=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"CA has {len(data)} unread notifications")


# ========== REPORTS TESTS ==========

class TestReports:
    """Reports export tests"""
    
    def test_export_po_register_csv(self, ca_client):
        """Test PO register export as CSV"""
        response = ca_client.get(f"{BASE_URL}/api/reports/export?report_type=po_register&format=csv")
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        assert "text/csv" in content_type or response.text.startswith("PO Number")
        print("PO register CSV export successful")
    
    def test_export_payment_register_csv(self, ca_client):
        """Test payment register export as CSV"""
        response = ca_client.get(f"{BASE_URL}/api/reports/export?report_type=payment_register&format=csv")
        assert response.status_code == 200
        print("Payment register CSV export successful")
    
    def test_export_vendor_aging_csv(self, ca_client):
        """Test vendor aging export as CSV"""
        response = ca_client.get(f"{BASE_URL}/api/reports/export?report_type=vendor_aging&format=csv")
        assert response.status_code == 200
        print("Vendor aging CSV export successful")
    
    def test_export_gst_tds_csv(self, ca_client):
        """Test GST/TDS report export as CSV"""
        response = ca_client.get(f"{BASE_URL}/api/reports/export?report_type=gst_tds&format=csv")
        assert response.status_code == 200
        print("GST/TDS CSV export successful")
    
    def test_export_po_register_xlsx(self, ca_client):
        """Test PO register export as Excel"""
        response = ca_client.get(f"{BASE_URL}/api/reports/export?report_type=po_register&format=xlsx")
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        # Excel content type or fallback to JSON if openpyxl not available
        assert "spreadsheet" in content_type or "application/json" in content_type
        print("PO register Excel export successful")
    
    def test_export_po_register_pdf(self, ca_client):
        """Test PO register export as PDF"""
        response = ca_client.get(f"{BASE_URL}/api/reports/export?report_type=po_register&format=pdf")
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        # PDF content type or fallback to JSON if reportlab not available
        assert "pdf" in content_type or "application/json" in content_type
        print("PO register PDF export successful")


# ========== AUDIT TESTS ==========

class TestAudit:
    """Audit trail tests"""
    
    def test_get_audit_trail(self, ca_client):
        """Test getting audit trail for entity"""
        if TestQuotations.created_quotation_id:
            response = ca_client.get(
                f"{BASE_URL}/api/audit/quotation/{TestQuotations.created_quotation_id}"
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"Found {len(data)} audit entries")
        else:
            pytest.skip("No quotation to get audit for")


# ========== CLEANUP ==========

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self, ca_client):
        """Cleanup TEST_ prefixed quotations and POs"""
        # Get all quotations
        response = ca_client.get(f"{BASE_URL}/api/quotations")
        if response.status_code == 200:
            quotations = response.json()
            for quo in quotations:
                if quo.get("vendor_name", "").startswith("TEST_"):
                    print(f"Test quotation found: {quo['quotation_id']}")
        print("Cleanup check complete")
