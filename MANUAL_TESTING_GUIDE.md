# 🧪 Manual Security Testing Guide

Follow these steps to test all security fixes.

---

## Prerequisites

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```
   Backend should be running on `http://localhost:3001`

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend should be running on `http://localhost:5173`

3. **Open Browser DevTools:**
   - Press `F12` or `Right-click > Inspect`
   - Go to **Network** tab
   - Go to **Application** tab > **Cookies**

---

## Test 1: CSRF Token Generation ✅

### Steps:
1. Open frontend in browser: `http://localhost:5173`
2. Open DevTools > **Application** tab > **Cookies**
3. Look for cookie named `XSRF-TOKEN`

### Expected Result:
- ✅ Cookie `XSRF-TOKEN` should be present
- ✅ Cookie value should be a long random string
- ✅ Check **Network** tab - should see request to `/api/csrf-token`

### If Failed:
- Check backend logs for errors
- Verify `backend/server.js` includes CSRF middleware
- Check `frontend/src/context/AuthContext.jsx` calls `/api/csrf-token`

---

## Test 2: CSRF Token in Requests ✅

### Steps:
1. Log in to the application
2. Open DevTools > **Network** tab
3. Perform any POST/PUT/PATCH/DELETE action (e.g., create staff, update profile)
4. Click on the request in Network tab
5. Check **Headers** section

### Expected Result:
- ✅ Request headers should include: `X-CSRF-Token: <token-value>`
- ✅ Token value should match the `XSRF-TOKEN` cookie value
- ✅ Request should succeed (200/201 status)

### If Failed:
- Check `frontend/src/services/api.js` request interceptor
- Verify token is being read from cookie correctly

---

## Test 3: CSRF Protection (Block Invalid Requests) ✅

### Steps:
1. Log in and get a valid CSRF token (from Test 1)
2. Open DevTools > **Console** tab
3. Run this JavaScript:
   ```javascript
   // Try to make a request WITHOUT CSRF token
   fetch('http://localhost:3001/api/staff', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
     },
     body: JSON.stringify({ test: 'data' })
   })
   .then(r => r.json())
   .then(console.log)
   ```

### Expected Result:
- ✅ Response should be `403 Forbidden`
- ✅ Error message should include "CSRF token missing" or "CSRF token mismatch"

### If Failed:
- Verify `validateCSRF` middleware is applied to routes
- Check backend logs for CSRF validation errors

---

## Test 4: XSS Protection (DOMPurify) ✅

### Steps:
1. Log in as Admin or Staff
2. Go to **Announcements** > **Create Announcement**
3. In the content field, enter:
   ```html
   <script>alert('XSS Attack!')</script>
   <img src=x onerror="alert('XSS')">
   <svg onload="alert('XSS')">
   <h1>Normal Content</h1>
   ```
4. Save the announcement
5. View the announcement

### Expected Result:
- ✅ Script tags should be **removed** (not executed)
- ✅ `onerror` and `onload` attributes should be **stripped**
- ✅ Only safe HTML like `<h1>Normal Content</h1>` should display
- ✅ **No JavaScript alerts** should appear

### If Failed:
- Check `frontend/src/pages/*/AnnouncementDetail.jsx` files
- Verify `DOMPurify.sanitize()` is being called
- Check browser console for errors

---

## Test 5: CORS Preflight Validation ✅

### Steps:
1. Open DevTools > **Console** tab
2. Run this JavaScript:
   ```javascript
   // Test with allowed origin (should work)
   fetch('http://localhost:3001/api/staff', {
     method: 'OPTIONS',
     headers: {
       'Origin': 'http://localhost:5173',
       'Access-Control-Request-Method': 'POST'
     }
   })
   .then(r => {
     console.log('Allowed origin status:', r.status);
     console.log('CORS headers:', r.headers.get('access-control-allow-origin'));
   });
   
   // Test with unauthorized origin (should fail)
   fetch('http://localhost:3001/api/staff', {
     method: 'OPTIONS',
     headers: {
       'Origin': 'https://evil.com',
       'Access-Control-Request-Method': 'POST'
     }
   })
   .then(r => {
     console.log('Unauthorized origin status:', r.status);
     return r.json();
   })
   .then(data => console.log('Response:', data));
   ```

### Expected Result:
- ✅ Allowed origin (`localhost:5173`): Status `200` with CORS headers
- ✅ Unauthorized origin (`evil.com`): Status `403` with error message

### If Failed:
- Check `backend/middleware/cors.js` `handlePreflight` function
- Verify `FRONTEND_URL` environment variable is set

---

## Test 6: Error Message Sanitization ✅

### Steps:
1. Set backend to production mode:
   ```bash
   cd backend
   NODE_ENV=production npm run dev
   ```
2. Trigger an error (e.g., invalid endpoint):
   ```bash
   curl http://localhost:3001/api/invalid-endpoint
   ```
   Or use browser DevTools:
   ```javascript
   fetch('http://localhost:3001/api/invalid-endpoint')
     .then(r => r.json())
     .then(console.log);
   ```

### Expected Result:
- ✅ Error message should **NOT** contain:
  - Stack traces
  - File paths
  - Line numbers
  - Words like "password", "token", "secret", "SQL", "database"
- ✅ Error message should be generic: "Internal server error" or similar

### If Failed:
- Check `backend/middleware/errorHandler.js`
- Verify `sanitizeErrorMessage` function is working
- Ensure `NODE_ENV=production` is set

---

## Test 7: SQL Injection Protection ✅

### Steps:
1. This requires **code review** - already verified ✅
2. Check `backend/controllers/staffController.js` line 95-97:
   ```javascript
   // Should use parameterized query:
   whereClauses.push(`role_id = $${idx}`);
   params.push(DEFAULT_ROLE_ID);
   ```
3. Verify **NO** string interpolation like:
   ```javascript
   // ❌ BAD - Should NOT exist:
   const sql = `SELECT * FROM table WHERE id = '${userId}'`;
   ```

### Expected Result:
- ✅ All SQL queries use parameterized queries (`$1`, `$2`, etc.)
- ✅ No direct string interpolation in SQL

---

## Test 8: Full Application Flow ✅

### Steps:
1. **Login:**
   - Should get CSRF token automatically
   - Check cookies for `XSRF-TOKEN`

2. **Create Staff:**
   - Should include CSRF token in request
   - Should succeed

3. **Update Profile:**
   - Should include CSRF token
   - Should succeed

4. **Create Announcement with XSS:**
   - Enter malicious script in content
   - View announcement - script should be stripped

5. **Logout:**
   - Should include CSRF token
   - Should succeed

### Expected Result:
- ✅ All operations work correctly
- ✅ CSRF tokens are included automatically
- ✅ No security errors in console

---

## Quick Test Checklist

- [ ] CSRF token cookie present on page load
- [ ] CSRF token sent with POST/PUT/PATCH/DELETE requests
- [ ] Requests without CSRF token are blocked (403)
- [ ] XSS scripts in announcements are stripped
- [ ] CORS preflight validates origins correctly
- [ ] Error messages don't leak sensitive data (production mode)
- [ ] All application flows work correctly

---

## Troubleshooting

### CSRF Token Not Found
- **Check:** Backend is running and `/api/csrf-token` endpoint works
- **Fix:** Verify `backend/server.js` includes `generateCSRF` middleware

### CSRF Validation Failing
- **Check:** Token in cookie matches token in header
- **Fix:** Verify `frontend/src/services/api.js` reads cookie correctly

### XSS Still Executing
- **Check:** DOMPurify is imported and used
- **Fix:** Verify `DOMPurify.sanitize()` is called on all HTML content

### CORS Errors
- **Check:** `FRONTEND_URL` environment variable is set
- **Fix:** Update `backend/.env` with correct frontend URL

---

## Test Results Template

```
Date: ___________
Tester: ___________

[ ] Test 1: CSRF Token Generation - PASS / FAIL
[ ] Test 2: CSRF Token in Requests - PASS / FAIL
[ ] Test 3: CSRF Protection - PASS / FAIL
[ ] Test 4: XSS Protection - PASS / FAIL
[ ] Test 5: CORS Validation - PASS / FAIL
[ ] Test 6: Error Sanitization - PASS / FAIL
[ ] Test 7: SQL Injection Protection - PASS / FAIL (Code Review)
[ ] Test 8: Full Application Flow - PASS / FAIL

Notes:
_________________________________________________
_________________________________________________
```

---

**Ready to test?** Start with Test 1 and work through each test systematically.

