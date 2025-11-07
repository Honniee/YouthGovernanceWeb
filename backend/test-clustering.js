/**
 * Test Script for Clustering System
 * Run this to verify the system works with your data
 */

import { query } from './config/database.js';
import youthClusteringService from './services/youthClusteringService.js';

async function testClustering() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🧪 CLUSTERING SYSTEM TEST');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Check validated responses
    console.log('📊 Step 1: Checking validated survey responses...\n');
    
    const responseCheck = await query(`
      SELECT 
        COUNT(*) as total,
        validation_status
      FROM "KK_Survey_Responses"
      GROUP BY validation_status
    `);
    
    console.log('Survey Response Summary:');
    responseCheck.rows.forEach(row => {
      console.log(`   ${row.validation_status}: ${row.total} responses`);
    });
    
    const validatedCount = responseCheck.rows.find(r => r.validation_status === 'validated')?.total || 0;
    
    if (validatedCount < 10) {
      console.log('\n❌ ERROR: Not enough validated responses!');
      console.log(`   Found: ${validatedCount} (minimum: 10 recommended: 50+)`);
      console.log('\n💡 Solution: Validate more survey responses first!');
      return;
    }
    
    console.log(`\n✅ Sufficient data: ${validatedCount} validated responses\n`);
    
    // Step 2: Check database tables
    console.log('📊 Step 2: Verifying clustering tables exist...\n');
    
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('Youth_Segments', 'Youth_Cluster_Assignments', 'Program_Recommendations', 'Clustering_Runs')
      ORDER BY table_name
    `);
    
    console.log('Clustering Tables:');
    tableCheck.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    if (tableCheck.rows.length < 4) {
      console.log('\n❌ ERROR: Missing clustering tables!');
      console.log('💡 Run the migration: 033_create_clustering_tables_v3_simple.sql');
      return;
    }
    
    console.log('\n✅ All clustering tables exist\n');
    
    // Step 3: Run test clustering
    console.log('📊 Step 3: Running test clustering (municipality-wide)...\n');
    console.log('⏳ This may take 10-60 seconds depending on data size...\n');
    
    const result = await youthClusteringService.runCompletePipeline('TEST_USER', {
      runType: 'manual',
      scope: 'municipality',
      barangayId: null
    });
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ TEST SUCCESSFUL!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📈 Results Summary:');
    console.log(`   Run ID: ${result.runId}`);
    console.log(`   Youth Analyzed: ${result.metrics.totalYouth}`);
    console.log(`   Segments Created: ${result.metrics.segmentsCreated}`);
    console.log(`   Programs Recommended: ${result.metrics.recommendationsGenerated}`);
    console.log(`   Silhouette Score: ${result.metrics.silhouetteScore.toFixed(4)} ${result.metrics.silhouetteScore >= 0.5 ? '✅ GOOD' : result.metrics.silhouetteScore >= 0.3 ? '⚠️ OK' : '❌ POOR'}`);
    console.log(`   Data Quality: ${(result.metrics.dataQualityScore * 100).toFixed(1)}% ${result.metrics.dataQualityScore >= 0.7 ? '✅' : '⚠️'}`);
    
    console.log('\n📊 Segments Created:');
    result.segments.forEach((seg, i) => {
      console.log(`   ${i + 1}. ${seg.name} (${seg.youthCount} youth) - Priority: ${seg.priority.toUpperCase()}`);
    });
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Check database to see the results');
    console.log('   2. Review segment profiles and recommendations');
    console.log('   3. Test the API endpoints');
    console.log('   4. Build the frontend dashboards');
    
    console.log('\n═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error('❌ TEST FAILED!');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('\nError:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check database connection');
    console.error('   2. Verify tables exist (run migration)');
    console.error('   3. Ensure validated survey responses exist');
    console.error('   4. Check console logs above for details\n');
    console.error('═══════════════════════════════════════════════════════════\n');
  }
  
  process.exit(0);
}

// Run the test
testClustering();

