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
- `EMAIL_LOGO_URL` - (Optional) Public URL to municipality logo image for email templates
  - Example: `https://yourdomain.com/uploads/logo.png` or `https://yourdomain.com/assets/logos/san_jose_logo.webp`
  - Alternative variable name: `MUNICIPALITY_LOGO_URL`

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
- `SK_TERMS_CRON_SCHEDULE` - Cron schedule for SK Terms status updates
  - Default: `0 0 * * *` (Daily at midnight 00:00)
- `ENABLE_SK_TERMS_CRON` - Enable automatic SK Terms status updates (set to `true` to enable)
  - In production mode, this is automatically enabled

### CORS
- `CORS_ORIGIN` - Custom CORS origin (overrides `FRONTEND_URL`)
  - Usually not needed if `FRONTEND_URL` is set correctly

### Logging
- `QUERY_LOGGING` - Enable detailed database query logging (set to `true` to enable in production)
  - Default: Disabled in production, enabled in development
  - Useful for debugging database performance issues

### Backup Configuration
- `BACKUP_ENABLED` - Enable automated database backups (set to `true` to enable)
  - Default: `false`
- `BACKUP_SCHEDULE` - Cron schedule for backups (default: `0 2 * * *` - Daily at 2 AM)
- `BACKUP_STORAGE_TYPE` - Storage type: `local`, `s3`, or `gcs` (default: `local`)
- `BACKUP_LOCAL_PATH` - Local backup directory (default: `./backups`)
- `BACKUP_S3_BUCKET` - AWS S3 bucket name for backups
- `BACKUP_S3_REGION` - AWS S3 region (default: `us-east-1`)
- `AWS_ACCESS_KEY_ID` - AWS access key ID for S3
- `AWS_SECRET_ACCESS_KEY` - AWS secret access key for S3
- `BACKUP_GCS_BUCKET` - Google Cloud Storage bucket name
- `BACKUP_GCS_KEY_FILE` - Path to GCS service account key file
- `BACKUP_RETENTION_DAYS` - Number of days to retain backups (default: `30`)
- `BACKUP_NOTIFICATION_EMAIL` - Email address for backup failure notifications
- `BACKUP_COMPRESS` - Enable backup compression (default: `true`)
- `BACKUP_FORMAT` - Backup format: `custom`, `plain`, `directory`, `tar` (default: `custom`)

### Data Retention
- `DATA_RETENTION_ENABLED` - Enable data retention processing (set to `true` to enable)
  - Default: `false`
- `DATA_RETENTION_YEARS` - Years to retain data before anonymization (default: `5`)
- `DATA_RETENTION_CHECK_SCHEDULE` - Cron schedule for retention checks (default: `0 3 1 * *` - Monthly on 1st at 3 AM)
- `ANONYMIZATION_ENABLED` - Enable data anonymization (default: `true`)
- `DATA_RETENTION_NOTIFICATION_EMAIL` - Email address for retention processing notifications

### Security
- `SECURITY_INCIDENT_NOTIFICATION_EMAIL` - Email address for security incident notifications
- `DATA_PROTECTION_OFFICER_EMAIL` - Email address of Data Protection Officer

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
EMAIL_LOGO_URL=https://yourdomain.com/assets/logos/san_jose_logo.webp

# File Uploads
UPLOADS_DIR=/opt/render/project/src/uploads
UPLOAD_MAX_SIZE=5242880
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx

# Cron Jobs
CRON_SECRET=your-cron-secret
CLUSTERING_CRON_SCHEDULE=0 2 1 * *
ENABLE_CLUSTERING_CRON=true
SK_TERMS_CRON_SCHEDULE=0 0 * * *
ENABLE_SK_TERMS_CRON=true

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_STORAGE_TYPE=local
BACKUP_RETENTION_DAYS=30
BACKUP_NOTIFICATION_EMAIL=admin@example.com

# Data Retention
DATA_RETENTION_ENABLED=true
DATA_RETENTION_YEARS=5
DATA_RETENTION_CHECK_SCHEDULE=0 3 1 * *
ANONYMIZATION_ENABLED=true
DATA_RETENTION_NOTIFICATION_EMAIL=admin@example.com

# Security
SECURITY_INCIDENT_NOTIFICATION_EMAIL=security@example.com
DATA_PROTECTION_OFFICER_EMAIL=dpo@example.com

# CORS
CORS_ORIGIN=https://your-frontend.onrender.com
```

## Notes

1. **Never commit secrets to git** - Always set environment variables in Render dashboard
2. **Generate strong secrets** - Use cryptographically secure random generators for JWT_SECRET and CRON_SECRET
3. **Database URL** - Render provides this automatically if you link the database to the service
4. **Port** - Render sets PORT automatically; you usually don't need to override it
5. **File Storage** - Consider using cloud storage (S3, Cloudinary) instead of local filesystem for production

