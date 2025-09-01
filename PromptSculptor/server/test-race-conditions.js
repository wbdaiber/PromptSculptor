/**
 * Comprehensive test suite for authentication race conditions and demo mode
 * Tests all scenarios described in AUTHENTICATION_RACE_CONDITION_FIX.md
 */
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

// Test credentials
const TEST_USER = {
  email: `test_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  username: `testuser_${Date.now()}`
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper to make authenticated request
async function makeAuthenticatedRequest(sessionCookie, endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Cookie': sessionCookie,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  
  return {
    status: response.status,
    data: await response.json().catch(() => null),
    headers: response.headers
  };
}

// Test 1: Demo mode for unauthenticated users
async function testUnauthenticatedDemoMode() {
  log('\n=== Test 1: Unauthenticated Demo Mode ===', 'blue');
  
  try {
    const response = await fetch(`${BASE_URL}/api/prompts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        naturalLanguageInput: 'Create a function to sort an array',
        templateType: 'coding',
        targetModel: 'claude',
        complexityLevel: 'simple',
        includeExamples: false,
        useXMLTags: false,
        includeConstraints: false
      })
    });
    
    const data = await response.json();
    
    if (data.demoInfo && data.demoInfo.message) {
      log('✅ Demo mode active for unauthenticated user', 'green');
      log(`   Message: ${data.demoInfo.message.substring(0, 80)}...`, 'green');
      return true;
    } else {
      log('❌ Demo mode not properly activated for unauthenticated user', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    return false;
  }
}

// Test 2: Authenticated user without API keys
async function testAuthenticatedNoDemoMode() {
  log('\n=== Test 2: Authenticated User Without API Keys ===', 'blue');
  
  try {
    // Register new user
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    if (registerResponse.status !== 201) {
      throw new Error('Failed to register test user');
    }
    
    const sessionCookie = registerResponse.headers.get('set-cookie').split(';')[0];
    
    // Generate prompt without API keys
    const generateResponse = await makeAuthenticatedRequest(
      sessionCookie,
      '/api/prompts/generate',
      'POST',
      {
        naturalLanguageInput: 'Create a REST API endpoint',
        templateType: 'coding',
        targetModel: 'claude',
        complexityLevel: 'detailed',
        includeExamples: true,
        useXMLTags: false,
        includeConstraints: false
      }
    );
    
    if (generateResponse.data?.demoInfo?.isDemo !== false) {
      log('❌ Demo mode detection incorrect for authenticated user', 'red');
      return false;
    }
    
    if (generateResponse.data?.demoInfo?.message?.includes('API key')) {
      log('✅ Correct demo mode message for authenticated user without API keys', 'green');
      log(`   Message: ${generateResponse.data.demoInfo.message.substring(0, 80)}...`, 'green');
      return true;
    } else {
      log('❌ Incorrect message for authenticated user without API keys', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    return false;
  }
}

// Test 3: Rapid navigation (simulating the original race condition)
async function testRapidNavigation() {
  log('\n=== Test 3: Rapid Navigation Race Condition ===', 'blue');
  
  try {
    // Create and login user
    const loginUser = {
      email: `nav_${Date.now()}@example.com`,
      password: 'NavTest123!',
      username: `navuser_${Date.now()}`
    };
    
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginUser)
    });
    
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginUser)
    });
    
    const sessionCookie = loginResponse.headers.get('set-cookie').split(';')[0];
    
    // Simulate rapid navigation by making multiple concurrent requests
    const promises = [];
    for (let i = 0; i < 10; i++) {
      // Mix of different endpoints to simulate navigation
      promises.push(makeAuthenticatedRequest(sessionCookie, '/api/templates'));
      promises.push(makeAuthenticatedRequest(sessionCookie, '/api/prompts/recent'));
      promises.push(makeAuthenticatedRequest(sessionCookie, '/api/user/api-keys'));
      promises.push(makeAuthenticatedRequest(sessionCookie, '/api/prompts/generate', 'POST', {
        naturalLanguageInput: `Test prompt ${i}`,
        templateType: 'custom',
        targetModel: 'gpt',
        complexityLevel: 'simple',
        includeExamples: false,
        useXMLTags: false,
        includeConstraints: false
      }));
    }
    
    log('   Making 40 concurrent requests during navigation...', 'yellow');
    const results = await Promise.all(promises);
    
    // Check that all requests maintain consistent auth state
    const authStates = results.map(r => {
      if (r.data?.demoInfo) {
        return r.data.demoInfo.message?.includes('Sign up') ? 'unauth' : 'auth';
      }
      return r.status === 200 ? 'auth' : 'unknown';
    });
    
    const uniqueStates = [...new Set(authStates)];
    
    if (uniqueStates.length === 1 && uniqueStates[0] === 'auth') {
      log('✅ Consistent authentication state during rapid navigation', 'green');
      log(`   All ${results.length} requests maintained authenticated state`, 'green');
      return true;
    } else {
      log('❌ Inconsistent authentication state detected', 'red');
      log(`   States detected: ${uniqueStates.join(', ')}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    return false;
  }
}

// Test 4: Concurrent login/logout cycles
async function testConcurrentAuthCycles() {
  log('\n=== Test 4: Concurrent Authentication Cycles ===', 'blue');
  
  try {
    const cycleUser = {
      email: `cycle_${Date.now()}@example.com`,
      password: 'CycleTest123!',
      username: `cycleuser_${Date.now()}`
    };
    
    // Register user first
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cycleUser)
    });
    
    const promises = [];
    
    // Run 5 concurrent login/action/logout cycles
    for (let i = 0; i < 5; i++) {
      promises.push((async () => {
        try {
          // Login
          const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cycleUser)
          });
          
          if (loginResponse.status !== 200) return { success: false, error: 'Login failed' };
          
          const sessionCookie = loginResponse.headers.get('set-cookie').split(';')[0];
          
          // Make authenticated request
          const dataResponse = await makeAuthenticatedRequest(sessionCookie, '/api/templates');
          
          // Generate a prompt
          const generateResponse = await makeAuthenticatedRequest(
            sessionCookie,
            '/api/prompts/generate',
            'POST',
            {
              naturalLanguageInput: `Cycle test ${i}`,
              templateType: 'custom',
              targetModel: 'gpt',
              complexityLevel: 'simple',
              includeExamples: false,
              useXMLTags: false,
              includeConstraints: false
            }
          );
          
          // Logout
          const logoutResponse = await fetch(`${BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Cookie': sessionCookie }
          });
          
          return {
            success: dataResponse.status === 200 && 
                    generateResponse.status === 200 && 
                    logoutResponse.status === 200,
            cycle: i
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })());
    }
    
    log('   Running 5 concurrent login/generate/logout cycles...', 'yellow');
    const results = await Promise.all(promises);
    
    const successful = results.filter(r => r.success).length;
    
    if (successful === 5) {
      log('✅ All concurrent authentication cycles succeeded', 'green');
      log(`   ${successful}/5 cycles completed without race conditions`, 'green');
      return true;
    } else {
      log('❌ Some authentication cycles failed', 'red');
      log(`   ${successful}/5 cycles succeeded`, 'red');
      const failed = results.filter(r => !r.success);
      failed.forEach(f => log(`   Error: ${f.error}`, 'red'));
      return false;
    }
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    return false;
  }
}

// Test 5: Context validation consistency
async function testContextValidation() {
  log('\n=== Test 5: Context Validation Consistency ===', 'blue');
  
  try {
    const contextUser = {
      email: `context_${Date.now()}@example.com`,
      password: 'ContextTest123!',
      username: `contextuser_${Date.now()}`
    };
    
    // Register and login
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contextUser)
    });
    
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contextUser)
    });
    
    const sessionCookie = loginResponse.headers.get('set-cookie').split(';')[0];
    
    // Make multiple requests in parallel to test context consistency
    const endpoints = [
      '/api/templates',
      '/api/prompts/recent',
      '/api/prompts/favorites',
      '/api/user/api-keys'
    ];
    
    const promises = [];
    for (let i = 0; i < 3; i++) {
      endpoints.forEach(endpoint => {
        promises.push(makeAuthenticatedRequest(sessionCookie, endpoint));
      });
    }
    
    log('   Testing context validation across 12 parallel requests...', 'yellow');
    const results = await Promise.all(promises);
    
    // All authenticated endpoints should return 200
    const allSuccessful = results.every(r => r.status === 200 || r.status === 404); // 404 is ok for empty data
    
    if (allSuccessful) {
      log('✅ Context validation consistent across all requests', 'green');
      log(`   All ${results.length} requests maintained proper context`, 'green');
      return true;
    } else {
      log('❌ Context validation inconsistency detected', 'red');
      const failed = results.filter(r => r.status !== 200 && r.status !== 404);
      log(`   ${failed.length} requests failed with status: ${failed.map(f => f.status).join(', ')}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    return false;
  }
}

// Main test runner
async function runAllTests() {
  log('\n╔══════════════════════════════════════════════════════════╗', 'blue');
  log('║   Authentication Race Condition Comprehensive Test Suite   ║', 'blue');
  log('╚══════════════════════════════════════════════════════════╝', 'blue');
  
  // Check server health
  try {
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const health = await healthResponse.json();
    if (health.status !== 'healthy') {
      throw new Error('Server is not healthy');
    }
    log('\n✓ Server is running and healthy', 'green');
  } catch (error) {
    log('\n❌ Server is not running. Start the server with: npm run dev', 'red');
    process.exit(1);
  }
  
  // Run all tests
  const testResults = {
    unauthenticatedDemo: await testUnauthenticatedDemoMode(),
    authenticatedNoKeys: await testAuthenticatedNoDemoMode(),
    rapidNavigation: await testRapidNavigation(),
    concurrentAuth: await testConcurrentAuthCycles(),
    contextValidation: await testContextValidation()
  };
  
  // Summary
  log('\n╔══════════════════════════════════════════════════════════╗', 'blue');
  log('║                     TEST RESULTS SUMMARY                   ║', 'blue');
  log('╚══════════════════════════════════════════════════════════╝', 'blue');
  
  const tests = [
    { name: 'Unauthenticated Demo Mode', result: testResults.unauthenticatedDemo },
    { name: 'Authenticated User (No API Keys)', result: testResults.authenticatedNoKeys },
    { name: 'Rapid Navigation Race Condition', result: testResults.rapidNavigation },
    { name: 'Concurrent Authentication Cycles', result: testResults.concurrentAuth },
    { name: 'Context Validation Consistency', result: testResults.contextValidation }
  ];
  
  tests.forEach(test => {
    const status = test.result ? '✅ PASSED' : '❌ FAILED';
    const color = test.result ? 'green' : 'red';
    log(`${test.name.padEnd(35)} ${status}`, color);
  });
  
  const allPassed = Object.values(testResults).every(r => r === true);
  
  if (allPassed) {
    log('\n🎉 ALL TESTS PASSED! Authentication race condition fix is working correctly!', 'green');
    log('✅ The system successfully prevents authenticated users from seeing demo mode', 'green');
    log('✅ All race conditions have been eliminated', 'green');
    process.exit(0);
  } else {
    log('\n💥 SOME TESTS FAILED. Review the implementation.', 'red');
    process.exit(1);
  }
}

// Run the test suite
runAllTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});