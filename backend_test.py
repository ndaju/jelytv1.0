#!/usr/bin/env python3
"""
JellyTV Backend API Testing Script
Tests all authentication, owner, and public endpoints
"""
import requests
import json
import time
from typing import Optional, Dict, Any

class JellyTVTester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.api_url = f"{self.base_url}/api"
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'JellyTV-Tester/1.0'
        })
        
        # Test results
        self.results = {
            'auth_endpoints': {},
            'owner_endpoints': {},
            'public_endpoints': {},
            'summary': {'passed': 0, 'failed': 0, 'total': 0}
        }
        
    def log_result(self, test_name: str, success: bool, message: str, category: str = 'general'):
        """Log test result"""
        print(f"{'✅' if success else '❌'} {test_name}: {message}")
        
        if category not in self.results:
            self.results[category] = {}
            
        self.results[category][test_name] = {
            'success': success,
            'message': message,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        self.results['summary']['total'] += 1
        if success:
            self.results['summary']['passed'] += 1
        else:
            self.results['summary']['failed'] += 1
            
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> requests.Response:
        """Make HTTP request with error handling"""
        url = f"{self.api_url}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, params=params)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, params=params)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
            
        except requests.exceptions.RequestException as e:
            print(f"Request error: {str(e)}")
            raise
            
    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication Endpoints...")
        
        # Test 1: Login with owner credentials
        try:
            response = self.make_request('POST', '/auth/login', {
                'username': 'ryan',
                'password': '115457'
            })
            
            if response.status_code == 200:
                data = response.json()
                if 'user' in data and data['user']['role'] == 'owner':
                    self.log_result('Login with owner credentials', True, 
                                  f"Successfully logged in as {data['user']['username']}", 'auth_endpoints')
                    # Store cookies for future requests
                    self.session.cookies.update(response.cookies)
                else:
                    self.log_result('Login with owner credentials', False, 
                                  'Login succeeded but user data incorrect', 'auth_endpoints')
            else:
                error_msg = response.json().get('error', 'Unknown error') if response.headers.get('content-type', '').startswith('application/json') else response.text
                self.log_result('Login with owner credentials', False, 
                              f"Status {response.status_code}: {error_msg}", 'auth_endpoints')
                              
        except Exception as e:
            self.log_result('Login with owner credentials', False, f"Exception: {str(e)}", 'auth_endpoints')
            
        # Test 2: Get current session info
        try:
            response = self.make_request('GET', '/auth/me')
            
            if response.status_code == 200:
                data = response.json()
                if 'user' in data and data['user']['username'] == 'ryan':
                    self.log_result('Get session info', True, 
                                  f"Retrieved session for {data['user']['username']}", 'auth_endpoints')
                else:
                    self.log_result('Get session info', False, 
                                  'Session data incorrect', 'auth_endpoints')
            else:
                error_msg = response.json().get('error', 'Unknown error') if response.headers.get('content-type', '').startswith('application/json') else response.text
                self.log_result('Get session info', False, 
                              f"Status {response.status_code}: {error_msg}", 'auth_endpoints')
                              
        except Exception as e:
            self.log_result('Get session info', False, f"Exception: {str(e)}", 'auth_endpoints')
            
        # Test 3: Logout (but login again for owner tests)
        try:
            response = self.make_request('POST', '/auth/logout')
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.log_result('Logout', True, 'Successfully logged out', 'auth_endpoints')
                    
                    # Login again for owner endpoint tests
                    login_response = self.make_request('POST', '/auth/login', {
                        'username': 'ryan',
                        'password': '115457'
                    })
                    if login_response.status_code == 200:
                        self.session.cookies.update(login_response.cookies)
                else:
                    self.log_result('Logout', False, 'Logout response invalid', 'auth_endpoints')
            else:
                error_msg = response.json().get('error', 'Unknown error') if response.headers.get('content-type', '').startswith('application/json') else response.text
                self.log_result('Logout', False, f"Status {response.status_code}: {error_msg}", 'auth_endpoints')
                
        except Exception as e:
            self.log_result('Logout', False, f"Exception: {str(e)}", 'auth_endpoints')
            
    def test_owner_endpoints(self):
        """Test owner-only endpoints"""
        print("\n👑 Testing Owner Endpoints...")
        
        # Test 1: List all users
        try:
            response = self.make_request('GET', '/owner/users')
            
            if response.status_code == 200:
                data = response.json()
                if 'users' in data and isinstance(data['users'], list):
                    self.log_result('List users', True, 
                                  f"Retrieved {len(data['users'])} users", 'owner_endpoints')
                else:
                    self.log_result('List users', False, 'Invalid users data structure', 'owner_endpoints')
            else:
                error_msg = response.json().get('error', 'Unknown error') if response.headers.get('content-type', '').startswith('application/json') else response.text
                self.log_result('List users', False, f"Status {response.status_code}: {error_msg}", 'owner_endpoints')
                
        except Exception as e:
            self.log_result('List users', False, f"Exception: {str(e)}", 'owner_endpoints')
            
        # Test 2: Create new user
        try:
            user_data = {
                'username': 'testuser_' + str(int(time.time())),
                'password': 'testpass123',
                'subscriptionEnd': '2025-12-31T23:59:59.000Z'
            }
            
            response = self.make_request('POST', '/owner/users', user_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'user' in data and data['user']['username'] == user_data['username']:
                    self.log_result('Create user', True, 
                                  f"Created user {data['user']['username']}", 'owner_endpoints')
                else:
                    self.log_result('Create user', False, 'Invalid user creation response', 'owner_endpoints')
            else:
                error_msg = response.json().get('error', 'Unknown error') if response.headers.get('content-type', '').startswith('application/json') else response.text
                self.log_result('Create user', False, f"Status {response.status_code}: {error_msg}", 'owner_endpoints')
                
        except Exception as e:
            self.log_result('Create user', False, f"Exception: {str(e)}", 'owner_endpoints')
            
        # Test 3: List categories
        try:
            response = self.make_request('GET', '/owner/categories')
            
            if response.status_code == 200:
                data = response.json()
                if 'categories' in data and isinstance(data['categories'], list):
                    self.log_result('List categories (owner)', True, 
                                  f"Retrieved {len(data['categories'])} categories", 'owner_endpoints')
                else:
                    self.log_result('List categories (owner)', False, 'Invalid categories data', 'owner_endpoints')
            else:
                error_msg = response.json().get('error', 'Unknown error') if response.headers.get('content-type', '').startswith('application/json') else response.text
                self.log_result('List categories (owner)', False, f"Status {response.status_code}: {error_msg}", 'owner_endpoints')
                
        except Exception as e:
            self.log_result('List categories (owner)', False, f"Exception: {str(e)}", 'owner_endpoints')
            
        # Test 4: Create category
        try:
            category_data = {
                'name': 'Test Category ' + str(int(time.time())),
                'description': 'Test category for API testing'
            }
            
            response = self.make_request('POST', '/owner/categories', category_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'category' in data and data['category']['name'] == category_data['name']:
                    self.log_result('Create category', True, 
                                  f"Created category '{data['category']['name']}'", 'owner_endpoints')
                    # Store category ID for media test
                    self.test_category_id = data['category']['id']
                else:
                    self.log_result('Create category', False, 'Invalid category creation response', 'owner_endpoints')
            else:
                error_msg = response.json().get('error', 'Unknown error') if response.headers.get('content-type', '').startswith('application/json') else response.text
                self.log_result('Create category', False, f"Status {response.status_code}: {error_msg}", 'owner_endpoints')
                
        except Exception as e:
            self.log_result('Create category', False, f"Exception: {str(e)}", 'owner_endpoints')
            
        # Test 5: TMDB search
        try:
            response = self.make_request('GET', '/owner/tmdb/search', params={'q': 'Inception', 'type': 'movie'})
            
            if response.status_code == 200:
                data = response.json()
                if 'results' in data and isinstance(data['results'], list):
                    self.log_result('TMDB search', True, 
                                  f"Found {len(data['results'])} results for 'Inception'", 'owner_endpoints')
                else:
                    self.log_result('TMDB search', False, 'Invalid TMDB search response', 'owner_endpoints')
            else:
                error_msg = response.json().get('error', 'Unknown error') if response.headers.get('content-type', '').startswith('application/json') else response.text
                self.log_result('TMDB search', False, f"Status {response.status_code}: {error_msg}", 'owner_endpoints')
                
        except Exception as e:
            self.log_result('TMDB search', False, f"Exception: {str(e)}", 'owner_endpoints')
            
        # Test 6: Add media link
        try:
            media_data = {
                'title': 'Test Movie ' + str(int(time.time())),
                'url': 'https://example.com/test-movie.mp4',
                'type': 'MOVIE',
                'categoryId': getattr(self, 'test_category_id', None)
            }
            
            response = self.make_request('POST', '/owner/media/add-link', media_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'mediaItem' in data and data['mediaItem']['title'] == media_data['title']:
                    self.log_result('Add media link', True, 
                                  f"Added media '{data['mediaItem']['title']}'", 'owner_endpoints')
                else:
                    self.log_result('Add media link', False, 'Invalid media creation response', 'owner_endpoints')
            else:
                error_msg = response.json().get('error', 'Unknown error') if response.headers.get('content-type', '').startswith('application/json') else response.text
                self.log_result('Add media link', False, f"Status {response.status_code}: {error_msg}", 'owner_endpoints')
                
        except Exception as e:
            self.log_result('Add media link', False, f"Exception: {str(e)}", 'owner_endpoints')
            
    def test_public_endpoints(self):
        """Test public endpoints (no authentication required)"""
        print("\n🌐 Testing Public Endpoints...")
        
        # Clear session cookies to test public access
        self.session.cookies.clear()
        
        # Test 1: Get all categories
        try:
            response = self.make_request('GET', '/categories')
            
            if response.status_code == 200:
                data = response.json()
                if 'categories' in data and isinstance(data['categories'], list):
                    self.log_result('Get categories (public)', True, 
                                  f"Retrieved {len(data['categories'])} public categories", 'public_endpoints')
                else:
                    self.log_result('Get categories (public)', False, 'Invalid categories response', 'public_endpoints')
            else:
                error_msg = response.json().get('error', 'Unknown error') if response.headers.get('content-type', '').startswith('application/json') else response.text
                self.log_result('Get categories (public)', False, f"Status {response.status_code}: {error_msg}", 'public_endpoints')
                
        except Exception as e:
            self.log_result('Get categories (public)', False, f"Exception: {str(e)}", 'public_endpoints')
            
        # Test 2: Get all media
        try:
            response = self.make_request('GET', '/media')
            
            if response.status_code == 200:
                data = response.json()
                if 'media' in data and isinstance(data['media'], list):
                    self.log_result('Get media (public)', True, 
                                  f"Retrieved {len(data['media'])} media items", 'public_endpoints')
                else:
                    self.log_result('Get media (public)', False, 'Invalid media response', 'public_endpoints')
            else:
                error_msg = response.json().get('error', 'Unknown error') if response.headers.get('content-type', '').startswith('application/json') else response.text
                self.log_result('Get media (public)', False, f"Status {response.status_code}: {error_msg}", 'public_endpoints')
                
        except Exception as e:
            self.log_result('Get media (public)', False, f"Exception: {str(e)}", 'public_endpoints')
            
        # Test 3: Get all channels
        try:
            response = self.make_request('GET', '/channels')
            
            if response.status_code == 200:
                data = response.json()
                if 'channels' in data and isinstance(data['channels'], list):
                    self.log_result('Get channels (public)', True, 
                                  f"Retrieved {len(data['channels'])} channels", 'public_endpoints')
                else:
                    self.log_result('Get channels (public)', False, 'Invalid channels response', 'public_endpoints')
            else:
                error_msg = response.json().get('error', 'Unknown error') if response.headers.get('content-type', '').startswith('application/json') else response.text
                self.log_result('Get channels (public)', False, f"Status {response.status_code}: {error_msg}", 'public_endpoints')
                
        except Exception as e:
            self.log_result('Get channels (public)', False, f"Exception: {str(e)}", 'public_endpoints')
            
    def test_database_seeded_data(self):
        """Test if database has been properly seeded"""
        print("\n🗃️ Testing Database Seeded Data...")
        
        # Login as owner to check seeded data
        try:
            login_response = self.make_request('POST', '/auth/login', {
                'username': 'ryan',
                'password': '115457'
            })
            if login_response.status_code == 200:
                self.session.cookies.update(login_response.cookies)
                
                # Check if default categories exist
                response = self.make_request('GET', '/owner/categories')
                if response.status_code == 200:
                    data = response.json()
                    categories = data.get('categories', [])
                    expected_categories = ['Movies', 'Series', 'Sports', 'Kids', 'News']
                    
                    found_categories = [cat['name'] for cat in categories]
                    missing = [cat for cat in expected_categories if cat not in found_categories]
                    
                    if not missing:
                        self.log_result('Default categories seeded', True, 
                                      f"All expected categories found: {found_categories}", 'public_endpoints')
                    else:
                        self.log_result('Default categories seeded', False, 
                                      f"Missing categories: {missing}", 'public_endpoints')
                else:
                    self.log_result('Default categories seeded', False, 
                                  'Could not fetch categories to verify seeding', 'public_endpoints')
                    
        except Exception as e:
            self.log_result('Default categories seeded', False, f"Exception: {str(e)}", 'public_endpoints')
            
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting JellyTV Backend API Tests...")
        print(f"Base URL: {self.base_url}")
        print(f"API URL: {self.api_url}")
        
        try:
            self.test_auth_endpoints()
            self.test_owner_endpoints()
            self.test_public_endpoints() 
            self.test_database_seeded_data()
            
        except Exception as e:
            print(f"❌ Critical error during testing: {str(e)}")
            
        self.print_summary()
        
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("📊 JellyTV Backend API Test Results Summary")
        print("="*60)
        
        summary = self.results['summary']
        print(f"Total Tests: {summary['total']}")
        print(f"✅ Passed: {summary['passed']}")
        print(f"❌ Failed: {summary['failed']}")
        
        success_rate = (summary['passed'] / summary['total'] * 100) if summary['total'] > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Print failed tests
        if summary['failed'] > 0:
            print("\n❌ Failed Tests:")
            for category, tests in self.results.items():
                if category != 'summary':
                    for test_name, result in tests.items():
                        if not result['success']:
                            print(f"  - {test_name}: {result['message']}")
                            
        print("\n" + "="*60)
        
        return summary['failed'] == 0


if __name__ == "__main__":
    # Get base URL from environment
    import os
    base_url = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://stream-portal-87.preview.emergentagent.com')
    
    tester = JellyTVTester(base_url)
    success = tester.run_all_tests()
    
    exit(0 if success else 1)