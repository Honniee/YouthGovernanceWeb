# KK Survey Validation System - Comprehensive Plan

## Overview
The KK Survey system allows anonymous youth (ages 15-30) from San Jose, Batangas to participate in public surveys without creating accounts. The validation process ensures data integrity through voter list cross-referencing and manual validation by SK officials.

## Current System Analysis

### Database Schema Review
Based on the provided schema, we have:

1. **`Youth_Profiling`** - Registered youth profiles (with accounts)
2. **`Voters_List`** - Uploaded voter database for validation
3. **`KK_Survey_Responses`** - Anonymous survey responses
4. **`KK_Survey_Batches`** - Survey periods with target age ranges

### Key Validation Requirements
- ✅ **Age**: 15-30 years old
- ✅ **Residency**: San Jose, Batangas municipality
- ✅ **Frequency**: One response per batch per person
- ✅ **Identity Verification**: Cross-reference with voter list

## Proposed Validation Process

### Phase 1: Survey Response Collection
```
Anonymous Youth → Public Survey Form → KK_Survey_Responses (pending validation)
```

### Phase 2: Automatic Validation
```
Survey Response → Voter List Cross-Reference → Validation Result
```

**Automatic Validation Logic:**
```sql
-- Match survey response with voter list
SELECT vl.* 
FROM "Voters_List" vl
WHERE LOWER(TRIM(vl.first_name)) = LOWER(TRIM(survey.first_name))
  AND LOWER(TRIM(vl.last_name)) = LOWER(TRIM(survey.last_name))
  AND vl.birth_date = survey.birth_date
  AND vl.gender = survey.gender
  AND vl.created_by = 'LYDO001' -- San Jose, Batangas voter list
```

**Validation Tiers:**
- **Tier 1 (Automatic)**: Exact match with voter list
- **Tier 2 (Manual)**: Partial match or no match
- **Tier 3 (Final)**: SK official review and decision

### Phase 3: Manual Validation
```
Unmatched Responses → SK Official Review → Final Validation Decision
```

## Database Schema Enhancements

### 1. Enhanced KK_Survey_Responses Table
```sql
-- Add fields for validation process
ALTER TABLE "KK_Survey_Responses" ADD COLUMN IF NOT EXISTS
    -- Personal info for validation (from survey form)
    survey_first_name VARCHAR(50),
    survey_last_name VARCHAR(50),
    survey_middle_name VARCHAR(50),
    survey_birth_date DATE,
    survey_gender TEXT CHECK (survey_gender IN ('Male', 'Female')),
    survey_barangay VARCHAR(50),
    
    -- Validation process fields
    voter_match_id VARCHAR(20), -- Reference to matched voter record
    validation_score DECIMAL(3,2), -- 0.00 to 1.00 match confidence
    validation_notes TEXT,
    
    -- Duplicate prevention
    is_duplicate BOOLEAN DEFAULT FALSE,
    original_response_id VARCHAR(20), -- If this is a duplicate
    FOREIGN KEY (original_response_id) REFERENCES "KK_Survey_Responses"(response_id)
```

### 2. Voter List Enhancement
```sql
-- Add fields for better matching
ALTER TABLE "Voters_List" ADD COLUMN IF NOT EXISTS
    municipality VARCHAR(50) DEFAULT 'San Jose',
    province VARCHAR(50) DEFAULT 'Batangas',
    region VARCHAR(50) DEFAULT 'Region IV-A (CALABARZON)',
    is_active BOOLEAN DEFAULT TRUE,
    age INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM birth_date)) STORED
```

### 3. Youth Participation Tracking
```sql
-- New table to track youth participation across batches
CREATE TABLE "Youth_Participation_Tracking" (
    tracking_id VARCHAR(20) PRIMARY KEY,
    voter_id VARCHAR(20) NOT NULL, -- Reference to Voters_List
    batch_id VARCHAR(20) NOT NULL,
    response_id VARCHAR(20) NOT NULL,
    participation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validation_status TEXT CHECK (validation_status IN ('pending', 'validated', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (voter_id) REFERENCES "Voters_List"(voter_id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES "KK_Survey_Batches"(batch_id) ON DELETE CASCADE,
    FOREIGN KEY (response_id) REFERENCES "KK_Survey_Responses"(response_id) ON DELETE CASCADE,
    
    UNIQUE(voter_id, batch_id) -- Prevent duplicate participation per batch
);

CREATE INDEX idx_youth_participation_voter_id ON "Youth_Participation_Tracking" (voter_id);
CREATE INDEX idx_youth_participation_batch_id ON "Youth_Participation_Tracking" (batch_id);
```

## Validation Algorithm

### 1. Automatic Validation Function
```sql
CREATE OR REPLACE FUNCTION validate_survey_response(
    p_response_id VARCHAR(20)
) RETURNS TABLE(
    validation_tier TEXT,
    validation_score DECIMAL(3,2),
    voter_match_id VARCHAR(20),
    validation_notes TEXT
) AS $$
DECLARE
    response_record RECORD;
    voter_match RECORD;
    match_score DECIMAL(3,2) := 0.0;
    tier_result TEXT := 'manual';
BEGIN
    -- Get survey response details
    SELECT * INTO response_record 
    FROM "KK_Survey_Responses" 
    WHERE response_id = p_response_id;
    
    -- Try to find voter match
    SELECT vl.*, 
           -- Calculate match score
           CASE 
               WHEN LOWER(TRIM(vl.first_name)) = LOWER(TRIM(response_record.survey_first_name)) THEN 0.3
               ELSE 0.0
           END +
           CASE 
               WHEN LOWER(TRIM(vl.last_name)) = LOWER(TRIM(response_record.survey_last_name)) THEN 0.3
               ELSE 0.0
           END +
           CASE 
               WHEN vl.birth_date = response_record.survey_birth_date THEN 0.3
               ELSE 0.0
           END +
           CASE 
               WHEN vl.gender = response_record.survey_gender THEN 0.1
               ELSE 0.0
           END as calculated_score
    INTO voter_match
    FROM "Voters_List" vl
    WHERE vl.is_active = true
      AND vl.municipality = 'San Jose'
      AND vl.province = 'Batangas'
      AND vl.age BETWEEN 15 AND 30
    ORDER BY calculated_score DESC
    LIMIT 1;
    
    -- Determine validation tier
    IF voter_match.calculated_score >= 0.9 THEN
        tier_result := 'automatic';
    ELSIF voter_match.calculated_score >= 0.6 THEN
        tier_result := 'manual';
    ELSE
        tier_result := 'manual';
    END IF;
    
    RETURN QUERY SELECT 
        tier_result,
        COALESCE(voter_match.calculated_score, 0.0),
        voter_match.voter_id,
        CASE 
            WHEN voter_match.calculated_score >= 0.9 THEN 'Automatic validation - high confidence match'
            WHEN voter_match.calculated_score >= 0.6 THEN 'Manual validation required - partial match'
            ELSE 'Manual validation required - no voter match found'
        END;
END;
$$ LANGUAGE plpgsql;
```

### 2. Duplicate Detection Function
```sql
CREATE OR REPLACE FUNCTION check_duplicate_participation(
    p_voter_id VARCHAR(20),
    p_batch_id VARCHAR(20)
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM "Youth_Participation_Tracking" 
        WHERE voter_id = p_voter_id 
          AND batch_id = p_batch_id 
          AND validation_status = 'validated'
    );
END;
$$ LANGUAGE plpgsql;
```

## Updated Statistics Calculation

### Revised calculate_batch_statistics Function
```sql
CREATE OR REPLACE FUNCTION calculate_batch_statistics(batch_id_param VARCHAR(20))
RETURNS TABLE(
    total_responses INTEGER,
    validated_responses INTEGER,
    rejected_responses INTEGER,
    pending_responses INTEGER,
    total_eligible_voters INTEGER,        -- From voter list (ages 15-30)
    total_youths_surveyed INTEGER,        -- Unique validated participants
    total_youths_not_surveyed INTEGER,    -- Eligible voters not yet surveyed
    response_rate DECIMAL(5,2),
    validation_rate DECIMAL(5,2),
    automatic_validations INTEGER,        -- Auto-validated responses
    manual_validations INTEGER,           -- Manually validated responses
    pending_validations INTEGER           -- Awaiting validation
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Response counts
        COALESCE(COUNT(ksr.response_id), 0)::INTEGER as total_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated'), 0)::INTEGER as validated_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'rejected'), 0)::INTEGER as rejected_responses,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'pending'), 0)::INTEGER as pending_responses,
        
        -- Eligible voter count (from voter list, ages 15-30)
        (SELECT COUNT(*) FROM "Voters_List" vl 
         WHERE vl.is_active = true 
           AND vl.municipality = 'San Jose' 
           AND vl.province = 'Batangas'
           AND vl.age BETWEEN 15 AND 30)::INTEGER as total_eligible_voters,
        
        -- Unique surveyed youths (validated responses)
        COALESCE(COUNT(DISTINCT ypt.voter_id) FILTER (WHERE ksr.validation_status = 'validated'), 0)::INTEGER as total_youths_surveyed,
        
        -- Not surveyed (eligible voters - surveyed)
        ((SELECT COUNT(*) FROM "Voters_List" vl 
          WHERE vl.is_active = true 
            AND vl.municipality = 'San Jose' 
            AND vl.province = 'Batangas'
            AND vl.age BETWEEN 15 AND 30) - 
         COUNT(DISTINCT ypt.voter_id) FILTER (WHERE ksr.validation_status = 'validated'))::INTEGER as total_youths_not_surveyed,
        
        -- Response rate (validated responses / eligible voters)
        CASE 
            WHEN (SELECT COUNT(*) FROM "Voters_List" vl 
                  WHERE vl.is_active = true 
                    AND vl.municipality = 'San Jose' 
                    AND vl.province = 'Batangas'
                    AND vl.age BETWEEN 15 AND 30) > 0 
            THEN ROUND((COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated')::DECIMAL / 
                (SELECT COUNT(*) FROM "Voters_List" vl 
                 WHERE vl.is_active = true 
                   AND vl.municipality = 'San Jose' 
                   AND vl.province = 'Batangas'
                   AND vl.age BETWEEN 15 AND 30)) * 100, 2)
            ELSE 0.00
        END as response_rate,
        
        -- Validation rate (validated / total responses)
        CASE 
            WHEN COUNT(ksr.response_id) > 0 THEN ROUND((COUNT(ksr.response_id) FILTER (WHERE ksr.validation_status = 'validated')::DECIMAL / COUNT(ksr.response_id)) * 100, 2)
            ELSE 0.00
        END as validation_rate,
        
        -- Validation tier breakdown
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_tier = 'automatic'), 0)::INTEGER as automatic_validations,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_tier = 'manual'), 0)::INTEGER as manual_validations,
        COALESCE(COUNT(ksr.response_id) FILTER (WHERE ksr.validation_tier = 'final'), 0)::INTEGER as pending_validations
        
    FROM "KK_Survey_Responses" ksr
    LEFT JOIN "Youth_Participation_Tracking" ypt ON ksr.response_id = ypt.response_id
    WHERE ksr.batch_id = batch_id_param;
END;
$$ LANGUAGE plpgsql;
```

## Youth Participation Dashboard

### Key Metrics to Display:
1. **Individual Youth Profile:**
   - Total surveys participated
   - Batches completed vs missed
   - Validation status history
   - Participation timeline

2. **Batch Overview:**
   - Total eligible voters (from voter list)
   - Responses received
   - Validation breakdown (automatic vs manual)
   - Completion rate

3. **Validation Queue:**
   - Pending manual validations
   - SK official workload
   - Average validation time

## Implementation Steps

### Phase 1: Database Schema Updates
1. Add validation fields to `KK_Survey_Responses`
2. Enhance `Voters_List` table
3. Create `Youth_Participation_Tracking` table
4. Create validation functions

### Phase 2: Validation Logic
1. Implement automatic validation algorithm
2. Create manual validation interface for SK officials
3. Build duplicate detection system

### Phase 3: Statistics & Reporting
1. Update statistics calculation functions
2. Create youth participation dashboard
3. Build validation queue management

### Phase 4: Frontend Integration
1. Update survey form to collect validation data
2. Create SK official validation interface
3. Build youth participation tracking views

## Benefits of This Approach

1. **Data Integrity**: Voter list cross-referencing ensures legitimate participants
2. **Efficiency**: Automatic validation reduces manual workload
3. **Transparency**: Clear validation tiers and processes
4. **Tracking**: Complete participation history per youth
5. **Accuracy**: Real statistics based on actual eligible population

This system ensures that only legitimate San Jose, Batangas youth (ages 15-30) can participate in surveys, while maintaining efficiency through automated validation and providing comprehensive tracking capabilities.
