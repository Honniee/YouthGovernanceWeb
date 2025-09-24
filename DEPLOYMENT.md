# 🚀 Youth Governance Web - Deployment Guide

This guide will help you deploy your full-stack Youth Governance Web application to production.

## 📋 Prerequisites

- ✅ Database already deployed on Render
- ✅ GitHub repository with your code
- ✅ Google reCAPTCHA Enterprise setup
- ✅ Email service credentials (Gmail/SMTP)

## 🌟 Recommended Deployment: Render (Full Stack)

Since your database is already on Render, we'll deploy everything on the same platform for simplicity.

---

## 🔧 STEP 1: Deploy Backend (API) on Render

### 1.1 Create Web Service

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**

```yaml
Name: youth-governance-api
Environment: Node
Region: Oregon (US West)
Branch: main
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

### 1.2 Environment Variables

Add these environment variables in Render:

```bash
# Server Configuration
NODE_ENV=production
PORT=10000

# Database Configuration (from your existing Render database)
DB_HOST=your-render-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# JWT Secret (generate a strong secret)
JWT_SECRET=your-super-secure-jwt-secret-here-min-32-chars

# Frontend URL (will be set after frontend deployment)
FRONTEND_URL=https://your-frontend-domain.onrender.com

# reCAPTCHA Configuration
RECAPTCHA_API_KEY=your-recaptcha-api-key
RECAPTCHA_PROJECT_ID=your-google-cloud-project-id
RECAPTCHA_MIN_SCORE=0.5

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Security Configuration
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=5
SESSION_TIMEOUT=24h

# File Upload
UPLOAD_MAX_SIZE=5242880
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx

# Logging
LOG_LEVEL=info
LOG_FILE_MAX_SIZE=10m
LOG_MAX_FILES=5
```

### 1.3 Deploy Backend

1. **Click "Create Web Service"**
2. **Wait for deployment** (5-10 minutes)
3. **Note your backend URL**: `https://your-backend-name.onrender.com`

---

## 🎨 STEP 2: Deploy Frontend on Render

### 2.1 Create Static Site

1. **Go to Render Dashboard**
2. **Click "New +" → "Static Site"**
3. **Connect your GitHub repository**
4. **Configure the site:**

```yaml
Name: youth-governance-web
Branch: main
Root Directory: frontend
Build Command: npm run build
Publish Directory: dist
```

### 2.2 Environment Variables

Add these environment variables:

```bash
# API Configuration
VITE_API_BASE_URL=https://your-backend-name.onrender.com/api

# reCAPTCHA Configuration
VITE_RECAPTCHA_SITE_KEY=6LcW7KErAAAAAL1YkHfgboexcJAJf99tgjU6xCWu

# App Configuration
VITE_APP_NAME=Youth Governance Web
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production
VITE_ENABLE_DEVTOOLS=false
```

### 2.3 Deploy Frontend

1. **Click "Create Static Site"**
2. **Wait for deployment** (3-5 minutes)
3. **Note your frontend URL**: `https://your-frontend-name.onrender.com`

---

## 🔄 STEP 3: Update Backend CORS

After frontend deployment, update your backend environment variables:

```bash
FRONTEND_URL=https://your-frontend-name.onrender.com
```

This ensures CORS allows requests from your frontend domain.

---

## ✅ STEP 4: Test Your Deployment

### 4.1 Backend Health Check

Visit: `https://your-backend-name.onrender.com/api/health`

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production"
}
```

### 4.2 Frontend Access

Visit: `https://your-frontend-name.onrender.com`

Test all functionality:
- ✅ Home page loads
- ✅ Login form works
- ✅ reCAPTCHA verification
- ✅ Authentication flow
- ✅ Dashboard access
- ✅ Cookie banner functions

---

## 🔒 STEP 5: Security Checklist

### 5.1 Environment Variables
- ✅ Strong JWT secret (32+ characters)
- ✅ Database credentials secured
- ✅ reCAPTCHA keys configured
- ✅ Email credentials secured

### 5.2 HTTPS & Security
- ✅ HTTPS enabled (automatic on Render)
- ✅ CORS configured for your domain
- ✅ Rate limiting enabled
- ✅ Helmet security headers active

### 5.3 Database Security
- ✅ Database password is strong
- ✅ Connection uses SSL
- ✅ Access restricted to your backend

---

## 🚨 Troubleshooting

### Common Issues:

**1. Backend won't start:**
- Check environment variables are set correctly
- Verify database connection details
- Check logs in Render dashboard

**2. Frontend can't connect to backend:**
- Verify `VITE_API_BASE_URL` is correct
- Check CORS configuration
- Ensure backend is running

**3. reCAPTCHA not working:**
- Verify site key matches your domain
- Check API key and project ID
- Ensure domain is whitelisted in Google Console

**4. Database connection failed:**
- Check database credentials
- Verify database is running
- Check network connectivity

---

## 📊 Monitoring & Maintenance

### Render Features:
- ✅ **Auto-deployments** from GitHub
- ✅ **SSL certificates** (automatic)
- ✅ **Health checks** (built-in)
- ✅ **Logs & metrics** (dashboard)
- ✅ **Custom domains** (optional)

### Regular Tasks:
- Monitor application logs
- Update dependencies regularly
- Backup database periodically
- Monitor performance metrics

---

## 🎯 Alternative Deployment Options

### Option 2: Vercel + Render
- **Frontend**: Deploy to Vercel for better performance
- **Backend**: Keep on Render with your database

### Option 3: Netlify + Render
- **Frontend**: Deploy to Netlify
- **Backend**: Keep on Render with your database

### Option 4: Full Cloud (AWS/GCP/Azure)
- More complex but enterprise-grade
- Requires cloud platform knowledge

---

## 📞 Support

If you encounter issues:
1. Check Render logs first
2. Verify environment variables
3. Test database connectivity
4. Check GitHub repository settings

Your application should now be live and accessible worldwide! 🌍✨ 