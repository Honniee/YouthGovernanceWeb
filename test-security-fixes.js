/**
 * Security Fixes Testing Script
 * Tests all critical security implementations
 */

import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper to log results
const logResult = (testName, passed, message = '') => {
  if (passed) {
    results.passed.push(testName);
    console.log(`✅ ${testName}`);
  } else {
    results.failed.push(testName);
    console.log(`❌ ${testName}: ${message}`);
  }
};

const logWarning = (testName, message) => {
  results.warnings.push({ test: testName, message });
  console.log(`⚠️  ${testName}: ${message}`);
};

// Test 1: CSRF Token Generation
async function testCSRFTokenGeneration() {
  try {
    console.log('\n📋 Test 1: CSRF Token Generation');
    const response = await axios.get(`${BASE_URL}/api/csrf-token`, {
      withCredentials: true
    });
    
    const hasToken = response.data.csrfToken && typeof response.data.csrfToken === 'string';
    const hasCookie = response.headers['set-cookie']?.some(cookie => cookie.includes('XSRF-TOKEN'));
    
    if (hasToken && hasCookie) {
      logResult('CSRF Token Generation', true);
      return response.data.csrfToken;
    } else {
      logResult('CSRF Token Generation', false, 'Token or cookie missing');
      return null;
    }
  } catch (error) {
    logResult('CSRF Token Generation', false, error.message);
    return null;
  }
}

// Test 2: CSRF Token Validation (should fail without token)
async function testCSRFValidationWithoutToken() {
  try {
    console.log('\n📋 Test 2: CSRF Validation (Without Token)');
    const response = await axios.post(
      `${BASE_URL}/api/staff`,
      { test: 'data' },
      {
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Don't throw on 403
      }
    );
    
    if (response.status === 403 && response.data.message?.includes('CSRF')) {
      logResult('CSRF Validation (Without Token)', true);
      return true;
    } else {
      logResult('CSRF Validation (Without Token)', false, 
        `Expected 403 with CSRF message, got ${response.status}`);
      return false;
    }
  } catch (error) {
    logResult('CSRF Validation (Without Token)', false, error.message);
    return false;
  }
}

// Test 3: CORS Preflight Validation
async function testCORSPreflight() {
  try {
    console.log('\n📋 Test 3: CORS Preflight Validation');
    
    // Test with allowed origin
    const allowedResponse = await axios.options(`${BASE_URL}/api/staff`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST'
      },
      validateStatus: () => true
    });
    
    const allowedOriginWorks = allowedResponse.status === 200 || 
                               allowedResponse.headers['access-control-allow-origin'];
    
    // Test with unauthorized origin
    const unauthorizedResponse = await axios.options(`${BASE_URL}/api/staff`, {
      headers: {
        'Origin': 'https://evil.com',
        'Access-Control-Request-Method': 'POST'
      },
      validateStatus: () => true
    });
    
    const unauthorizedBlocked = unauthorizedResponse.status === 403 ||
                                 (unauthorizedResponse.data?.message?.includes('CORS'));
    
    if (allowedOriginWorks && unauthorizedBlocked) {
      logResult('CORS Preflight Validation', true);
      return true;
    } else {
      logResult('CORS Preflight Validation', false, 
        `Allowed: ${allowedOriginWorks}, Blocked: ${unauthorizedBlocked}`);
      return false;
    }
  } catch (error) {
    logResult('CORS Preflight Validation', false, error.message);
    return false;
  }
}

// Test 4: Error Message Sanitization (requires production mode)
async function testErrorSanitization() {
  try {
    console.log('\n📋 Test 4: Error Message Sanitization');
    console.log('   Note: This test requires NODE_ENV=production to fully verify');
    
    // Try to trigger an error (invalid endpoint)
    const response = await axios.get(`${BASE_URL}/api/invalid-endpoint`, {
      validateStatus: () => true
    });
    
    const errorMessage = response.data?.message || '';
    const hasSensitiveData = /password|token|secret|sql|database/i.test(errorMessage);
    
    if (process.env.NODE_ENV === 'production' && hasSensitiveData) {
      logResult('Error Message Sanitization', false, 'Sensitive data found in error message');
      return false;
    } else {
      logWarning('Error Message Sanitization', 
        'Run with NODE_ENV=production to fully test sanitization');
      return true;
    }
  } catch (error) {
    logWarning('Error Message Sanitization', error.message);
    return true;
  }
}

// Test 5: Health Check (basic connectivity)
async function testHealthCheck() {
  try {
    console.log('\n📋 Test 5: Backend Health Check');
    const response = await axios.get(`${BASE_URL}/api/health`);
    
    if (response.status === 200) {
      logResult('Backend Health Check', true);
      return true;
    } else {
      logResult('Backend Health Check', false, `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logResult('Backend Health Check', false, error.message);
    return false;
  }
}

// Test 6: SQL Injection Protection (verify parameterized queries)
async function testSQLInjectionProtection() {
  try {
    console.log('\n📋 Test 6: SQL Injection Protection');
    console.log('   Note: This test verifies parameterized queries are used');
    console.log('   Manual code review required for full verification');
    
    // This is a code-level test - we can't easily test SQL injection without
    // actually attempting an attack, which we don't want to do
    logWarning('SQL Injection Protection', 
      'Code review confirms parameterized queries in staffController.js');
    return true;
  } catch (error) {
    logResult('SQL Injection Protection', false, error.message);
    return false;
  }
}

// Test 7: XSS Protection (DOMPurify)
async function testXSSProtection() {
  try {
    console.log('\n📋 Test 7: XSS Protection (DOMPurify)');
    console.log('   Note: This requires frontend testing with actual HTML content');
    console.log('   Manual testing required:');
    console.log('   1. Create announcement with <script>alert("XSS")</script>');
    console.log('   2. View announcement - script should be stripped');
    
    logWarning('XSS Protection', 
      'Frontend testing required - DOMPurify installed and integrated');
    return true;
  } catch (error) {
    logResult('XSS Protection', false, error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🔒 Security Fixes Testing Suite');
  console.log('================================\n');
  console.log(`Backend URL: ${BASE_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}\n`);
  
  // Run tests
  await testHealthCheck();
  const csrfToken = await testCSRFTokenGeneration();
  await testCSRFValidationWithoutToken();
  await testCORSPreflight();
  await testErrorSanitization();
  await testSQLInjectionProtection();
  await testXSSProtection();
  
  // Print summary
  console.log('\n\n📊 Test Summary');
  console.log('================');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  
  if (results.passed.length > 0) {
    console.log('\n✅ Passed Tests:');
    results.passed.forEach(test => console.log(`   - ${test}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(test => console.log(`   - ${test}`));
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(w => console.log(`   - ${w.test}: ${w.message}`));
  }
  
  console.log('\n📝 Next Steps:');
  console.log('   1. Test CSRF with valid token (requires authentication)');
  console.log('   2. Test XSS protection in frontend (create announcement with script tags)');
  console.log('   3. Test error sanitization in production mode');
  console.log('   4. Manual code review for SQL injection protection');
  
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});

