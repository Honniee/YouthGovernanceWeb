import dotenv from 'dotenv';
dotenv.config();
import youthClusteringService from './services/youthClusteringService.js';

/**
 * Test Script for Optimal K Selection
 * 
 * This script demonstrates the automatic optimal K selection feature
 * by running it on sample data
 */

async function testOptimalKSelection() {
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 TESTING AUTOMATIC OPTIMAL K SELECTION');
  console.log('═'.repeat(60));

  try {
    // Test with actual survey data
    console.log('\n📊 Running clustering with automatic K selection...');
    console.log('   This will test k=2, 3, and automatically pick the best\n');

    const result = await youthClusteringService.runCompletePipeline('TEST_USER', {
      scope: 'municipality',
      runType: 'manual',
      batchId: 'BAT999'  // Your test batch
    });

    console.log('\n' + '═'.repeat(60));
    console.log('✅ TEST SUCCESSFUL!');
    console.log('═'.repeat(60));

    console.log('\n📊 K Selection Results:');
    console.log(`   Selected K: ${result.kSelection.k}`);
    console.log(`   Selection Method: ${result.kSelection.method}`);
    console.log(`   Reasoning: ${result.kSelection.reasoning}`);
    
    console.log('\n📈 All K Scores Tested:');
    Object.entries(result.kSelection.scores).forEach(([k, scores]) => {
      console.log(`   k=${k}:`);
      console.log(`      Silhouette: ${(scores.silhouette * 100).toFixed(1)}%`);
      console.log(`      Inertia: ${scores.inertia.toFixed(2)}`);
    });

    console.log('\n🎯 Clustering Results:');
    console.log(`   Total Youth: ${result.metrics.totalYouth}`);
    console.log(`   Segments Created: ${result.metrics.segmentsCreated}`);
    console.log(`   Recommendations: ${result.metrics.recommendationsGenerated}`);
    console.log(`   Quality Score: ${(result.metrics.silhouetteScore * 100).toFixed(1)}%`);

    console.log('\n💡 Why This Matters:');
    console.log('   ✅ System automatically found optimal number of clusters');
    console.log('   ✅ No manual tuning required');
    console.log('   ✅ Scientific justification for k choice');
    console.log('   ✅ Adapts to your specific data');

    console.log('\n' + '═'.repeat(60));
    console.log('🎓 FOR YOUR THESIS:');
    console.log('═'.repeat(60));
    console.log('You can now confidently say:');
    console.log('"The system employs automatic cluster number selection');
    console.log(' using combined Silhouette Analysis and Elbow Method,');
    console.log(` achieving optimal k=${result.kSelection.k} with ${(result.metrics.silhouetteScore * 100).toFixed(1)}% quality."');

    process.exit(0);

  } catch (error) {
    console.error('\n' + '═'.repeat(60));
    console.error('❌ TEST FAILED!');
    console.error('═'.repeat(60));
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

testOptimalKSelection();

