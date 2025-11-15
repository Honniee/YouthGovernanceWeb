# ⚡ Quick Test Commands

Quick commands to test security fixes without manual browser testing.

---

## 1. Test CSRF Token Endpoint

```bash
# Get CSRF token
curl -v http://localhost:3001/api/csrf-token

# Should return:
# - Set-Cookie: XSRF-TOKEN=...
# - JSON: { "success": true, "csrfToken": "..." }
```

---

## 2. Test CSRF Protection (Should Fail)

```bash
# Try POST without CSRF token (should get 403)
curl -X POST http://localhost:3001/api/staff \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"test":"data"}'

# Expected: 403 Forbidden with CSRF error message
```

---

## 3. Test CORS Preflight

```bash
# Test with allowed origin (should work)
curl -X OPTIONS http://localhost:3001/api/staff \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Test with unauthorized origin (should fail)
curl -X OPTIONS http://localhost:3001/api/staff \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Expected: First returns 200, second returns 403
```

---

## 4. Test Health Check

```bash
curl http://localhost:3001/api/health

# Expected: { "status": "ok", ... }
```

---

## 5. Test Error Sanitization (Production Mode)

```bash
# Set production mode
export NODE_ENV=production

# Trigger error
curl http://localhost:3001/api/invalid-endpoint

# Expected: Generic error message, no stack traces or sensitive data
```

---

## Browser Console Tests

Open browser console (`F12`) and run:

### Test CSRF Token
```javascript
// Check if CSRF token cookie exists
document.cookie.includes('XSRF-TOKEN')
```

### Test CSRF Protection
```javascript
// Try request without CSRF token
fetch('http://localhost:3001/api/staff', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({ test: 'data' })
})
.then(r => r.json())
.then(console.log)
// Expected: { success: false, message: "CSRF token missing..." }
```

### Test CORS
```javascript
// Test CORS preflight
fetch('http://localhost:3001/api/staff', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://evil.com',
    'Access-Control-Request-Method': 'POST'
  }
})
.then(r => {
  console.log('Status:', r.status);
  return r.json();
})
.then(console.log)
// Expected: 403 with CORS error message
```

---

## PowerShell Commands (Windows)

```powershell
# Test CSRF token
Invoke-WebRequest -Uri "http://localhost:3001/api/csrf-token" -Method GET

# Test CSRF protection (should fail)
Invoke-WebRequest -Uri "http://localhost:3001/api/staff" -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"test":"data"}'

# Test CORS
Invoke-WebRequest -Uri "http://localhost:3001/api/staff" -Method OPTIONS `
  -Headers @{"Origin"="https://evil.com"} `
  -ErrorAction SilentlyContinue
```

---

**Note:** Replace `YOUR_TOKEN` with an actual JWT token from login.

