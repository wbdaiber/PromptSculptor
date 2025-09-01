/**
 * Test script for session synchronization under concurrent requests
 * This simulates multiple concurrent authentication operations to test race conditions
 */
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

// Test user credentials
const TEST_USER = {
  email: 'test123@example.com',
  password: 'TestPassword123',
  username: 'testuser123'
};

// Helper function to make authenticated request
async function makeAuthenticatedRequest(sessionCookie, endpoint) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json'
    }
  });
  
  return {
    status: response.status,
    data: await response.json().catch(() => null),
    setCookie: response.headers.get('set-cookie')
  };
}

// Test concurrent requests with same session
async function testConcurrentSessionRequests() {
  console.log('\n=== Testing Concurrent Session Requests ===');
  
  try {
    // First, login to get session
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    if (loginResponse.status !== 200) {
      console.log('Login failed, trying to register first...');
      
      // Try to register first
      await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER)
      });
      
      // Try login again
      const retryLogin = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER)
      });
      
      if (retryLogin.status !== 200) {
        throw new Error('Could not authenticate test user');
      }
      
      const sessionCookie = retryLogin.headers.get('set-cookie');
      
      // Test concurrent requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(makeAuthenticatedRequest(sessionCookie, '/api/templates'));
        promises.push(makeAuthenticatedRequest(sessionCookie, '/api/prompts/recent'));
        promises.push(makeAuthenticatedRequest(sessionCookie, '/api/user/api-keys'));
      }
      
      console.log('Making 30 concurrent authenticated requests...');
      const results = await Promise.all(promises);
      
      // Check results
      const successful = results.filter(r => r.status === 200).length;
      const failed = results.filter(r => r.status !== 200).length;
      
      console.log(`✓ Successful requests: ${successful}/30`);
      console.log(`✗ Failed requests: ${failed}/30`);
      
      if (failed === 0) {
        console.log('✅ All concurrent session requests succeeded');
      } else {
        console.log('❌ Some concurrent requests failed');
        console.log('Failed responses:', results.filter(r => r.status !== 200));
      }
      
      return failed === 0;
    }
    
    const sessionCookie = loginResponse.headers.get('set-cookie');
    
    // Test concurrent requests
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(makeAuthenticatedRequest(sessionCookie, '/api/templates'));
      promises.push(makeAuthenticatedRequest(sessionCookie, '/api/prompts/recent'));
      promises.push(makeAuthenticatedRequest(sessionCookie, '/api/user/api-keys'));
    }
    
    console.log('Making 30 concurrent authenticated requests...');
    const results = await Promise.all(promises);
    
    // Check results
    const successful = results.filter(r => r.status === 200).length;
    const failed = results.filter(r => r.status !== 200).length;
    
    console.log(`✓ Successful requests: ${successful}/30`);
    console.log(`✗ Failed requests: ${failed}/30`);
    
    if (failed === 0) {
      console.log('✅ All concurrent session requests succeeded');
    } else {
      console.log('❌ Some concurrent requests failed');
      console.log('Failed responses:', results.filter(r => r.status !== 200));
    }
    
    return failed === 0;
    
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Test rapid login/logout cycles
async function testRapidAuthCycles() {
  console.log('\n=== Testing Rapid Auth Cycles ===');
  
  try {
    const promises = [];
    
    for (let i = 0; i < 5; i++) {
      promises.push((async () => {
        // Login
        const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(TEST_USER)
        });
        
        if (loginResponse.status !== 200) return false;
        
        const sessionCookie = loginResponse.headers.get('set-cookie');
        
        // Make a quick request
        const dataResponse = await makeAuthenticatedRequest(sessionCookie, '/api/templates');
        
        // Logout
        const logoutResponse = await fetch(`${BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Cookie': sessionCookie }
        });
        
        return dataResponse.status === 200 && logoutResponse.status === 200;
      })());
    }
    
    console.log('Running 5 concurrent login/request/logout cycles...');
    const results = await Promise.all(promises);
    
    const successful = results.filter(r => r === true).length;
    console.log(`✓ Successful cycles: ${successful}/5`);
    
    if (successful === 5) {
      console.log('✅ All rapid auth cycles succeeded');
    } else {
      console.log('❌ Some auth cycles failed');
    }
    
    return successful === 5;
    
  } catch (error) {
    console.error('Rapid auth test failed:', error);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('Session Synchronization Test Suite');
  console.log('=====================================');
  
  // Check if server is running
  try {
    await fetch(`${BASE_URL}/api/health`);
  } catch (error) {
    console.error('❌ Server not running. Please start the server first with: npm run dev');
    process.exit(1);
  }
  
  console.log('✓ Server is running');
  
  const test1 = await testConcurrentSessionRequests();
  const test2 = await testRapidAuthCycles();
  
  console.log('\n=== Test Results Summary ===');
  console.log(`Concurrent session requests: ${test1 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Rapid auth cycles: ${test2 ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (test1 && test2) {
    console.log('\n🎉 All session synchronization tests PASSED!');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests FAILED. Check session middleware implementation.');
    process.exit(1);
  }
}

runTests();