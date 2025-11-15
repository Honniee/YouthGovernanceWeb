import dotenv from 'dotenv';

dotenv.config();

/**
 * Backup Configuration
 * Configures database backup settings
 */
export const backupConfig = {
  // Enable/disable backups
  enabled: process.env.BACKUP_ENABLED === 'true' || false,
  
  // Backup schedule (cron format)
  schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
  
  // Storage type: 'local', 's3', 'gcs'
  storageType: process.env.BACKUP_STORAGE_TYPE || 'local',
  
  // Local storage path
  localPath: process.env.BACKUP_LOCAL_PATH || './backups',
  
  // AWS S3 Configuration
  s3: {
    bucket: process.env.BACKUP_S3_BUCKET || '',
    region: process.env.BACKUP_S3_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  
  // Google Cloud Storage Configuration
  gcs: {
    bucket: process.env.BACKUP_GCS_BUCKET || '',
    keyFilename: process.env.BACKUP_GCS_KEY_FILE || '',
  },
  
  // Backup retention (days)
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
  
  // Notification email
  notificationEmail: process.env.BACKUP_NOTIFICATION_EMAIL || process.env.EMAIL_USER || '',
  
  // Database connection (for pg_dump)
  database: {
    host: process.env.DB_HOST || '',
    port: process.env.DB_PORT || '5432',
    name: process.env.DB_NAME || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    url: process.env.DATABASE_URL || '',
  },
  
  // Backup options
  options: {
    // Compression
    compress: process.env.BACKUP_COMPRESS !== 'false',
    
    // Backup format: 'custom', 'plain', 'directory', 'tar'
    format: process.env.BACKUP_FORMAT || 'custom',
    
    // Include schema
    schemaOnly: process.env.BACKUP_SCHEMA_ONLY === 'true' || false,
    
    // Include data
    dataOnly: process.env.BACKUP_DATA_ONLY === 'true' || false,
    
    // Verbose output
    verbose: process.env.BACKUP_VERBOSE === 'true' || false,
  },
};

export default backupConfig;


