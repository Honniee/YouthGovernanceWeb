# 🔐 Forgot Password Feature - Implementation Plan

## Overview
Implement a secure password reset flow that allows users to request a password reset via email and reset their password using a secure token.

## Current Status
- ✅ Email service has `sendPasswordResetEmail` method
- ✅ Token generator utility exists
- ✅ Login page has "Forgot Password?" link
- ❌ No password reset token database table
- ❌ No backend routes for password reset
- ❌ No frontend pages for forgot/reset password

---

## 📋 Implementation Plan

### Phase 1: Database Setup

#### 1.1 Create Password Reset Tokens Table
**File**: `backend/migrations/create_password_reset_tokens_table.sql`

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS "Password_Reset_Tokens" (
    token_hash VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user_type VARCHAR(20) NOT NULL, -- 'lydo_staff', 'admin', 'sk_official', 'youth'
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    
    -- Indexes for faster lookups
    INDEX idx_reset_tokens_user (user_id, user_type),
    INDEX idx_reset_tokens_email (email),
    INDEX idx_reset_tokens_expires (expires_at)
);

COMMENT ON TABLE "Password_Reset_Tokens" IS 'Stores password reset tokens for secure password recovery';
COMMENT ON COLUMN "Password_Reset_Tokens".token_hash IS 'SHA-256 hash of the reset token (never store plain tokens)';
COMMENT ON COLUMN "Password_Reset_Tokens".user_id IS 'ID of the user requesting reset';
COMMENT ON COLUMN "Password_Reset_Tokens".user_type IS 'Type of user: admin, lydo_staff, sk_official, or youth';
COMMENT ON COLUMN "Password_Reset_Tokens".used_at IS 'Timestamp when token was used (prevents reuse)';
```

**Security Features**:
- Tokens stored as SHA-256 hashes (never plain text)
- Expiration timestamp (1 hour default)
- `used_at` field to prevent token reuse
- Indexes for performance

---

### Phase 2: Backend Implementation

#### 2.1 Password Reset Request Endpoint
**Route**: `POST /api/auth/forgot-password`

**Features**:
- Accepts **personal email address** only
- Validates email format
- **Email Validation Strategy**:
  - **LYDO Staff/Admin**: Checks `personal_email` field only
  - **SK Officials**: Checks `personal_email` field only
  - **Youth**: Checks `email` field (this is their personal email)
  - User must enter their personal email
- Generates secure reset token (32 bytes, hex)
- Stores hashed token in database (1 hour expiration)
- **Sends reset email to personal email** (no fallback to organizational email)
- Rate limiting (prevent email spam)
- reCAPTCHA verification (prevent abuse)
- **Security**: Never reveals if email exists (prevents user enumeration)

**Request Body**:
```json
{
  "email": "user@example.com",
  "recaptchaToken": "recaptcha_token_here"
}
```

**Response** (always success, even if email doesn't exist):
```json
{
  "success": true,
  "message": "If an account exists with that email, a password reset link has been sent."
}
```

**Email Lookup Logic**:
```javascript
// Check LYDO table (personal_email only)
const lydoUser = await query(`
  SELECT lydo_id, personal_email, first_name, last_name, is_active
  FROM "LYDO"
  WHERE personal_email = $1 AND is_active = true
`, [email]);

// If not found, check SK Officials (personal_email only)
const skUser = await query(`
  SELECT sk_id, personal_email, first_name, last_name, is_active, account_access
  FROM "SK_Officials"
  WHERE personal_email = $1 AND is_active = true AND account_access = true
`, [email]);

// If not found, check Youth (email field - this is their personal email)
const youthUser = await query(`
  SELECT youth_id, email, first_name, last_name, is_active
  FROM "Youth_Profiling"
  WHERE email = $1 AND is_active = true
`, [email]);

// Send reset email to:
// - LYDO/SK: personal_email (no fallback)
// - Youth: email (their personal email)
```

**Security Considerations**:
- ✅ Generic success message (doesn't reveal if email exists)
- ✅ Rate limiting (max 3 requests per email per hour)
- ✅ reCAPTCHA required
- ✅ Token expires in 1 hour
- ✅ One active token per user (invalidate old tokens)
- ✅ Uses personal email only (more secure and accessible)

---

#### 2.2 Verify Reset Token Endpoint
**Route**: `GET /api/auth/verify-reset-token/:token`

**Features**:
- Validates token format
- Checks if token exists and is not expired
- Checks if token has not been used
- Returns token validity status

**Response**:
```json
{
  "success": true,
  "valid": true,
  "message": "Token is valid"
}
```

**Error Response**:
```json
{
  "success": false,
  "valid": false,
  "message": "Invalid or expired token"
}
```

---

#### 2.3 Reset Password Endpoint
**Route**: `POST /api/auth/reset-password`

**Features**:
- Accepts reset token and new password
- Validates token (exists, not expired, not used)
- Validates new password (min 8 characters, strength requirements)
- Hashes new password with bcrypt (12 rounds)
- Updates password in appropriate table (LYDO, SK_Officials, or Youth)
- Marks token as used
- Invalidates all refresh tokens for security
- Sends confirmation email
- Logs activity

**Request Body**:
```json
{
  "token": "reset_token_from_email",
  "newPassword": "newSecurePassword123!",
  "confirmPassword": "newSecurePassword123!",
  "recaptchaToken": "recaptcha_token_here"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now login with your new password."
}
```

**Security Considerations**:
- ✅ Token can only be used once
- ✅ Token expires after 1 hour
- ✅ Password strength validation
- ✅ reCAPTCHA required
- ✅ Invalidates all refresh tokens (forces re-login)
- ✅ Activity logging

---

### Phase 3: Frontend Implementation

#### 3.1 Forgot Password Page
**File**: `frontend/src/pages/public/ForgotPassword.jsx`

**Features**:
- Email input field
- reCAPTCHA verification
- Submit button (disabled until reCAPTCHA verified)
- Success message (generic, doesn't reveal if email exists)
- Link back to login page
- Loading state during submission
- Error handling

**UI Flow**:
1. User enters **personal email** (not organizational email)
2. Completes reCAPTCHA
3. Clicks "Send Reset Link"
4. Shows success message: "If an account exists with that email, a password reset link has been sent."
5. Email sent to personal email with reset link

**Reset Link Format**:
```
https://yourdomain.com/reset-password?token=abc123...
```

---

#### 3.2 Reset Password Page
**File**: `frontend/src/pages/public/ResetPassword.jsx`

**Features**:
- Reads token from URL query parameter
- Validates token on page load
- New password input (with strength indicator)
- Confirm password input
- Password visibility toggle
- reCAPTCHA verification
- Submit button
- Success message with link to login
- Error handling (invalid token, expired token, etc.)

**UI Flow**:
1. User clicks link from email
2. Page loads and validates token
3. If valid: Shows password reset form
4. If invalid: Shows error message with link to request new reset
5. User enters new password (with strength indicator)
6. User confirms password
7. Completes reCAPTCHA
8. Submits form
9. Shows success message
10. Redirects to login page

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (optional, but recommended)

---

### Phase 4: Security Features

#### 4.1 Rate Limiting
- **Forgot Password Request**: Max 3 requests per email per hour
- **Reset Password Attempt**: Max 5 attempts per token
- **IP-based rate limiting**: Prevent abuse from same IP

#### 4.2 Token Security
- **Token Length**: 32 bytes (64 hex characters)
- **Token Expiration**: 1 hour
- **Token Storage**: SHA-256 hash in database
- **Token Reuse**: Prevented (marked as used after successful reset)
- **One Active Token**: Invalidate old tokens when new one is created

#### 4.3 Email Security
- **Generic Messages**: Never reveal if email exists
- **Secure Links**: HTTPS only
- **Token in URL**: Single-use, time-limited
- **Email Template**: Professional, branded

#### 4.4 Additional Security
- **reCAPTCHA**: Required for both request and reset
- **CSRF Protection**: For reset password endpoint
- **Activity Logging**: Log all password reset attempts
- **Token Cleanup**: Periodic cleanup of expired tokens

---

### Phase 5: User Experience

#### 5.1 Email Template
**Subject**: "Password Reset Request - LYDO Youth Governance"

**Content**:
- Professional branding
- Clear instructions
- Prominent reset button
- Security notice
- Expiration warning (1 hour)
- Support contact information

#### 5.2 Error Messages
- **Invalid Token**: "This password reset link is invalid or has expired. Please request a new one."
- **Expired Token**: "This password reset link has expired. Please request a new one."
- **Used Token**: "This password reset link has already been used. Please request a new one."
- **Weak Password**: Clear validation messages
- **Network Error**: User-friendly error messages

#### 5.3 Success Messages
- **Email Sent**: "If an account exists with that email, a password reset link has been sent."
- **Password Reset**: "Password has been reset successfully. You can now login with your new password."

---

## 📁 Files to Create/Modify

### Backend Files

#### New Files:
1. `backend/migrations/create_password_reset_tokens_table.sql`
2. `backend/routes/authPasswordReset.js` (or add to `auth.js`)

#### Modified Files:
1. `backend/routes/auth.js` - Add forgot-password and reset-password routes
2. `backend/services/emailService.js` - Already has method, may need template updates
3. `backend/middleware/rateLimiter.js` - Add password reset rate limiters

### Frontend Files

#### New Files:
1. `frontend/src/pages/public/ForgotPassword.jsx`
2. `frontend/src/pages/public/ResetPassword.jsx`
3. `frontend/src/services/passwordResetService.js` (optional, or add to authService)

#### Modified Files:
1. `frontend/src/services/auth.js` - Add password reset methods
2. `frontend/src/App.jsx` or router config - Add routes

---

## 🔄 User Flow Diagram

```
1. User clicks "Forgot Password?" on login page
   ↓
2. Forgot Password page loads
   ↓
3. User enters email + completes reCAPTCHA
   ↓
4. POST /api/auth/forgot-password
   ↓
5. Backend generates token, stores hash, sends email
   ↓
6. User receives email with reset link
   ↓
7. User clicks link → Reset Password page
   ↓
8. GET /api/auth/verify-reset-token/:token
   ↓
9. If valid: Show password reset form
   If invalid: Show error message
   ↓
10. User enters new password + confirms + reCAPTCHA
   ↓
11. POST /api/auth/reset-password
   ↓
12. Backend validates, updates password, marks token as used
   ↓
13. Success message → Redirect to login
```

---

## 🛡️ Security Checklist

- [ ] Tokens stored as SHA-256 hashes (never plain text)
- [ ] Token expiration (1 hour)
- [ ] Token single-use (marked as used)
- [ ] Rate limiting on requests
- [ ] reCAPTCHA on both request and reset
- [ ] Generic success messages (no user enumeration)
- [ ] HTTPS only for reset links
- [ ] Password strength validation
- [ ] Activity logging
- [ ] Invalidate refresh tokens after reset
- [ ] CSRF protection on reset endpoint
- [ ] Input validation and sanitization

---

## 📝 Implementation Steps

### Step 1: Database Migration
1. Create `create_password_reset_tokens_table.sql`
2. Run migration
3. Verify table creation

### Step 2: Backend Routes
1. Add `POST /api/auth/forgot-password` route
2. Add `GET /api/auth/verify-reset-token/:token` route
3. Add `POST /api/auth/reset-password` route
4. Add rate limiters
5. Test endpoints

### Step 3: Frontend Pages
1. Create `ForgotPassword.jsx` page
2. Create `ResetPassword.jsx` page
3. Add routes to router
4. Create password reset service methods
5. Test UI flow

### Step 4: Email Integration
1. Update email template if needed
2. Test email sending
3. Verify reset links work

### Step 5: Testing
1. Test happy path (successful reset)
2. Test invalid token
3. Test expired token
4. Test used token
5. Test rate limiting
6. Test reCAPTCHA
7. Test password validation
8. Test for all user types (LYDO, SK, Youth)

---

## 🎯 Success Criteria

- ✅ Users can request password reset via email
- ✅ Reset emails are sent successfully
- ✅ Reset links work and are secure
- ✅ Users can reset password with valid token
- ✅ Invalid/expired tokens are rejected
- ✅ Rate limiting prevents abuse
- ✅ reCAPTCHA prevents bots
- ✅ No user enumeration vulnerability
- ✅ All user types supported (LYDO, SK, Youth)
- ✅ Activity logging works
- ✅ UI is user-friendly and accessible

---

## 📚 Additional Considerations

### Multi-User Type Support
The system supports multiple user types:
- **LYDO Staff/Admin**: Uses `LYDO` table
- **SK Officials**: Uses `SK_Officials` table
- **Youth**: Uses `Youth_Profiling` table (if exists)

The password reset flow must:
1. Check all tables when email is provided
2. Store `user_type` with token
3. Update correct table when resetting password

### Email Service
- Already configured with `sendPasswordResetEmail` method
- Uses nodemailer
- Supports HTML and text emails
- Template generation exists

### Token Generator
- `TokenGenerator` utility exists
- Can generate secure tokens
- Can hash tokens for storage
- Can verify tokens

---

## 🚀 Ready to Implement?

This plan provides a complete roadmap for implementing the forgot password feature securely and user-friendly. Should we proceed with implementation?

