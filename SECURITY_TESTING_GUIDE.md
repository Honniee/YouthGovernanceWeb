# 🧪 Security Fixes Testing Guide

## Testing Checklist

### 1. ✅ SQL Injection Fix Test
**File:** `backend/controllers/staffController.js`

**Test:**
1. Access staff listing endpoint
2. Verify no SQL errors in logs
3. Check that role filtering works correctly

**Expected:** Staff list loads without errors, only LYDO staff shown (not admins)

---

### 2. ✅ XSS Protection Test
**Files:** All announcement detail pages

**Test:**
1. Create an announcement with malicious content:
   ```html
   <script>alert('XSS')</script>
   <img src=x onerror="alert('XSS')">
   <svg onload="alert('XSS')">
   ```
2. View the announcement
3. Verify scripts are stripped/blocked

**Expected:** 
- Scripts should be removed by DOMPurify
- No JavaScript execution
- Content displays safely

---

### 3. ✅ Error Message Sanitization Test
**File:** `backend/middleware/errorHandler.js`

**Test:**
1. Set `NODE_ENV=production`
2. Trigger an error (e.g., invalid login)
3. Check error response

**Expected:**
- No stack traces in production
- Sensitive words (password, token, secret) redacted
- Generic error messages only

---

### 4. ✅ CORS Validation Test
**File:** `backend/middleware/cors.js`

**Test:**
1. Make request from allowed origin (should work)
2. Make request from unauthorized origin (should fail)
3. Check preflight (OPTIONS) requests

**Expected:**
- Allowed origins: 200 OK
- Unauthorized origins: 403 Forbidden
- Proper CORS headers in responses

---

### 5. ✅ CSRF Protection Test
**Files:** `backend/middleware/csrf.js`, `frontend/src/services/api.js`

**Test Steps:**

**A. Token Generation:**
1. Load frontend app
2. Check browser cookies for `XSRF-TOKEN`
3. Check network tab for `/api/csrf-token` request

**Expected:** Token cookie set, token available

**B. Token Sending:**
1. Make a POST request (e.g., create staff)
2. Check request headers for `X-CSRF-Token`
3. Verify token matches cookie

**Expected:** Token sent in header, matches cookie

**C. Token Validation (After applying to routes):**
1. Make POST without token (should fail)
2. Make POST with invalid token (should fail)
3. Make POST with valid token (should succeed)

**Expected:**
- Without token: 403 Forbidden
- Invalid token: 403 Forbidden
- Valid token: Request succeeds

---

## Quick Test Commands

### Backend Tests
```bash
# Start backend
cd backend
npm run dev

# Check CSRF endpoint
curl http://localhost:3001/api/csrf-token

# Test CORS (from unauthorized origin)
curl -H "Origin: https://evil.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:3001/api/staff
```

### Frontend Tests
```bash
# Start frontend
cd frontend
npm run dev

# Open browser console
# Check for CSRF token in cookies
document.cookie

# Check API requests include CSRF token
# (Open Network tab, check POST requests)
```

---

## Test Results Template

```
[ ] SQL Injection Fix - PASSED/FAILED
[ ] XSS Protection - PASSED/FAILED
[ ] Error Sanitization - PASSED/FAILED
[ ] CORS Validation - PASSED/FAILED
[ ] CSRF Token Generation - PASSED/FAILED
[ ] CSRF Token Sending - PASSED/FAILED
[ ] CSRF Token Validation - PENDING (after route application)
```

---

## Common Issues

### CSRF Token Not Found
- **Issue:** Cookie not set
- **Fix:** Check backend CSRF middleware is running
- **Verify:** `/api/csrf-token` endpoint returns token

### CORS Errors
- **Issue:** Requests blocked
- **Fix:** Verify `FRONTEND_URL` environment variable is set correctly
- **Verify:** Origin matches allowed list

### XSS Still Executing
- **Issue:** Scripts running despite DOMPurify
- **Fix:** Verify DOMPurify import and usage
- **Verify:** Check browser console for errors

---

**Ready to test?** Run through the checklist above, then proceed with CSRF route application.

