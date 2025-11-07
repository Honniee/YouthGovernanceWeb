import { getClient } from './config/database.js';

async function checkCivic() {
  const client = await getClient();
  
  try {
    console.log('\n📊 Checking Civic Engagement Rates...\n');
    
    const result = await client.query(`
      SELECT DISTINCT ON (segment_name)
        segment_name,
        youth_count,
        ROUND((employment_rate * 100)::numeric, 0) as employment_pct,
        ROUND((civic_engagement_rate * 100)::numeric, 0) as civic_pct,
        ROUND(avg_age::numeric, 1) as avg_age
      FROM "Youth_Segments"
      WHERE batch_id = 'BAT999' AND is_active = true
      ORDER BY segment_name, segment_id DESC
    `);
    
    console.log('📊 Civic Engagement Rates (Updated):');
    console.log('─'.repeat(80));
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.segment_name}`);
      console.log(`   Youth: ${row.youth_count}`);
      console.log(`   Avg Age: ${row.avg_age} yrs`);
      console.log(`   Employment: ${row.employment_pct}%`);
      console.log(`   Civic Engagement: ${row.civic_pct}% ${row.civic_pct > 100 ? '⚠️  STILL > 100%!' : '✅'}`);
      console.log('');
    });
    
    console.log('─'.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

checkCivic();






