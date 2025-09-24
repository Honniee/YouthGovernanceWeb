import { getClient } from '../config/database.js';

class SKValidationService {
  // Position limits per barangay (application-level constants)
  static POSITION_LIMITS = {
    'SK Chairperson': 1,
    'SK Secretary': 1, 
    'SK Treasurer': 1,
    'SK Councilor': 7
  };

  // Validate position availability for a barangay
  static async validatePositionAvailability(barangayId, termId, position, excludeSkId = null) {
    const client = await getClient();
    try {
      const query = `
        SELECT COUNT(*) as current_count
        FROM "SK_Officials" 
        WHERE barangay_id = $1 
        AND term_id = $2 
        AND position = $3
        AND is_active = true
        ${excludeSkId ? 'AND sk_id != $4' : ''}
      `;
      
      const params = excludeSkId ? [barangayId, termId, position, excludeSkId] : [barangayId, termId, position];
      const result = await client.query(query, params);
      
      const currentCount = parseInt(result.rows[0].current_count);
      const maxAllowed = this.POSITION_LIMITS[position];
      
      return {
        isValid: currentCount < maxAllowed,
        currentCount,
        maxAllowed,
        availableSlots: maxAllowed - currentCount
      };
    } finally {
      client.release();
    }
  }

  // Get vacancy statistics for a barangay
  static async getBarangayVacancies(barangayId, termId) {
    const client = await getClient();
    try {
      const query = `
        SELECT 
          position,
          COUNT(*) as current_count
        FROM "SK_Officials" 
        WHERE barangay_id = $1 AND term_id = $2 AND is_active = true
        GROUP BY position
      `;
      
      const result = await client.query(query, [barangayId, termId]);
      const currentCounts = {};
      
      result.rows.forEach(row => {
        currentCounts[row.position] = parseInt(row.current_count);
      });
      
      // Calculate vacancies
      const vacancies = {};
      Object.entries(this.POSITION_LIMITS).forEach(([position, limit]) => {
        const current = currentCounts[position] || 0;
        vacancies[position] = {
          current,
          max: limit,
          available: limit - current,
          isFull: current >= limit
        };
      });
      
      return vacancies;
    } finally {
      client.release();
    }
  }

  // Get all barangay vacancies for active term
  static async getAllBarangayVacancies(termId) {
    const client = await getClient();
    try {
      // Get all barangays
      const barangayQuery = `SELECT barangay_id, barangay_name FROM "Barangay" ORDER BY barangay_name`;
      const barangayResult = await client.query(barangayQuery);
      
      const allVacancies = {};
      
      for (const barangay of barangayResult.rows) {
        allVacancies[barangay.barangay_id] = {
          barangayName: barangay.barangay_name,
          vacancies: await this.getBarangayVacancies(barangay.barangay_id, termId)
        };
      }
      
      return allVacancies;
    } finally {
      client.release();
    }
  }

  // Get overall vacancy statistics for active term
  static async getOverallVacancyStats(termId) {
    const client = await getClient();
    try {
      const query = `
        SELECT 
          position,
          COUNT(*) as current_count
        FROM "SK_Officials" 
        WHERE term_id = $1 AND is_active = true
        GROUP BY position
      `;
      
      const result = await client.query(query, [termId]);
      const currentCounts = {};
      
      result.rows.forEach(row => {
        currentCounts[row.position] = parseInt(row.current_count);
      });
      
      // Calculate overall statistics
      const stats = {};
      Object.entries(this.POSITION_LIMITS).forEach(([position, limit]) => {
        const current = currentCounts[position] || 0;
        const totalPossible = limit * 33; // 33 barangays
        stats[position] = {
          current,
          max: totalPossible,
          available: totalPossible - current,
          filled: current,
          vacancyRate: ((totalPossible - current) / totalPossible * 100).toFixed(1)
        };
      });
      
      return stats;
    } finally {
      client.release();
    }
  }

  // Validate bulk import records with comprehensive validation
  static async validateBulkImportRecords(records, termId) {
    const client = await getClient();
    try {
      const validationResults = [];
      const conflicts = [];
      
      // Track position counts per barangay for this import batch
      const batchCounts = {};
      
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const { barangayId, position, firstName, lastName, personalEmail } = record;
        
        // Initialize batch counts for this barangay if not exists
        if (!batchCounts[barangayId]) {
          batchCounts[barangayId] = {};
        }
        if (!batchCounts[barangayId][position]) {
          batchCounts[barangayId][position] = 0;
        }
        
        // Increment batch count for this position
        batchCounts[barangayId][position]++;
        
        const validationResult = {
          record,
          rowIndex: i + 1, // 1-based index for user-friendly display
          isValid: true,
          errors: [],
          warnings: [],
          conflicts: []
        };
        
        // 1. Basic data validation
        if (!firstName || !lastName || !personalEmail || !barangayId || !position) {
          validationResult.isValid = false;
          validationResult.errors.push('Missing required fields: firstName, lastName, personalEmail, barangayId, position');
        }
        
        // 2. Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (personalEmail && !emailRegex.test(personalEmail)) {
          validationResult.isValid = false;
          validationResult.errors.push('Invalid email format');
        }
        
        // 3. Check for duplicate email in existing records
        const existingEmailQuery = `
          SELECT sk_id, first_name, last_name, barangay_name 
          FROM "SK_Officials" so
          JOIN "Barangay" b ON so.barangay_id = b.barangay_id
          WHERE so.personal_email = $1 AND so.term_id = $2
        `;
        const existingEmailResult = await client.query(existingEmailQuery, [personalEmail, termId]);
        
        if (existingEmailResult.rows.length > 0) {
          const existing = existingEmailResult.rows[0];
          validationResult.isValid = false;
          validationResult.errors.push(`Email already exists: ${existing.first_name} ${existing.last_name} (${existing.barangay_name})`);
          conflicts.push({
            type: 'email_duplicate',
            record: validationResult,
            existing: existing
          });
        }
        
        // 4. Check for duplicate email within the import batch
        const duplicateInBatch = records.slice(0, i).find(r => r.personalEmail === personalEmail);
        if (duplicateInBatch) {
          validationResult.isValid = false;
          validationResult.errors.push('Duplicate email within import batch');
          conflicts.push({
            type: 'batch_duplicate',
            record: validationResult,
            duplicateRecord: duplicateInBatch
          });
        }
        
        // 5. Validate position availability (including batch counts)
        const currentValidation = await this.validatePositionAvailability(barangayId, termId, position);
        const totalForThisPosition = currentValidation.currentCount + batchCounts[barangayId][position];
        
        if (totalForThisPosition > currentValidation.maxAllowed) {
          validationResult.isValid = false;
          validationResult.errors.push(`Position limit exceeded: ${totalForThisPosition}/${currentValidation.maxAllowed} (current: ${currentValidation.currentCount}, batch: ${batchCounts[barangayId][position]})`);
          conflicts.push({
            type: 'position_limit',
            record: validationResult,
            currentCount: currentValidation.currentCount,
            batchCount: batchCounts[barangayId][position],
            maxAllowed: currentValidation.maxAllowed
          });
        }
        
        // 6. Check for duplicate position in same barangay within batch
        const duplicatePositionInBatch = records.slice(0, i).find(r => 
          r.barangayId === barangayId && r.position === position
        );
        if (duplicatePositionInBatch) {
          validationResult.isValid = false;
          validationResult.errors.push('Duplicate position in same barangay within import batch');
          conflicts.push({
            type: 'position_duplicate',
            record: validationResult,
            duplicateRecord: duplicatePositionInBatch
          });
        }
        
        // 7. Check for existing official in same position/barangay
        const existingPositionQuery = `
          SELECT sk_id, first_name, last_name, personal_email
          FROM "SK_Officials"
          WHERE barangay_id = $1 AND position = $2 AND term_id = $3 AND is_active = true
        `;
        const existingPositionResult = await client.query(existingPositionQuery, [barangayId, position, termId]);
        
        if (existingPositionResult.rows.length > 0) {
          const existing = existingPositionResult.rows[0];
          validationResult.isValid = false;
          validationResult.errors.push(`Position already occupied: ${existing.first_name} ${existing.last_name} (${existing.personal_email})`);
          conflicts.push({
            type: 'position_occupied',
            record: validationResult,
            existing: existing
          });
        }
        
        // 8. Validate barangay exists
        const barangayQuery = `SELECT barangay_name FROM "Barangay" WHERE barangay_id = $1`;
        const barangayResult = await client.query(barangayQuery, [barangayId]);
        
        if (barangayResult.rows.length === 0) {
          validationResult.isValid = false;
          validationResult.errors.push('Invalid barangay ID');
        }
        
        // 9. Validate position is valid
        if (!this.POSITION_LIMITS[position]) {
          validationResult.isValid = false;
          validationResult.errors.push(`Invalid position: ${position}`);
        }
        
        validationResults.push(validationResult);
      }
      
      return {
        validationResults,
        conflicts,
        summary: {
          total: records.length,
          valid: validationResults.filter(r => r.isValid).length,
          invalid: validationResults.filter(r => !r.isValid).length,
          conflictTypes: conflicts.reduce((acc, conflict) => {
            acc[conflict.type] = (acc[conflict.type] || 0) + 1;
            return acc;
          }, {})
        }
      };
    } finally {
      client.release();
    }
  }

  // Get import preview with validation results
  static async getImportPreview(records, termId) {
    const validation = await this.validateBulkImportRecords(records, termId);
    
    // Group records by validation status
    const validRecords = validation.validationResults.filter(r => r.isValid);
    const invalidRecords = validation.validationResults.filter(r => !r.isValid);
    
    // Group conflicts by type
    const conflictsByType = validation.conflicts.reduce((acc, conflict) => {
      if (!acc[conflict.type]) {
        acc[conflict.type] = [];
      }
      acc[conflict.type].push(conflict);
      return acc;
    }, {});
    
    return {
      ...validation,
      preview: {
        validRecords,
        invalidRecords,
        conflictsByType,
        canProceed: validRecords.length > 0,
        recommendedAction: this.getRecommendedAction(validation)
      }
    };
  }

  // Get recommended action based on validation results
  static getRecommendedAction(validation) {
    const { summary, conflicts } = validation;
    
    if (summary.valid === 0) {
      return {
        action: 'fix_all',
        message: 'All records have validation errors. Please fix all issues before importing.',
        severity: 'error'
      };
    }
    
    if (summary.invalid === 0) {
      return {
        action: 'proceed',
        message: 'All records are valid. Ready to import.',
        severity: 'success'
      };
    }
    
    // Check for critical conflicts
    const criticalConflicts = conflicts.filter(c => 
      ['email_duplicate', 'position_occupied'].includes(c.type)
    );
    
    if (criticalConflicts.length > 0) {
      return {
        action: 'review_conflicts',
        message: `${summary.valid} records are valid, but ${criticalConflicts.length} have critical conflicts that need resolution.`,
        severity: 'warning'
      };
    }
    
    return {
      action: 'partial_import',
      message: `${summary.valid} records are valid and can be imported. ${summary.invalid} records will be skipped.`,
      severity: 'info'
    };
  }

  // Get detailed vacancy statistics including inactive officials
  static async getDetailedBarangayVacancies(barangayId, termId) {
    const client = await getClient();
    try {
      const query = `
        SELECT 
          position,
          COUNT(*) as total_count,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_count
        FROM "SK_Officials" 
        WHERE barangay_id = $1 AND term_id = $2
        GROUP BY position
      `;
      
      const result = await client.query(query, [barangayId, termId]);
      const detailedCounts = {};
      
      result.rows.forEach(row => {
        detailedCounts[row.position] = {
          total: parseInt(row.total_count),
          active: parseInt(row.active_count),
          inactive: parseInt(row.inactive_count)
        };
      });
      
      // Calculate detailed vacancies
      const detailedVacancies = {};
      Object.entries(this.POSITION_LIMITS).forEach(([position, limit]) => {
        const counts = detailedCounts[position] || { total: 0, active: 0, inactive: 0 };
        detailedVacancies[position] = {
          current: counts.active,
          total: counts.total,
          active: counts.active,
          inactive: counts.inactive,
          max: limit,
          available: limit - counts.active,
          isFull: counts.active >= limit,
          hasInactive: counts.inactive > 0
        };
      });
      
      return detailedVacancies;
    } finally {
      client.release();
    }
  }
}

export default SKValidationService;
