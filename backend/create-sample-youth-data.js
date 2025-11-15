import { query, getClient } from './config/database.js';
import { generateId } from './utils/idGenerator.js';

/**
 * Create Sample Youth Data
 * Generates realistic, diverse youth profiles for clustering testing
 * Run this script after delete-all-youth-data.js
 */

// Sample data pools for realistic variety
const FIRST_NAMES_MALE = ['Juan', 'Miguel', 'Jose', 'Pedro', 'Carlo', 'Mark', 'John', 'Ryan', 'Kevin', 'Luis', 'Gabriel', 'Rafael', 'Daniel', 'Angelo', 'Marco'];
const FIRST_NAMES_FEMALE = ['Maria', 'Ana', 'Sofia', 'Isabel', 'Lucia', 'Elena', 'Carmen', 'Rosa', 'Angela', 'Patricia', 'Michelle', 'Jennifer', 'Nicole', 'Crystal', 'Jasmine'];
const LAST_NAMES = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Rivera', 'Gomez', 'Ramos', 'Fernandez', 'Lopez', 'Gonzales', 'Perez', 'Rodriguez', 'Dela Cruz', 'Villanueva', 'Castro', 'Santiago'];

const EDUCATIONAL_BACKGROUNDS = [
  'Elementary Level',
  'Elementary Grad',
  'High School Level',
  'High School Grad',
  'Vocational Grad',
  'College Level',
  'College Grad'
];

const WORK_STATUSES = [
  'Employed',
  'Unemployed',
  'Self-Employed',
  'Currently looking for a Job',
  'Not interested looking for a job'
];

const CIVIL_STATUSES = [
  'Single',
  'Married',
  'Widowed',
  'Separated'
];

const YOUTH_AGE_GROUPS = [
  'Child Youth (15-17 yrs old)',
  'Core Youth (18-24 yrs old)',
  'Young Adult (15-30 yrs old)'
];

// Helper functions
function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getBirthDateForAgeGroup(ageGroup) {
  const now = new Date();
  let minAge, maxAge;
  
  if (ageGroup.includes('15-17')) {
    minAge = 15;
    maxAge = 17;
  } else if (ageGroup.includes('18-24')) {
    minAge = 18;
    maxAge = 24;
  } else { // Young Adult (15-30)
    minAge = 15;
    maxAge = 30;
  }
  
  const minDate = new Date(now.getFullYear() - maxAge - 1, now.getMonth(), now.getDate());
  const maxDate = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
  
  return randomDate(minDate, maxDate);
}

function getYouthClassification(educationalBackground, workStatus, ageGroup) {
  // Logic to determine youth classification based on profile
  if (educationalBackground.includes('Level')) return 'In School Youth'; // Currently studying
  if (workStatus === 'Employed' || workStatus === 'Self-Employed') return 'Working Youth';
  if (workStatus === 'Unemployed' || workStatus.includes('looking for a Job')) {
    return 'Out of School Youth';
  }
  return 'Out of School Youth';
}

async function generateSampleYouth(barangayId, count, batchId) {
  const client = await getClient();
  const generated = [];
  
  try {
    await client.query('BEGIN');
    
    for (let i = 0; i < count; i++) {
      // Generate profile
      const gender = Math.random() > 0.5 ? 'Male' : 'Female';
      const firstName = gender === 'Male' ? randomItem(FIRST_NAMES_MALE) : randomItem(FIRST_NAMES_FEMALE);
      const lastName = randomItem(LAST_NAMES);
      const middleName = randomItem(LAST_NAMES);
      
      // CREATE VERY DISTINCT PROFILES (for better clustering quality)
      // 5 clear profile types with minimal overlap
      // NOW WITH AGE-APPROPRIATE ASSIGNMENTS!
      
      const profileType = Math.random();
      let educationalBackground, workStatus, civilStatus, youthClassification, ageGroup;
      
      if (profileType < 0.20) {
        // Profile 1: High School Students (20% - YOUNG, in school, not employed)
        ageGroup = 'Child Youth (15-17 yrs old)'; // HIGH SCHOOL AGE!
        educationalBackground = randomItem(['Elementary Level', 'High School Level']);
        workStatus = 'Unemployed';
        civilStatus = 'Single';
        youthClassification = 'In School Youth';
      } else if (profileType < 0.40) {
        // Profile 2: College Students (20% - young adults, in college, minimal work)
        ageGroup = 'Core Youth (18-24 yrs old)'; // COLLEGE AGE!
        educationalBackground = 'College Level';
        workStatus = Math.random() > 0.8 ? 'Employed' : 'Unemployed';
        civilStatus = 'Single';
        youthClassification = 'In School Youth';
      } else if (profileType < 0.60) {
        // Profile 3: Employed Graduates (20% - OLDER, working full-time)
        ageGroup = Math.random() > 0.3 ? 'Core Youth (18-24 yrs old)' : 'Young Adult (15-30 yrs old)'; // 22-30 range
        educationalBackground = randomItem(['High School Grad', 'College Grad', 'Vocational Grad']);
        workStatus = Math.random() > 0.1 ? randomItem(['Employed', 'Self-Employed']) : 'Employed';
        civilStatus = Math.random() > 0.7 ? 'Married' : 'Single';
        youthClassification = 'Working Youth';
      } else if (profileType < 0.80) {
        // Profile 4: Job Seekers (20% - unemployed, looking for work)
        ageGroup = 'Core Youth (18-24 yrs old)'; // POST-GRADUATION AGE
        educationalBackground = randomItem(['High School Grad', 'College Level']);
        workStatus = randomItem(['Unemployed', 'Currently looking for a Job']);
        civilStatus = 'Single';
        youthClassification = 'Out of School Youth';
      } else {
        // Profile 5: Part-Time Workers (20% - working while studying or partial employment)
        ageGroup = 'Core Youth (18-24 yrs old)'; // MID-RANGE AGE
        educationalBackground = randomItem(['High School Grad', 'College Level']);
        workStatus = Math.random() > 0.5 ? 'Employed' : 'Self-Employed';
        civilStatus = 'Single';
        youthClassification = Math.random() > 0.5 ? 'Working Youth' : 'In School Youth';
      }
      
      // Real-world overlaps: introduce small-probability age exceptions per profile
      if (profileType < 0.20) {
        // High School Students: some repeaters/late HS
        if (Math.random() < 0.10) ageGroup = 'Core Youth (18-24 yrs old)';
      } else if (profileType < 0.40) {
        // College: a few early/older cases
        if (Math.random() < 0.05) ageGroup = 'Child Youth (15-17 yrs old)';
        else if (Math.random() < 0.10) ageGroup = 'Young Adult (15-30 yrs old)';
      } else if (profileType < 0.60) {
        // Employed: mix of 18-24 and rare <18 workers
        if (Math.random() < 0.20) ageGroup = 'Core Youth (18-24 yrs old)';
        else if (Math.random() < 0.02) ageGroup = 'Child Youth (15-17 yrs old)';
      } else if (profileType < 0.80) {
        // Job Seekers: some minors or older job seekers
        if (Math.random() < 0.10) ageGroup = 'Child Youth (15-17 yrs old)';
        else if (Math.random() < 0.15) ageGroup = 'Young Adult (15-30 yrs old)';
      } else {
        // Part-time workers: rare minors & some older
        if (Math.random() < 0.05) ageGroup = 'Child Youth (15-17 yrs old)';
        else if (Math.random() < 0.10) ageGroup = 'Young Adult (15-30 yrs old)';
      }

      // NOW generate birth date AFTER determining (possibly adjusted) age group
      const birthDate = getBirthDateForAgeGroup(ageGroup);
      
      // Generate contact and email (fake but realistic format)
      const contactNumber = `09${Math.floor(100000000 + Math.random() * 900000000)}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 999)}@email.com`;
      
      // Calculate age from birth date
      const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
      
      // Civic engagement (strongly correlated with profile type)
      let registeredSKVoter, registeredNationalVoter, attendedKKAssembly, votedLastSK;
      
      if (profileType < 0.20) {
        // High School Students: VERY HIGH civic engagement
        registeredSKVoter = Math.random() > 0.15 ? 'Yes' : 'No'; // 85% registered
        attendedKKAssembly = Math.random() > 0.2 ? 'Yes' : 'No'; // 80% attended
        votedLastSK = registeredSKVoter === 'Yes' ? (Math.random() > 0.2 ? 'Yes' : 'No') : 'No';
      } else if (profileType < 0.40) {
        // College Students: HIGH civic engagement
        registeredSKVoter = Math.random() > 0.25 ? 'Yes' : 'No'; // 75% registered
        attendedKKAssembly = Math.random() > 0.3 ? 'Yes' : 'No'; // 70% attended
        votedLastSK = registeredSKVoter === 'Yes' ? (Math.random() > 0.3 ? 'Yes' : 'No') : 'No';
      } else if (profileType < 0.60) {
        // Employed Graduates: MEDIUM civic engagement (busy working)
        registeredSKVoter = Math.random() > 0.5 ? 'Yes' : 'No'; // 50% registered
        attendedKKAssembly = Math.random() > 0.6 ? 'Yes' : 'No'; // 40% attended
        votedLastSK = registeredSKVoter === 'Yes' ? (Math.random() > 0.5 ? 'Yes' : 'No') : 'No';
      } else if (profileType < 0.80) {
        // Job Seekers: LOW civic engagement
        registeredSKVoter = Math.random() > 0.7 ? 'Yes' : 'No'; // 30% registered
        attendedKKAssembly = Math.random() > 0.75 ? 'Yes' : 'No'; // 25% attended
        votedLastSK = registeredSKVoter === 'Yes' ? (Math.random() > 0.6 ? 'Yes' : 'No') : 'No';
      } else {
        // Part-Time Workers: MEDIUM-HIGH civic engagement
        registeredSKVoter = Math.random() > 0.35 ? 'Yes' : 'No'; // 65% registered
        attendedKKAssembly = Math.random() > 0.45 ? 'Yes' : 'No'; // 55% attended
        votedLastSK = registeredSKVoter === 'Yes' ? (Math.random() > 0.4 ? 'Yes' : 'No') : 'No';
      }
      
      registeredNationalVoter = (ageGroup.includes('18-24') || ageGroup.includes('15-30')) && age >= 18
        ? (Math.random() > 0.2 ? 'Yes' : 'No') // 80% of eligible age
        : 'No';
        
      // Determine times_attended based on civic engagement
      let timesAttended = null;
      if (attendedKKAssembly === 'Yes') {
        if (profileType < 0.20) {
          // High School Students: Very active (5+)
          timesAttended = Math.random() > 0.3 ? '5 and above' : '3-4 Times';
        } else if (profileType < 0.40) {
          // College Students: Active (3-4 or 5+)
          timesAttended = Math.random() > 0.5 ? '3-4 Times' : '5 and above';
        } else if (profileType < 0.60) {
          // Employed: Less active (1-2 or 3-4)
          timesAttended = Math.random() > 0.6 ? '1-2 Times' : '3-4 Times';
        } else {
          // Others: Varied (1-2 to 3-4)
          timesAttended = Math.random() > 0.7 ? '1-2 Times' : '3-4 Times';
        }
      }
        
      // Determine reason_not_attended
      let reasonNotAttended = null;
      if (attendedKKAssembly === 'No') {
        if (profileType < 0.60) {
          // Students/Workers: No meeting
          reasonNotAttended = 'There was no KK Assembly Meeting';
        } else {
          // Job Seekers: Not interested
          reasonNotAttended = Math.random() > 0.5 ? 'Not interested to Attend' : 'There was no KK Assembly Meeting';
        }
      }
  
      // 1. Create Youth Profile
      const youthId = await generateId('YTH');
      await client.query(`
        INSERT INTO "Youth_Profiling" (
          youth_id, barangay_id, last_name, first_name, middle_name,
          birth_date, age, gender, contact_number, email, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      `, [youthId, barangayId, lastName, firstName, middleName, birthDate, age, gender, contactNumber, email]);
      
      // Convert 'Yes'/'No' strings to boolean for database
      const registeredSKVoterBool = registeredSKVoter === 'Yes' ? true : (registeredSKVoter === 'No' ? false : null);
      const registeredNationalVoterBool = registeredNationalVoter === 'Yes' ? true : (registeredNationalVoter === 'No' ? false : null);
      const attendedKKAssemblyBool = attendedKKAssembly === 'Yes' ? true : (attendedKKAssembly === 'No' ? false : null);
      const votedLastSKBool = votedLastSK === 'Yes' ? true : (votedLastSK === 'No' ? false : null);
      
      // 2. Create Survey Response
      const responseId = await generateId('RES');
      await client.query(`
        INSERT INTO "KK_Survey_Responses" (
          response_id, youth_id, barangay_id, batch_id,
          youth_age_group, educational_background, work_status, civil_status,
          youth_classification, registered_sk_voter, registered_national_voter,
          attended_kk_assembly, voted_last_sk, times_attended, reason_not_attended,
          validation_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'validated', CURRENT_TIMESTAMP)
      `, [
        responseId, youthId, barangayId, batchId,
        ageGroup, educationalBackground, workStatus, civilStatus,
        youthClassification, registeredSKVoterBool, registeredNationalVoterBool,
        attendedKKAssemblyBool, votedLastSKBool, timesAttended, reasonNotAttended
      ]);
      
      generated.push({ youthId, responseId, name: `${firstName} ${lastName}`, barangay: barangayId });
    }
    
    await client.query('COMMIT');
    return generated;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('🎲 CREATING SAMPLE YOUTH DATA');
  console.log('═'.repeat(60));
  
  const YOUTH_PER_BARANGAY = 40; // Maximum sample size for highest clustering quality
  const BATCH_ID = 'BAT999';
  
  try {
    // Get all barangays
    console.log('\n📊 Step 1: Fetching barangays...');
    const barangays = await query('SELECT barangay_id, barangay_name FROM "Barangay" ORDER BY barangay_name');
    console.log(`✅ Found ${barangays.rows.length} barangays`);
    
    // Check if BAT999 exists, create if not
    console.log('\n📊 Step 2: Checking batch...');
    const batchCheck = await query('SELECT batch_id FROM "KK_Survey_Batches" WHERE batch_id = $1', [BATCH_ID]);
    if (batchCheck.rows.length === 0) {
      console.log('⚠️  Batch BAT999 not found, creating it...');
      await query(`
        INSERT INTO "KK_Survey_Batches" (
          batch_id, batch_name, start_date, end_date, status, created_by
        ) VALUES ($1, 'Sample Data Batch', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', 'active', 'LYDO001')
      `, [BATCH_ID]);
      console.log('✅ Batch BAT999 created');
    } else {
      console.log('✅ Batch BAT999 exists');
    }
    
    // Generate youth for each barangay
    console.log('\n📊 Step 3: Generating sample youth...');
    console.log(`   Creating ${YOUTH_PER_BARANGAY} youth per barangay...`);
    console.log('');
    
    let totalGenerated = 0;
    
    for (const barangay of barangays.rows) {
      process.stdout.write(`   📍 ${barangay.barangay_name.padEnd(20)} ... `);
      
      const generated = await generateSampleYouth(barangay.barangay_id, YOUTH_PER_BARANGAY, BATCH_ID);
      totalGenerated += generated.length;
      
      console.log(`✅ ${generated.length} youth created`);
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ SAMPLE DATA CREATION COMPLETE!');
    console.log('═'.repeat(60));
    console.log(`   Total Barangays: ${barangays.rows.length}`);
    console.log(`   Youth per Barangay: ${YOUTH_PER_BARANGAY}`);
    console.log(`   Total Youth Created: ${totalGenerated}`);
    console.log(`   Batch ID: ${BATCH_ID}`);
    console.log('═'.repeat(60));
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Go to Segmentation tab in frontend');
    console.log('   2. Select "All Batches" or "BAT999"');
    console.log('   3. Click "Run Clustering"');
    console.log('   4. Watch optimal K selection pick k=3 or k=4! 🎉');
    console.log('');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n' + '═'.repeat(60));
    console.error('❌ ERROR CREATING SAMPLE DATA');
    console.error('═'.repeat(60));
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

main();


