import { query } from './config/database.js';

/**
 * Clear All Youth and Response Data
 * Deletes ALL youth profiles, survey responses, and related data
 * Run this script first before regenerating sample data
 */

async function clearSampleData() {
  console.log('\n' + '═'.repeat(60));
  console.log('🗑️  CLEARING ALL YOUTH AND RESPONSE DATA');
  console.log('═'.repeat(60));
  
  try {
    // Delete in correct order (foreign keys)
    // Step 1: Delete clustering runs (independent, no foreign key dependencies)
    console.log('\n📊 Step 1: Deleting clustering runs...');
    const clusteringRuns = await query('DELETE FROM "Clustering_Runs"');
    console.log(`✅ Deleted ${clusteringRuns.rowCount} clustering runs`);
    
    // Step 2: Delete youth segments (cascades to Youth_Cluster_Assignments and Program_Recommendations)
    console.log('\n📊 Step 2: Deleting youth segments...');
    const segments = await query('DELETE FROM "Youth_Segments"');
    console.log(`✅ Deleted ${segments.rowCount} segments`);
    
    // Step 3: Delete validation logs (references responses, has ON DELETE CASCADE but delete explicitly)
    console.log('\n📊 Step 3: Deleting validation logs...');
    const validationLogs = await query('DELETE FROM "Validation_Logs"');
    console.log(`✅ Deleted ${validationLogs.rowCount} validation logs`);
    
    // Step 4: Delete validation queue (references responses and youth, has ON DELETE CASCADE but delete explicitly)
    console.log('\n📊 Step 4: Deleting validation queue entries...');
    const validationQueue = await query('DELETE FROM "Validation_Queue"');
    console.log(`✅ Deleted ${validationQueue.rowCount} validation queue entries`);
    
    // Step 5: Delete survey responses (must delete before youth due to ON DELETE RESTRICT)
    console.log('\n📊 Step 5: Deleting survey responses...');
    const responses = await query('DELETE FROM "KK_Survey_Responses"');
    console.log(`✅ Deleted ${responses.rowCount} survey responses`);
    
    // Step 6: Delete youth profiles (all records)
    console.log('\n📊 Step 6: Deleting youth profiles...');
    const youth = await query('DELETE FROM "Youth_Profiling"');
    console.log(`✅ Deleted ${youth.rowCount} youth profiles`);
    
    // Note: Consent_Logs has ON DELETE SET NULL, so it will remain but with null youth_id
    // This is intentional for data retention compliance
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ ALL DATA CLEARED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log('\n💡 Next step: Run node create-sample-youth-data.js to regenerate sample data');
    console.log('');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

clearSampleData();






