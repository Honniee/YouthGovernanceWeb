import { getClient } from './config/database.js';

async function testUpdatedStats() {
  const client = await getClient();
  try {
    console.log('=== TESTING UPDATED STATISTICS SYSTEM ===');
    
    // Test 1: Check the updated calculate_batch_statistics function
    console.log('\n1. UPDATED CALCULATE_BATCH_STATISTICS FUNCTION RESULTS:');
    const batches = await client.query('SELECT batch_id, batch_name, target_age_min, target_age_max FROM "KK_Survey_Batches" ORDER BY batch_id');
    
    for (const batch of batches.rows) {
      try {
        const calcStats = await client.query('SELECT * FROM calculate_batch_statistics($1)', [batch.batch_id]);
        console.log(`\nBatch ${batch.batch_id} (${batch.batch_name}):`);
        console.log(`  Target Age Range: ${batch.target_age_min}-${batch.target_age_max}`);
        console.log(`  Total Responses: ${calcStats.rows[0].total_responses}`);
        console.log(`  Validated: ${calcStats.rows[0].validated_responses}`);
        console.log(`  Rejected: ${calcStats.rows[0].rejected_responses}`);
        console.log(`  Pending: ${calcStats.rows[0].pending_responses}`);
        console.log(`  Total Youths (Age ${batch.target_age_min}-${batch.target_age_max}): ${calcStats.rows[0].total_youths}`);
        console.log(`  Youths Surveyed: ${calcStats.rows[0].total_youths_surveyed}`);
        console.log(`  Youths Not Surveyed: ${calcStats.rows[0].total_youths_not_surveyed}`);
        console.log(`  Response Rate: ${calcStats.rows[0].response_rate}%`);
        console.log(`  Validation Rate: ${calcStats.rows[0].validation_rate}%`);
      } catch (error) {
        console.log(`Batch ${batch.batch_id}: ERROR - ${error.message}`);
      }
    }
    
    // Test 2: Check actual youth count in Youth_Profiling table
    console.log('\n2. ACTUAL YOUTH COUNTS BY AGE RANGE:');
    const youthCounts = await client.query(`
      SELECT 
        age,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE is_active = true) as active_count
      FROM "Youth_Profiling" 
      GROUP BY age 
      ORDER BY age
    `);
    console.table(youthCounts.rows);
    
    // Test 3: Test the active_batches_with_stats view
    console.log('\n3. ACTIVE_BATCHES_WITH_STATS VIEW:');
    const viewResults = await client.query('SELECT batch_id, batch_name, status, total_responses, total_youths, response_rate FROM active_batches_with_stats ORDER BY batch_id');
    console.table(viewResults.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

testUpdatedStats();
