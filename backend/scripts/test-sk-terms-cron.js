/**
 * Test script for SK Terms Auto-Update Service
 * Tests the cron job functionality and manual triggers
 */

import dotenv from 'dotenv';
import skTermsAutoUpdateService from '../services/skTermsAutoUpdateService.js';

dotenv.config();

console.log('\n🧪 Testing SK Terms Auto-Update Service\n');
console.log('=' .repeat(50));

// Test 1: Check cron job status
console.log('\n1️⃣ Checking Cron Job Status...');
const status = skTermsAutoUpdateService.getStatus();
console.log('Status:', JSON.stringify(status, null, 2));

// Test 2: Check pending updates
console.log('\n2️⃣ Checking Pending Status Updates...');
try {
  const pending = await skTermsAutoUpdateService.getPendingStatusUpdates();
  console.log(`Found ${pending.length} terms needing updates:`);
  pending.forEach(term => {
    console.log(`  - ${term.term_name} (${term.status}): ${term.required_action}`);
  });
} catch (error) {
  console.error('❌ Error checking pending updates:', error.message);
}

// Test 3: Manual trigger (if requested)
const args = process.argv.slice(2);
if (args.includes('--run')) {
  console.log('\n3️⃣ Running Manual Status Update...');
  try {
    const result = await skTermsAutoUpdateService.triggerManualUpdate();
    if (result.success) {
      console.log('✅ Manual update completed successfully!');
      console.log(`   Activated: ${result.changes.activated.length}`);
      console.log(`   Completed: ${result.changes.completed.length}`);
      if (result.changes.activated.length > 0) {
        console.log('\n   Activated terms:');
        result.changes.activated.forEach(term => {
          console.log(`     - ${term.term_name} (${term.term_id})`);
        });
      }
      if (result.changes.completed.length > 0) {
        console.log('\n   Completed terms:');
        result.changes.completed.forEach(term => {
          console.log(`     - ${term.term_name} (${term.term_id})`);
        });
      }
    } else {
      console.error('❌ Manual update failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error running manual update:', error.message);
  }
} else {
  console.log('\n3️⃣ To run manual update, use: node test-sk-terms-cron.js --run');
}

// Test 4: Check if cron is enabled
console.log('\n4️⃣ Cron Job Configuration...');
const isEnabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_SK_TERMS_CRON === 'true';
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   ENABLE_SK_TERMS_CRON: ${process.env.ENABLE_SK_TERMS_CRON || 'not set'}`);
console.log(`   Cron Enabled: ${isEnabled ? '✅ Yes' : '❌ No'}`);
console.log(`   Schedule: ${process.env.SK_TERMS_CRON_SCHEDULE || '0 0 * * *'} (Daily at midnight)`);

console.log('\n' + '='.repeat(50));
console.log('✅ Test completed!\n');

