# KK Survey Batches Database Enhancements

## Overview
This migration adds essential enhancements to the `KK_Survey_Batches` table to support advanced functionality including pause/resume operations, audit trails, and performance optimizations.

## Files Included

### 1. `add_kk_batches_enhancements.sql`
**Main migration file** - Adds all enhancements to the database.

### 2. `validate_kk_batches_enhancements.sql`
**Validation script** - Verifies that all enhancements were applied correctly.

### 3. `rollback_kk_batches_enhancements.sql`
**Rollback script** - Removes all enhancements if needed (⚠️ **Warning**: Data loss!).

### 4. `sample_kk_batches_data.sql`
**Test data script** - Inserts sample data for testing the new functionality.

## Migration Steps

### Step 1: Apply Main Migration
```sql
-- Run this first
\i database/migrations/add_kk_batches_enhancements.sql
```

### Step 2: Validate Installation
```sql
-- Verify everything was installed correctly
\i database/migrations/validate_kk_batches_enhancements.sql
```

### Step 3: Insert Test Data (Optional)
```sql
-- Add sample data for testing
\i database/migrations/sample_kk_batches_data.sql
```

## What's Added

### 🔧 **New Columns**
| Column | Type | Purpose |
|--------|------|---------|
| `paused_at` | TIMESTAMP | When the batch was paused |
| `paused_by` | VARCHAR(20) | Who paused the batch (LYDO ID) |
| `paused_reason` | TEXT | Reason for pausing |
| `resumed_at` | TIMESTAMP | When the batch was resumed |
| `resumed_by` | VARCHAR(20) | Who resumed the batch (LYDO ID) |

### 📊 **New Indexes**
- `idx_kk_batches_status` - Fast status queries
- `idx_kk_batches_status_dates` - Combined status and date queries
- `idx_kk_batches_active_status` - Partial index for active batches only
- `idx_kk_batches_status_created` - Status with creation date ordering

### 🔒 **New Constraints**
- Foreign key constraints for `paused_by` and `resumed_by` referencing `LYDO` table

### ⚙️ **New Functions**

#### `check_active_kk_survey(excluding_batch_id)`
```sql
-- Check if there's already an active KK survey
SELECT * FROM check_active_kk_survey();
SELECT * FROM check_active_kk_survey('BAT001'); -- Exclude BAT001
```

#### `check_batch_date_conflicts(start_date, end_date, excluding_batch_id)`
```sql
-- Check for date conflicts with existing batches
SELECT * FROM check_batch_date_conflicts('2024-01-01', '2024-01-31');
```

#### `get_batches_needing_status_update()`
```sql
-- Get batches that need automatic status updates
SELECT * FROM get_batches_needing_status_update();
```

#### `calculate_batch_statistics(batch_id)`
```sql
-- Calculate comprehensive statistics for a batch
SELECT * FROM calculate_batch_statistics('BAT001');
```

### 👁️ **New Views**

#### `active_batches_with_stats`
Shows active and draft batches with calculated statistics and time-based flags.
```sql
SELECT batch_id, batch_name, status, days_remaining, is_overdue, response_rate 
FROM active_batches_with_stats;
```

#### `batch_audit_trail`
Comprehensive audit trail showing who created, paused, and resumed batches.
```sql
SELECT batch_id, batch_name, created_by_name, paused_by_name, paused_reason 
FROM batch_audit_trail;
```

### 🔄 **New Triggers**
- `trigger_batch_pause_timestamps` - Automatically manages pause/resume timestamps

## Business Logic Support

### ✅ **Validation Functions**
- **Single Active KK Survey**: Ensures only one active KK survey at a time
- **Date Conflict Detection**: Prevents overlapping survey periods
- **Auto Status Updates**: Identifies batches needing status changes based on dates

### 📈 **Statistics Calculation**
- Real-time response rates
- Validation rates
- Participation metrics
- Youth coverage statistics

### 🔍 **Performance Optimizations**
- Optimized indexes for common query patterns
- Partial indexes for active batches
- Composite indexes for multi-column queries

## Usage Examples

### Check Business Rules
```sql
-- Ensure no active KK survey conflicts
SELECT COUNT(*) as active_count FROM check_active_kk_survey();

-- Check for date conflicts before creating new batch
SELECT * FROM check_batch_date_conflicts('2024-06-01', '2024-07-31');
```

### Pause/Resume Operations
```sql
-- Pause a batch
UPDATE "KK_Survey_Batches" SET
    paused_at = CURRENT_TIMESTAMP,
    paused_by = 'LYDO001',
    paused_reason = 'System maintenance'
WHERE batch_id = 'BAT002';

-- Resume a batch
UPDATE "KK_Survey_Batches" SET
    resumed_at = CURRENT_TIMESTAMP,
    resumed_by = 'LYDO001',
    paused_at = NULL,
    paused_reason = NULL
WHERE batch_id = 'BAT002';
```

### Statistics and Monitoring
```sql
-- Get real-time statistics
SELECT * FROM active_batches_with_stats;

-- Monitor pause/resume activities
SELECT * FROM batch_audit_trail WHERE paused_at IS NOT NULL;

-- Check for batches needing status updates
SELECT * FROM get_batches_needing_status_update();
```

## Rollback Instructions

⚠️ **Warning**: Rollback will permanently delete all pause/resume audit data!

```sql
-- Only if you need to undo all changes
\i database/migrations/rollback_kk_batches_enhancements.sql
```

## Performance Notes

- All new indexes are optimized for the expected query patterns
- Functions use efficient PostgreSQL features
- Views are materialized for better performance on large datasets
- Triggers have minimal overhead and only fire when necessary

## Compatibility

- Compatible with existing `KK_Survey_Batches` table structure
- No breaking changes to existing functionality
- All new columns are nullable to maintain compatibility
- Foreign key constraints use `ON DELETE SET NULL` for safety

## Next Steps

After applying these enhancements:

1. ✅ **Backend API Development** - Use these functions in your service layer
2. ✅ **Frontend Integration** - Connect the React components to use real data
3. ✅ **Testing** - Comprehensive testing of all new functionality
4. ✅ **Monitoring** - Set up monitoring for the new audit features

---

**Author**: AI Assistant  
**Version**: 1.0  
**Date**: 2024  
**Status**: Ready for Production
