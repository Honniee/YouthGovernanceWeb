import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import backupConfig from '../config/backupConfig.js';
import { query } from '../config/database.js';
import emailService from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

/**
 * Database Backup Service
 * Creates automated backups of PostgreSQL database
 */
class DatabaseBackupService {
  constructor() {
    this.backupDir = path.resolve(__dirname, '../../backups');
    this.ensureBackupDirectory();
  }

  /**
   * Ensure backup directory exists
   */
  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  /**
   * Generate backup filename with timestamp
   */
  generateBackupFilename() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
    const extension = backupConfig.options.compress && backupConfig.options.format === 'custom' 
      ? 'dump' 
      : 'sql';
    return `backup_${timestamp}.${extension}`;
  }

  /**
   * Create database backup using pg_dump
   */
  async createBackup() {
    if (!backupConfig.enabled) {
      console.log('Backup is disabled. Set BACKUP_ENABLED=true to enable.');
      return { success: false, message: 'Backup is disabled' };
    }

    const filename = this.generateBackupFilename();
    const filepath = path.join(this.backupDir, filename);

    try {
      console.log(`Starting database backup: ${filename}`);

      // Build pg_dump command
      const dumpCommand = this.buildDumpCommand(filepath);

      // Execute backup
      const { stdout, stderr } = await execAsync(dumpCommand, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: {
          ...process.env,
          PGPASSWORD: backupConfig.database.password,
        },
      });

      if (stderr && !stderr.includes('WARNING')) {
        console.error('Backup stderr:', stderr);
      }

      // Get file size
      const stats = await fs.stat(filepath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log(`Backup created successfully: ${filename} (${fileSizeMB} MB)`);

      // Log backup to database
      await this.logBackup({
        filename,
        filepath,
        size: stats.size,
        status: 'success',
      });

      // Upload to cloud storage if configured
      if (backupConfig.storageType !== 'local') {
        await this.uploadToCloud(filepath, filename);
      }

      // Clean up old backups
      await this.cleanupOldBackups();

      return {
        success: true,
        filename,
        filepath,
        size: stats.size,
        sizeMB: parseFloat(fileSizeMB),
      };
    } catch (error) {
      console.error('Backup failed:', error);
      
      // Log failed backup
      await this.logBackup({
        filename,
        filepath,
        status: 'failed',
        error: error.message,
      });

      // Send notification email
      await this.sendFailureNotification(error, filename);

      return {
        success: false,
        error: error.message,
        filename,
      };
    }
  }

  /**
   * Build pg_dump command
   */
  buildDumpCommand(filepath) {
    const { database, options } = backupConfig;
    
    // Use DATABASE_URL if available, otherwise build connection string
    const connectionString = database.url || 
      `postgresql://${database.user}:${database.password}@${database.host}:${database.port}/${database.name}`;

    let command = 'pg_dump';

    // Connection options
    if (database.url) {
      command += ` "${database.url}"`;
    } else {
      command += ` -h ${database.host} -p ${database.port} -U ${database.user} -d ${database.name}`;
    }

    // Format
    if (options.format === 'custom') {
      command += ' -Fc'; // Custom format (compressed)
    } else if (options.format === 'directory') {
      command += ' -Fd'; // Directory format
    } else if (options.format === 'tar') {
      command += ' -Ft'; // Tar format
    } else {
      command += ' -Fp'; // Plain text
    }

    // Schema/data only
    if (options.schemaOnly) {
      command += ' --schema-only';
    }
    if (options.dataOnly) {
      command += ' --data-only';
    }

    // Verbose
    if (options.verbose) {
      command += ' -v';
    }

    // Output file
    command += ` -f "${filepath}"`;

    return command;
  }

  /**
   * Upload backup to cloud storage
   */
  async uploadToCloud(filepath, filename) {
    try {
      if (backupConfig.storageType === 's3') {
        await this.uploadToS3(filepath, filename);
      } else if (backupConfig.storageType === 'gcs') {
        await this.uploadToGCS(filepath, filename);
      }
    } catch (error) {
      console.error('Cloud upload failed:', error);
      // Don't fail the backup if cloud upload fails
    }
  }

  /**
   * Upload to AWS S3
   */
  async uploadToS3(filepath, filename) {
    try {
      // Dynamic import for AWS SDK
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const { readFileSync } = await import('fs');

      const s3Client = new S3Client({
        region: backupConfig.s3.region,
        credentials: {
          accessKeyId: backupConfig.s3.accessKeyId,
          secretAccessKey: backupConfig.s3.secretAccessKey,
        },
      });

      const fileContent = readFileSync(filepath);
      const key = `backups/${filename}`;

      const command = new PutObjectCommand({
        Bucket: backupConfig.s3.bucket,
        Key: key,
        Body: fileContent,
        ContentType: 'application/octet-stream',
      });

      await s3Client.send(command);
      console.log(`Backup uploaded to S3: ${key}`);
    } catch (error) {
      console.error('S3 upload error:', error);
      throw error;
    }
  }

  /**
   * Upload to Google Cloud Storage
   */
  async uploadToGCS(filepath, filename) {
    try {
      // Dynamic import for GCS
      const { Storage } = await import('@google-cloud/storage');
      const { readFileSync } = await import('fs');

      const storage = new Storage({
        keyFilename: backupConfig.gcs.keyFilename,
      });

      const bucket = storage.bucket(backupConfig.gcs.bucket);
      const file = bucket.file(`backups/${filename}`);

      const fileContent = readFileSync(filepath);
      await file.save(fileContent);

      console.log(`Backup uploaded to GCS: backups/${filename}`);
    } catch (error) {
      console.error('GCS upload error:', error);
      throw error;
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const now = Date.now();
      const retentionMs = backupConfig.retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.startsWith('backup_')) continue;

        const filepath = path.join(this.backupDir, file);
        const stats = await fs.stat(filepath);
        const age = now - stats.mtimeMs;

        if (age > retentionMs) {
          await fs.unlink(filepath);
          console.log(`Deleted old backup: ${file}`);
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Log backup to database
   */
  async logBackup(backupInfo) {
    try {
      await query(
        `INSERT INTO "Backup_Logs" 
         (backup_filename, backup_filepath, backup_size, status, error_message, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (backup_filename) DO UPDATE SET
         backup_filepath = $2, backup_size = $3, status = $4, error_message = $5, updated_at = CURRENT_TIMESTAMP`,
        [
          backupInfo.filename,
          backupInfo.filepath,
          backupInfo.size || 0,
          backupInfo.status,
          backupInfo.error || null,
        ]
      );
    } catch (error) {
      // Table might not exist yet, just log error
      console.error('Failed to log backup to database:', error.message);
    }
  }

  /**
   * Send failure notification email
   */
  async sendFailureNotification(error, filename) {
    if (!backupConfig.notificationEmail) return;

    try {
      await emailService.sendEmail({
        to: backupConfig.notificationEmail,
        subject: 'Database Backup Failed',
        html: `
          <h2>Database Backup Failed</h2>
          <p><strong>Filename:</strong> ${filename}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Error:</strong></p>
          <pre>${error.message}</pre>
          <p>Please check the backup configuration and database connection.</p>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send backup failure notification:', emailError);
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupFile) {
    try {
      const filepath = path.isAbsolute(backupFile) 
        ? backupFile 
        : path.join(this.backupDir, backupFile);

      // Check if file exists
      await fs.access(filepath);

      console.log(`Restoring database from: ${filepath}`);

      const { database } = backupConfig;
      const connectionString = database.url || 
        `postgresql://${database.user}:${database.password}@${database.host}:${database.port}/${database.name}`;

      let command = 'pg_restore';

      if (database.url) {
        command += ` -d "${database.url}"`;
      } else {
        command += ` -h ${database.host} -p ${database.port} -U ${database.user} -d ${database.name}`;
      }

      // Check if it's a custom format backup
      if (filepath.endsWith('.dump') || backupConfig.options.format === 'custom') {
        command += ` -Fc`;
      }

      command += ` -c`; // Clean (drop) database objects before recreating
      command += ` "${filepath}"`;

      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          PGPASSWORD: database.password,
        },
      });

      if (stderr && !stderr.includes('WARNING')) {
        console.error('Restore stderr:', stderr);
      }

      console.log('Database restored successfully');

      return { success: true, message: 'Database restored successfully' };
    } catch (error) {
      console.error('Restore failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (!file.startsWith('backup_')) continue;

        const filepath = path.join(this.backupDir, file);
        const stats = await fs.stat(filepath);
        backups.push({
          filename: file,
          filepath,
          size: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          created: stats.birthtime,
          modified: stats.mtime,
        });
      }

      return backups.sort((a, b) => b.modified - a.modified);
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }
}

// Create singleton instance
const backupService = new DatabaseBackupService();

// If run directly, execute backup
if (import.meta.url === `file://${process.argv[1]}`) {
  backupService.createBackup()
    .then(result => {
      if (result.success) {
        console.log('Backup completed successfully');
        process.exit(0);
      } else {
        console.error('Backup failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Backup error:', error);
      process.exit(1);
    });
}

export default backupService;

