import requests
import sys
import json
import base64
from datetime import datetime
from io import BytesIO

class StudentsNetAPITester:
    def __init__(self, base_url="https://college-signup-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.test_contact = None
        self.test_password = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "status": "PASSED" if success else "FAILED",
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)
        
        if files:
            # Remove Content-Type for multipart/form-data
            test_headers.pop('Content-Type', None)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=test_headers, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=test_headers, timeout=30)

            print(f"   Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                error_detail = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail += f" - {response.json()}"
                except:
                    error_detail += f" - {response.text}"
                self.log_test(name, False, error_detail)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_register_user(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        self.test_contact = f"9876543{timestamp[-3:]}"
        self.test_password = "TestPass123!"
        
        test_data = {
            "name": f"Test User {timestamp}",
            "college": "Test College",
            "class": "1st Year",
            "stream": "Science",
            "contact": self.test_contact,
            "password": self.test_password
        }
        
        success, response = self.run_test("User Registration", "POST", "register", 200, test_data)
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
            print(f"   User ID: {self.user_id}")
            print(f"   Contact: {self.test_contact}")
            print(f"   Payment Status: {response['user'].get('payment_status', 'N/A')}")
            return True, response
        
        return False, response

    def test_register_duplicate_user(self):
        """Test registration with duplicate contact"""
        if not self.test_contact:
            self.log_test("Duplicate Registration", False, "No existing user contact to duplicate")
            return False, {}
            
        # Try to register with same contact
        test_data = {
            "name": "Duplicate User",
            "college": "Test College",
            "class": "2nd Year", 
            "stream": "Arts",
            "contact": self.test_contact,  # Same contact as previous registration
            "password": "TestPass123!"
        }
        
        return self.run_test("Duplicate Registration", "POST", "register", 400, test_data)

    def test_login_valid_credentials(self):
        """Test login with valid credentials"""
        if not self.test_contact or not self.test_password:
            self.log_test("Valid Login", False, "No registered user credentials available")
            return False, {}
            
        login_data = {
            "contact": self.test_contact,
            "password": self.test_password
        }
        
        success, response = self.run_test("Valid Login", "POST", "login", 200, login_data)
        
        if success and 'token' in response:
            self.token = response['token']
            print(f"   New token: {self.token[:20]}...")
            print(f"   Payment Status: {response['user'].get('payment_status', 'N/A')}")
            return True, response
            
        return False, response

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        login_data = {
            "contact": "9999999999",
            "password": "WrongPassword"
        }
        
        return self.run_test("Invalid Login", "POST", "login", 401, login_data)

    def test_get_profile(self):
        """Test getting user profile"""
        if not self.token:
            self.log_test("Get Profile", False, "No token available")
            return False, {}
            
        success, response = self.run_test("Get Profile", "GET", "profile", 200)
        
        if success:
            print(f"   Profile Name: {response.get('name', 'N/A')}")
            print(f"   Payment Status: {response.get('payment_status', 'N/A')}")
            
        return success, response

    def test_get_profile_unauthorized(self):
        """Test getting profile without token"""
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test("Unauthorized Profile", "GET", "profile", 401)
        
        # Restore token
        self.token = temp_token
        return success, response

    def test_get_all_students(self):
        """Test getting all students"""
        if not self.token:
            self.log_test("Get All Students", False, "No token available")
            return False, {}
            
        success, response = self.run_test("Get All Students", "GET", "students", 200)
        
        if success:
            print(f"   Students found: {len(response) if isinstance(response, list) else 'N/A'}")
            
        return success, response

    def test_get_students_by_stream(self):
        """Test getting students filtered by stream"""
        if not self.token:
            self.log_test("Get Students by Stream", False, "No token available")
            return False, {}
            
        success, response = self.run_test("Get Students by Stream", "GET", "students?stream=Science", 200)
        
        if success:
            print(f"   Science students found: {len(response) if isinstance(response, list) else 'N/A'}")
            
        return success, response

    def test_payment_status_initial(self):
        """Test initial payment status (should be unpaid)"""
        if not self.token:
            self.log_test("Initial Payment Status", False, "No token available")
            return False, {}
            
        success, response = self.run_test("Initial Payment Status", "GET", "payment/status", 200)
        
        if success:
            payment_status = response.get('payment_status', 'unknown')
            payment_paid = response.get('payment_paid', False)
            print(f"   Payment Status: {payment_status}")
            print(f"   Payment Paid: {payment_paid}")
            
            if payment_status == 'unpaid' and not payment_paid:
                print("   ✓ Correct initial payment status")
                return True, response
            else:
                self.log_test("Initial Payment Status Validation", False, 
                            f"Expected unpaid/False, got {payment_status}/{payment_paid}")
                
        return success, response

    def test_submit_upi_payment(self):
        """Test UPI payment submission"""
        if not self.token:
            self.log_test("Submit UPI Payment", False, "No token available")
            return False, {}

        # Create a dummy image file
        dummy_image = BytesIO()
        dummy_image.write(b"dummy image content for testing payment screenshot")
        dummy_image.seek(0)
        
        transaction_id = f"UPI{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        form_data = {
            "transaction_id": transaction_id
        }
        
        files = {
            "screenshot": ("test_screenshot.jpg", dummy_image, "image/jpeg")
        }
        
        success, response = self.run_test(
            "Submit UPI Payment", 
            "POST", 
            "payment/submit-upi", 
            200, 
            data=form_data, 
            files=files
        )
        
        if success:
            print(f"   Transaction ID: {response.get('transaction_id', 'N/A')}")
            print(f"   Status: {response.get('status', 'N/A')}")
            return True, response
            
        return False, response

    def test_payment_status_after_submission(self):
        """Test payment status after UPI submission (should be pending)"""
        if not self.token:
            self.log_test("Payment Status After Submission", False, "No token available")
            return False, {}
            
        success, response = self.run_test("Payment Status After Submission", "GET", "payment/status", 200)
        
        if success:
            payment_status = response.get('payment_status', 'unknown')
            payment_paid = response.get('payment_paid', False)
            print(f"   Payment Status: {payment_status}")
            print(f"   Payment Paid: {payment_paid}")
            
            if payment_status == 'pending':
                print("   ✓ Payment status correctly updated to pending")
                return True, response
            else:
                self.log_test("Payment Status After Submission Validation", False, 
                            f"Expected 'pending', got '{payment_status}'")
                
        return success, response

    def test_duplicate_payment_submission(self):
        """Test submitting payment when already submitted"""
        if not self.token:
            self.log_test("Duplicate Payment Submission", False, "No token available")
            return False, {}

        # Create another dummy image file
        dummy_image = BytesIO()
        dummy_image.write(b"another dummy image for duplicate payment test")
        dummy_image.seek(0)
        
        transaction_id = f"UPI{datetime.now().strftime('%Y%m%d%H%M%S')}_DUP"
        
        form_data = {
            "transaction_id": transaction_id
        }
        
        files = {
            "screenshot": ("test_screenshot2.jpg", dummy_image, "image/jpeg")
        }
        
        # This should fail since payment already submitted
        success, response = self.run_test(
            "Duplicate Payment Submission", 
            "POST", 
            "payment/submit-upi", 
            400, 
            data=form_data, 
            files=files
        )
        
        return success, response

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting StudentsNet API Tests")
        print("=" * 50)
        
        # Test API availability
        self.test_root_endpoint()
        
        # Test registration flow
        self.test_register_user()
        self.test_register_duplicate_user()
        
        # Test login flow
        self.test_login_valid_credentials()
        self.test_login_invalid_credentials()
        
        # Test profile access
        self.test_get_profile()
        self.test_get_profile_unauthorized()
        
        # Test students endpoints
        self.test_get_all_students()
        self.test_get_students_by_stream()
        
        # Test payment flow
        self.test_payment_status_initial()
        self.test_submit_upi_payment()
        self.test_payment_status_after_submission()
        self.test_duplicate_payment_submission()
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if test['status'] == 'FAILED']
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = StudentsNetAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())