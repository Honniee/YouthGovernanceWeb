#!/usr/bin/env node

/**
 * Debug script to check Users table entries for Staff members
 * Run with: node debug_users_table.js
 */

import { query } from './config/database.js';

async function checkUsersTableForStaff() {
  console.log('🔍 Checking Users table entries for Staff members...\n');

  try {
    // 1. Check recent LYDO entries
    console.log('📊 Recent LYDO staff entries (last 10):');
    const lydoResult = await query(`
      SELECT l.lydo_id, l.first_name, l.last_name, l.personal_email, l.created_at,
             r.role_name
      FROM "LYDO" l
      LEFT JOIN "Roles" r ON l.role_id = r.role_id  
      WHERE l.role_id IN ('ROL001', 'ROL002')
      ORDER BY l.created_at DESC 
      LIMIT 10
    `);
    
    lydoResult.rows.forEach(row => {
      console.log(`  - ${row.lydo_id}: ${row.first_name} ${row.last_name} (${row.role_name}) - ${row.created_at}`);
    });

    // 2. Check corresponding Users table entries
    console.log('\n👤 Corresponding Users table entries:');
    const usersResult = await query(`
      SELECT u.user_id, u.user_type, u.lydo_id, u.created_at,
             l.first_name, l.last_name
      FROM "Users" u
      LEFT JOIN "LYDO" l ON u.lydo_id = l.lydo_id
      WHERE u.lydo_id IS NOT NULL
      ORDER BY u.created_at DESC 
      LIMIT 10
    `);
    
    if (usersResult.rows.length === 0) {
      console.log('  ❌ No Users table entries found for LYDO staff!');
    } else {
      usersResult.rows.forEach(row => {
        console.log(`  - ${row.user_id}: ${row.first_name} ${row.last_name} (${row.lydo_id}, ${row.user_type}) - ${row.created_at}`);
      });
    }

    // 3. Find LYDO entries WITHOUT Users table entries
    console.log('\n❗ LYDO staff without Users table entries:');
    const missingUsersResult = await query(`
      SELECT l.lydo_id, l.first_name, l.last_name, l.created_at, r.role_name
      FROM "LYDO" l
      LEFT JOIN "Users" u ON l.lydo_id = u.lydo_id
      LEFT JOIN "Roles" r ON l.role_id = r.role_id
      WHERE u.user_id IS NULL 
        AND l.role_id IN ('ROL001', 'ROL002')
        AND l.is_active = true
      ORDER BY l.created_at DESC
    `);
    
    if (missingUsersResult.rows.length === 0) {
      console.log('  ✅ All LYDO staff have Users table entries');
    } else {
      console.log(`  ❌ Found ${missingUsersResult.rows.length} LYDO staff without Users entries:`);
      missingUsersResult.rows.forEach(row => {
        console.log(`    - ${row.lydo_id}: ${row.first_name} ${row.last_name} (${row.role_name}) - ${row.created_at}`);
      });
    }

    // 4. Check user_id sequence
    console.log('\n🔢 Recent User ID sequence:');
    const userIdResult = await query(`
      SELECT user_id, user_type, lydo_id, sk_id, created_at
      FROM "Users" 
      ORDER BY user_id DESC 
      LIMIT 5
    `);
    
    if (userIdResult.rows.length === 0) {
      console.log('  ❌ No Users found in Users table!');
    } else {
      userIdResult.rows.forEach(row => {
        console.log(`  - ${row.user_id}: ${row.user_type} (LYDO: ${row.lydo_id}, SK: ${row.sk_id}) - ${row.created_at}`);
      });
    }

    // 5. Summary
    console.log('\n📊 Summary:');
    console.log(`  - Total LYDO staff: ${lydoResult.rows.length > 0 ? lydoResult.rows.length : 'None found'}`);
    console.log(`  - Total Users entries: ${usersResult.rows.length > 0 ? usersResult.rows.length : 'None found'}`);
    console.log(`  - Missing Users entries: ${missingUsersResult.rows.length}`);

    console.log('\n✅ Users table check completed!');

  } catch (error) {
    console.error('❌ Users table check failed:', error);
  }

  process.exit(0);
}

checkUsersTableForStaff();
