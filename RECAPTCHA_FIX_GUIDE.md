# 🔧 reCAPTCHA Configuration Fix Guide

## Problem
```
POST https://www.google.com/recaptcha/api2/pat?k=... 401 (Unauthorized)
```

## Solution Steps

### Step 1: Get New reCAPTCHA Keys

1. **Go to Google reCAPTCHA Admin:**
   - Visit: https://www.google.com/recaptcha/admin
   - Sign in with your Google account

2. **Create New Site:**
   - Click "+" to create new site
   - **Label:** "Youth Governance Web - Production"
   - **reCAPTCHA type:** v2 or v3 (your code supports both)
   - **Domains:** Add your production domain
     - Example: `yourdomain.com`
     - Also add: `www.yourdomain.com` (if using www)
   - **Accept terms** and submit

3. **Copy Keys:**
   - **Site Key** (for frontend)
   - **Secret Key** (for backend)

### Step 2: Update Frontend Configuration

**File:** `frontend/.env` or `frontend/.env.production`

```bash
VITE_RECAPTCHA_SITE_KEY=your-new-site-key-here
```

**Or in build environment variables:**
- If using Render/Vercel, add as environment variable
- Name: `VITE_RECAPTCHA_SITE_KEY`
- Value: Your site key

### Step 3: Update Backend Configuration

**File:** `backend/.env` or production environment variables

```bash
RECAPTCHA_SECRET_KEY=your-new-secret-key-here
RECAPTCHA_MIN_SCORE=0.5  # For v3, adjust as needed
```

**In Render/Vercel:**
- Add environment variable
- Name: `RECAPTCHA_SECRET_KEY`
- Value: Your secret key

### Step 4: Test in Development

1. **Update local `.env` files:**
   ```bash
   # frontend/.env
   VITE_RECAPTCHA_SITE_KEY=your-test-site-key
   
   # backend/.env
   RECAPTCHA_SECRET_KEY=your-test-secret-key
   ```

2. **Restart servers:**
   ```bash
   # Frontend
   cd frontend
   npm run dev
   
   # Backend
   cd backend
   npm run dev
   ```

3. **Test reCAPTCHA:**
   - Try login/registration
   - Verify reCAPTCHA widget appears
   - Complete reCAPTCHA
   - Check console for errors

### Step 5: Verify Keys Match

**Important:** Site key and secret key must be from the same reCAPTCHA project!

- ✅ Same project = Keys work together
- ❌ Different projects = 401 errors

### Step 6: Production Deployment

1. **Set environment variables in hosting platform:**
   - Render/Vercel/Netlify dashboard
   - Add production keys

2. **Rebuild application:**
   - Frontend: Rebuild with new env vars
   - Backend: Restart with new env vars

3. **Test in production:**
   - Verify reCAPTCHA appears
   - Test login/registration
   - Check for 401 errors

---

## Troubleshooting

### Still Getting 401?

1. **Check domain match:**
   - Site key domain must match your actual domain
   - `localhost` keys won't work for production domain

2. **Check key type:**
   - v2 keys work with v2
   - v3 keys work with v3
   - Don't mix types

3. **Check key validity:**
   - Keys might be expired
   - Create new keys if needed

4. **Check environment variables:**
   - Verify keys are actually set
   - Check for typos
   - Restart server after changes

### Development Bypass

**Current behavior:** In development, reCAPTCHA is bypassed if keys are missing.

**To test reCAPTCHA in development:**
1. Set valid keys in `.env`
2. Set `NODE_ENV=development` (don't use production)
3. reCAPTCHA will be verified normally

---

## Quick Checklist

- [ ] Created reCAPTCHA site in Google Admin
- [ ] Added production domain to allowed domains
- [ ] Copied site key (for frontend)
- [ ] Copied secret key (for backend)
- [ ] Updated frontend `.env` or build env vars
- [ ] Updated backend `.env` or deployment env vars
- [ ] Tested in development
- [ ] Verified no 401 errors
- [ ] Deployed to staging
- [ ] Tested in staging
- [ ] Deployed to production
- [ ] Tested in production

---

**Time Required:** 15-30 minutes

**Difficulty:** Easy

**Priority:** 🔴 CRITICAL (must fix before production)

