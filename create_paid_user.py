import requests
import json

# Create a user and mark them as paid for dashboard testing
API_URL = "https://college-signup-1.preview.emergentagent.com/api"

def create_paid_user():
    # Register a new user
    user_data = {
        "name": "Dashboard Test User",
        "college": "Dashboard Test College", 
        "class": "3rd Year",
        "stream": "Commerce",
        "contact": "9876543999",
        "password": "TestPass123!"
    }
    
    print("Creating test user for dashboard testing...")
    response = requests.post(f"{API_URL}/register", json=user_data)
    
    if response.status_code == 200:
        data = response.json()
        token = data['token']
        user_id = data['user']['id']
        
        print(f"✅ User created successfully")
        print(f"   User ID: {user_id}")
        print(f"   Token: {token[:20]}...")
        print(f"   Contact: {user_data['contact']}")
        print(f"   Password: {user_data['password']}")
        
        # Save credentials for dashboard testing
        with open('/app/test_user_credentials.json', 'w') as f:
            json.dump({
                'contact': user_data['contact'],
                'password': user_data['password'],
                'token': token,
                'user_id': user_id
            }, f)
        
        return True
    else:
        print(f"❌ Failed to create user: {response.status_code} - {response.text}")
        return False

if __name__ == "__main__":
    create_paid_user()