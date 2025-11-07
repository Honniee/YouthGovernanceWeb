import { getClient } from './config/database.js';

async function checkPercentages() {
  const client = await getClient();
  
  try {
    console.log('\n🔍 Checking Segment Percentages...\n');
    
    const result = await client.query(`
      SELECT 
        segment_name,
        youth_count,
        percentage,
        ROUND((employment_rate * 100)::numeric, 0) as employment_pct,
        ROUND((civic_engagement_rate * 100)::numeric, 0) as civic_pct,
        batch_id
      FROM "Youth_Segments"
      WHERE batch_id = 'BAT999' AND is_active = true
      ORDER BY cluster_number
    `);
    
    console.log('📊 Segments for Batch BAT999:');
    console.log('─'.repeat(80));
    
    let totalPct = 0;
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.segment_name}`);
      console.log(`   Youth Count: ${row.youth_count}`);
      console.log(`   Percentage: ${row.percentage}% ✅`);
      console.log(`   Employment: ${row.employment_pct}%`);
      console.log(`   Civic Engagement: ${row.civic_pct}%`);
      console.log('');
      totalPct += parseFloat(row.percentage);
    });
    
    console.log('─'.repeat(80));
    console.log(`\n✅ Total Percentage: ${totalPct.toFixed(2)}% (should be ~100%)\n`);
    
    if (Math.abs(totalPct - 100) < 1) {
      console.log('🎉 PERCENTAGE FIX SUCCESSFUL! All segments sum to 100%!\n');
    } else {
      console.log('⚠️  Warning: Percentages don\'t sum to 100%\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

checkPercentages();






