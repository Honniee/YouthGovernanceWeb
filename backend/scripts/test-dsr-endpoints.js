/**
 * Quick Testing Script for Data Subject Rights API Endpoints
 * 
 * Usage:
 *   node scripts/test-dsr-endpoints.js
 * 
 * Make sure to:
 *   1. Set your backend URL and admin token
 *   2. Have test data in the database
 */

import fetch from 'node-fetch';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'YOUR_ADMIN_JWT_TOKEN_HERE';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, path, body = null, requiresAuth = true) {
  try {
    log(`\n🧪 Testing: ${name}`, 'blue');
    log(`   ${method} ${path}`, 'yellow');

    const headers = {
      'Content-Type': 'application/json',
    };

    if (requiresAuth) {
      headers['Authorization'] = `Bearer ${ADMIN_TOKEN}`;
    }

    const options = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BACKEND_URL}${path}`, options);
    const data = await response.json();

    if (response.ok && data.success) {
      log(`   ✅ Success`, 'green');
      log(`   Response: ${JSON.stringify(data, null, 2).substring(0, 200)}...`, 'green');
      return { success: true, data };
    } else {
      log(`   ❌ Failed: ${data.message || response.statusText}`, 'red');
      log(`   Status: ${response.status}`, 'red');
      return { success: false, error: data.message || response.statusText };
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('🚀 Starting Data Subject Rights API Tests', 'blue');
  log('=' .repeat(50), 'blue');

  // Test 1: Get Statistics
  await testEndpoint(
    'Get Request Statistics',
    'GET',
    '/api/data-subject-rights/statistics'
  );

  // Test 2: List Requests
  await testEndpoint(
    'List Requests',
    'GET',
    '/api/data-subject-rights/requests?limit=10'
  );

  // Test 3: Create Request (Public - no auth)
  const createResult = await testEndpoint(
    'Create Request',
    'POST',
    '/api/data-subject-rights/requests',
    {
      requestType: 'access',
      requesterName: 'Test User',
      requesterEmail: 'test@example.com',
      requesterPhone: '1234567890',
      requestDescription: 'Test request created by testing script',
    },
    false // No auth required
  );

  let requestId = null;
  let accessToken = null;

  if (createResult.success && createResult.data?.data?.request) {
    requestId = createResult.data.data.request.request_id;
    accessToken = createResult.data.data.accessToken;
    log(`\n📝 Created Request ID: ${requestId}`, 'green');
    log(`   Access Token: ${accessToken?.substring(0, 20)}...`, 'green');
  }

  if (!requestId) {
    log('\n⚠️  Could not create request. Using existing request ID for remaining tests.', 'yellow');
    log('   Set REQUEST_ID environment variable to test with existing request.', 'yellow');
    requestId = process.env.REQUEST_ID || '1';
  }

  // Test 4: Get Request by ID
  await testEndpoint(
    'Get Request by ID',
    'GET',
    `/api/data-subject-rights/requests/${requestId}`
  );

  // Test 5: Get Request by Token (if token available)
  if (accessToken) {
    await testEndpoint(
      'Get Request by Token (Public)',
      'GET',
      `/api/data-subject-rights/requests/by-token/${accessToken}`,
      null,
      false // No auth required
    );
  }

  // Test 6: Update Request Status
  await testEndpoint(
    'Update Request Status',
    'PATCH',
    `/api/data-subject-rights/requests/${requestId}/status`,
    {
      status: 'in_progress',
      notes: 'Testing status update from script',
    }
  );

  // Test 7: Assign Request (if you have a valid user ID)
  const assignedTo = process.env.ASSIGN_TO_USER_ID || null;
  if (assignedTo) {
    await testEndpoint(
      'Assign Request',
      'POST',
      `/api/data-subject-rights/requests/${requestId}/assign`,
      {
        assignedTo: assignedTo,
      }
    );
  } else {
    log('\n⚠️  Skipping Assign Request test. Set ASSIGN_TO_USER_ID env var to test.', 'yellow');
  }

  // Test 8: Process Access Request (if request type is access)
  if (createResult.success) {
    await testEndpoint(
      'Process Access Request',
      'POST',
      `/api/data-subject-rights/requests/${requestId}/process-access`
    );
  }

  // Test 9: Verify Identity
  await testEndpoint(
    'Verify Identity',
    'POST',
    `/api/data-subject-rights/requests/${requestId}/verify-identity`,
    {
      verificationMethod: 'email',
    }
  );

  log('\n' + '='.repeat(50), 'blue');
  log('✅ Testing Complete!', 'green');
  log('\n📋 Summary:', 'blue');
  log('   - Check above for any failed tests', 'yellow');
  log('   - Review backend logs for detailed errors', 'yellow');
  log('   - Verify database changes if applicable', 'yellow');
}

// Run tests
runTests().catch((error) => {
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  process.exit(1);
});


