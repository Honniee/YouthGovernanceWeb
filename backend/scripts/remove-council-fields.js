import { query } from '../config/database.js';

async function removeCouncilFields() {
  try {
    console.log('🔄 Removing extra columns from LYDO_Council_Members...');
    
    // Drop the index first
    console.log('📊 Step 1: Dropping index...');
    await query(`DROP INDEX IF EXISTS idx_council_members_sort;`);
    
    // Remove the columns
    console.log('📊 Step 2: Removing columns...');
    await query(`
      ALTER TABLE "LYDO_Council_Members"
      DROP COLUMN IF EXISTS focus,
      DROP COLUMN IF EXISTS description,
      DROP COLUMN IF EXISTS photo_url_1,
      DROP COLUMN IF EXISTS photo_url_2,
      DROP COLUMN IF EXISTS photo_url_3,
      DROP COLUMN IF EXISTS term_start,
      DROP COLUMN IF EXISTS term_end,
      DROP COLUMN IF EXISTS sort_order;
    `);
    
    console.log('✅ Successfully removed all extra columns!');
    console.log('📋 Removed: focus, description, photo_url_1/2/3, term_start/end, sort_order');
    console.log('📋 Dropped index: idx_council_members_sort');
    
  } catch (error) {
    console.error('❌ Failed to remove columns:', error);
    process.exit(1);
  }
}

// Run the removal
removeCouncilFields();


