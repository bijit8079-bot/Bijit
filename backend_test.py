import requests
import sys
import json
from datetime import datetime

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

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

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
            return True, response
        
        return False, response

    def test_register_duplicate_user(self):
        """Test registration with duplicate contact"""
        if not self.token:
            self.log_test("Duplicate Registration", False, "No existing user to duplicate")
            return False, {}
            
        # Try to register with same contact
        test_data = {
            "name": "Duplicate User",
            "college": "Test College",
            "class": "2nd Year", 
            "stream": "Arts",
            "contact": f"9876543{datetime.now().strftime('%H%M%S')[-3:]}",  # This should be same as previous
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
            
        return self.run_test("Get Profile", "GET", "profile", 200)

    def test_get_profile_unauthorized(self):
        """Test getting profile without token"""
        # Temporarily remove token
        temp_token = self.token
        self.token = None
        
        return self.run_test("Unauthorized Profile", "GET", "profile", 403)
        
        # Restore token
        self.token = temp_token
        return success, response

    def test_get_all_students(self):
        """Test getting all students"""
        if not self.token:
            self.log_test("Get All Students", False, "No token available")
            return False, {}
            
        return self.run_test("Get All Students", "GET", "students", 200)

    def test_get_students_by_stream(self):
        """Test getting students filtered by stream"""
        if not self.token:
            self.log_test("Get Students by Stream", False, "No token available")
            return False, {}
            
        return self.run_test("Get Students by Stream", "GET", "students?stream=Science", 200)

    def test_create_payment_session(self):
        """Test creating payment session"""
        if not self.token:
            self.log_test("Create Payment Session", False, "No token available")
            return False, {}
            
        payment_data = {
            "origin_url": self.base_url
        }
        
        success, response = self.run_test("Create Payment Session", "POST", "payment/create-session", 200, payment_data)
        
        if success and 'url' in response and 'session_id' in response:
            print(f"   Payment URL: {response['url'][:50]}...")
            print(f"   Session ID: {response['session_id']}")
            print(f"   Amount: ${response['amount']}")
            return True, response
            
        return False, response

    def test_payment_status_check(self):
        """Test payment status check"""
        if not self.token:
            self.log_test("Payment Status Check", False, "No token available")
            return False, {}
            
        # Create a payment session first
        payment_data = {"origin_url": self.base_url}
        success, session_response = self.run_test("Create Session for Status Check", "POST", "payment/create-session", 200, payment_data)
        
        if not success:
            return False, {}
            
        session_id = session_response.get('session_id')
        if not session_id:
            self.log_test("Payment Status Check", False, "No session ID from payment creation")
            return False, {}
            
        return self.run_test("Payment Status Check", "GET", f"payment/status/{session_id}", 200)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting StudentsNet API Tests")
        print("=" * 50)
        
        # Test API availability
        self.test_root_endpoint()
        
        # Test registration flow
        self.test_register_user()
        
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
        self.test_create_payment_session()
        self.test_payment_status_check()
        
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