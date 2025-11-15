# Render PostgreSQL Backup Setup Guide

## Overview

This guide explains how to set up database backups for your Render PostgreSQL database in compliance with RA 10173 requirements.

## Render PostgreSQL Backup Options

### Option 1: Render Point-in-Time Recovery (PITR) - Automatic

**Availability:**
- **Free Tier**: Not available
- **Hobby Plan ($7/month)**: 3 days recovery window
- **Professional+ Plans**: 7 days recovery window

**Features:**
- Automatic backups managed by Render
- Point-in-time recovery to any state within recovery window
- No configuration needed
- Access via Render Dashboard → Database → Recovery page

**How to Use:**
1. Ensure you have a paid Render PostgreSQL plan
2. PITR is automatically enabled
3. To restore: Go to Render Dashboard → Your Database → Recovery
4. Select point in time and restore

**Pros:**
- Zero configuration
- Automatic
- Reliable
- Easy to use

**Cons:**
- Limited retention (3-7 days)
- Requires paid plan
- No off-site backup
- Limited for compliance requirements (RA 10173 recommends longer retention)

### Option 2: Render Manual Logical Backups

**Availability:**
- All Render PostgreSQL plans

**Features:**
- Create backups on-demand from Render Dashboard
- Download backups for long-term storage
- Restore to new database instance
- Retained for 7 days on Render

**How to Use:**
1. Go to Render Dashboard → Your Database
2. Click "Backups" tab
3. Click "Create Backup"
4. Download backup file for long-term storage
5. To restore: Use "Restore Backup" option

**Pros:**
- Available on all plans
- Simple to use
- Can download for long-term storage

**Cons:**
- Manual process (not automated)
- Requires regular manual creation
- 7-day retention on Render
- Not suitable for compliance (needs automation)

### Option 3: Custom Backup Script with S3 (Recommended for Compliance)

**Availability:**
- All Render PostgreSQL plans
- Works with any external storage (S3, GCS, etc.)

**Features:**
- Automated daily backups
- Long-term retention (30+ days)
- Off-site backup to S3/GCS
- Backup verification
- Email notifications
- Audit trail
- Compliance with RA 10173

**Setup Steps:**

#### Step 1: Set Up AWS S3 Bucket

1. Create S3 bucket in AWS Console
2. Configure bucket for backups:
   - Enable versioning
   - Set lifecycle policies for old backups
   - Configure access policies
3. Create IAM user with S3 access
4. Generate access keys

#### Step 2: Configure Environment Variables

Add to Render environment variables:

```env
BACKUP_ENABLED=true
BACKUP_STORAGE_TYPE=s3
BACKUP_S3_BUCKET=your-backup-bucket-name
BACKUP_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
BACKUP_RETENTION_DAYS=30
BACKUP_NOTIFICATION_EMAIL=admin@example.com
```

#### Step 3: Set Up Cron Job

**Option A: External Cron Service (Recommended)**

Use external cron service to trigger backup endpoint:

1. Sign up for cron service (cron-job.org, EasyCron, etc.)
2. Set up cron job to call: `https://your-api.onrender.com/api/cron/backup`
3. Add header: `X-Cron-Secret: your-cron-secret`
4. Schedule: Daily at 2 AM (or preferred time)

**Option B: Render Cron Jobs (If Available)**

If Render supports cron jobs in your plan:
1. Configure cron job in Render Dashboard
2. Set schedule: `0 2 * * *` (Daily at 2 AM)
3. Endpoint: `/api/cron/backup`
4. Method: GET
5. Headers: `X-Cron-Secret: your-cron-secret`

#### Step 4: Verify Backups

1. Check backup status: `GET /api/backup/status`
2. List backups: `GET /api/backup/list`
3. Verify S3 bucket has backup files
4. Check email notifications for backup status

### Option 4: Hybrid Approach (Best for Compliance)

**Recommended Setup:**
- **Short-term (3-7 days)**: Use Render PITR for immediate recovery
- **Long-term (30+ days)**: Use custom S3 backups for compliance and audit

**Benefits:**
- Immediate recovery via PITR
- Long-term retention for compliance
- Redundancy (multiple backup sources)
- Meets RA 10173 requirements

## RA 10173 Compliance Requirements

### Backup Requirements:
- ✅ **Automated backups**: Daily automated backups
- ✅ **Long-term retention**: 30+ days (S3 backups)
- ✅ **Off-site storage**: Backups stored in S3 (separate from production)
- ✅ **Backup verification**: Automated verification and integrity checks
- ✅ **Audit trail**: Backup logs tracked in database
- ✅ **Restoration capability**: Can restore from backups
- ✅ **Notification system**: Email notifications for backup failures

## Configuration Recommendations

### For Development/Testing:
```env
BACKUP_ENABLED=false  # Use Render PITR only
# Or use local backups for testing
BACKUP_ENABLED=true
BACKUP_STORAGE_TYPE=local
```

### For Production (Compliance):
```env
BACKUP_ENABLED=true
BACKUP_STORAGE_TYPE=s3
BACKUP_S3_BUCKET=your-production-backup-bucket
BACKUP_RETENTION_DAYS=30
BACKUP_NOTIFICATION_EMAIL=admin@example.com
```

### For Production (Hybrid):
- Enable Render PITR (paid plan)
- Enable custom S3 backups
- Use both for redundancy

## Monitoring and Maintenance

### Daily Checks:
- Verify backup completion (check logs/email)
- Check backup file size (should be consistent)
- Verify S3 upload success

### Weekly Checks:
- Test backup restoration
- Verify backup retention (old backups deleted)
- Check backup storage usage

### Monthly Checks:
- Review backup logs
- Test full database restoration
- Verify compliance requirements

## Troubleshooting

### Backup Fails:
1. Check Render service logs
2. Verify S3 credentials
3. Check network connectivity
4. Verify database connection
5. Check email notifications for error details

### Backup Not Running:
1. Verify cron job is configured
2. Check `BACKUP_ENABLED=true`
3. Verify cron secret is correct
4. Check Render service is running
5. Verify endpoint is accessible

### S3 Upload Fails:
1. Verify AWS credentials
2. Check S3 bucket permissions
3. Verify bucket exists
4. Check network connectivity
5. Verify S3 region is correct

## Cost Considerations

### Render PITR:
- Included in paid plans ($7+/month)
- No additional storage costs
- Limited to 3-7 days retention

### Custom S3 Backups:
- S3 storage: ~$0.023/GB/month
- S3 requests: Minimal cost
- Data transfer: Free (within same region)
- Estimated cost: $1-5/month for typical database

### Hybrid Approach:
- Render PITR: Included in paid plan
- S3 backups: $1-5/month
- Total: $8-12/month (includes database + backups)

## Best Practices

1. **Enable Both**: Use Render PITR + S3 backups for redundancy
2. **Monitor Regularly**: Check backup status daily
3. **Test Restores**: Test restoration monthly
4. **Verify Off-site**: Ensure S3 backups are in different region
5. **Encrypt Backups**: Enable S3 encryption
6. **Version Control**: Enable S3 versioning
7. **Lifecycle Policies**: Set S3 lifecycle policies for old backups
8. **Access Control**: Restrict S3 bucket access
9. **Audit Logs**: Enable S3 access logging
10. **Documentation**: Document backup and restore procedures

## Support

For issues or questions:
- Render Support: support@render.com
- AWS S3 Documentation: https://docs.aws.amazon.com/s3/
- Backup Service Logs: Check Render service logs
- Backup API: `/api/backup/status` endpoint


