/**
 * Database Migration Runner
 * 
 * Automatically runs pending database migrations in order.
 * Tracks migration status in a migrations_log table.
 * 
 * Usage:
 *   node scripts/runMigrations.js                    # Run all pending migrations
 *   node scripts/runMigrations.js --status           # Show migration status
 *   node scripts/runMigrations.js --dry-run          # Show what would be run without executing
 *   node scripts/runMigrations.js --migration=name   # Run specific migration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query, getClient, closePool } from '../config/database.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const showStatus = args.includes('--status');
const migrationArg = args.find(arg => arg.startsWith('--migration='));
const specificMigration = migrationArg ? migrationArg.split('=')[1] : null;

// Paths
const migrationsDir = join(__dirname, '../../database/migrations');
const phaseDir = join(migrationsDir, 'phase');

/**
 * Create migrations_log table if it doesn't exist
 */
async function createMigrationsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS migrations_log (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      executed_by VARCHAR(255),
      execution_time_ms INTEGER,
      status VARCHAR(20) DEFAULT 'success',
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations_log (migration_name);
    CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON migrations_log (executed_at);
  `;
  
  await query(createTableSQL);
  logger.info('Migrations log table ready');
}

/**
 * Get list of all migration files
 */
function getAllMigrationFiles() {
  const files = [];
  
  // Get SQL files from main migrations directory (excluding subdirectories and non-SQL files)
  const mainFiles = fs.readdirSync(migrationsDir)
    .filter(file => 
      file.endsWith('.sql') && 
      !file.includes('test_') && 
      !file.includes('check_') &&
      !file.endsWith('_status.sql') &&
      !file.endsWith('_GUIDE.md') &&
      !file.endsWith('.md')
    )
    .map(file => ({
      name: file,
      path: join(migrationsDir, file),
      category: 'main'
    }));
  
  // Get SQL files from phase directory
  let phaseFiles = [];
  if (fs.existsSync(phaseDir)) {
    phaseFiles = fs.readdirSync(phaseDir)
      .filter(file => file.endsWith('.sql') && !file.includes('test_'))
      .map(file => ({
        name: `phase/${file}`,
        path: join(phaseDir, file),
        category: 'phase'
      }));
  }
  
  // Combine and sort by name (ensures consistent order)
  files.push(...mainFiles, ...phaseFiles);
  files.sort((a, b) => a.name.localeCompare(b.name));
  
  return files;
}

/**
 * Get executed migrations from database
 */
async function getExecutedMigrations() {
  try {
    const result = await query('SELECT migration_name, executed_at, status FROM migrations_log ORDER BY executed_at');
    return new Set(result.rows.map(row => row.migration_name));
  } catch (error) {
    // If table doesn't exist, return empty set
    if (error.code === '42P01') { // Table doesn't exist
      return new Set();
    }
    throw error;
  }
}

/**
 * Get pending migrations
 */
async function getPendingMigrations() {
  await createMigrationsTable();
  const allMigrations = getAllMigrationFiles();
  const executedMigrations = await getExecutedMigrations();
  
  const pending = allMigrations.filter(migration => !executedMigrations.has(migration.name));
  
  return {
    all: allMigrations,
    executed: Array.from(executedMigrations),
    pending
  };
}

/**
 * Execute a single migration file
 */
async function executeMigration(migration) {
  const startTime = Date.now();
  const client = await getClient();
  
  try {
    logger.info(`Executing migration: ${migration.name}`);
    
    // Read migration file
    const sql = fs.readFileSync(migration.path, 'utf8');
    
    // Check if file is empty
    if (!sql.trim()) {
      throw new Error('Migration file is empty');
    }
    
    // Split SQL by semicolons, but preserve multi-line statements
    // Simple approach: execute the entire file as-is
    // For complex migrations, they should handle their own transaction logic
    
    // Execute migration in a transaction
    await client.query('BEGIN');
    
    try {
      // Execute the SQL
      await client.query(sql);
      
      // Log successful execution
      await client.query(
        `INSERT INTO migrations_log (migration_name, executed_at, execution_time_ms, status, executed_by)
         VALUES ($1, CURRENT_TIMESTAMP, $2, 'success', $3)
         ON CONFLICT (migration_name) DO NOTHING`,
        [migration.name, Date.now() - startTime, process.env.USER || 'system']
      );
      
      await client.query('COMMIT');
      
      const duration = Date.now() - startTime;
      logger.info(`✅ Migration completed: ${migration.name} (${duration}ms)`);
      
      return { success: true, duration };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    // Log failed execution
    try {
      await client.query(
        `INSERT INTO migrations_log (migration_name, executed_at, execution_time_ms, status, error_message, executed_by)
         VALUES ($1, CURRENT_TIMESTAMP, $2, 'failed', $3, $4)
         ON CONFLICT (migration_name) 
         DO UPDATE SET status = 'failed', error_message = $3, executed_at = CURRENT_TIMESTAMP`,
        [migration.name, Date.now() - startTime, error.message, process.env.USER || 'system']
      );
    } catch (logError) {
      logger.error('Failed to log migration error', { error: logError.message });
    }
    
    logger.error(`❌ Migration failed: ${migration.name}`, { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Show migration status
 */
async function showMigrationStatus() {
  const status = await getPendingMigrations();
  
  console.log('\n📊 Migration Status\n');
  console.log(`Total migrations found: ${status.all.length}`);
  console.log(`Executed: ${status.executed.length}`);
  console.log(`Pending: ${status.pending.length}\n`);
  
  if (status.pending.length > 0) {
    console.log('⏳ Pending migrations:');
    status.pending.forEach(migration => {
      console.log(`  - ${migration.name}`);
    });
    console.log('');
  }
  
  if (status.executed.length > 0) {
    console.log('✅ Executed migrations:');
    const executedDetails = await query(
      `SELECT migration_name, executed_at, status, execution_time_ms 
       FROM migrations_log 
       ORDER BY executed_at DESC 
       LIMIT 10`
    );
    
    executedDetails.rows.forEach(row => {
      const statusIcon = row.status === 'success' ? '✅' : '❌';
      console.log(`  ${statusIcon} ${row.migration_name} (${row.executed_at.toISOString().split('T')[0]})`);
    });
    
    if (status.executed.length > 10) {
      console.log(`  ... and ${status.executed.length - 10} more`);
    }
    console.log('');
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    logger.info('🚀 Starting migration runner...');
    
    // Check database connection
    await query('SELECT 1');
    logger.info('✅ Database connection established');
    
    // Create migrations log table
    await createMigrationsTable();
    
    // Show status if requested
    if (showStatus) {
      await showMigrationStatus();
      await closePool();
      process.exit(0);
    }
    
    // Get pending migrations
    const { pending } = await getPendingMigrations();
    
    // Filter by specific migration if requested
    const migrationsToRun = specificMigration
      ? pending.filter(m => m.name === specificMigration || m.name.includes(specificMigration))
      : pending;
    
    if (migrationsToRun.length === 0) {
      logger.info('✅ No pending migrations');
      await closePool();
      process.exit(0);
    }
    
    // Dry run mode
    if (isDryRun) {
      console.log('\n🔍 Dry Run Mode - The following migrations would be executed:\n');
      migrationsToRun.forEach((migration, index) => {
        console.log(`${index + 1}. ${migration.name}`);
      });
      console.log(`\nTotal: ${migrationsToRun.length} migration(s)\n`);
      await closePool();
      process.exit(0);
    }
    
    // Execute migrations
    logger.info(`Found ${migrationsToRun.length} pending migration(s)`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const migration of migrationsToRun) {
      try {
        await executeMigration(migration);
        successCount++;
      } catch (error) {
        failCount++;
        logger.error(`Failed to execute ${migration.name}`, { 
          error: error.message,
          stack: error.stack 
        });
        
        // Ask if we should continue
        if (process.env.CONTINUE_ON_ERROR !== 'true') {
          logger.error('❌ Stopping migration execution due to error');
          logger.info('Set CONTINUE_ON_ERROR=true to continue despite errors');
          break;
        }
      }
    }
    
    // Summary
    console.log('\n📋 Migration Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${migrationsToRun.length}\n`);
    
    if (failCount > 0) {
      logger.warn('Some migrations failed. Check logs for details.');
      await closePool();
      process.exit(1);
    }
    
    logger.info('✅ All migrations completed successfully');
    await closePool();
    process.exit(0);
    
  } catch (error) {
    logger.error('Migration runner error', { 
      error: error.message,
      stack: error.stack 
    });
    await closePool();
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as runMigrations, getPendingMigrations, showMigrationStatus };

