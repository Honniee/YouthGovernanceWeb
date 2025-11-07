# SK Terms - Bulk Operations Analysis

## 📋 Current State

### **Frontend Implementation**
- ✅ **Bulk UI exists** in `frontend/src/pages/admin/SKTerms.jsx`
- ✅ Users can select multiple terms
- ✅ Bulk operations modal with actions:
  - `activate` - Activate multiple terms
  - `complete` - Complete multiple terms
- ⚠️ **BUT**: This is NOT a real bulk operation - it's just calling individual endpoints in a loop

### **Backend Implementation**
- ❌ **NO bulk status update endpoint exists** (`/api/sk-terms/bulk/status` does NOT exist)
- ❌ Frontend calls individual endpoints in a loop (`Promise.all` with individual `activateSKTerm`/`completeSKTerm` calls)
- ❌ Each operation creates a separate activity log (not a single bulk log)
- ✅ **ONLY bulk export exists** - can export multiple terms at once

---

## 🔍 Current Implementation Details

### **Frontend Code** (`SKTerms.jsx` lines 2132-2168)
```javascript
// Execute bulk operations
const promises = selectedItems.map(async (termId) => {
  const term = termsData.find(t => t.termId === termId);
  if (!term) return;
  
  switch (bulkAction) {
    case 'activate':
      if (term.status === 'upcoming') {
        return skTermsService.activateSKTerm(termId); // Individual call
      }
      break;
    case 'complete':
      if (term.status === 'active') {
        return skTermsService.completeSKTerm(termId); // Individual call
      }
      break;
  }
});

await Promise.all(promises);
```

### **Issues with Current Approach**
1. **Multiple API Calls** - One request per term (inefficient)
2. **Multiple Activity Logs** - Each term creates a separate log entry
3. **No Bulk Summary** - No single log showing "Bulk Activate 5 terms"
4. **Transaction Safety** - No database transaction wrapping all operations
5. **Error Handling** - Partial failures not tracked in a single summary

---

## 📊 Comparison with Other Entities

### **Staff Management** ✅ Has Bulk Endpoint
- **Endpoint**: `POST /api/staff/bulk/status`
- **Actions**: `activate`, `deactivate`
- **Activity Log**: Single `Bulk Activate` or `Bulk Deactivate` log
- **Details**: `totalItems`, `successCount`, `action`

### **Youth Management** ✅ Has Bulk Endpoint
- **Endpoint**: `POST /api/youth/bulk`
- **Actions**: `archive`, `unarchive`
- **Activity Log**: Single `Bulk Archive` or `Bulk Unarchive` log
- **Details**: `totalItems`, `successCount`, `errorCount`, `action`

### **SK Officials** ✅ Has Bulk Endpoint
- **Endpoint**: `PUT /api/sk-officials/bulk/status`
- **Actions**: `activate`, `deactivate`
- **Activity Log**: Single `Bulk Activate` or `Bulk Deactivate` log
- **Details**: `totalItems`, `successCount`, `errorCount`, `action`

### **SK Terms** ❌ NO Bulk Endpoint
- **Current**: Individual endpoint calls in loop
- **Activity Log**: Multiple individual logs
- **Missing**: Single bulk summary log

---

## 🎯 Recommended Implementation

### **1. Create Backend Bulk Endpoint**

**Endpoint**: `PATCH /api/sk-terms/bulk/status`

**Request Body**:
```json
{
  "ids": ["TRM001", "TRM002", "TRM003"],
  "action": "activate" | "complete",
  "force": false  // Optional, for complete action
}
```

**Response**:
```json
{
  "success": true,
  "message": "Bulk activate completed successfully",
  "processed": 3,
  "terms": [
    { "termId": "TRM001", "termName": "2025-2027 Term", "status": "active" },
    ...
  ],
  "errors": [] // If any failed
}
```

### **2. Backend Controller Function**

```javascript
// backend/controllers/skTermsController.js

const bulkUpdateStatus = async (req, res) => {
  const client = await getClient();
  
  try {
    const { ids, action, force = false } = req.body;
    
    // Validation
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid request: ids must be a non-empty array' 
      });
    }
    
    if (!['activate', 'complete'].includes(action)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid action: must be "activate" or "complete"' 
      });
    }

    await client.query('BEGIN');
    
    const results = [];
    const errors = [];
    
    // Process each term
    for (const id of ids) {
      try {
        if (action === 'activate') {
          // Validate and activate
          const validationErrors = await validateTermActivation(id, client);
          if (validationErrors.length > 0) {
            errors.push({ id, errors: validationErrors });
            continue;
          }
          
          await client.query(
            `UPDATE "SK_Terms" SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE term_id = $1 RETURNING *`,
            [id]
          );
          
          // Get term name for result
          const termResult = await client.query('SELECT term_id, term_name FROM "SK_Terms" WHERE term_id = $1', [id]);
          if (termResult.rows.length > 0) {
            results.push(termResult.rows[0]);
          }
          
        } else if (action === 'complete') {
          // Validate and complete (similar to completeTerm logic)
          // ... completion logic here ...
          
          // Get term name for result
          const termResult = await client.query('SELECT term_id, term_name FROM "SK_Terms" WHERE term_id = $1', [id]);
          if (termResult.rows.length > 0) {
            results.push(termResult.rows[0]);
          }
        }
      } catch (err) {
        console.error(`❌ Failed to ${action} term ${id}:`, err);
        errors.push({ id, error: err.message });
      }
    }

    await client.query('COMMIT');

    // Create SINGLE bulk audit log
    const bulkAction = action.charAt(0).toUpperCase() + action.slice(1);
    const resourceName = `SK Terms Bulk ${bulkAction} - ${results.length} ${results.length === 1 ? 'term' : 'terms'}`;
    
    await createAuditLog({
      userId: req.user?.id || req.user?.lydo_id || req.user?.lydoId || null,
      userType: req.user?.userType || 'admin',
      action: `Bulk ${bulkAction}`,
      resource: '/api/sk-terms/bulk/status',
      resourceId: null,
      resourceName: resourceName,
      details: {
        resourceType: 'sk-terms',
        totalItems: ids.length,
        successCount: results.length,
        errorCount: errors.length,
        action: action,
        termIds: ids,
        termNames: results.map(t => t.term_name)
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: errors.length === 0 ? 'success' : 'partial'
    });

    return res.json({
      success: true,
      message: `Bulk ${action} completed`,
      processed: results.length,
      errors: errors.length > 0 ? errors : undefined,
      terms: results
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Error in bulk ${req.body?.action || 'operation'}:`, error);
    
    // Create audit log for failed bulk operation
    await createAuditLog({
      userId: req.user?.id || req.user?.lydo_id || req.user?.lydoId || null,
      userType: req.user?.userType || 'admin',
      action: `Bulk ${req.body?.action ? req.body.action.charAt(0).toUpperCase() + req.body.action.slice(1) : 'Operation'}`,
      resource: '/api/sk-terms/bulk/status',
      resourceId: null,
      resourceName: `SK Terms Bulk Operation - Failed`,
      details: {
        resourceType: 'sk-terms',
        error: error.message,
        bulkOperationFailed: true
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'error',
      errorMessage: error.message
    });
    
    return res.status(500).json({ 
      success: false,
      message: 'Failed to perform bulk operation',
      error: error.message
    });
  } finally {
    client.release();
  }
};
```

### **3. Add Route**

```javascript
// backend/routes/skTerms.js

router.patch('/bulk/status', requireRole(['admin']), skTermsController.bulkUpdateStatus);
```

### **4. Update Frontend Service**

```javascript
// frontend/src/services/skTermsService.js

export const bulkUpdateStatus = async (ids, action, force = false) => {
  const response = await api.patch('/api/sk-terms/bulk/status', {
    ids,
    action,
    force
  });
  return response.data;
};
```

### **5. Update Frontend Component**

```javascript
// frontend/src/pages/admin/SKTerms.jsx

onExecute={async () => {
  try {
    setIsBulkProcessing(true);
    
    // Single API call instead of multiple
    const response = await skTermsService.bulkUpdateStatus(selectedItems, bulkAction);
    
    if (response.success) {
      showSuccessToast(
        'Bulk operation completed', 
        `${response.processed} term${response.processed > 1 ? 's' : ''} ${bulkAction}d successfully`
      );
      
      if (response.errors && response.errors.length > 0) {
        showWarningToast(
          'Some operations failed',
          `${response.errors.length} term${response.errors.length > 1 ? 's' : ''} could not be ${bulkAction}d`
        );
      }
      
      await loadTermsData(activeTab);
      setSelectedItems([]);
    }
  } catch (error) {
    showErrorToast('Bulk operation failed', error.message || 'An error occurred during bulk operation');
  } finally {
    setIsBulkProcessing(false);
    bulkModal.hideModal();
    setBulkAction('');
  }
}}
```

### **6. Add Message Templates**

```javascript
// backend/utils/activityLogMessageGenerator.js

// Add to templates object:
'BULK_ACTIVATE': details.termNames?.length > 0
  ? (details.resourceType === 'sk-terms'
    ? `${userRole} ${userName} activated ${details.successCount || details.totalItems || 'multiple'} SK term${details.successCount > 1 ? 's' : ''}: ${details.termNames.slice(0, 3).join(', ')}${details.termNames.length > 3 ? ` and ${details.termNames.length - 3} more` : ''}`
    : `${userRole} ${userName} activated ${details.totalItems || details.successCount || 'multiple'} SK officials`)
  : `${userRole} ${userName} activated ${details.totalItems || details.successCount || 'multiple'} SK terms`,

'Bulk Activate': details.termNames?.length > 0
  ? (details.resourceType === 'sk-terms'
    ? `${userRole} ${userName} activated ${details.successCount || details.totalItems || 'multiple'} SK term${details.successCount > 1 ? 's' : ''}: ${details.termNames.slice(0, 3).join(', ')}${details.termNames.length > 3 ? ` and ${details.termNames.length - 3} more` : ''}`
    : `${userRole} ${userName} activated ${details.totalItems || details.successCount || 'multiple'} SK officials`)
  : `${userRole} ${userName} activated ${details.totalItems || details.successCount || 'multiple'} SK terms`,

'BULK_COMPLETE': details.termNames?.length > 0
  ? `${userRole} ${userName} completed ${details.successCount || details.totalItems || 'multiple'} SK term${details.successCount > 1 ? 's' : ''}: ${details.termNames.slice(0, 3).join(', ')}${details.termNames.length > 3 ? ` and ${details.termNames.length - 3} more` : ''}`,
  
'Bulk Complete': details.termNames?.length > 0
  ? `${userRole} ${userName} completed ${details.successCount || details.totalItems || 'multiple'} SK term${details.successCount > 1 ? 's' : ''}: ${details.termNames.slice(0, 3).join(', ')}${details.termNames.length > 3 ? ` and ${details.termNames.length - 3} more` : ''}`,
```

---

## ✅ Benefits of Implementing Bulk Endpoint

1. **Single Activity Log** - One `Bulk Activate` or `Bulk Complete` log instead of multiple individual logs
2. **Better Performance** - Single database transaction vs multiple transactions
3. **Better Error Handling** - Summary of successes and failures
4. **Consistency** - Matches pattern used by Staff, Youth, SK Officials
5. **Efficiency** - Single API call vs multiple calls
6. **Audit Trail** - Clear bulk operation summary in activity logs

---

## 📝 Summary

**Current State**: 
- ❌ **NO bulk status update endpoint** - Frontend has bulk UI but it's "fake bulk" (just loops individual calls)
- ❌ Each operation creates a separate activity log (multiple `Activate` or `Complete` logs)
- ❌ No dedicated bulk status endpoint (`/api/sk-terms/bulk/status` does NOT exist)
- ✅ **ONLY bulk export exists** - Export can handle multiple terms

**Key Understanding**:
- The frontend bulk UI is misleading - it's not a real bulk operation
- It's just calling `activateSKTerm(termId)` or `completeSKTerm(termId)` multiple times
- There's no backend bulk status endpoint unlike Staff, Youth, or SK Officials
- Only export has real bulk capability (can export multiple terms in one operation)

**Recommended State** (if implementing):
- Create `PATCH /api/sk-terms/bulk/status` endpoint
- Single transaction for all operations
- Single `Bulk Activate` or `Bulk Complete` activity log
- Summary of successes and failures

**Impact** (if implemented): 
- Better activity logging (single bulk log instead of multiple individual logs)
- Better performance (single transaction vs multiple transactions)
- Consistency with other entities (Staff, Youth, SK Officials all have bulk endpoints)
- Better error handling and reporting

