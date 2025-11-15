# 🔒 httpOnly Cookies Implementation Guide

## Overview
This document describes the implementation of httpOnly cookies for JWT token storage, replacing localStorage-based token management for enhanced security.

## Security Benefits

### ✅ XSS Protection
- **Before**: Tokens stored in `localStorage` are accessible to JavaScript, vulnerable to XSS attacks
- **After**: Tokens in httpOnly cookies are **not accessible** to JavaScript, preventing XSS token theft

### ✅ Automatic Token Transmission
- **Before**: Manual token management in Authorization headers
- **After**: Browser automatically sends cookies with every request

### ✅ Refresh Token Pattern
- **Before**: Single long-lived token (24 hours)
- **After**: Short-lived access token (15 minutes) + long-lived refresh token (7 days)

## Implementation Details

### Backend Changes

#### 1. Login Endpoint (`backend/routes/auth.js`)
- **Access Token**: 15-minute expiration, stored in `accessToken` cookie
- **Refresh Token**: 7-day expiration, stored in `refreshToken` cookie
- **Database**: Refresh tokens stored in `Refresh_Tokens` table (hashed)

```javascript
// Access token cookie (15 minutes)
res.cookie('accessToken', accessToken, {
  httpOnly: true,           // Not accessible to JavaScript
  secure: isProduction,      // HTTPS only in production
  sameSite: 'strict',       // CSRF protection
  maxAge: 15 * 60 * 1000,   // 15 minutes
  path: '/'
});

// Refresh token cookie (7 days)
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/'
});
```

#### 2. Authentication Middleware (`backend/middleware/auth.js`)
- **Priority**: Read from `req.cookies.accessToken` first
- **Fallback**: Authorization header (for backward compatibility)

```javascript
// Get token from httpOnly cookie first
let token = req.cookies?.accessToken;

// Fallback to Authorization header
if (!token) {
  const authHeader = req.headers['authorization'];
  token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
}
```

#### 3. Refresh Token Endpoint (`backend/routes/authRefresh.js`)
- **Route**: `POST /api/auth/refresh`
- **Purpose**: Exchange refresh token for new access token
- **Validation**: Checks database for valid, non-expired refresh token

#### 4. Logout Endpoint (`backend/routes/auth.js`)
- **Actions**:
  1. Revoke refresh token from database
  2. Clear `accessToken` cookie
  3. Clear `refreshToken` cookie

#### 5. Database Migration
- **Table**: `Refresh_Tokens`
- **Columns**:
  - `token_hash` (PRIMARY KEY): SHA-256 hash of refresh token
  - `user_id`: User identifier
  - `user_type`: User type (admin, lydo_staff, sk_official, youth)
  - `expires_at`: Token expiration timestamp
  - `created_at`: Token creation timestamp
  - `revoked_at`: Token revocation timestamp (nullable)

**Migration File**: `backend/migrations/create_refresh_tokens_table.sql`

### Frontend Changes

#### 1. API Service (`frontend/src/services/api.js`)
- **Removed**: Manual token addition to Authorization header
- **Note**: Tokens are sent automatically by browser via cookies
- **Backward Compatibility**: Still checks localStorage for token (during migration)

#### 2. Auth Service (`frontend/src/services/auth.js`)
- **Login**: No longer stores token in localStorage (only user data)
- **Logout**: Clears localStorage (cookies cleared by backend)
- **isAuthenticated()**: Checks for user data + refresh token cookie existence
- **getStoredToken()**: Returns `null` (tokens not accessible to JavaScript)

#### 3. Auth Context (`frontend/src/context/AuthContext.jsx`)
- **Session Restoration**: Checks for refresh token cookie instead of localStorage token
- **Login**: Stores only user data (not token)
- **Token**: Set to `null` in state (not accessible)

## Migration Steps

### 1. Database Migration
```sql
-- Run the migration script
\i backend/migrations/create_refresh_tokens_table.sql
```

### 2. Backend Restart
- Restart backend server to apply changes
- Ensure `cookie-parser` middleware is active

### 3. Frontend Deployment
- Deploy updated frontend code
- Users will automatically migrate on next login

### 4. Backward Compatibility
- **Duration**: 1-2 weeks (until all users have logged in)
- **Mechanism**: Backend accepts tokens from both cookies and Authorization headers
- **Cleanup**: After migration period, remove Authorization header fallback

## Testing Checklist

### ✅ Login Flow
- [ ] Login sets `accessToken` and `refreshToken` cookies
- [ ] Cookies are httpOnly (not accessible via `document.cookie`)
- [ ] Cookies have correct expiration times
- [ ] User data stored in localStorage (non-sensitive)

### ✅ API Requests
- [ ] Requests include cookies automatically
- [ ] Backend authenticates using cookie token
- [ ] No manual Authorization header needed

### ✅ Token Refresh
- [ ] 401 errors trigger refresh attempt
- [ ] Refresh endpoint returns new access token
- [ ] Original request retried after refresh

### ✅ Logout
- [ ] Refresh token revoked from database
- [ ] Cookies cleared by backend
- [ ] localStorage cleared by frontend

### ✅ Session Restoration
- [ ] Page reload restores session using refresh token cookie
- [ ] Invalid refresh token clears session
- [ ] Expired refresh token redirects to login

## Security Considerations

### ✅ XSS Protection
- Tokens in httpOnly cookies cannot be stolen via XSS
- JavaScript cannot access cookie values

### ✅ CSRF Protection
- `sameSite: 'strict'` prevents cross-site requests
- CSRF tokens still required for state-changing requests

### ✅ Token Rotation
- Short-lived access tokens (15 minutes)
- Refresh tokens can be rotated on each use (future enhancement)

### ✅ Token Revocation
- Refresh tokens stored in database
- Can be revoked immediately on logout or security incident

## Troubleshooting

### Issue: Cookies Not Set
**Solution**: 
- Check CORS configuration allows credentials
- Ensure `credentials: 'include'` in frontend API calls
- Verify backend sets cookies with correct domain/path

### Issue: 401 Errors After Login
**Solution**:
- Check cookie expiration times
- Verify refresh token endpoint is accessible
- Check database for refresh token records

### Issue: Session Not Restored
**Solution**:
- Verify refresh token cookie exists
- Check backend logs for authentication errors
- Ensure cookie domain matches frontend domain

## Next Steps

1. **Token Rotation**: Rotate refresh tokens on each use
2. **Device Fingerprinting**: Track devices for refresh tokens
3. **Concurrent Session Limits**: Limit active refresh tokens per user
4. **Remove Backward Compatibility**: After migration period, remove Authorization header fallback

## References

- [OWASP: Secure Cookie Attributes](https://owasp.org/www-community/HttpOnly)
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

