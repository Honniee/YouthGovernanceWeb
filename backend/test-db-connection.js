import { query } from './config/database.js';

async function testConnection() {
  try {
    console.log('🔄 Testing database connection...');
    
    // Test basic connection
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully');
    console.log('📅 Current time:', result.rows[0].current_time);
    
    // Check if Activity_Logs table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Activity_Logs'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Activity_Logs table exists');
      
      // Count existing logs
      const countResult = await query('SELECT COUNT(*) as total FROM "Activity_Logs"');
      console.log('📊 Total activity logs:', countResult.rows[0].total);
      
      // Show sample data if any exists
      if (parseInt(countResult.rows[0].total) > 0) {
        const sampleResult = await query('SELECT * FROM "Activity_Logs" ORDER BY created_at DESC LIMIT 3');
        console.log('📋 Sample logs:');
        sampleResult.rows.forEach((log, i) => {
          console.log(`  ${i + 1}. ${log.action} - ${log.category} - ${log.success ? 'Success' : 'Failed'}`);
        });
      } else {
        console.log('📝 No activity logs found - will insert sample data');
        await insertSampleData();
      }
    } else {
      console.log('❌ Activity_Logs table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

async function insertSampleData() {
  console.log('🔄 Inserting sample activity logs...');
  
  const sampleLogs = [
    {
      user_id: 'ADM001',
      user_type: 'admin',
      action: 'create_batch',
      resource_type: 'survey',
      resource_id: 'BATCH1001',
      resource_name: 'KK Survey 2024 Q3',
      details: JSON.stringify({ fields: ['batchName', 'startDate', 'endDate'], createdBy: 'ADM001' }),
      category: 'Survey Management',
      success: true,
      error_message: null
    },
    {
      user_id: 'STF045',
      user_type: 'lydo_staff',
      action: 'export_data',
      resource_type: 'survey',
      resource_id: 'BATCH0998',
      resource_name: 'Youth Employment Survey',
      details: JSON.stringify({ format: 'csv', rowCount: 523 }),
      category: 'Data Export',
      success: true,
      error_message: null
    },
    {
      user_id: 'SK012',
      user_type: 'sk_official',
      action: 'login',
      resource_type: 'auth',
      resource_id: null,
      resource_name: null,
      details: JSON.stringify({ ip: '203.0.113.15', userAgent: 'Chrome/125' }),
      category: 'Authentication',
      success: true,
      error_message: null
    },
    {
      user_id: 'STF052',
      user_type: 'lydo_staff',
      action: 'update_user',
      resource_type: 'user',
      resource_id: 'USR7782',
      resource_name: 'Santos, Maria',
      details: JSON.stringify({ updated: ['role', 'email'], prevRole: 'staff', newRole: 'admin' }),
      category: 'User Management',
      success: true,
      error_message: null
    },
    {
      user_id: 'STF033',
      user_type: 'lydo_staff',
      action: 'bulk_import',
      resource_type: 'youth',
      resource_id: null,
      resource_name: 'Voters List Import',
      details: JSON.stringify({ file: 'voters_list_q3.csv', inserted: 1200, skipped: 15 }),
      category: 'Data Management',
      success: true,
      error_message: null
    },
    {
      user_id: 'STF033',
      user_type: 'lydo_staff',
      action: 'bulk_import',
      resource_type: 'youth',
      resource_id: null,
      resource_name: 'Voters List Import',
      details: JSON.stringify({ file: 'voters_list_q3_part2.csv' }),
      category: 'Data Management',
      success: false,
      error_message: 'Duplicate entries detected in input file'
    },
    {
      user_id: null,
      user_type: 'anonymous',
      action: 'submit_survey',
      resource_type: 'survey',
      resource_id: 'BATCH1001',
      resource_name: 'KK Survey 2024 Q3',
      details: JSON.stringify({ age: 19, barangay: 'San Jose Centro' }),
      category: 'Survey Management',
      success: true,
      error_message: null
    },
    {
      user_id: 'ADM001',
      user_type: 'admin',
      action: 'system_config_update',
      resource_type: 'system',
      resource_id: null,
      resource_name: 'Rate Limiter',
      details: JSON.stringify({ requestsPerMinute: 200, burst: 50 }),
      category: 'System Management',
      success: true,
      error_message: null
    }
  ];

  try {
    for (const log of sampleLogs) {
      const logId = `LOG${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      const insertQuery = `
        INSERT INTO "Activity_Logs" (
          log_id, user_id, user_type, action, resource_type, 
          resource_id, resource_name, details, category, 
          created_at, success, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10, $11)
      `;
      
      const values = [
        logId,
        log.user_id,
        log.user_type,
        log.action,
        log.resource_type,
        log.resource_id,
        log.resource_name,
        log.details,
        log.category,
        log.success,
        log.error_message
      ];
      
      await query(insertQuery, values);
      console.log(`✅ Inserted log: ${logId} - ${log.action}`);
    }
    
    console.log(`🎉 Successfully inserted ${sampleLogs.length} sample activity logs!`);
    
  } catch (error) {
    console.error('❌ Error inserting sample logs:', error.message);
  }
}

// Run the test
testConnection()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

