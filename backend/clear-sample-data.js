import { query } from './config/database.js';

/**
 * Clear Sample Data
 * Deletes all youth and responses from BAT999 batch
 */

async function clearSampleData() {
  console.log('\n' + '═'.repeat(60));
  console.log('🗑️  CLEARING SAMPLE DATA');
  console.log('═'.repeat(60));
  
  try {
    // Delete in correct order (foreign keys)
    console.log('\n📊 Step 1: Deleting survey responses...');
    const responses = await query(`DELETE FROM "KK_Survey_Responses" WHERE batch_id = 'BAT999'`);
    console.log(`✅ Deleted ${responses.rowCount} responses`);
    
    console.log('\n📊 Step 2: Deleting youth profiles...');
    const youth = await query(`DELETE FROM "Youth_Profiling" WHERE youth_id LIKE 'YTH%' AND youth_id IN (SELECT DISTINCT youth_id FROM "KK_Survey_Responses" WHERE batch_id = 'BAT999')`);
    console.log(`✅ Deleted ${youth.rowCount} youth profiles`);
    
    console.log('\n📊 Step 3: Cleaning up orphaned youth...');
    const orphans = await query(`DELETE FROM "Youth_Profiling" WHERE youth_id LIKE 'YTH%' AND created_at > NOW() - INTERVAL '1 hour'`);
    console.log(`✅ Cleaned ${orphans.rowCount} orphaned profiles`);
    
    console.log('\n📊 Step 4: Deleting old clustering results...');
    const segments = await query(`DELETE FROM "Youth_Segments" WHERE batch_id = 'BAT999'`);
    console.log(`✅ Deleted ${segments.rowCount} segments`);
    
    const runs = await query(`DELETE FROM "Clustering_Runs" WHERE batch_id = 'BAT999'`);
    console.log(`✅ Deleted ${runs.rowCount} clustering runs`);
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ SAMPLE DATA CLEARED!');
    console.log('═'.repeat(60));
    console.log('\n💡 Now run: node generate-sample-youth.js');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

clearSampleData();






