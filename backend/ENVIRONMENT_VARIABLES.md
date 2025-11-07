# Environment Variables Reference

This file lists all environment variables used by the backend application.

## Required Variables

### Server Configuration
- `NODE_ENV` - Environment mode (set to `production` for Render)
- `PORT` - Server port (Render sets this automatically, but you can override)

### Database Configuration
Choose **ONE** of the following options:

**Option 1: DATABASE_URL** (Recommended)
- `DATABASE_URL` - Complete PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/dbname?sslmode=require`
  - Get this from Render database dashboard (External Connection String)

**Option 2: Individual Database Variables**
- `DB_HOST` - Database host
- `DB_PORT` - Database port (usually 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password

### Security
- `JWT_SECRET` - Secret key for JWT token signing (minimum 32 characters)
  - Generate a strong random string for production
  - Example: Use `openssl rand -base64 32` or online generator

### Frontend Configuration
- `FRONTEND_URL` - Your deployed frontend URL
  - Example: `https://your-frontend-name.onrender.com`
  - Used for CORS configuration and email links

### reCAPTCHA
- `RECAPTCHA_SECRET_KEY` - Google reCAPTCHA secret key
- `RECAPTCHA_MIN_SCORE` - Minimum score threshold (default: `0.5`)

### Email Configuration
- `EMAIL_HOST` - SMTP server host (e.g., `smtp.gmail.com`)
- `EMAIL_PORT` - SMTP port (usually `587` for TLS)
- `EMAIL_USER` - Email address for sending emails
- `EMAIL_PASS` - Email password or app-specific password
- `EMAIL_SECURE` - Use SSL/TLS (set to `false` for port 587, `true` for port 465)

## Optional Variables

### File Upload
- `UPLOADS_DIR` - Directory for file uploads
  - Render default: `/opt/render/project/src/uploads`
  - Note: Render's filesystem is ephemeral; consider cloud storage for production
- `UPLOAD_MAX_SIZE` - Maximum file size in bytes (default: `5242880` = 5MB)
- `ALLOWED_FILE_TYPES` - Comma-separated list of allowed file types
  - Default: `jpg,jpeg,png,pdf,doc,docx`

### Cron Jobs
- `CRON_SECRET` - Secret key for securing cron job endpoints
- `CLUSTERING_CRON_SCHEDULE` - Cron schedule for clustering jobs
  - Default: `0 2 1 * *` (2 AM on the 1st of every month)
- `ENABLE_CLUSTERING_CRON` - Enable automatic clustering (set to `true` to enable)

### CORS
- `CORS_ORIGIN` - Custom CORS origin (overrides `FRONTEND_URL`)
  - Usually not needed if `FRONTEND_URL` is set correctly

## Environment Variable Examples

### Minimal Production Setup
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
JWT_SECRET=your-32-character-minimum-secret-key-here
FRONTEND_URL=https://your-frontend.onrender.com
RECAPTCHA_SECRET_KEY=your-recaptcha-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Full Production Setup
```bash
# Server
NODE_ENV=production
PORT=10000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require

# Security
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars

# Frontend
FRONTEND_URL=https://your-frontend.onrender.com

# reCAPTCHA
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
RECAPTCHA_MIN_SCORE=0.5

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_SECURE=false

# File Uploads
UPLOADS_DIR=/opt/render/project/src/uploads
UPLOAD_MAX_SIZE=5242880
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx

# Cron Jobs
CRON_SECRET=your-cron-secret
CLUSTERING_CRON_SCHEDULE=0 2 1 * *
ENABLE_CLUSTERING_CRON=true

# CORS
CORS_ORIGIN=https://your-frontend.onrender.com
```

## Notes

1. **Never commit secrets to git** - Always set environment variables in Render dashboard
2. **Generate strong secrets** - Use cryptographically secure random generators for JWT_SECRET and CRON_SECRET
3. **Database URL** - Render provides this automatically if you link the database to the service
4. **Port** - Render sets PORT automatically; you usually don't need to override it
5. **File Storage** - Consider using cloud storage (S3, Cloudinary) instead of local filesystem for production

