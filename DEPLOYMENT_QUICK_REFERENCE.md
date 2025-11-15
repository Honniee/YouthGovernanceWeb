# Deployment Quick Reference Guide

## 🚀 Pre-Deployment Checklist

### Critical Items (Must Fix Before Deployment)

- [x] ✅ **Environment Template Files Created**
  - `backend/env.example.template` - Copy to `backend/.env.example`
  - `frontend/env.example.template` - Copy to `frontend/.env.example`
  - **Action Required:** Copy templates and create actual `.env.example` files

- [ ] 🔴 **API Caching Format Verification**
  - Fix implemented in `frontend/src/services/api.js` (line 105)
  - **Action Required:** Test cached responses with `/youth/validated` endpoint
  - Verify `result.success` works on cached responses

- [ ] 🔴 **Remove Critical Console Logs**
  - 1838+ console statements found
  - **Action Required:** Replace critical console.log with Winston logger
  - Keep only essential logs in production

- [ ] 🔴 **Add Basic Test Coverage**
  - Currently only 1 test file
  - **Action Required:** Add tests for critical paths (auth, validation, API)

- [ ] 🟠 **Security Hardening**
  - Remove fallback secrets in production
  - Review rate limiting configuration
  - **Action Required:** Security review before production

## 📋 Environment Setup

### Backend Environment Variables

**Required:**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
JWT_SECRET=your-32-char-minimum-secret
FRONTEND_URL=https://your-frontend.onrender.com
RECAPTCHA_SECRET_KEY=your-recaptcha-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**Quick Setup:**
```bash
cd backend
cp env.example.template .env
# Edit .env with your actual values
```

### Frontend Environment Variables

**Required:**
```bash
VITE_API_BASE_URL=https://your-backend-api.onrender.com/api
```

**Quick Setup:**
```bash
cd frontend
cp env.example.template .env
# Edit .env with your actual values
```

## 🔧 Deployment Steps

### 1. Pre-Deployment

```bash
# 1. Copy environment templates
cd backend && cp env.example.template .env.example
cd ../frontend && cp env.example.template .env.example

# 2. Verify all environment variables are documented
# 3. Run database migrations
# 4. Test locally with production environment variables
```

### 2. Database Migrations

```bash
# Apply all migrations in order
# Check: database/migrations/ directory
# 47 migration files found

# TODO: Implement migration runner
# Current: Manual execution required
```

### 3. Backend Deployment

**Render Configuration:**
- Build Command: `npm install`
- Start Command: `npm start`
- Root Directory: `backend`
- Health Check: `/api/health`

**Environment Variables:**
- Set all required variables in Render dashboard
- See `backend/ENVIRONMENT_VARIABLES.md` for complete list

### 4. Frontend Deployment

**Build Configuration:**
- Build Command: `npm run build`
- Output Directory: `dist`
- Root Directory: `frontend`

**Environment Variables:**
- Set `VITE_API_BASE_URL` to your backend API URL

## ⚠️ Known Issues to Address

1. **API Caching Format** - Verify fix works correctly
2. **Console Logs** - Replace with proper logging
3. **Test Coverage** - Add basic tests before production
4. **Security** - Review and harden security measures
5. **Migration Management** - Implement automated migrations

## 📊 Deployment Readiness: 75%

**Critical Blockers:** 4
- Missing `.env.example` files → ✅ Template created
- API caching verification needed → ⚠️ Fix implemented, needs testing
- Excessive console logs → ⚠️ Needs cleanup
- No test coverage → ❌ Needs implementation

**Can Deploy After:**
- Addressing critical items above
- Staging deployment and testing
- Security review completion

## 🔗 Useful Resources

- **Full Analysis:** `CODEBASE_ANALYSIS_AND_DEPLOYMENT_READINESS.md`
- **Backend Env Docs:** `backend/ENVIRONMENT_VARIABLES.md`
- **Deployment Guide:** `DEPLOYMENT.md`
- **Render Deployment:** `backend/RENDER_DEPLOYMENT.md`

## 🆘 Quick Commands

```bash
# Generate JWT Secret
openssl rand -base64 32

# Generate Cron Secret
openssl rand -hex 32

# Check backend health
curl http://localhost:3001/api/health

# Test database connection
cd backend && node -e "import('./config/database.js').then(m => console.log('DB OK'))"
```

