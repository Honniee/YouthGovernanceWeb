import { getClient } from '../config/database.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * Create sample validation queue data for testing
 * This script creates:
 * 1. Sample youth profiles
 * 2. Sample survey responses with pending status
 * 3. Validation queue entries with various match types
 */
async function createSampleValidationQueue() {
  const client = await getClient();
  
  try {
    console.log('🔄 Creating sample validation queue data...');
    
    // Get an active survey batch (or create one if none exists)
    const batchResult = await client.query(`
      SELECT batch_id, batch_name 
      FROM "KK_Survey_Batches" 
      WHERE status = 'active' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    let batch_id;
    if (batchResult.rows.length === 0) {
      console.log('⚠️ No active survey batch found. Creating one...');
      batch_id = await generateId('BAT');
      await client.query(`
        INSERT INTO "KK_Survey_Batches" (
          batch_id, batch_name, description, start_date, end_date,
          target_age_min, target_age_max, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        batch_id,
        'Sample Test Batch',
        'Test batch for validation queue',
        new Date().toISOString().split('T')[0],
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        15,
        30,
        'active'
      ]);
      console.log(`✅ Created active batch: ${batch_id}`);
    } else {
      batch_id = batchResult.rows[0].batch_id;
      console.log(`✅ Using existing active batch: ${batch_id} (${batchResult.rows[0].batch_name})`);
    }
    
    // Get a sample barangay
    const barangayResult = await client.query(`
      SELECT barangay_id FROM "Barangay" LIMIT 1
    `);
    
    if (barangayResult.rows.length === 0) {
      throw new Error('No barangays found. Please run dummy_data_postgresql.sql first.');
    }
    
    const barangay_id = barangayResult.rows[0].barangay_id;
    console.log(`✅ Using barangay: ${barangay_id}`);
    
    // Sample youth data with different validation scenarios
    // Includes all match types: exact, strong, partial, weak, none, existing_youth
    const sampleYouth = [
      {
        first_name: 'Juan',
        last_name: 'Delos Santos',
        middle_name: 'Cruz',
        suffix: null,
        birth_date: '2000-05-15',
        gender: 'Male',
        age: 23,
        contact_number: '09123456789',
        email: 'juan.delos.santos@email.com',
        voter_match_type: 'exact',
        validation_score: 100,
        purok_zone: 'Zone 1'
      },
      {
        first_name: 'Maria',
        last_name: 'Garcia',
        middle_name: 'Lopez',
        suffix: 'Jr.',
        birth_date: '1998-11-20',
        gender: 'Female',
        age: 25,
        contact_number: '09234567890',
        email: 'maria.garcia.lopez@email.com',
        voter_match_type: 'strong',
        validation_score: 90,
        purok_zone: 'Zone 2'
      },
      {
        first_name: 'Pedro',
        last_name: 'Reyes',
        middle_name: null,
        suffix: 'III',
        birth_date: '2002-03-10',
        gender: 'Male',
        age: 21,
        contact_number: '09345678901',
        email: 'pedro.reyes@email.com',
        voter_match_type: 'partial',
        validation_score: 75,
        purok_zone: 'Zone 3'
      },
      {
        first_name: 'Ana',
        last_name: 'Torres',
        middle_name: 'Santos',
        suffix: null,
        birth_date: '1999-08-25',
        gender: 'Female',
        age: 24,
        contact_number: '09456789012',
        email: 'ana.torres@email.com',
        voter_match_type: 'weak',
        validation_score: 50,
        purok_zone: 'Zone 4'
      },
      {
        first_name: 'Carlos',
        last_name: 'Villanueva',
        middle_name: 'Dela Cruz',
        suffix: 'Sr.',
        birth_date: '2001-12-05',
        gender: 'Male',
        age: 22,
        contact_number: '09567890123',
        email: 'carlos.villanueva@email.com',
        voter_match_type: 'none',
        validation_score: 0,
        purok_zone: 'Zone 5'
      },
      {
        first_name: 'Sofia',
        last_name: 'Mendoza',
        middle_name: null,
        suffix: null,
        birth_date: '2000-07-18',
        gender: 'Female',
        age: 23,
        contact_number: '09678901234',
        email: 'sofia.mendoza@email.com',
        voter_match_type: 'existing_youth',
        validation_score: 95,
        purok_zone: 'Zone 6'
      },
      {
        first_name: 'Jose',
        last_name: 'Fernandez',
        middle_name: 'Ramos',
        suffix: null,
        birth_date: '1997-04-30',
        gender: 'Male',
        age: 26,
        contact_number: '09789012345',
        email: 'jose.fernandez@email.com',
        voter_match_type: 'partial',
        validation_score: 65,
        purok_zone: 'Zone 7'
      },
      {
        first_name: 'Carmen',
        last_name: 'Aquino',
        middle_name: 'Perez',
        suffix: 'Jr.',
        birth_date: '2003-01-12',
        gender: 'Female',
        age: 20,
        contact_number: '09890123456',
        email: 'carmen.aquino@email.com',
        voter_match_type: 'strong',
        validation_score: 85,
        purok_zone: 'Zone 8'
      },
      {
        first_name: 'Miguel',
        last_name: 'Bautista',
        middle_name: 'Cruz',
        suffix: null,
        birth_date: '1999-02-14',
        gender: 'Male',
        age: 24,
        contact_number: '09901234567',
        email: 'miguel.bautista@email.com',
        voter_match_type: 'weak',
        validation_score: 45,
        purok_zone: 'Zone 9'
      },
      {
        first_name: 'Isabel',
        last_name: 'Rivera',
        middle_name: 'Flores',
        suffix: null,
        birth_date: '2001-09-08',
        gender: 'Female',
        age: 22,
        contact_number: '09012345678',
        email: 'isabel.rivera@email.com',
        voter_match_type: 'none',
        validation_score: 0,
        purok_zone: 'Zone 10'
      },
      {
        first_name: 'Rafael',
        last_name: 'Gomez',
        middle_name: null,
        suffix: 'II',
        birth_date: '1998-06-22',
        gender: 'Male',
        age: 25,
        contact_number: '09123456780',
        email: 'rafael.gomez@email.com',
        voter_match_type: 'partial',
        validation_score: 70,
        purok_zone: 'Zone 11'
      },
      {
        first_name: 'Lucia',
        last_name: 'Castro',
        middle_name: 'Santiago',
        suffix: null,
        birth_date: '2002-11-30',
        gender: 'Female',
        age: 21,
        contact_number: '09234567801',
        email: 'lucia.castro@email.com',
        voter_match_type: 'exact',
        validation_score: 100,
        purok_zone: 'Zone 12'
      }
    ];
    
    console.log(`\n📝 Creating ${sampleYouth.length} sample validation queue items...\n`);
    
    for (const youth of sampleYouth) {
      try {
        await client.query('BEGIN');
        
        // Generate IDs (response/queue always new)
        let youth_id;
        let user_id;
        const response_id = await generateId('RES');
        const queue_id = await generateId('QUE');
        
        // Check if youth already exists (by name + birth date)
        const existingCheck = await client.query(`
          SELECT youth_id FROM "Youth_Profiling"
          WHERE first_name = $1 
            AND last_name = $2 
            AND birth_date = $3
        `, [youth.first_name, youth.last_name, youth.birth_date]);
        
        if (existingCheck.rows.length > 0) {
          youth_id = existingCheck.rows[0].youth_id;
          console.log(`ℹ️ Using existing youth ${youth.first_name} ${youth.last_name} (${youth_id})`);
        } else {
          // Create new youth profile
          youth_id = await generateId('YTH');
          user_id = await generateId('USR');
          await client.query(`
            INSERT INTO "Youth_Profiling" (
              youth_id, first_name, last_name, middle_name, suffix,
              age, gender, contact_number, email, barangay_id, purok_zone, birth_date,
              is_active, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          `, [
            youth_id,
            youth.first_name,
            youth.last_name,
            youth.middle_name,
            youth.suffix,
            youth.age,
            youth.gender,
            youth.contact_number,
            youth.email,
            barangay_id,
            youth.purok_zone,
            youth.birth_date,
            true,
            new Date()
          ]);
          
          // Create user account
          await client.query(`
            INSERT INTO "Users" (user_id, youth_id, user_type)
            VALUES ($1, $2, $3)
          `, [user_id, youth_id, 'youth']);
        }
        
        // Create survey response with pending status
        await client.query(`
          INSERT INTO "KK_Survey_Responses" (
            response_id, batch_id, youth_id, barangay_id,
            civil_status, youth_classification, youth_specific_needs, youth_age_group,
            educational_background, work_status,
            registered_SK_voter, registered_national_voter, attended_KK_assembly,
            voted_last_SK, times_attended, reason_not_attended,
            validation_status, validation_tier,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `, [
          response_id,
          batch_id,
          youth_id,
          barangay_id,
          'Single',
          'In School Youth',
          null,
          youth.age >= 18 && youth.age <= 24 ? 'Core Youth (18-24 yrs old)' : youth.age >= 15 && youth.age <= 17 ? 'Child Youth (15-17 yrs old)' : 'Young Adult (15-30 yrs old)',
          'High School Level',
          'Unemployed',
          true,
          false,
          true,
          true,
          '1-2 Times',
          null,
          'pending', // Pending status - requires manual validation
          'manual',
          new Date()
        ]);
        
        // Create validation queue entry
        await client.query(`
          INSERT INTO "Validation_Queue" (
            queue_id, response_id, youth_id, voter_match_type, validation_score,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          queue_id,
          response_id,
          youth_id,
          youth.voter_match_type,
          youth.validation_score,
          new Date(),
          new Date()
        ]);
        
        await client.query('COMMIT');
        
        console.log(`✅ Created: ${youth.first_name} ${youth.last_name} (${youth.voter_match_type} match, score: ${youth.validation_score}%)`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error creating ${youth.first_name} ${youth.last_name}:`, error.message);
      }
    }
    
    console.log('\n✅ Sample validation queue data created successfully!');
    console.log('📊 You can now view the Validation Queue page in the admin dashboard.\n');
    
  } catch (error) {
    console.error('❌ Error creating sample validation queue:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
createSampleValidationQueue()
  .then(() => {
    console.log('✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });


