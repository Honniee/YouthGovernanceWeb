import { kmeans } from 'ml-kmeans';
import { query, getClient } from '../config/database.js';
import { generateId } from '../utils/idGenerator.js';
import dataQualityService from './dataQualityService.js';
import segmentAnalysisService from './segmentAnalysisService.js';
import recommendationService from './recommendationService.js';
import logger from '../utils/logger.js';

/**
 * Youth Clustering Service
 * Implements K-Means clustering for youth segmentation
 * 
 * ALGORITHM: K-Means (Lloyd's Algorithm with K-Means++ initialization)
 * PURPOSE: Segment youth into groups for targeted program recommendations
 * 
 * PHASES (from your document):
 * 1. Survey Responses (Raw Data)
 * 2. Feature Engineering (Normalized Features)
 * 3. K-Means Clustering (Segments)
 * 4. Segment Analysis (Segment Profiles)
 * 5. Program Recommendations (Personalized Programs)
 */

class YouthClusteringService {

  // ==========================================
  // PHASE 1: DATA COLLECTION
  // ==========================================

  /**
   * Get validated survey responses from database
   * Only includes responses that passed validation
   * @param {string} scope - 'municipality' or 'barangay'
   * @param {string} [barangayId=null] - Required if scope is 'barangay'
   * @param {string} [batchId=null] - Optional: Filter by specific survey batch
   */
  async getSurveyResponses(scope, barangayId = null, batchId = null) {
    logger.info('PHASE 1: Fetching Survey Responses', { scope, barangayId, batchId });
    
    try {
      let queryText = `
        SELECT 
          r.response_id,
          r.youth_id,
          r.barangay_id,
          r.youth_age_group,
          r.educational_background,
          r.work_status,
          r.civil_status,
          r.youth_classification,
          r.registered_sk_voter,
          r.registered_national_voter,
          r.attended_kk_assembly,
          r.voted_last_sk,
          r.times_attended,
          r.reason_not_attended,
          r.youth_specific_needs,
          y.birth_date,
          y.gender
        FROM "KK_Survey_Responses" r
        JOIN "Youth_Profiling" y ON r.youth_id = y.youth_id
        WHERE r.validation_status = 'validated'
      `;
      
      const params = [];
      
      // Add barangay filter if scope is 'barangay'
      if (scope === 'barangay' && barangayId) {
        queryText += ` AND r.barangay_id = $${params.length + 1}`;
        params.push(barangayId);
      }
      
      // Add batch filter if specified
      if (batchId) {
        queryText += ` AND r.batch_id = $${params.length + 1}`;
        params.push(batchId);
      }
      
      queryText += ` ORDER BY r.created_at DESC`;

      const result = await query(queryText, params);
      
      logger.info('Retrieved validated responses', {
        count: result.rows.length,
        ageGroups: this.countUnique(result.rows, 'youth_age_group'),
        workStatus: this.countUnique(result.rows, 'work_status'),
        educationLevels: this.countUnique(result.rows, 'educational_background')
      });
      
      return result.rows;
      
    } catch (error) {
      logger.error('Failed to fetch survey responses', { error: error.message, stack: error.stack });
      throw new Error('Database error while fetching responses');
    }
  }

  // ==========================================
  // PHASE 2: FEATURE ENGINEERING
  // ==========================================

  /**
   * Extract and normalize features from survey responses
   * Converts categorical data to numerical values (0-1 scale)
   * 
   * FEATURES (6 dimensions):
   * 1. Age (normalized 15-30 → 0-1)
   * 2. Education Level (Elementary to Doctorate → 0-1)
   * 3. Work Status (Unemployed to Employed → 0-1)
   * 4. Gender (Binary: Male=0, Female=1)
   * 5. Civic Engagement (0-4 activities → 0-1)
   * 6. Civil Status (Binary: Single=0, Other=1)
   */
  extractFeatures(responses) {
    logger.info('PHASE 2: Feature Engineering', { responseCount: responses.length });
    
    const features = [];
    const metadata = []; // Store original data for analysis later
    
    responses.forEach((response, index) => {
      try {
        // 1. AGE FEATURE (weight: 1.0)
        const age = this.calculateAge(response.birth_date);
        const ageNormalized = this.normalizeAge(age);

        // 2. EDUCATION FEATURE (weight: 1.2)
        const educationScore = this.mapEducationLevel(response.educational_background);
        const educationNormalized = educationScore / 10; // 0-10 scale → 0-1

        // 3. WORK STATUS FEATURE (weight: 2.0) ← MOST IMPORTANT
        const workScore = this.mapWorkStatus(response.work_status);
        const workNormalized = workScore / 4; // 0-4 scale → 0-1

        // 4. CIVIC ENGAGEMENT FEATURE (weight: 1.5) ← ENHANCED
        let civicScore = 0;
        if (response.registered_sk_voter) civicScore += 1;
        if (response.registered_national_voter) civicScore += 1;
        if (response.attended_kk_assembly) civicScore += 1;
        if (response.voted_last_sk) civicScore += 1;
        
        // NEW: Add times_attended (stronger engagement indicator)
        if (response.times_attended) {
          if (response.times_attended === '5 and above') civicScore += 2;
          else if (response.times_attended === '3-4 Times') civicScore += 1;
          else if (response.times_attended === '1-2 Times') civicScore += 0.5;
        }
        const civicNormalized = civicScore / 8; // 0-8 → 0-1 (increased max score)

        // 5. CIVIL STATUS FEATURE (weight: 0.8)
        const civilScore = response.civil_status === 'Single' ? 0 : 1;

        // 6. YOUTH CLASSIFICATION FEATURE (weight: 1.3)
        const classificationScore = this.mapYouthClassification(response.youth_classification);
        const classificationNormalized = classificationScore / 3; // 0-3 → 0-1

        // 7. GENDER FEATURE (weight: 0.5) ← REDUCED (less discriminative)
        const genderScore = response.gender === 'Male' ? 0 : 1;

        // 8. SPECIAL NEEDS FEATURE (weight: 1.0)
        const specialNeedsScore = response.youth_specific_needs ? 1 : 0;

        // 9. ENGAGEMENT MOTIVATION FEATURE (weight: 1.2)
        let motivationScore = 0.5; // Default: neutral
        if (response.reason_not_attended === 'Not interested to Attend') motivationScore = 0; // Low motivation
        if (response.attended_kk_assembly) motivationScore = 1; // High motivation

        // Create feature vector with WEIGHTED features
        const featureVector = [
          ageNormalized * 1.0,                    // Age
          educationNormalized * 1.2,              // Education
          workNormalized * 2.0,                   // Employment (DOUBLED)
          civicNormalized * 1.5,                  // Civic Engagement (ENHANCED)
          civilScore * 0.8,                       // Civil Status
          classificationNormalized * 1.3,         // Youth Classification
          genderScore * 0.5,                      // Gender (REDUCED)
          specialNeedsScore * 1.0,                // Special Needs
          motivationScore * 1.2                   // Motivation
        ];

        features.push(featureVector);
        
        // Store metadata for segment analysis
        metadata.push({
          response_id: response.response_id,
          youth_id: response.youth_id,
          barangay_id: response.barangay_id,
          raw_age: age,
          raw_education: response.educational_background,
          raw_work_status: response.work_status,
          raw_gender: response.gender,
          raw_civic_score: civicScore,
          raw_civil_status: response.civil_status,
          raw_classification: response.youth_classification,
          raw_special_needs: response.youth_specific_needs,
          raw_times_attended: response.times_attended,
          raw_motivation: motivationScore
        });

      } catch (error) {
        logger.warn(`Skipping response ${index}`, { error: error.message, stack: error.stack });
      }
    });

    logger.info('Extracted feature vectors', {
      count: features.length,
      dimensions: 9,
      features: 'Age(1.0x), Education(1.2x), Work(2.0x), Civic(1.5x), Civil(0.8x), Classification(1.3x), Gender(0.5x), Special Needs(1.0x), Motivation(1.2x)',
      normalization: 'All values scaled to 0-1 range, then weighted'
    });

    return { features, metadata };
  }

  // ==========================================
  // PHASE 3: K-MEANS CLUSTERING
  // ==========================================

  /**
   * Run K-Means clustering algorithm
   * Groups youth into k segments based on feature similarity
   * 
   * @param {Array} features - 2D array of feature vectors
   * @param {Number} k - Number of clusters
   * @returns {Object} Clustering results with quality metrics
   */
  async runClustering(features, k) {
    logger.info('PHASE 3: Running K-Means Clustering', {
      k,
      dataPoints: features.length,
      featureDimensions: features[0]?.length,
      initialization: 'K-Means++'
    });
    
    try {
      const startTime = Date.now();
      
      // Run K-Means algorithm
      const result = kmeans(features, k, {
        initialization: 'kmeans++', // Smart initialization (best practice)
        maxIterations: 100,          // Stop after 100 iterations max
        tolerance: 1e-4              // Convergence threshold
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      const silhouetteScore = this.calculateSilhouetteScore(features, result.clusters);
      const clusterSizes = this.calculateClusterSizes(result.clusters, k);
      
      logger.info('Clustering completed', {
        duration: `${duration}s`,
        iterations: result.iterations,
        converged: result.iterations < 100,
        silhouetteScore: silhouetteScore.toFixed(4),
        interpretation: this.interpretSilhouetteScore(silhouetteScore),
        clusterDistribution: clusterSizes.map((size, i) => ({
          cluster: i,
          size,
          percentage: ((size / features.length) * 100).toFixed(1)
        }))
      });

      return {
        clusters: result.clusters,      // Array: cluster assignment for each youth
        centroids: result.centroids,    // Cluster center points
        iterations: result.iterations,  // Number of iterations to converge
        silhouetteScore: silhouetteScore,
        clusterSizes: clusterSizes
      };

    } catch (error) {
      logger.error('K-Means clustering failed', { error: error.message, stack: error.stack });
      throw new Error('Clustering algorithm failed: ' + error.message);
    }
  }

  // ==========================================
  // PHASE 4: SEGMENT ANALYSIS
  // ==========================================

  /**
   * Analyze each cluster to create segment profiles
   */
  async analyzeSegments(responses, features, metadata, clusterResult, k) {
    logger.info('PHASE 4: Analyzing Segments', { k });
    
    const segments = [];
    
    for (let clusterNum = 0; clusterNum < k; clusterNum++) {
      // Get indices of youth in this cluster
      const indices = clusterResult.clusters
        .map((cluster, idx) => cluster === clusterNum ? idx : -1)
        .filter(idx => idx !== -1);
      
      if (indices.length === 0) {
        logger.warn(`Cluster ${clusterNum} is empty`, { clusterNum });
        continue;
      }

      // Get data for youth in this cluster
      const clusterResponses = indices.map(idx => responses[idx]);
      const clusterMetadata = indices.map(idx => metadata[idx]);
      const clusterFeatures = indices.map(idx => features[idx]);
      
      // Analyze this segment
      const segment = await segmentAnalysisService.analyzeSegment(
        clusterNum,
        clusterResponses,
        clusterMetadata,
        clusterFeatures,
        clusterResult.centroids[clusterNum],
        responses.length // Pass total youth count for percentage calculation
      );
      
      segments.push(segment);
      
      logger.debug(`Cluster ${clusterNum} analyzed`, {
        clusterNum,
        name: segment.name,
        youthCount: segment.youthCount,
        avgAge: segment.avgAge.toFixed(1),
        employmentRate: (segment.employmentRate * 100).toFixed(1),
        priority: segment.priority
      });
    }

    logger.info(`Created ${segments.length} segment profiles`);
    return segments;
  }

  // ==========================================
  // PHASE 5: PROGRAM RECOMMENDATIONS
  // ==========================================

  /**
   * Generate program recommendations for each segment
   */
  async generateRecommendations(segments) {
    logger.info('PHASE 5: Generating Program Recommendations', { segmentCount: segments.length });
    
    const allRecommendations = [];
    
    for (const segment of segments) {
      const recommendations = await recommendationService.generateForSegment(segment);
      allRecommendations.push(...recommendations);
      
      logger.debug(`${segment.name} recommendations`, { segmentName: segment.name, count: recommendations.length });
    }

    logger.info(`Total recommendations generated`, { count: allRecommendations.length });
    return allRecommendations;
  }

  // ==========================================
  // MAIN PIPELINE
  // ==========================================

  /**
   * Run complete clustering pipeline
   * This is the main entry point called by the controller
   * @param {string} userId - ID of the user triggering the run (LYDO or SK)
   * @param {object} options
   * @param {string} [options.runType='manual'] - 'manual' or 'scheduled'
   * @param {string} [options.scope='municipality'] - 'municipality' or 'barangay'
   * @param {string} [options.barangayId=null] - Required if scope is 'barangay'
   * @param {string} [options.batchId=null] - Optional: Cluster specific survey batch
   */
  async runCompletePipeline(userId, options = {}) {
    const { 
      runType = 'manual', 
      scope = 'municipality', 
      barangayId = null,
      batchId = null
    } = options;

    const client = await getClient();
    let runId = null;
    
    try {
      await client.query('BEGIN');
      
      logger.info('YOUTH CLUSTERING PIPELINE STARTED', {
        runType,
        scope,
        barangayId: barangayId || 'N/A (Municipality-wide)',
        batchId: batchId || 'N/A (All batches)',
        userId,
        startedAt: new Date().toISOString()
      });
      
      // Create run record
      runId = await generateId('CLR');
      await client.query(`
        INSERT INTO "Clustering_Runs" (
          run_id, run_type, run_status, run_by, started_at, scope, barangay_id, batch_id
        )
        VALUES ($1, $2, 'running', $3, CURRENT_TIMESTAMP, $4, $5, $6)
      `, [runId, runType, userId, scope, barangayId, batchId]);

      // PHASE 1: Get Data
      const responses = await this.getSurveyResponses(scope, barangayId, batchId);
      
      if (responses.length < 10) {
        throw new Error(`Insufficient data: ${responses.length} responses (minimum: 10 for clustering)`);
      }
      
      // Warn if sample size is small but proceed
      if (responses.length < 50) {
        logger.warn('Small sample size', {
          responseCount: responses.length,
          recommendation: 'Collect 50+ responses for best clustering quality'
        });
      }

      // Check Data Quality
      const qualityReport = await dataQualityService.assessDataQuality(responses);
      
      if (!qualityReport.summary.canProceed) {
        throw new Error(`Data quality check failed: ${qualityReport.summary.recommendation}`);
      }

      // PHASE 2: Extract Features
      const { features, metadata } = this.extractFeatures(responses);

      if (features.length === 0) {
        throw new Error('Feature extraction failed: no valid features generated');
      }

      // Determine optimal k based on dataset size and scope
      // PHASE 3: Determine Optimal K (Intelligent Selection)
      const kSelection = await this.determineOptimalKIntelligent(features, responses.length, scope);
      const k = kSelection.k;
      
      logger.info('Using K clusters', {
        k,
        method: kSelection.method,
        reasoning: kSelection.reasoning
      });

      // PHASE 3: Cluster (use the final K value)
      const selectedResult = kSelection.allResults.find(r => r.k === k);
      const clusterResult = {
        clusters: selectedResult.result.clusters,
        centroids: selectedResult.result.centroids,
        iterations: selectedResult.result.iterations,
        silhouetteScore: selectedResult.silhouette,
        clusterSizes: this.calculateClusterSizes(selectedResult.result.clusters, k)
      };

      // PHASE 4: Analyze Segments
      const segments = await this.analyzeSegments(responses, features, metadata, clusterResult, k);

      if (segments.length === 0) {
        throw new Error('Segment analysis failed: no segments created');
      }

      // SAVE TO DATABASE (recommendations will be generated after segments are saved)
      const result = await this.saveResults(client, runId, segments, metadata, clusterResult, userId, scope, barangayId, batchId);
      
      const recommendations = result.recommendations;

      // Update run record with success
      await client.query(`
        UPDATE "Clustering_Runs"
        SET 
          run_status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)),
          total_responses = $2,
          segments_created = $3,
          overall_silhouette_score = $4,
          data_quality_score = $5
        WHERE run_id = $1
      `, [
        runId,
        responses.length,
        segments.length,
        clusterResult.silhouetteScore,
        qualityReport.qualityScore
      ]);

      await client.query('COMMIT');
      
      logger.info('PIPELINE COMPLETED SUCCESSFULLY', {
        runId,
        scope,
        barangayId: barangayId || 'N/A',
        totalYouthAnalyzed: responses.length,
        segmentsCreated: segments.length,
        programsRecommended: recommendations.length,
        silhouetteScore: clusterResult.silhouetteScore.toFixed(4),
        dataQuality: (qualityReport.qualityScore * 100).toFixed(1)
      });
      
      return {
        success: true,
        runId,
        segments,
        recommendations,
        metrics: {
          totalYouth: responses.length,
          segmentsCreated: segments.length,
          recommendationsGenerated: recommendations.length,
          silhouetteScore: clusterResult.silhouetteScore,
          dataQualityScore: qualityReport.qualityScore,
          clusterSizes: clusterResult.clusterSizes
        },
        kSelection: {
          k: kSelection.k,
          method: kSelection.method,
          reasoning: kSelection.reasoning,
          scores: kSelection.scores
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('PIPELINE FAILED', { error: error.message, stack: error.stack, runId });
      
      // Log failure
      if (runId) {
        await client.query(`
          UPDATE "Clustering_Runs"
          SET 
            run_status = 'failed',
            completed_at = CURRENT_TIMESTAMP,
            error_message = $2
          WHERE run_id = $1
        `, [runId, error.message]);
      }

      throw error;
      
    } finally {
      client.release();
    }
  }

  // ==========================================
  // DATABASE OPERATIONS
  // ==========================================

  /**
   * Save all clustering results to database
   * @param {object} client - PostgreSQL client
   * @param {string} runId - ID of the current clustering run
   * @param {Array} segments - Array of segment profiles
   * @param {Array} metadata - Metadata for each youth
   * @param {object} clusterResult - Raw clustering results
   * @param {string} userId - ID of user who triggered the run
   * @param {string} scope - 'municipality' or 'barangay'
   * @param {string} [barangayId=null] - Barangay ID if scope is 'barangay'
   * @param {string} [batchId=null] - Batch ID if clustering specific batch
   */
  async saveResults(client, runId, segments, metadata, clusterResult, userId, scope, barangayId = null, batchId = null) {
    logger.info('Saving results to database', { runId, segmentCount: segments.length });
    
    try {
      // 1. Deactivate old segments for the specific scope/barangay/batch
      await client.query(`
        UPDATE "Youth_Segments" 
        SET is_active = false 
        WHERE scope = $1 
          AND (barangay_id = $2 OR ($2 IS NULL AND barangay_id IS NULL))
          AND (batch_id = $3 OR ($3 IS NULL AND batch_id IS NULL))
      `, [scope, barangayId, batchId]);
      logger.info('Deactivated old segments', { scope, barangayId: barangayId || 'All', batchId: batchId || 'All' });

      // 2. Save new segments
      const segmentIdMap = {}; // Map cluster number to segment_id
      
      for (const segment of segments) {
        const segmentId = await generateId('SEG');
        
        await client.query(`
          INSERT INTO "Youth_Segments" (
            segment_id, segment_name, segment_description, cluster_number,
            avg_age, avg_education_level, employment_rate, civic_engagement_rate,
            characteristics, youth_count, percentage, priority_level,
            cluster_quality_score, is_active, created_by, scope, barangay_id, batch_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14, $15, $16, $17)
        `, [
          segmentId,
          segment.name,
          segment.description,
          segment.clusterNumber,
          segment.avgAge,
          segment.avgEducation,
          segment.employmentRate,
          segment.civicEngagement,
          JSON.stringify(segment.characteristics),
          segment.youthCount,
          segment.percentage,
          segment.priority,
          segment.qualityScore,
          userId,
          scope,
          barangayId,
          batchId
        ]);

        segmentIdMap[segment.clusterNumber] = segmentId;
        segment.segmentId = segmentId; // Store for recommendations
      }
      
      logger.info(`Saved ${segments.length} new segments`);

      // 3. Save cluster assignments
      let assignmentCount = 0;
      
      for (let i = 0; i < metadata.length; i++) {
        const meta = metadata[i];
        const clusterNum = clusterResult.clusters[i];
        const segmentId = segmentIdMap[clusterNum];
        
        if (segmentId) {
          const assignmentId = await generateId('ASG');
          
          await client.query(`
            INSERT INTO "Youth_Cluster_Assignments" (
              assignment_id, youth_id, segment_id, response_id, assigned_at
            ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
          `, [assignmentId, meta.youth_id, segmentId, meta.response_id]);
          
          assignmentCount++;
        }
      }
      
      logger.info(`Saved ${assignmentCount} cluster assignments`);
      
      // 4. Generate and save recommendations (now that segments have database IDs)
      logger.info('PHASE 5: Generating Program Recommendations');
      
      const recommendations = await this.generateRecommendations(segments);
      
      let recCount = 0;
      
      for (const rec of recommendations) {
        const recId = await generateId('REC');
        
        await client.query(`
          INSERT INTO "Program_Recommendations" (
            recommendation_id, segment_id, program_name, program_type, description,
            target_need, priority_rank, expected_impact, duration_months,
            target_youth_count, implementation_plan, success_metrics,
            primary_sdg, sdg_alignment_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          recId,
          rec.segmentId,
          rec.programName,
          rec.programType,
          rec.description,
          rec.targetNeed,
          rec.priorityRank,
          rec.expectedImpact,
          rec.durationMonths,
          rec.targetYouthCount,
          rec.implementationPlan,
          JSON.stringify(rec.successMetrics),
          rec.primarySDG,
          rec.sdgAlignment
        ]);
        
        recCount++;
      }
      
      logger.info(`Saved ${recCount} program recommendations`);
      logger.info('All results saved successfully');
      
      return { recommendations };

    } catch (error) {
      logger.error('Failed to save results', { error: error.message, stack: error.stack });
      throw new Error('Database save operation failed: ' + error.message);
    }
  }

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  /**
   * Calculate age from birth date
   */
  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Normalize age to 0-1 scale (15-30 years)
   */
  normalizeAge(age) {
    const min = 15;
    const max = 30;
    const normalized = (age - min) / (max - min);
    return Math.max(0, Math.min(1, normalized)); // Clamp to 0-1
  }

  /**
   * Map education level to numeric score (0-10)
   */
  mapEducationLevel(education) {
    const mapping = {
      'Elementary Level': 1,
      'Elementary Grad': 2,
      'High School Level': 3,
      'High School Grad': 4,
      'Vocational Grad': 5,
      'College Level': 6,
      'College Grad': 7,
      'Masters Level': 8,
      'Masters Grad': 9,
      'Doctorate Level': 9,
      'Doctorate Graduate': 10
    };
    return mapping[education] || 0;
  }

  /**
   * Map work status to numeric score (0-4)
   */
  mapWorkStatus(workStatus) {
    const mapping = {
      'Unemployed': 1,
      'Not interested looking for a job': 1,
      'Currently looking for a Job': 2,
      'Self-Employed': 3,
      'Employed': 4
    };
    return mapping[workStatus] || 0;
  }

  /**
   * Map youth classification to numerical score
   */
  mapYouthClassification(classification) {
    const mapping = {
      'In School Youth': 1,           // Currently studying
      'Out of School Youth': 2,       // Not in school
      'Working Youth': 3,             // Employed
      'Youth w/Specific Needs': 1     // Special support needed
    };
    return mapping[classification] || 0;
  }

  /**
   * Calculate Silhouette Score (cluster quality metric)
   * 
   * Silhouette Score measures how well-separated clusters are:
   * - Score near 1: Excellent clustering
   * - Score near 0: Overlapping clusters
   * - Score near -1: Wrong cluster assignments
   * 
   * Formula for each point i:
   *   a(i) = average distance to other points in same cluster
   *   b(i) = average distance to points in nearest different cluster
   *   s(i) = (b(i) - a(i)) / max(a(i), b(i))
   * 
   * Overall score = average of all s(i)
   */
  calculateSilhouetteScore(features, clusters) {
    const k = Math.max(...clusters) + 1;
    let totalScore = 0;
    let count = 0;

    for (let i = 0; i < features.length; i++) {
      const point = features[i];
      const cluster = clusters[i];
      
      // Calculate a(i): average distance within cluster
      let intraClusterDist = 0;
      let intraCount = 0;
      
      for (let j = 0; j < features.length; j++) {
        if (i !== j && clusters[j] === cluster) {
          intraClusterDist += this.euclideanDistance(point, features[j]);
          intraCount++;
        }
      }
      
      const a = intraCount > 0 ? intraClusterDist / intraCount : 0;
      
      // Calculate b(i): average distance to nearest cluster
      let minInterClusterDist = Infinity;
      
      for (let c = 0; c < k; c++) {
        if (c !== cluster) {
          let interClusterDist = 0;
          let interCount = 0;
          
          for (let j = 0; j < features.length; j++) {
            if (clusters[j] === c) {
              interClusterDist += this.euclideanDistance(point, features[j]);
              interCount++;
            }
          }
          
          if (interCount > 0) {
            const avgDist = interClusterDist / interCount;
            minInterClusterDist = Math.min(minInterClusterDist, avgDist);
          }
        }
      }
      
      const b = minInterClusterDist;
      
      // Calculate silhouette for this point
      if (Math.max(a, b) > 0) {
        const s = (b - a) / Math.max(a, b);
        totalScore += s;
        count++;
      }
    }

    return count > 0 ? totalScore / count : 0;
  }

  /**
   * Calculate Euclidean distance between two points
   */
  euclideanDistance(point1, point2) {
    return Math.sqrt(
      point1.reduce((sum, val, idx) => {
        return sum + Math.pow(val - point2[idx], 2);
      }, 0)
    );
  }

  /**
   * Interpret Silhouette Score for humans
   */
  interpretSilhouetteScore(score) {
    if (score >= 0.7) return 'Excellent - Strong, well-separated clusters';
    if (score >= 0.5) return 'Good - Clear cluster structure';
    if (score >= 0.3) return 'Acceptable - Reasonable clustering';
    if (score >= 0.2) return 'Weak - Overlapping clusters';
    return 'Poor - Reconsider clustering approach';
  }

  /**
   * Calculate cluster sizes
   */
  calculateClusterSizes(clusters, k) {
    const sizes = new Array(k).fill(0);
    clusters.forEach(cluster => sizes[cluster]++);
    return sizes;
  }

  /**
   * Count unique values in array of objects
   */
  countUnique(array, field) {
    return new Set(array.map(item => item[field])).size;
  }

  /**
   * Determine optimal k based on dataset size and scope
   * This is a heuristic to provide reasonable cluster counts for varying data sizes.
   * For a thesis, you might also implement Elbow Method or Silhouette Analysis to find optimal K.
   */
  /**
   * Determine optimal K using Elbow Method and Silhouette Analysis
   * Tests multiple K values and picks the best one
   * @param {Array} features - Feature vectors
   * @param {number} datasetSize - Number of data points
   * @param {string} scope - 'municipality' or 'barangay'
   * @returns {Object} - { k, method, scores, reasoning }
   */
  async determineOptimalKIntelligent(features, datasetSize, scope) {
    logger.info('PHASE 2.5: Determining Optimal K', { datasetSize, scope });
    
    // Determine K range based on data size
    const minK = 2;
    const maxK = Math.min(Math.floor(Math.sqrt(datasetSize / 2)), 6);
    
    if (maxK < minK) {
      logger.warn('Dataset too small', { datasetSize, usingK: 2 });
      return { k: 2, method: 'minimum', scores: {}, reasoning: 'Dataset too small for analysis' };
    }
    
    logger.debug('Testing K values', { minK, maxK });
    
    const results = [];
    
    // Test each K value
    for (let k = minK; k <= maxK; k++) {
      try {
        // Run clustering
        const result = kmeans(features, k, {
          initialization: 'kmeans++',
          maxIterations: 100
        });
        
        // Calculate Silhouette Score (pass clusters array, not whole result)
        const silhouette = this.calculateSilhouetteScore(features, result.clusters);
        
        // Calculate Inertia (within-cluster sum of squares)
        const inertia = this.calculateInertia(features, result);
        
        results.push({
          k,
          silhouette,
          inertia,
          result
        });
        
        logger.debug(`k=${k} tested`, { k, silhouette: silhouette.toFixed(4), inertia: inertia.toFixed(2) });
      } catch (error) {
        logger.warn(`k=${k} failed`, { k, error: error.message });
      }
    }
    
    if (results.length === 0) {
      throw new Error('Could not determine optimal K - all attempts failed');
    }
    
    // METHOD 1: Silhouette Analysis (pick highest silhouette score)
    const bestBySilhouette = results.reduce((best, current) => 
      current.silhouette > best.silhouette ? current : best
    );
    
    // METHOD 2: Elbow Method (detect elbow in inertia curve)
    const elbowK = this.findElbowPoint(results);
    
    // Decision logic: Prioritize silhouette but consider elbow
    let chosenK, method, reasoning;
    
    if (bestBySilhouette.silhouette >= 0.5) {
      // Good silhouette score - use it
      chosenK = bestBySilhouette.k;
      method = 'silhouette';
      reasoning = `K=${chosenK} has best Silhouette Score (${bestBySilhouette.silhouette.toFixed(3)})`;
    } else if (elbowK) {
      // Poor silhouette but found elbow
      chosenK = elbowK;
      method = 'elbow';
      reasoning = `K=${chosenK} detected at elbow point (balance between inertia and complexity)`;
    } else {
      // Fall back to best silhouette even if poor
      chosenK = bestBySilhouette.k;
      method = 'silhouette_fallback';
      reasoning = `K=${chosenK} has best Silhouette Score (${bestBySilhouette.silhouette.toFixed(3)}), but data may not cluster well`;
    }
    
    logger.info('Optimal K Selected', { k: chosenK, method, reasoning });
    
    // Package all scores for frontend display
    const scores = {};
    results.forEach(r => {
      scores[r.k] = {
        silhouette: r.silhouette,
        inertia: r.inertia
      };
    });
    
    return {
      k: chosenK,
      method,
      scores,
      reasoning,
      allResults: results
    };
  }
  
  /**
   * Calculate inertia (within-cluster sum of squares)
   * Lower is better - measures cluster compactness
   */
  calculateInertia(features, clusterResult) {
    let inertia = 0;
    const { centroids, clusters } = clusterResult;
    
    features.forEach((point, idx) => {
      const cluster = clusters[idx];
      const centroid = centroids[cluster];
      
      // Calculate squared Euclidean distance to centroid
      const distance = point.reduce((sum, val, i) => {
        const diff = val - centroid[i];
        return sum + (diff * diff);
      }, 0);
      
      inertia += distance;
    });
    
    return inertia;
  }
  
  /**
   * Find elbow point in inertia curve
   * Uses the "elbow" detection algorithm
   */
  findElbowPoint(results) {
    if (results.length < 3) return null;
    
    // Sort by K
    const sorted = results.sort((a, b) => a.k - b.k);
    
    // Calculate rate of inertia decrease
    const rates = [];
    for (let i = 1; i < sorted.length; i++) {
      const rate = sorted[i-1].inertia - sorted[i].inertia;
      rates.push({ k: sorted[i].k, rate });
    }
    
    if (rates.length === 0) return null;
    
    // Find the point where rate decrease slows down significantly
    let elbowK = rates[0].k;
    let maxRateDecrease = 0;
    
    for (let i = 1; i < rates.length; i++) {
      const rateDecrease = rates[i-1].rate - rates[i].rate;
      if (rateDecrease > maxRateDecrease) {
        maxRateDecrease = rateDecrease;
        elbowK = rates[i-1].k;
      }
    }
    
    return elbowK;
  }
  
  /**
   * Simple fallback method (original logic)
   * Used as last resort if intelligent method fails
   */
  determineOptimalK(datasetSize, scope) {
    if (scope === 'barangay') {
      if (datasetSize < 20) return 2;
      if (datasetSize < 50) return 3;
      return 4;
    } else {
      if (datasetSize < 50) return 3;
      if (datasetSize < 100) return 4;
      if (datasetSize < 200) return 5;
      if (datasetSize < 500) return 6;
      return 7;
    }
  }
}

// Export singleton instance
export default new YouthClusteringService();

