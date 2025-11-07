# Backend Deployment to Render - Step by Step Guide

This guide will help you deploy the Youth Governance Web backend to Render.

## Prerequisites

- ✅ GitHub repository with your code
- ✅ Render account (sign up at https://render.com)
- ✅ Database already deployed on Render
- ✅ Frontend already deployed on Render

## Alternative: Use Render Blueprint (Optional)

If you prefer Infrastructure as Code, you can use the `render.yaml` file included in the `backend` directory. This file contains the service configuration and can be used with Render's Blueprint feature.

**To use the Blueprint:**
1. Go to Render Dashboard → "New +" → "Blueprint"
2. Connect your GitHub repository
3. Render will automatically detect and use `render.yaml`
4. Still need to set environment variables manually in the dashboard

**Otherwise, follow the manual steps below:**

## Step 1: Create Web Service in Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository (if not already connected)
4. Select your repository

## Step 2: Configure Service Settings

Fill in the following settings:

- **Name**: `youth-governance-api` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose the same region as your database (recommended: `Oregon (US West)`)
- **Branch**: `main` (or your deployment branch)
- **Root Directory**: `backend` ⚠️ **Important: Set this to `backend`**
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: Free tier (or paid if needed)

## Step 3: Set Environment Variables

Click on **"Environment"** tab and add the following variables:

### Required Environment Variables

```bash
NODE_ENV=production
PORT=10000
```

**Database Configuration** (choose one option):

**Option 1: Use DATABASE_URL** (Recommended if database is linked to service)
```bash
DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require
```

**Option 2: Use individual variables**
```bash
DB_HOST=your-render-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

**JWT Secret** (generate a strong secret, minimum 32 characters):
```bash
JWT_SECRET=your-super-secure-jwt-secret-min-32-characters-long
```

**Frontend URL**:
```bash
FRONTEND_URL=https://your-frontend-name.onrender.com
```

**reCAPTCHA Configuration**:
```bash
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
RECAPTCHA_MIN_SCORE=0.5
```

**Email Configuration**:
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_SECURE=false
```

### Optional Environment Variables

```bash
# File Upload Configuration
UPLOADS_DIR=/opt/render/project/src/uploads
UPLOAD_MAX_SIZE=5242880
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx

# Cron Job Configuration
CRON_SECRET=your-cron-secret-key

# Clustering Configuration
CLUSTERING_CRON_SCHEDULE=0 2 1 * *
ENABLE_CLUSTERING_CRON=true

# CORS Configuration (optional, uses FRONTEND_URL if not set)
CORS_ORIGIN=https://your-frontend-name.onrender.com
```

## Step 4: Link Database (Recommended)

If your database is in the same Render account:

1. In the service settings, scroll down to **"Linked Resources"**
2. Click **"Link Resource"**
3. Select your PostgreSQL database
4. Render will automatically create a `DATABASE_URL` environment variable

This is the easiest way to configure the database connection.

## Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Monitor the build logs for any errors

## Step 6: Verify Deployment

### Check Health Endpoint

Visit: `https://your-backend-name.onrender.com/api/health`

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production"
}
```

### Check Deployment Logs

1. Go to your service in Render Dashboard
2. Click on **"Logs"** tab
3. Look for:
   - ✅ "Youth Development Office API running on port..."
   - ✅ "Database connection successful"
   - ✅ No error messages

### Verify Database Connection

Check logs for:
- ✅ Database connection successful messages
- ❌ No "connection refused" or "authentication failed" errors

## Step 7: Update Frontend Configuration

If your frontend is already deployed, update the API URL:

1. Go to your frontend service in Render
2. Add/Update environment variable:
   ```bash
   VITE_API_BASE_URL=https://your-backend-name.onrender.com/api
   ```
3. Redeploy the frontend service

## Step 8: Test Integration

1. Visit your frontend URL
2. Test login functionality
3. Verify API calls are working
4. Check browser console for any CORS errors

## Troubleshooting

### Backend won't start

**Check:**
- All required environment variables are set
- Database connection string is correct
- Port is not hardcoded (should use `PORT` env var)
- Check Render logs for specific error messages

### Database connection failed

**Solutions:**
- Verify `DATABASE_URL` or individual DB variables are correct
- Check database is running in Render
- Ensure SSL is enabled (database config already includes this)
- Verify database credentials are correct

### CORS errors

**Solutions:**
- Verify `FRONTEND_URL` is set correctly
- Check frontend URL matches exactly (including https://)
- Ensure no trailing slashes
- Check browser console for specific CORS error

### Health check fails

**Solutions:**
- Verify `/api/health` endpoint is accessible
- Check server is running (view logs)
- Ensure no firewall or network issues

### File uploads not working

**Note:** Render's filesystem is ephemeral. Files uploaded will be lost on redeploy.

**Solutions:**
- For production, consider using cloud storage (AWS S3, Cloudinary, etc.)
- Update `UPLOADS_DIR` to point to cloud storage
- Or use Render's disk storage (paid plans only)

## Important Notes

1. **Port Configuration**: Render automatically sets the `PORT` environment variable. Do not hardcode port numbers.

2. **Database SSL**: The backend is already configured to use SSL for database connections (required by Render PostgreSQL).

3. **Health Checks**: Render automatically monitors `/api/health` endpoint for service health.

4. **Auto-Deploy**: Render automatically redeploys when you push to the connected branch.

5. **Environment Variables**: All sensitive values should be set in Render dashboard, never committed to git.

6. **File Storage**: Render's filesystem is ephemeral. For production file storage, use cloud storage services.

## Next Steps

After successful deployment:

1. ✅ Test all API endpoints
2. ✅ Verify authentication works
3. ✅ Test file uploads (if using cloud storage)
4. ✅ Monitor logs for any errors
5. ✅ Set up custom domain (optional)
6. ✅ Configure auto-scaling (if needed)

## Support

If you encounter issues:
1. Check Render logs first
2. Verify all environment variables
3. Test database connection separately
4. Check Render status page for service outages

Your backend should now be live and accessible! 🚀

