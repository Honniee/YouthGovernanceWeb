import dotenv from 'dotenv';
dotenv.config();
import { query, getClient } from './config/database.js';
import youthClusteringService from './services/youthClusteringService.js';

async function testBatchClustering() {
  console.log('\n' + '═'.repeat(50));
  console.log('🧪 BATCH CLUSTERING SYSTEM TEST');
  console.log('═'.repeat(50));

  const client = await getClient();
  try {
    // Step 1: Check if batch_id column exists
    console.log('\n📊 Step 1: Verifying batch support...');
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Youth_Segments' 
        AND column_name = 'batch_id'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.error('❌ Batch support not installed!');
      console.log('\n💡 Run this migration first:');
      console.log('   psql -U postgres -d youth_governance -f database/migrations/034_add_batch_support_to_clustering.sql');
      throw new Error('Please run batch support migration first.');
    }
    console.log('✅ Batch support installed (batch_id column exists)');

    // Step 2: Check available batches
    console.log('\n📊 Step 2: Checking available survey batches...');
    const batchResult = await query(`
      SELECT 
        b.batch_id,
        b.batch_name,
        COUNT(DISTINCT r.response_id) as response_count
      FROM "KK_Survey_Batches" b
      LEFT JOIN "KK_Survey_Responses" r ON b.batch_id = r.batch_id
      WHERE r.validation_status = 'validated'
      GROUP BY b.batch_id, b.batch_name
      ORDER BY b.batch_id
    `);

    if (batchResult.rows.length === 0) {
      console.log('⚠️  No survey batches found with validated responses.');
      console.log('\n💡 Your responses might not be assigned to batches yet.');
      console.log('   You can still test with batchId=null (all batches)');
    } else {
      console.log(`✅ Found ${batchResult.rows.length} batches with validated responses:`);
      batchResult.rows.forEach(batch => {
        console.log(`   - ${batch.batch_id}: ${batch.batch_name} (${batch.response_count} responses)`);
      });
    }

    // Step 3: Test clustering ALL batches (batchId = null)
    console.log('\n📊 Step 3: Testing clustering for ALL batches...');
    console.log('⏳ Running clustering (batchId=null)...\n');

    const allBatchesResult = await youthClusteringService.runCompletePipeline('TEST_USER', {
      scope: 'municipality',
      runType: 'manual',
      batchId: null // Cluster all batches
    });

    console.log('\n✅ All Batches Clustering Complete!');
    console.log(`   Run ID: ${allBatchesResult.runId}`);
    console.log(`   Youth: ${allBatchesResult.metrics.totalYouth}`);
    console.log(`   Segments: ${allBatchesResult.metrics.segmentsCreated}`);
    console.log(`   Silhouette: ${allBatchesResult.metrics.silhouetteScore.toFixed(4)}`);

    // Step 4: If batches exist, test clustering specific batch
    if (batchResult.rows.length > 0) {
      // Find batch with at least 10 responses
      const suitableBatch = batchResult.rows.find(b => b.response_count >= 10) || batchResult.rows[batchResult.rows.length - 1];
      console.log(`\n📊 Step 4: Testing clustering for specific batch (${suitableBatch.batch_id})...`);
      console.log(`⏳ Running clustering for batch: ${suitableBatch.batch_name} (${suitableBatch.response_count} responses)...\n`);

      const batchSpecificResult = await youthClusteringService.runCompletePipeline('TEST_USER', {
        scope: 'municipality',
        runType: 'manual',
        batchId: suitableBatch.batch_id // Cluster specific batch
      });

      console.log(`\n✅ Batch-Specific Clustering Complete!`);
      console.log(`   Run ID: ${batchSpecificResult.runId}`);
      console.log(`   Batch: ${suitableBatch.batch_name}`);
      console.log(`   Youth: ${batchSpecificResult.metrics.totalYouth}`);
      console.log(`   Segments: ${batchSpecificResult.metrics.segmentsCreated}`);
      console.log(`   Silhouette: ${batchSpecificResult.metrics.silhouetteScore.toFixed(4)}`);
    } else {
      console.log('\n⏭️  Step 4: Skipped (no batches with validated responses)');
    }

    // Step 5: Verify segments in database
    console.log('\n📊 Step 5: Verifying segments in database...');
    const segmentCheck = await query(`
      SELECT 
        segment_id,
        segment_name,
        youth_count,
        scope,
        barangay_id,
        batch_id,
        is_active
      FROM "Youth_Segments"
      WHERE is_active = true
      ORDER BY batch_id NULLS FIRST, cluster_number
    `);

    console.log(`\n✅ Found ${segmentCheck.rows.length} active segments:`);
    
    // Group by batch
    const allBatchesSegments = segmentCheck.rows.filter(s => !s.batch_id);
    const batchSpecificSegments = segmentCheck.rows.filter(s => s.batch_id);
    
    if (allBatchesSegments.length > 0) {
      console.log(`\n   📊 All Batches (batch_id = NULL):`);
      allBatchesSegments.forEach(seg => {
        console.log(`      - ${seg.segment_name} (${seg.youth_count} youth)`);
      });
    }
    
    if (batchSpecificSegments.length > 0) {
      const batches = [...new Set(batchSpecificSegments.map(s => s.batch_id))];
      batches.forEach(batchId => {
        const batchSegs = batchSpecificSegments.filter(s => s.batch_id === batchId);
        console.log(`\n   📊 Batch ${batchId}:`);
        batchSegs.forEach(seg => {
          console.log(`      - ${seg.segment_name} (${seg.youth_count} youth)`);
        });
      });
    }

    console.log('\n' + '═'.repeat(50));
    console.log('✅ BATCH CLUSTERING TEST SUCCESSFUL!');
    console.log('═'.repeat(50));

    console.log('\n💡 Next Steps:');
    console.log('   1. ✅ Batch support is working!');
    console.log('   2. Compare segments across batches in your thesis');
    console.log('   3. Build frontend with batch selection dropdown');
    console.log('   4. Use per-batch clustering for temporal analysis');

  } catch (error) {
    console.error('\n' + '═'.repeat(50));
    console.error('❌ BATCH CLUSTERING TEST FAILED!');
    console.error('═'.repeat(50));
    console.error('Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure batch support migration was run');
    console.error('   2. Check if your responses have batch_id assigned');
    console.error('   3. Verify KK_Survey_Batches table exists');
    console.error('═'.repeat(50));
    process.exit(1);
  } finally {
    await client.release();
    process.exit(0);
  }
}

testBatchClustering();

