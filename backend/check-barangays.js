import { query } from './config/database.js';

async function checkBarangays() {
  try {
    const result = await query('SELECT COUNT(*) as count FROM "Barangay"');
    console.log(`\n📊 Total Barangays: ${result.rows[0].count}`);
    
    const list = await query('SELECT barangay_id, barangay_name FROM "Barangay" ORDER BY barangay_name LIMIT 20');
    console.log('\n📍 Barangays (showing first 20):');
    list.rows.forEach(b => console.log(`   - ${b.barangay_id}: ${b.barangay_name}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkBarangays();

