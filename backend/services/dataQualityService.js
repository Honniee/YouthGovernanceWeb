/**
 * Data Quality Service
 * Validates survey data before clustering
 * 
 * Best Practice: Always validate data quality before ML operations
 * 
 * Quality Thresholds:
 * - 0.9+ : Excellent
 * - 0.7-0.9 : Good (acceptable for clustering)
 * - 0.5-0.7 : Fair (may proceed with caution)
 * - <0.5 : Poor (should not proceed)
 */

import logger from '../utils/logger.js';

class DataQualityService {
  
  /**
   * Assess data quality for clustering
   * @param {Array} responses - Survey responses array
   * @returns {Object} Quality report with score and issues
   */
  async assessDataQuality(responses) {
    logger.info('Assessing data quality', { responseCount: responses.length });
    
    if (!responses || responses.length === 0) {
      return {
        totalRecords: 0,
        validRecords: 0,
        qualityScore: 0,
        issues: ['No responses provided'],
        canProceed: false
      };
    }

    const report = {
      totalRecords: responses.length,
      validRecords: 0,
      issues: [],
      qualityScore: 0,
      fieldCompleteness: {},
      summary: {}
    };

    // Required fields for clustering
    const requiredFields = [
      'youth_age_group',
      'educational_background',
      'work_status',
      'civil_status',
      'registered_sk_voter',
      'attended_kk_assembly',
      'birth_date',
      'gender'
    ];

    // Initialize field tracking
    requiredFields.forEach(field => {
      report.fieldCompleteness[field] = { present: 0, missing: 0, percentage: 0 };
    });

    // Check each response
    let completeRecords = 0;
    
    responses.forEach((response, index) => {
      let isComplete = true;
      
      requiredFields.forEach(field => {
        const value = response[field];
        const hasValue = value !== null && value !== undefined && value !== '';
        
        if (hasValue) {
          report.fieldCompleteness[field].present++;
        } else {
          report.fieldCompleteness[field].missing++;
          isComplete = false;
        }
      });

      if (isComplete) {
        completeRecords++;
      }
    });

    // Calculate completeness percentages
    requiredFields.forEach(field => {
      const total = responses.length;
      const present = report.fieldCompleteness[field].present;
      report.fieldCompleteness[field].percentage = (present / total * 100).toFixed(2);
    });

    // Calculate overall quality score
    report.validRecords = completeRecords;
    report.qualityScore = completeRecords / responses.length;

    // Identify issues
    if (report.qualityScore < 0.7) {
      report.issues.push(
        `Low data completeness: Only ${(report.qualityScore * 100).toFixed(1)}% of records are complete`
      );
    }

    if (responses.length < 10) {
      report.issues.push(
        `Insufficient sample size: ${responses.length} responses (minimum: 10)`
      );
    } else if (responses.length < 50) {
      report.issues.push(
        `Small sample size: ${responses.length} responses (recommended: 50+ for best results)`
      );
    }

    // Check individual field completeness
    Object.keys(report.fieldCompleteness).forEach(field => {
      const missingPct = (report.fieldCompleteness[field].missing / responses.length) * 100;
      if (missingPct > 20) {
        report.issues.push(
          `Field "${field}" has ${missingPct.toFixed(1)}% missing values`
        );
      }
    });

    // Generate summary
    // Lower threshold for testing/small datasets (10 minimum, 50 recommended)
    report.summary = {
      canProceed: report.qualityScore >= 0.7 && responses.length >= 10,
      recommendation: this.getRecommendation(report.qualityScore, responses.length)
    };

    // Log results
    logger.info('Data Quality Results', {
      totalRecords: report.totalRecords,
      validRecords: report.validRecords,
      qualityScore: (report.qualityScore * 100).toFixed(1) + '%',
      canProceed: report.summary.canProceed,
      issues: report.issues.length > 0 ? report.issues : []
    });

    return report;
  }

  /**
   * Get recommendation based on quality metrics
   */
  getRecommendation(qualityScore, sampleSize) {
    if (qualityScore >= 0.9 && sampleSize >= 100) {
      return 'Excellent data quality. Proceed with confidence.';
    }
    
    if (qualityScore >= 0.7 && sampleSize >= 50) {
      return 'Good data quality. Safe to proceed with clustering.';
    }
    
    if (qualityScore >= 0.5 && sampleSize >= 30) {
      return 'Fair data quality. Proceed with caution. Results may be less reliable.';
    }
    
    return 'Poor data quality or insufficient sample size. Please improve data collection before clustering.';
  }

  /**
   * Detect statistical outliers (for advanced validation)
   */
  detectOutliers(values) {
    if (values.length < 4) return [];
    
    // Use IQR method (Interquartile Range)
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(values.length * 0.25);
    const q3Index = Math.floor(values.length * 0.75);
    
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.filter(v => v < lowerBound || v > upperBound);
  }
}

// Export singleton instance
export default new DataQualityService();

