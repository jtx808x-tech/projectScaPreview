#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for SCA Merged Tools
Tests: Auth, Stok (0 regression), HPP, PO Tracker
"""
import requests
import sys
import json
from datetime import datetime, timedelta

class SCABackendTester:
    def __init__(self, base_url="https://stock-client-deploy.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_data_ids = {
            'hpp_calc_id': None,
            'po_id': None,
            'schedule_id': None
        }

    def log(self, emoji, message):
        """Print formatted log message"""
        print(f"{emoji} {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, check_json=True):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        req_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            req_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            req_headers.update(headers)

        self.tests_run += 1
        self.log("🔍", f"Test #{self.tests_run}: {name}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=req_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=req_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=req_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log("✅", f"PASSED - Status: {response.status_code}")
                
                if check_json and response.status_code != 204:
                    try:
                        resp_data = response.json()
                        return True, resp_data
                    except Exception:
                        return True, {}
                else:
                    return True, response.content if not check_json else {}
            else:
                self.log("❌", f"FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    self.log("📄", f"Response: {json.dumps(error_data, indent=2)}")
                except Exception:
                    self.log("📄", f"Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log("❌", f"FAILED - Error: {str(e)}")
            return False, {}

    def test_auth_login_success(self):
        """Test superadmin login success"""
        self.log("🔐", "\n=== AUTH TESTS ===")
        success, response = self.run_test(
            "Login Superadmin (Jeffsca/jeff3131/superadmin)",
            "POST",
            "auth/login",
            200,
            data={"username": "Jeffsca", "password": "jeff3131", "role": "superadmin"}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.log("🎫", f"Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_auth_role_mismatch(self):
        """Test login with role mismatch - should return 401"""
        success, response = self.run_test(
            "Login Role Mismatch (Jeffsca/jeff3131/admin) - should fail",
            "POST",
            "auth/login",
            401,
            data={"username": "Jeffsca", "password": "jeff3131", "role": "admin"}
        )
        if success and 'message' in response:
            if 'Role tidak sesuai' in response['message']:
                self.log("✅", f"Correct error message: {response['message']}")
                return True
        return success

    def test_auth_wrong_password(self):
        """Test login with wrong password"""
        success, response = self.run_test(
            "Login Wrong Password - should fail",
            "POST",
            "auth/login",
            401,
            data={"username": "Jeffsca", "password": "wrongpassword", "role": "superadmin"}
        )
        return success

    def test_auth_me(self):
        """Test GET /api/auth/me"""
        success, response = self.run_test(
            "GET /api/auth/me - should return user data",
            "GET",
            "auth/me",
            200
        )
        if success:
            if response.get('role') == 'superadmin' and response.get('username') == 'Jeffsca':
                self.log("✅", f"User data correct: {json.dumps(response, indent=2)}")
                return True
            else:
                self.log("❌", f"User data incorrect: {json.dumps(response, indent=2)}")
        return False

    def test_stok_dashboard(self):
        """Test Stok existing API - dashboard"""
        self.log("📊", "\n=== STOK EXISTING TESTS (0 Regression) ===")
        success, response = self.run_test(
            "GET /api/dashboard - Stok dashboard",
            "GET",
            "dashboard",
            200
        )
        if success:
            self.log("✅", f"Dashboard data keys: {list(response.keys())}")
        return success

    def test_stok_paper_mutations(self):
        """Test Stok existing API - paper mutations"""
        success, response = self.run_test(
            "GET /api/paper/mutations - Paper mutations list",
            "GET",
            "paper/mutations",
            200
        )
        if success:
            self.log("✅", f"Paper mutations count: {len(response) if isinstance(response, list) else 'N/A'}")
        return success

    def test_stok_paper_jenis(self):
        """Test Stok existing API - paper jenis"""
        success, response = self.run_test(
            "GET /api/paper/jenis - Paper types",
            "GET",
            "paper/jenis",
            200
        )
        if success:
            self.log("✅", f"Paper types: {response if isinstance(response, list) else 'N/A'}")
        return success

    def test_hpp_get_empty(self):
        """Test HPP GET calculations (empty list)"""
        self.log("🧮", "\n=== HPP KALKULATOR TESTS ===")
        success, response = self.run_test(
            "GET /api/hpp/calculations - should return list",
            "GET",
            "hpp/calculations",
            200
        )
        if success:
            self.log("✅", f"HPP calculations count: {len(response) if isinstance(response, list) else 'N/A'}")
        return success

    def test_hpp_create(self):
        """Test HPP POST create calculation"""
        test_data = {
            "name": "Test HPP Calculation",
            "customer": "Test Customer",
            "notes": "Test notes for HPP",
            "inputs": {
                "paper_cost": 1000,
                "ink_cost": 500,
                "labor_cost": 300
            },
            "result": {
                "total_cost": 1800,
                "profit_margin": 20,
                "selling_price": 2160
            }
        }
        success, response = self.run_test(
            "POST /api/hpp/calculations - create new calculation",
            "POST",
            "hpp/calculations",
            200,
            data=test_data
        )
        if success and 'id' in response:
            self.test_data_ids['hpp_calc_id'] = response['id']
            self.log("✅", f"HPP calculation created with ID: {response['id']}")
            return True
        return False

    def test_hpp_get_by_id(self):
        """Test HPP GET calculation by ID"""
        if not self.test_data_ids['hpp_calc_id']:
            self.log("⚠️", "Skipping - no HPP calc ID available")
            return False
        
        success, response = self.run_test(
            f"GET /api/hpp/calculations/{self.test_data_ids['hpp_calc_id']}",
            "GET",
            f"hpp/calculations/{self.test_data_ids['hpp_calc_id']}",
            200
        )
        if success:
            self.log("✅", f"HPP calculation retrieved: {response.get('name')}")
        return success

    def test_hpp_update(self):
        """Test HPP PUT update calculation"""
        if not self.test_data_ids['hpp_calc_id']:
            self.log("⚠️", "Skipping - no HPP calc ID available")
            return False
        
        update_data = {
            "name": "Updated HPP Calculation",
            "customer": "Updated Customer",
            "notes": "Updated notes",
            "inputs": {"paper_cost": 1200},
            "result": {"total_cost": 2000}
        }
        success, response = self.run_test(
            f"PUT /api/hpp/calculations/{self.test_data_ids['hpp_calc_id']}",
            "PUT",
            f"hpp/calculations/{self.test_data_ids['hpp_calc_id']}",
            200,
            data=update_data
        )
        if success:
            self.log("✅", f"HPP calculation updated: {response.get('name')}")
        return success

    def test_hpp_pdf_export(self):
        """Test HPP PDF export"""
        pdf_data = {
            "name": "Test HPP PDF",
            "customer": "Test Customer",
            "notes": "Test PDF export",
            "company": "Percetakan SCA",
            "result": {
                "total_cost": 1800,
                "profit_margin": 20,
                "selling_price": 2160
            }
        }
        success, response = self.run_test(
            "POST /api/hpp/pdf - export PDF",
            "POST",
            "hpp/pdf",
            200,
            data=pdf_data,
            check_json=False
        )
        if success:
            # Check if response is PDF (binary data)
            if isinstance(response, bytes) and len(response) > 0:
                self.log("✅", f"PDF generated successfully, size: {len(response)} bytes")
                return True
            else:
                self.log("❌", "PDF response is not binary data")
        return False

    def test_po_get_empty(self):
        """Test PO GET pos (list)"""
        self.log("📦", "\n=== PO TRACKER TESTS ===")
        success, response = self.run_test(
            "GET /api/po/pos - should return list",
            "GET",
            "po/pos",
            200
        )
        if success:
            self.log("✅", f"PO list count: {len(response) if isinstance(response, list) else 'N/A'}")
        return success

    def test_po_create(self):
        """Test PO POST create new PO"""
        today = datetime.now().strftime("%Y-%m-%d")
        est_start = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        est_end = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        test_data = {
            "po_number": f"TEST-PO-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "client_name": "Test Client",
            "item_type": "Brosur",
            "material": "Art Paper 150gsm",
            "paper_size": "A4",
            "quantity": "1000",
            "po_date": today,
            "est_start": est_start,
            "est_end": est_end,
            "print_machine": "Mesin 1",
            "enabled_stages": [1, 4, 5, 11],
            "notes": "Test PO creation"
        }
        success, response = self.run_test(
            "POST /api/po/pos - create new PO",
            "POST",
            "po/pos",
            200,
            data=test_data
        )
        if success and 'id' in response:
            self.test_data_ids['po_id'] = response['id']
            self.log("✅", f"PO created with ID: {response['id']}")
            if 'computed' in response:
                self.log("✅", f"Computed fields present: bucket={response['computed'].get('bucket')}, current_stage={response['computed'].get('current_stage')}")
            return True
        return False

    def test_po_get_by_id(self):
        """Test PO GET by ID with computed fields"""
        if not self.test_data_ids['po_id']:
            self.log("⚠️", "Skipping - no PO ID available")
            return False
        
        success, response = self.run_test(
            f"GET /api/po/pos/{self.test_data_ids['po_id']}",
            "GET",
            f"po/pos/{self.test_data_ids['po_id']}",
            200
        )
        if success:
            self.log("✅", f"PO retrieved: {response.get('po_number')}")
            if 'computed' in response:
                self.log("✅", f"Computed fields: {json.dumps(response['computed'], indent=2)}")
        return success

    def test_po_update_stage(self):
        """Test PO POST update stage data"""
        if not self.test_data_ids['po_id']:
            self.log("⚠️", "Skipping - no PO ID available")
            return False
        
        stage_data = {
            "data": {
                "paper_arrived": True,
                "paper_notes": "Paper received in good condition"
            }
        }
        success, response = self.run_test(
            f"POST /api/po/pos/{self.test_data_ids['po_id']}/stages/1 - update stage 1",
            "POST",
            f"po/pos/{self.test_data_ids['po_id']}/stages/1",
            200,
            data=stage_data
        )
        if success:
            # Check if stage is marked as done
            stage_1_data = response.get('stage_data', {}).get('1', {})
            if stage_1_data.get('completed_at'):
                self.log("✅", f"Stage 1 marked as done at: {stage_1_data.get('completed_at')}")
            return True
        return False

    def test_po_delivery_schedule(self):
        """Test PO POST delivery schedule"""
        if not self.test_data_ids['po_id']:
            self.log("⚠️", "Skipping - no PO ID available")
            return False
        
        schedule_data = {
            "scheduled_date": (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d"),
            "driver_name": "Test Driver"
        }
        success, response = self.run_test(
            f"POST /api/po/pos/{self.test_data_ids['po_id']}/delivery/schedule",
            "POST",
            f"po/pos/{self.test_data_ids['po_id']}/delivery/schedule",
            200,
            data=schedule_data
        )
        if success:
            self.log("✅", "Delivery scheduled successfully")
        return success

    def test_po_delivery_result(self):
        """Test PO POST delivery result"""
        if not self.test_data_ids['po_id']:
            self.log("⚠️", "Skipping - no PO ID available")
            return False
        
        result_data = {
            "status": "success"
        }
        success, response = self.run_test(
            f"POST /api/po/pos/{self.test_data_ids['po_id']}/delivery/result",
            "POST",
            f"po/pos/{self.test_data_ids['po_id']}/delivery/result",
            200,
            data=result_data
        )
        if success:
            self.log("✅", "Delivery result marked as success")
        return success

    def test_po_check_conflict(self):
        """Test PO POST check-conflict"""
        conflict_data = {
            "est_start": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "est_end": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "exclude_id": self.test_data_ids.get('po_id')
        }
        success, response = self.run_test(
            "POST /api/po/pos/check-conflict",
            "POST",
            "po/pos/check-conflict",
            200,
            data=conflict_data
        )
        if success:
            conflicts = response.get('conflicts', [])
            self.log("✅", f"Conflict check returned {len(conflicts)} conflicts")
        return success

    def test_po_update(self):
        """Test PO PUT update"""
        if not self.test_data_ids['po_id']:
            self.log("⚠️", "Skipping - no PO ID available")
            return False
        
        update_data = {
            "client_name": "Updated Test Client",
            "notes": "Updated notes for PO"
        }
        success, response = self.run_test(
            f"PUT /api/po/pos/{self.test_data_ids['po_id']}",
            "PUT",
            f"po/pos/{self.test_data_ids['po_id']}",
            200,
            data=update_data
        )
        if success:
            self.log("✅", f"PO updated: {response.get('client_name')}")
        return success

    def test_po_dashboard(self):
        """Test PO GET dashboard"""
        success, response = self.run_test(
            "GET /api/po/dashboard",
            "GET",
            "po/dashboard",
            200
        )
        if success:
            self.log("✅", f"Dashboard data: total={response.get('total')}, active={response.get('total_active')}, completed={response.get('total_completed')}")
            if 'counts' in response:
                self.log("✅", f"Bucket counts: {json.dumps(response['counts'], indent=2)}")
        return success

    def test_po_schedules_create(self):
        """Test PO POST schedules create"""
        if not self.test_data_ids['po_id']:
            self.log("⚠️", "Skipping - no PO ID available")
            return False
        
        schedule_data = {
            "po_id": self.test_data_ids['po_id'],
            "stage_number": 4,
            "date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
            "note": "Test schedule note"
        }
        success, response = self.run_test(
            "POST /api/po/schedules - create schedule",
            "POST",
            "po/schedules",
            200,
            data=schedule_data
        )
        if success and 'id' in response:
            self.test_data_ids['schedule_id'] = response['id']
            self.log("✅", f"Schedule created with ID: {response['id']}")
            return True
        return False

    def test_po_schedules_get(self):
        """Test PO GET schedules list"""
        success, response = self.run_test(
            "GET /api/po/schedules",
            "GET",
            "po/schedules",
            200
        )
        if success:
            self.log("✅", f"Schedules count: {len(response) if isinstance(response, list) else 'N/A'}")
        return success

    def test_cleanup_hpp(self):
        """Cleanup: Delete HPP test data"""
        if not self.test_data_ids['hpp_calc_id']:
            return True
        
        self.log("🧹", "\n=== CLEANUP TEST DATA ===")
        success, response = self.run_test(
            f"DELETE /api/hpp/calculations/{self.test_data_ids['hpp_calc_id']}",
            "DELETE",
            f"hpp/calculations/{self.test_data_ids['hpp_calc_id']}",
            200
        )
        if success:
            self.log("✅", "HPP calculation deleted")
        return success

    def test_cleanup_schedule(self):
        """Cleanup: Delete schedule test data"""
        if not self.test_data_ids['schedule_id']:
            return True
        
        success, response = self.run_test(
            f"DELETE /api/po/schedules/{self.test_data_ids['schedule_id']}",
            "DELETE",
            f"po/schedules/{self.test_data_ids['schedule_id']}",
            200
        )
        if success:
            self.log("✅", "Schedule deleted")
        return success

    def test_cleanup_po(self):
        """Cleanup: Delete PO test data"""
        if not self.test_data_ids['po_id']:
            return True
        
        success, response = self.run_test(
            f"DELETE /api/po/pos/{self.test_data_ids['po_id']}",
            "DELETE",
            f"po/pos/{self.test_data_ids['po_id']}",
            200
        )
        if success:
            self.log("✅", "PO deleted")
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("🚀", "Starting SCA Backend API Tests")
        self.log("🌐", f"Base URL: {self.base_url}")
        
        # Auth tests
        if not self.test_auth_login_success():
            self.log("❌", "Login failed - stopping tests")
            return False
        
        self.test_auth_role_mismatch()
        self.test_auth_wrong_password()
        self.test_auth_me()
        
        # Stok tests (0 regression)
        self.test_stok_dashboard()
        self.test_stok_paper_mutations()
        self.test_stok_paper_jenis()
        
        # HPP tests
        self.test_hpp_get_empty()
        self.test_hpp_create()
        self.test_hpp_get_by_id()
        self.test_hpp_update()
        self.test_hpp_pdf_export()
        
        # PO tests
        self.test_po_get_empty()
        self.test_po_create()
        self.test_po_get_by_id()
        self.test_po_update_stage()
        self.test_po_delivery_schedule()
        self.test_po_delivery_result()
        self.test_po_check_conflict()
        self.test_po_update()
        self.test_po_dashboard()
        self.test_po_schedules_create()
        self.test_po_schedules_get()
        
        # Cleanup
        self.test_cleanup_hpp()
        self.test_cleanup_schedule()
        self.test_cleanup_po()
        
        return True

    def print_summary(self):
        """Print test summary"""
        self.log("📊", "\n" + "="*60)
        self.log("📊", "TEST SUMMARY")
        self.log("📊", "="*60)
        self.log("📊", f"Total Tests: {self.tests_run}")
        self.log("✅", f"Passed: {self.tests_passed}")
        self.log("❌", f"Failed: {self.tests_run - self.tests_passed}")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log("📊", f"Success Rate: {success_rate:.1f}%")
        self.log("📊", "="*60)
        
        return self.tests_passed == self.tests_run

def main():
    tester = SCABackendTester()
    tester.run_all_tests()
    all_passed = tester.print_summary()
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
