# Environment Setup Guide for SK Terms Enhanced Features

## Overview

This guide explains how to set up environment variables and cron jobs for the enhanced SK Terms features including automatic status transitions.

## 1. Environment Variables Setup

### Required Environment Variables

Add these variables to your `.env` file in the backend directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
NODE_ENV=development

# Cron Job Security
CRON_SECRET=your-secure-cron-secret-here

# Optional: Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### CRON_SECRET Generation

Generate a secure random string for your CRON_SECRET:

**Option 1: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: Using OpenSSL**
```bash
openssl rand -hex 32
```

**Option 3: Using Online Generator**
- Visit: https://generate-secret.vercel.app/32
- Copy the generated string

### Example .env File

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=youth_governance_db
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=development

# Cron Security
CRON_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=admin@yourdomain.com
SMTP_PASS=your-app-specific-password
```

## 2. Cron Job Setup

### What is a Cron Job?

A cron job is a scheduled task that runs automatically at specified intervals. For SK Terms, we need a daily job that runs at midnight to update term statuses.

### Setup Options

#### Option 1: Linux/Unix Cron (Recommended for Production)

1. **Open crontab editor:**
```bash
crontab -e
```

2. **Add the cron job:**
```bash
# Daily at midnight (00:00) - Update SK Term statuses
0 0 * * * curl -H "X-Cron-Secret: your-secure-cron-secret-here" http://localhost:3001/api/cron/update-term-statuses
```

3. **Save and exit** (usually Ctrl+X, then Y, then Enter)

4. **Verify the cron job:**
```bash
crontab -l
```

#### Option 2: Windows Task Scheduler

1. **Open Task Scheduler:**
   - Press `Win + R`, type `taskschd.msc`, press Enter

2. **Create Basic Task:**
   - Click "Create Basic Task"
   - Name: "SK Terms Status Update"
   - Description: "Daily automatic update of SK term statuses"

3. **Set Trigger:**
   - Daily
   - Start time: 00:00:00
   - Recur every: 1 days

4. **Set Action:**
   - Start a program
   - Program: `curl`
   - Arguments: `-H "X-Cron-Secret: your-secure-cron-secret-here" http://localhost:3001/api/cron/update-term-statuses`

5. **Finish and test**

#### Option 3: Using Node.js Cron Package (Alternative)

If you prefer to run cron jobs within your Node.js application:

1. **Install the cron package:**
```bash
npm install node-cron
```

2. **Add to your server.js:**
```javascript
import cron from 'node-cron';
import skTermsAutoUpdateService from './services/skTermsAutoUpdateService.js';

// Schedule daily cron job at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('🕐 Running scheduled SK Terms status update...');
  try {
    const result = await skTermsAutoUpdateService.updateTermStatuses();
    console.log('✅ Scheduled update completed:', result);
  } catch (error) {
    console.error('❌ Scheduled update failed:', error);
  }
}, {
  timezone: "Asia/Manila" // Adjust to your timezone
});
```

### Cron Job Testing

#### Test the Endpoint Manually

1. **Test without cron secret (should fail):**
```bash
curl http://localhost:3001/api/cron/update-term-statuses
```

2. **Test with correct cron secret:**
```bash
curl -H "X-Cron-Secret: your-secure-cron-secret-here" http://localhost:3001/api/cron/update-term-statuses
```

3. **Test manual trigger (for development):**
```bash
curl http://localhost:3001/api/cron/manual-update-term-statuses
```

#### Expected Responses

**Successful Response:**
```json
{
  "success": true,
  "message": "Term statuses updated successfully",
  "data": {
    "changes": {
      "activated": [],
      "completed": []
    },
    "timestamp": "2024-01-15T00:00:00.000Z"
  }
}
```

**Unauthorized Response:**
```json
{
  "success": false,
  "message": "Unauthorized cron job request"
}
```

## 3. Production Deployment

### Environment Variables in Production

#### Heroku
```bash
heroku config:set CRON_SECRET=your-secure-cron-secret-here
heroku config:set NODE_ENV=production
```

#### Docker
```dockerfile
ENV CRON_SECRET=your-secure-cron-secret-here
ENV NODE_ENV=production
```

#### AWS/EC2
Add to your system environment or use a process manager like PM2:
```bash
pm2 start ecosystem.config.js --env production
```

### Production Cron Job

For production servers, use the actual domain:

```bash
# Production cron job
0 0 * * * curl -H "X-Cron-Secret: your-secure-cron-secret-here" https://yourdomain.com/api/cron/update-term-statuses
```

### Monitoring

#### Check Cron Job Logs

1. **View cron logs:**
```bash
tail -f /var/log/cron
```

2. **Check application logs:**
```bash
tail -f /var/log/your-app/app.log
```

#### Health Check Endpoint

Test if the cron endpoint is accessible:
```bash
curl -H "X-Cron-Secret: your-secure-cron-secret-here" https://yourdomain.com/api/cron/pending-status-updates
```

## 4. Troubleshooting

### Common Issues

#### 1. Cron Job Not Running
- Check if cron service is running: `sudo systemctl status cron`
- Verify cron job exists: `crontab -l`
- Check cron logs: `tail -f /var/log/cron`

#### 2. Unauthorized Error
- Verify CRON_SECRET matches in .env and cron job
- Check for extra spaces or characters
- Ensure the secret is properly quoted

#### 3. Database Connection Issues
- Verify database credentials in .env
- Check if database is running
- Test database connection manually

#### 4. Timezone Issues
- Set correct timezone in cron: `TZ=Asia/Manila`
- Or use UTC and adjust in application

### Debug Commands

```bash
# Test database connection
psql -h localhost -U your_user -d your_database

# Check if server is running
curl http://localhost:3001/api/health

# Test cron endpoint manually
curl -H "X-Cron-Secret: your-secret" http://localhost:3001/api/cron/manual-update-term-statuses

# Check application logs
tail -f backend/logs/app.log
```

## 5. Security Best Practices

1. **Use strong, unique CRON_SECRET**
2. **Never commit .env files to version control**
3. **Use HTTPS in production**
4. **Regularly rotate secrets**
5. **Monitor cron job execution logs**
6. **Set up alerts for failed cron jobs**

## 6. Next Steps

After setting up:

1. **Test the manual endpoint** to verify everything works
2. **Set up the daily cron job** for automatic updates
3. **Monitor the first few executions** to ensure success
4. **Set up logging and monitoring** for production
5. **Configure alerts** for failed executions

Your enhanced SK Terms system is now ready for automatic status management! 🎉
