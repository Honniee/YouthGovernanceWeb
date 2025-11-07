import { getClient } from './config/database.js';

async function checkDescriptions() {
  const client = await getClient();
  
  try {
    console.log('\n📝 Checking Enhanced Segment Descriptions...\n');
    
    const result = await client.query(`
      SELECT DISTINCT ON (segment_name)
        segment_name,
        segment_description,
        youth_count
      FROM "Youth_Segments"
      WHERE batch_id = 'BAT999' AND is_active = true
      ORDER BY segment_name, segment_id DESC
    `);
    
    console.log('📝 Enhanced Descriptions:');
    console.log('═'.repeat(100));
    
    result.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.segment_name} (${row.youth_count} youth)`);
      console.log('─'.repeat(100));
      console.log(`   ${row.segment_description}`);
    });
    
    console.log('\n' + '═'.repeat(100));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

checkDescriptions();






