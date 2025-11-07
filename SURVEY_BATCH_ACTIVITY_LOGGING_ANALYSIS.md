# Survey Batch Activity Logging - Analysis Report

## Current Status

### ✅ Operations WITH Activity Logging:

1. **Create Batch** (`createBatch`) - Line 115
   - Action: `CREATE_SURVEY_BATCH` ❌ (OLD FORMAT - uppercase with underscores)
   - Has: `userId`, `action`, `resourceType`, `resourceId`, `details` (string)
   - Missing: `userType`, `resource` path, `resourceName`, `message` field, proper category
   - Format: Old format using simple details string

2. **Update Batch** (`updateBatch`) - Line 302
   - Action: `UPDATE_SURVEY_BATCH` ❌ (OLD FORMAT)
   - Has: `userId`, `action`, `resourceType`, `resourceId`, `details` (string)
   - Missing: `userType`, `resource` path, `resourceName`, `message` field, proper category
   - Format: Old format using simple details string

3. **Delete Batch** (`deleteBatch`) - Line 384
   - Action: `DELETE_SURVEY_BATCH` ❌ (OLD FORMAT)
   - Has: `userId`, `action`, `resourceType`, `resourceId`, `details` (string)
   - Missing: `userType`, `resource` path, `resourceName`, `message` field, proper category
   - Format: Old format using simple details string

4. **Update Batch Status** (`updateBatchStatus`) - Line 478
   - Actions: 
     - `PAUSE_SURVEY_BATCH` ❌
     - `RESUME_SURVEY_BATCH` ❌
     - `ACTIVATE_SURVEY_BATCH` ❌
     - `CLOSE_SURVEY_BATCH` ❌
     - `FORCE_ACTIVATE_SURVEY_BATCH` ❌
     - `FORCE_CLOSE_SURVEY_BATCH` ❌
   - Has: `userId`, `action`, `resourceType`, `resourceId`, `details` (string with reason)
   - Missing: `userType`, `resource` path, `resourceName`, `message` field, proper category
   - Format: Old format using simple details string

5. **Bulk Update Status** (`bulkUpdateStatus`) - Line 711
   - Action: `BULK_UPDATE_SURVEY_BATCH_STATUS` ❌ (OLD FORMAT)
   - Has: `userId`, `action`, `resourceType`, `resourceId`, `details` (string)
   - Missing: `userType`, `resource` path, `resourceName`, `message` field, proper category
   - Note: Logs each batch individually in loop
   - Format: Old format using simple details string

### ❌ Operations MISSING Activity Logging:

1. **Export Operations** - NO LOGGING
   - The frontend `SurveyBatch.jsx` performs exports client-side (CSV, Excel, PDF)
   - Line 1223-1245: `mainExport` function exports data client-side
   - Line 1248-1267: `bulkExportHook` function exports selected batches client-side
   - **CRITICAL**: These exports are not logged because they're done in the browser, not on the backend
   - Should implement backend export logging similar to other pages

## Issues Identified

### 1. **Outdated Action Format** ❌
   - Current: Using uppercase with underscores (`CREATE_SURVEY_BATCH`, `UPDATE_SURVEY_BATCH`)
   - Should be: Title Case (`Create`, `Update`, `Delete`, `Activate`, `Close`, etc.)
   - Consistent with: Staff Management, SK Terms, Youth Management (all use Title Case now)

### 2. **Missing Required Fields** ❌
   - **`userType`**: Not provided (should be `req.user?.userType || 'admin'`)
   - **`resource`**: Not provided (should be `'/api/survey-batches'`)
   - **`resourceName`**: Not provided (should be batch name like `updatedBatch.batch_name`)
   - **`message`**: Not using the new message generator system
   - **`category`**: Not explicitly set (auto-detected, should be "Survey Management")

### 3. **Old Details Format** ❌
   - Current: Simple string like `"Created survey batch: ${newBatch.batch_name}"`
   - Should be: Structured object with proper fields:
     ```javascript
     details: {
       resourceType: 'survey-batch',
       batchId: newBatch.batch_id,
       batchName: newBatch.batch_name,
       startDate: newBatch.start_date,
       endDate: newBatch.end_date,
       status: newBatch.status
     }
     ```

### 4. **Export Operations Not Logged** ❌ CRITICAL
   - All export operations happen client-side
   - No backend API call for exports
   - Cannot track who exported what data
   - Need to implement backend export endpoint or client-side logging service

### 5. **Status Update Actions Need Better Naming** ⚠️
   - Current actions are very specific (`PAUSE_SURVEY_BATCH`, `RESUME_SURVEY_BATCH`)
   - Should be: `Pause`, `Resume`, `Activate`, `Close`, `Force Activate`, `Force Close`
   - Keep action type in `details.action` field

## Comparison with Other Controllers

### SK Terms (Good Example):
```javascript
await createAuditLog({
  userId: userId || req.user?.id || req.user?.lydo_id || req.user?.lydoId || null,
  userType: req.user?.userType || 'admin',
  action: 'Activate', // ✅ Title Case
  resource: '/api/sk-terms',
  resourceId: id,
  resourceName: updatedTerm.term_name, // ✅ Resource name
  resourceType: 'sk-terms',
  details: {
    resourceType: 'sk-terms',
    termId: updatedTerm.term_id,
    termName: updatedTerm.term_name,
    action: action || 'update',
    oldStatus: currentTerm.status,
    newStatus: status,
    // ... more structured data
  },
  ipAddress: req.ip || req.connection.remoteAddress,
  userAgent: req.get('User-Agent'),
  status: 'success'
});
```

### Survey Batch (Current - Needs Update):
```javascript
await createAuditLog({
  userId: sanitizedData.created_by,
  action: 'CREATE_SURVEY_BATCH', // ❌ Old format
  resourceType: 'Survey_Batch', // ❌ Wrong format
  resourceId: newBatch.batch_id,
  details: `Created survey batch: ${newBatch.batch_name}`, // ❌ Simple string
  ipAddress: req.ip,
  userAgent: req.get('User-Agent')
  // ❌ Missing: userType, resource, resourceName, message, category
});
```

## Recommended Fixes

### Priority 1: Update All Action Formats
1. Change `CREATE_SURVEY_BATCH` → `Create`
2. Change `UPDATE_SURVEY_BATCH` → `Update`
3. Change `DELETE_SURVEY_BATCH` → `Delete`
4. Change `ACTIVATE_SURVEY_BATCH` → `Activate`
5. Change `CLOSE_SURVEY_BATCH` → `Close`
6. Change `PAUSE_SURVEY_BATCH` → `Pause`
7. Change `RESUME_SURVEY_BATCH` → `Resume`
8. Change `FORCE_ACTIVATE_SURVEY_BATCH` → `Force Activate`
9. Change `FORCE_CLOSE_SURVEY_BATCH` → `Force Close`
10. Change `BULK_UPDATE_SURVEY_BATCH_STATUS` → `Bulk Update Status`

### Priority 2: Add Missing Fields
1. Add `userType: req.user?.userType || 'admin'`
2. Add `resource: '/api/survey-batches'`
3. Add `resourceName: batch.batch_name` (use actual batch name, not ID)
4. Add structured `details` object
5. Let `createAuditLog` auto-generate `message` (or provide custom message)
6. Ensure `category` is "Survey Management"

### Priority 3: Implement Export Logging
1. Option A: Add backend export endpoint that generates files server-side and logs
2. Option B: Create client-side logging service that sends export events to backend
3. Track: Export format (CSV, Excel, PDF), batch count, filters applied

## Example of Corrected Code

### Create Batch (After Fix):
```javascript
await createAuditLog({
  userId: sanitizedData.created_by || req.user?.id || req.user?.lydo_id || req.user?.lydoId || null,
  userType: req.user?.userType || 'admin',
  action: 'Create', // ✅ Title Case
  resource: '/api/survey-batches',
  resourceId: newBatch.batch_id,
  resourceName: newBatch.batch_name, // ✅ Actual name
  resourceType: 'survey-batch',
  details: {
    resourceType: 'survey-batch',
    batchId: newBatch.batch_id,
    batchName: newBatch.batch_name,
    startDate: newBatch.start_date,
    endDate: newBatch.end_date,
    status: newBatch.status,
    targetAgeMin: newBatch.target_age_min,
    targetAgeMax: newBatch.target_age_max
  },
  ipAddress: req.ip || req.connection.remoteAddress,
  userAgent: req.get('User-Agent'),
  status: 'success'
});
```

## Summary

**Current State**: Survey Batch has activity logging, but it's using the OLD FORMAT
**Issue**: Actions are uppercase with underscores, missing fields, simple details strings
**Impact**: Inconsistent with rest of system, harder to read in Activity Logs page
**Priority**: HIGH - Should be updated to match Staff/SK Terms/Youth Management patterns
**Export Logging**: CRITICAL MISSING - Need to implement export tracking


