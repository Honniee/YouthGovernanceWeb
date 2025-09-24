import { query } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runVoterMigration() {
  try {
    console.log('🔄 Starting voter migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../database/migrations/add_is_active_to_voters_list.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`  ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        await query(statement);
      }
    }
    
    console.log('✅ Voter migration completed successfully!');
    console.log('📋 Added is_active column to Voters_List table');
    console.log('📋 Created index for better performance');
    console.log('📋 Set all existing records to active');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runVoterMigration();



