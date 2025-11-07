import { getClient } from './config/database.js';

async function checkAges() {
  const client = await getClient();
  
  try {
    console.log('\n📊 Checking Segment Age Averages...\n');
    
    const result = await client.query(`
      SELECT DISTINCT ON (segment_name)
        segment_id,
        segment_name,
        youth_count,
        percentage,
        ROUND(avg_age::numeric, 1) as avg_age,
        ROUND((employment_rate * 100)::numeric, 0) as employment_pct,
        ROUND((civic_engagement_rate * 100)::numeric, 0) as civic_pct
      FROM "Youth_Segments"
      WHERE batch_id = 'BAT999' AND is_active = true
      ORDER BY segment_name, segment_id
    `);
    
    console.log('📊 Unique Segments for Batch BAT999:');
    console.log('─'.repeat(80));
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.segment_name}`);
      console.log(`   ID: ${row.segment_id}`);
      console.log(`   Youth Count: ${row.youth_count}`);
      console.log(`   Percentage: ${row.percentage}%`);
      console.log(`   Average Age: ${row.avg_age} yrs ✅`);
      console.log(`   Employment: ${row.employment_pct}%`);
      console.log(`   Civic Engagement: ${row.civic_pct}%`);
      console.log('');
    });
    
    console.log('─'.repeat(80));
    console.log(`\n✅ Total Unique Segments: ${result.rows.length}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

checkAges();






