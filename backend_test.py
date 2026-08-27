#!/usr/bin/env python3
"""
Comprehensive API test for LAPORAN STOK SCA (Next.js full-stack)
Tests all endpoints via public URL
"""
import requests
import sys
from datetime import datetime, timedelta
import json

class StokSCAAPITester:
    def __init__(self, base_url="https://live-preview-stock.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.year = datetime.now().year
        
        # Store created IDs for cleanup
        self.paper_mutation_ids = []
        self.ink_mutation_ids = []
        self.other_mutation_ids = []
        self.user_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        req_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            req_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            req_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=req_headers, params=params, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=req_headers, params=params, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=req_headers, params=params, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=req_headers, params=params, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ PASS - Status: {response.status_code}")
                try:
                    return True, response.json()
                except Exception:
                    return True, response.text
            else:
                print(f"❌ FAIL - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ FAIL - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success and response.get('ok') == True

    def test_login_superadmin(self):
        """Test superadmin login"""
        success, response = self.run_test(
            "Login Superadmin (Jeffsca/jeff3131 + role=superadmin)",
            "POST",
            "auth/login",
            200,
            data={"username": "Jeffsca", "password": "jeff3131", "role": "superadmin"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_login_invalid(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Login Invalid Credentials (should fail)",
            "POST",
            "auth/login",
            401,
            data={"username": "Jeffsca", "password": "wrongpassword", "role": "superadmin"}
        )
        return success

    def test_auth_me(self):
        """Test /auth/me endpoint"""
        success, response = self.run_test(
            "Get Current User (/auth/me)",
            "GET",
            "auth/me",
            200
        )
        if success:
            print(f"   User: {response.get('username')} - Role: {response.get('role')}")
        return success

    def test_auth_guard_no_token(self):
        """Test that endpoints require authentication"""
        old_token = self.token
        self.token = None
        success, _ = self.run_test(
            "Dashboard without token (should 401)",
            "GET",
            "dashboard",
            401
        )
        self.token = old_token
        return success

    def test_dashboard(self):
        """Test dashboard endpoint"""
        success, response = self.run_test(
            "Dashboard",
            "GET",
            "dashboard",
            200
        )
        if success:
            print(f"   Total Paper Stock: {response.get('total_paper_stock')}")
            print(f"   Total Ink Stock: {response.get('total_ink_stock')}")
            print(f"   Mutations Today: {response.get('mutations_today')}")
            print(f"   Nominal Total: {response.get('nominal_total')}")
            print(f"   Trend data points: {len(response.get('trend', []))}")
            print(f"   Recent mutations: {len(response.get('recent_mutations', []))}")
        return success

    def test_paper_mutation_masuk(self):
        """Test creating paper mutation MASUK"""
        data = {
            "date": f"{self.year}-06-15",
            "kode": f"TEST-PAPER-{datetime.now().strftime('%H%M%S')}",
            "jenis_kertas": "Ivory",
            "gramatur": 230,
            "panjang": 79,
            "lebar": 109,
            "jenis_transaksi": "masuk",
            "jumlah": 100,
            "supplier": "PT Kertas Test",
            "pic_name": "Jeff",
            "price_mode": "per_kg",
            "price_input": 15000,
            "ppn_ada": True,
            "ppn_nominal": 250000
        }
        success, response = self.run_test(
            "Create Paper Mutation MASUK",
            "POST",
            "paper/mutations",
            200,
            data=data
        )
        if success and 'id' in response:
            self.paper_mutation_ids.append(response['id'])
            print(f"   Created ID: {response['id']}")
            print(f"   Harga per Rim: {response.get('harga_per_rim')}")
        return success

    def test_paper_mutation_keluar(self):
        """Test creating paper mutation KELUAR"""
        data = {
            "date": f"{self.year}-06-16",
            "kode": f"TEST-KELUAR-{datetime.now().strftime('%H%M%S')}",
            "jenis_kertas": "Ivory",
            "gramatur": 230,
            "panjang": 79,
            "lebar": 109,
            "jenis_transaksi": "keluar",
            "jumlah": 20,
            "supplier": "PT Kertas Test",
            "pic_name": "Jeff"
        }
        success, response = self.run_test(
            "Create Paper Mutation KELUAR",
            "POST",
            "paper/mutations",
            200,
            data=data
        )
        if success and 'id' in response:
            self.paper_mutation_ids.append(response['id'])
            print(f"   Created ID: {response['id']}")
        return success

    def test_paper_mutation_keluar_exceed_stock(self):
        """Test creating paper mutation KELUAR that exceeds stock"""
        data = {
            "date": f"{self.year}-06-17",
            "jenis_kertas": "Ivory",
            "gramatur": 230,
            "panjang": 79,
            "lebar": 109,
            "jenis_transaksi": "keluar",
            "jumlah": 999999,
            "pic_name": "Jeff"
        }
        success, response = self.run_test(
            "Create Paper Mutation KELUAR (exceed stock - should fail)",
            "POST",
            "paper/mutations",
            400,
            data=data
        )
        return success

    def test_paper_mutation_retur(self):
        """Test creating paper mutation RETUR"""
        if len(self.paper_mutation_ids) < 2:
            print("   ⚠️  Skipping - need keluar mutation ID")
            return False
            
        ref_id = self.paper_mutation_ids[1]  # Use the keluar mutation
        data = {
            "date": f"{self.year}-06-18",
            "kode": f"TEST-RETUR-{datetime.now().strftime('%H%M%S')}",
            "jenis_kertas": "Ivory",
            "gramatur": 230,
            "panjang": 79,
            "lebar": 109,
            "jenis_transaksi": "retur",
            "jumlah": 5,
            "supplier": "PT Kertas Test",
            "pic_name": "Jeff",
            "ref_mutation_id": ref_id
        }
        success, response = self.run_test(
            "Create Paper Mutation RETUR",
            "POST",
            "paper/mutations",
            200,
            data=data
        )
        if success and 'id' in response:
            self.paper_mutation_ids.append(response['id'])
            print(f"   Created ID: {response['id']}")
            print(f"   Ref Mutation ID: {response.get('ref_mutation_id')}")
        return success

    def test_paper_mutation_list(self):
        """Test listing paper mutations"""
        success, response = self.run_test(
            "List Paper Mutations",
            "GET",
            "paper/mutations",
            200,
            params={"year": self.year}
        )
        if success:
            print(f"   Total mutations: {len(response)}")
        return success

    def test_paper_mutation_filter(self):
        """Test filtering paper mutations"""
        success, response = self.run_test(
            "Filter Paper Mutations (transaksi=masuk)",
            "GET",
            "paper/mutations",
            200,
            params={"year": self.year, "transaksi": "masuk"}
        )
        if success:
            print(f"   Filtered mutations: {len(response)}")
        return success

    def test_paper_mutation_search(self):
        """Test searching paper mutations"""
        success, response = self.run_test(
            "Search Paper Mutations (supplier)",
            "GET",
            "paper/mutations",
            200,
            params={"year": self.year, "search": "Test"}
        )
        if success:
            print(f"   Search results: {len(response)}")
        return success

    def test_paper_jenis(self):
        """Test getting distinct paper types"""
        success, response = self.run_test(
            "Get Paper Jenis (distinct)",
            "GET",
            "paper/jenis",
            200
        )
        if success:
            print(f"   Paper types: {response}")
        return success

    def test_paper_mutation_edit(self):
        """Test editing paper mutation"""
        if not self.paper_mutation_ids:
            print("   ⚠️  Skipping - no mutation to edit")
            return False
            
        mutation_id = self.paper_mutation_ids[0]
        data = {
            "date": f"{self.year}-06-15",
            "kode": f"TEST-EDITED-{datetime.now().strftime('%H%M%S')}",
            "jenis_kertas": "Ivory",
            "gramatur": 230,
            "panjang": 79,
            "lebar": 109,
            "jenis_transaksi": "masuk",
            "jumlah": 150,
            "supplier": "PT Kertas Test EDITED",
            "pic_name": "Jeff",
            "price_mode": "per_rim",
            "price_input": 1500000,
            "ppn_ada": True,
            "ppn_nominal": 300000
        }
        success, response = self.run_test(
            "Edit Paper Mutation",
            "PUT",
            f"paper/mutations/{mutation_id}",
            200,
            data=data
        )
        return success

    def test_ink_mutation_masuk(self):
        """Test creating ink mutation MASUK"""
        data = {
            "date": f"{self.year}-06-15",
            "kode": f"TEST-INK-{datetime.now().strftime('%H%M%S')}",
            "jenis_tinta": "Cyan",
            "jenis_transaksi": "masuk",
            "jumlah": 50,
            "supplier": "PT Tinta Test",
            "pic_name": "Jeff",
            "harga_per_kg": 120000,
            "ppn_ada": True,
            "ppn_nominal": 600000
        }
        success, response = self.run_test(
            "Create Ink Mutation MASUK",
            "POST",
            "ink/mutations",
            200,
            data=data
        )
        if success and 'id' in response:
            self.ink_mutation_ids.append(response['id'])
            print(f"   Created ID: {response['id']}")
        return success

    def test_ink_mutation_keluar_exceed(self):
        """Test ink mutation KELUAR exceeding stock"""
        data = {
            "date": f"{self.year}-06-16",
            "jenis_tinta": "Cyan",
            "jenis_transaksi": "keluar",
            "jumlah": 999999,
            "pic_name": "Jeff"
        }
        success, response = self.run_test(
            "Create Ink Mutation KELUAR (exceed stock - should fail)",
            "POST",
            "ink/mutations",
            400,
            data=data
        )
        return success

    def test_ink_mutation_list(self):
        """Test listing ink mutations"""
        success, response = self.run_test(
            "List Ink Mutations",
            "GET",
            "ink/mutations",
            200,
            params={"year": self.year}
        )
        if success:
            print(f"   Total mutations: {len(response)}")
        return success

    def test_other_mutation_masuk(self):
        """Test creating other mutation MASUK"""
        data = {
            "date": f"{self.year}-06-15",
            "kode": f"TEST-OTHER-{datetime.now().strftime('%H%M%S')}",
            "nama_barang": "Lem Panas Test",
            "satuan": "box",
            "jenis_transaksi": "masuk",
            "jumlah": 10,
            "supplier": "PT Lain Test",
            "pic_name": "Jeff",
            "harga_per_satuan": 75000
        }
        success, response = self.run_test(
            "Create Other Mutation MASUK",
            "POST",
            "other/mutations",
            200,
            data=data
        )
        if success and 'id' in response:
            self.other_mutation_ids.append(response['id'])
            print(f"   Created ID: {response['id']}")
        return success

    def test_other_mutation_list(self):
        """Test listing other mutations"""
        success, response = self.run_test(
            "List Other Mutations",
            "GET",
            "other/mutations",
            200,
            params={"year": self.year}
        )
        if success:
            print(f"   Total mutations: {len(response)}")
        return success

    def test_reports_stock(self):
        """Test stock report"""
        success, response = self.run_test(
            "Stock Report",
            "GET",
            "reports/stock",
            200
        )
        if success:
            print(f"   Paper items: {len(response.get('paper', []))}")
            print(f"   Ink items: {len(response.get('ink', []))}")
            print(f"   Other items: {len(response.get('other', []))}")
        return success

    def test_reports_detail(self):
        """Test detail report"""
        success, response = self.run_test(
            "Detail Report",
            "GET",
            "reports/detail",
            200,
            params={
                "start": f"{self.year}-01-01",
                "end": f"{self.year}-12-31"
            }
        )
        if success:
            print(f"   Total Nominal: {response.get('total_nominal')}")
            print(f"   Has comparison: {'comparison' in response}")
            print(f"   Has composition: {'composition' in response}")
            print(f"   PPN monthly entries: {len(response.get('ppn_monthly', []))}")
        return success

    def test_logs_activity(self):
        """Test activity logs"""
        success, response = self.run_test(
            "Activity Logs",
            "GET",
            "logs/activity",
            200
        )
        if success:
            print(f"   Activity log entries: {len(response)}")
        return success

    def test_logs_audit(self):
        """Test audit logs"""
        success, response = self.run_test(
            "Audit Logs",
            "GET",
            "logs/audit",
            200
        )
        if success:
            print(f"   Audit log entries: {len(response)}")
        return success

    def test_create_admin_user(self):
        """Test creating admin user"""
        data = {
            "name": "Admin Test",
            "username": f"admintest{datetime.now().strftime('%H%M%S')}",
            "password": "admin123",
            "role": "admin"
        }
        success, response = self.run_test(
            "Create Admin User",
            "POST",
            "users",
            200,
            data=data
        )
        if success and 'id' in response:
            self.user_ids.append({
                "id": response['id'],
                "username": data['username'],
                "password": data['password']
            })
            print(f"   Created user ID: {response['id']}")
        return success

    def test_list_users(self):
        """Test listing users"""
        success, response = self.run_test(
            "List Users",
            "GET",
            "users",
            200
        )
        if success:
            print(f"   Total users: {len(response)}")
        return success

    def test_login_admin_user(self):
        """Test login as admin user"""
        if not self.user_ids:
            print("   ⚠️  Skipping - no admin user created")
            return False
            
        user = self.user_ids[0]
        success, response = self.run_test(
            f"Login as Admin User ({user['username']})",
            "POST",
            "auth/login",
            200,
            data={"username": user['username'], "password": user['password'], "role": "admin"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
        return success

    def test_admin_section_protection(self):
        """Test section protection for admin role"""
        if not self.admin_token:
            print("   ⚠️  Skipping - no admin token")
            return False
            
        old_token = self.token
        self.token = self.admin_token
        
        # Test without password - should 403
        success1, _ = self.run_test(
            "Admin access detail report without password (should 403)",
            "GET",
            "reports/detail",
            403,
            params={"start": f"{self.year}-01-01", "end": f"{self.year}-12-31"}
        )
        
        # Test with password - should 200
        success2, _ = self.run_test(
            "Admin access detail report with password (should 200)",
            "GET",
            "reports/detail",
            200,
            params={"start": f"{self.year}-01-01", "end": f"{self.year}-12-31"},
            headers={"X-Section-Password": "superadminsementara"}
        )
        
        self.token = old_token
        return success1 and success2

    def test_admin_verify_temp_password(self):
        """Test verify temp password endpoint"""
        if not self.admin_token:
            print("   ⚠️  Skipping - no admin token")
            return False
            
        old_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Verify Temp Password",
            "POST",
            "auth/verify-temp-password",
            200,
            data={"password": "superadminsementara"}
        )
        
        self.token = old_token
        if success:
            print(f"   Valid: {response.get('valid')}")
        return success

    def test_admin_cannot_access_users(self):
        """Test that admin role cannot access /users endpoint"""
        if not self.admin_token:
            print("   ⚠️  Skipping - no admin token")
            return False
            
        old_token = self.token
        self.token = self.admin_token
        
        success, _ = self.run_test(
            "Admin access /users (should 403)",
            "GET",
            "users",
            403
        )
        
        self.token = old_token
        return success

    def test_admin_dashboard_nominal_hidden(self):
        """Test that admin role cannot see nominal in dashboard"""
        if not self.admin_token:
            print("   ⚠️  Skipping - no admin token")
            return False
            
        old_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Admin Dashboard (nominal should be hidden)",
            "GET",
            "dashboard",
            200
        )
        
        self.token = old_token
        if success:
            nominal = response.get('nominal_total')
            if nominal == "Terkunci" or nominal is None:
                print(f"   ✅ Nominal correctly hidden: {nominal}")
                return True
            else:
                print(f"   ❌ Nominal exposed to admin: {nominal}")
                return False
        return False

    def test_toggle_user(self):
        """Test toggling user active status"""
        if not self.user_ids:
            print("   ⚠️  Skipping - no user to toggle")
            return False
            
        user_id = self.user_ids[0]['id']
        success, response = self.run_test(
            "Toggle User (deactivate)",
            "PATCH",
            f"users/{user_id}/toggle",
            200
        )
        if success:
            print(f"   Active status: {response.get('active')}")
        return success

    def test_inactive_user_cannot_login(self):
        """Test that inactive user cannot login"""
        if not self.user_ids:
            print("   ⚠️  Skipping - no user to test")
            return False
            
        user = self.user_ids[0]
        success, _ = self.run_test(
            "Login as Inactive User (should 403)",
            "POST",
            "auth/login",
            403,
            data={"username": user['username'], "password": user['password']}
        )
        return success

    def test_delete_user(self):
        """Test deleting user"""
        if not self.user_ids:
            print("   ⚠️  Skipping - no user to delete")
            return False
            
        user_id = self.user_ids[0]['id']
        success, response = self.run_test(
            "Delete User",
            "DELETE",
            f"users/{user_id}",
            200
        )
        return success

    def test_change_temp_password(self):
        """Test changing temp password"""
        success1, _ = self.run_test(
            "Change Temp Password",
            "POST",
            "settings/temp-password",
            200,
            data={"new_password": "newpassword123"}
        )
        
        # Restore original
        success2, _ = self.run_test(
            "Restore Temp Password",
            "POST",
            "settings/temp-password",
            200,
            data={"new_password": "superadminsementara"}
        )
        
        return success1 and success2

    def test_pdf_endpoints(self):
        """Test all PDF generation endpoints"""
        pdf_kinds = [
            "paper-mutations",
            "ink-mutations",
            "other-mutations",
            "stock-ringkas",
            "detail",
            "stock-nominal"
        ]
        
        all_success = True
        for kind in pdf_kinds:
            success, response = self.run_test(
                f"PDF Generation: {kind}",
                "GET",
                f"pdf/{kind}",
                200,
                params={"start": f"{self.year}-01-01", "end": f"{self.year}-12-31"}
            )
            if not success:
                all_success = False
        
        return all_success

    def test_logout(self):
        """Test logout"""
        success, response = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200,
            data={"type": "manual"}
        )
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 80)
        print("LAPORAN STOK SCA - COMPREHENSIVE API TEST")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"Test Year: {self.year}")
        print("=" * 80)
        
        # 1. Health & Auth
        print("\n" + "=" * 80)
        print("SECTION 1: HEALTH & AUTHENTICATION")
        print("=" * 80)
        self.test_health()
        self.test_login_superadmin()
        self.test_login_invalid()
        self.test_auth_me()
        self.test_auth_guard_no_token()
        
        # 2. Dashboard
        print("\n" + "=" * 80)
        print("SECTION 2: DASHBOARD")
        print("=" * 80)
        self.test_dashboard()
        
        # 3. Paper Mutations
        print("\n" + "=" * 80)
        print("SECTION 3: PAPER MUTATIONS")
        print("=" * 80)
        self.test_paper_mutation_masuk()
        self.test_paper_mutation_keluar()
        self.test_paper_mutation_keluar_exceed_stock()
        self.test_paper_mutation_retur()
        self.test_paper_mutation_list()
        self.test_paper_mutation_filter()
        self.test_paper_mutation_search()
        self.test_paper_jenis()
        self.test_paper_mutation_edit()
        
        # 4. Ink Mutations
        print("\n" + "=" * 80)
        print("SECTION 4: INK MUTATIONS")
        print("=" * 80)
        self.test_ink_mutation_masuk()
        self.test_ink_mutation_keluar_exceed()
        self.test_ink_mutation_list()
        
        # 5. Other Mutations
        print("\n" + "=" * 80)
        print("SECTION 5: OTHER MUTATIONS")
        print("=" * 80)
        self.test_other_mutation_masuk()
        self.test_other_mutation_list()
        
        # 6. Reports
        print("\n" + "=" * 80)
        print("SECTION 6: REPORTS")
        print("=" * 80)
        self.test_reports_stock()
        self.test_reports_detail()
        
        # 7. Logs
        print("\n" + "=" * 80)
        print("SECTION 7: LOGS")
        print("=" * 80)
        self.test_logs_activity()
        self.test_logs_audit()
        
        # 8. User Management
        print("\n" + "=" * 80)
        print("SECTION 8: USER MANAGEMENT")
        print("=" * 80)
        self.test_create_admin_user()
        self.test_list_users()
        self.test_login_admin_user()
        
        # 9. Admin Role Protection
        print("\n" + "=" * 80)
        print("SECTION 9: ADMIN ROLE PROTECTION")
        print("=" * 80)
        self.test_admin_section_protection()
        self.test_admin_verify_temp_password()
        self.test_admin_cannot_access_users()
        self.test_admin_dashboard_nominal_hidden()
        
        # 10. User Toggle & Delete
        print("\n" + "=" * 80)
        print("SECTION 10: USER TOGGLE & DELETE")
        print("=" * 80)
        self.test_toggle_user()
        self.test_inactive_user_cannot_login()
        self.test_delete_user()
        
        # 11. Settings
        print("\n" + "=" * 80)
        print("SECTION 11: SETTINGS")
        print("=" * 80)
        self.test_change_temp_password()
        
        # 12. PDF Generation
        print("\n" + "=" * 80)
        print("SECTION 12: PDF GENERATION")
        print("=" * 80)
        self.test_pdf_endpoints()
        
        # 13. Logout
        print("\n" + "=" * 80)
        print("SECTION 13: LOGOUT")
        print("=" * 80)
        self.test_logout()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n" + "=" * 80)
            print("FAILED TESTS:")
            print("=" * 80)
            for i, failure in enumerate(self.failed_tests, 1):
                print(f"\n{i}. {failure.get('test')}")
                if 'error' in failure:
                    print(f"   Error: {failure['error']}")
                else:
                    print(f"   Expected: {failure.get('expected')}")
                    print(f"   Actual: {failure.get('actual')}")
                    print(f"   Response: {failure.get('response')}")
        
        print("\n" + "=" * 80)
        return 0 if len(self.failed_tests) == 0 else 1

def main():
    tester = StokSCAAPITester()
    tester.run_all_tests()
    return 0 if len(tester.failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
