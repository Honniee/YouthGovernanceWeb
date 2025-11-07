# SK Terms Audit Logging Analysis

## Summary of Issues Found

### 🔴 Critical Issues (Need Immediate Fix)

1. **Uppercase Actions** - All `universalAuditService` methods use uppercase actions (`'CREATE'`, `'UPDATE'`, `'DELETE'`, `'ACTIVATE'`, `'COMPLETE'`) instead of title case (`'Create'`, `'Update'`, `'Delete'`, `'Activate'`, `'Complete'`)

2. **Missing resourceName** - `universalAuditService` methods don't set `resourceName` field, so logs store IDs instead of readable names (e.g., `'TRM002'` instead of `'2025-2027 Term Name'`)

3. **String details instead of structured JSON** - Uses plain string `details` instead of structured JSON object with `resourceType`, `termName`, etc.

4. **Incorrect resource path** - Uses `'sk-terms'` instead of `/api/sk-terms` which affects resource type extraction

5. **User ID extraction** - May default to 'SYSTEM' instead of extracting from `req.user` properly

### 📋 Detailed Analysis by Function

#### 1. `createTerm` (Line 697)
**Current:** `universalAuditService.logCreation`
- ❌ Action: `'CREATE'` (uppercase)
- ❌ resourceName: Not set (will be term ID)
- ❌ details: String `"Created SK Term: ${termName}"`
- ❌ resource: `'sk-terms'` (should be `/api/sk-terms`)
- ❌ userId: May default to 'SYSTEM'

**Should be:**
```javascript
await createAuditLog({
  userId: req.user?.id || req.user?.lydo_id || req.user?.lydoId || null,
  userType: req.user?.userType || 'admin',
  action: 'Create',
  resource: '/api/sk-terms',
  resourceId: newTerm.term_id,
  resourceName: newTerm.term_name,
  details: {
    resourceType: 'sk-terms',
    termId: newTerm.term_id,
    termName: newTerm.term_name,
    startDate: newTerm.start_date,
    endDate: newTerm.end_date,
    status: newTerm.status
  },
  ipAddress: req.ip || req.connection.remoteAddress,
  userAgent: req.get('User-Agent'),
  status: 'success'
})
```

#### 2. `updateTerm` (Line 875)
**Current:** `universalAuditService.logUpdate`
- ❌ Action: `'UPDATE'` (uppercase)
- ❌ resourceName: Not set
- ❌ details: String
- ❌ resource: `'sk-terms'`
- ❌ userId: May default to 'SYSTEM'

**Should be:** Direct `createAuditLog` with title case `'Update'`, proper resourceName, structured details

#### 3. `deleteTerm` (Line 978)
**Current:** `universalAuditService.logDeletion`
- ❌ Action: `'DELETE'` (uppercase)
- ❌ resourceName: Not set
- ❌ details: String
- ❌ resource: `'sk-terms'`
- ❌ userId: May default to 'SYSTEM'

**Should be:** Direct `createAuditLog` with title case `'Delete'`, proper resourceName, structured details

#### 4. `activateTerm` (Line 1110)
**Status:** ✅ **ALREADY FIXED**
- ✅ Action: `'Activate'` (title case)
- ✅ resourceName: Set to term name
- ✅ details: Structured JSON
- ✅ resource: `/api/sk-terms`
- ✅ userId: Properly extracted

#### 5. `completeTerm` (Line 1508)
**Current:** `universalAuditService.logStatusChange`
- ❌ Action: `'COMPLETE'` (uppercase)
- ❌ resourceName: Not set
- ❌ details: String
- ❌ resource: `'sk-terms'`
- ✅ userId: Properly extracted (line 1361)

**Should be:** Direct `createAuditLog` with title case `'Complete'`, proper resourceName, structured details

#### 6. `extendTerm` (Line 2149)
**Current:** `universalAuditService.logStatusChange`
- ❌ Action: `'ACTIVATE'` (uppercase) - but this is actually an extension, not activation
- ❌ resourceName: Not set
- ❌ details: String
- ❌ resource: `'sk-terms'`
- ✅ userId: Properly extracted

**Should be:** Direct `createAuditLog` with action `'Extend'` or `'Activate'` (title case), proper resourceName, structured details

#### 7. `exportTermDetailed` (Line 1898)
**Status:** ✅ **ALREADY FIXED**
- ✅ Action: `'Export'` (title case)
- ✅ resourceName: Descriptive name
- ✅ details: Structured JSON
- ✅ resource: `/api/sk-terms`
- ✅ userId: Properly extracted

#### 8. `exportSKTerms` (Line 2281)
**Status:** ✅ **ALREADY FIXED**
- ✅ Action: `'Export'` (title case)
- ✅ resourceName: Descriptive name
- ✅ details: Structured JSON
- ✅ resource: `/api/sk-terms/export`
- ⚠️ userId: Uses fallback to 'SYSTEM' but tries multiple fields

### 📊 Issue Summary Table

| Function | Action Format | resourceName | details Format | resource Path | userId | Status |
|----------|--------------|--------------|----------------|---------------|--------|--------|
| createTerm | ❌ Uppercase | ❌ Missing | ❌ String | ❌ Wrong | ❌ May default | 🔴 Needs Fix |
| updateTerm | ❌ Uppercase | ❌ Missing | ❌ String | ❌ Wrong | ❌ May default | 🔴 Needs Fix |
| deleteTerm | ❌ Uppercase | ❌ Missing | ❌ String | ❌ Wrong | ❌ May default | 🔴 Needs Fix |
| activateTerm | ✅ Title case | ✅ Set | ✅ Structured | ✅ Correct | ✅ Correct | ✅ Fixed |
| completeTerm | ❌ Uppercase | ❌ Missing | ❌ String | ❌ Wrong | ✅ Correct | 🔴 Needs Fix |
| extendTerm | ❌ Uppercase | ❌ Missing | ❌ String | ❌ Wrong | ✅ Correct | 🔴 Needs Fix |
| exportTermDetailed | ✅ Title case | ✅ Set | ✅ Structured | ✅ Correct | ✅ Correct | ✅ Fixed |
| exportSKTerms | ✅ Title case | ✅ Set | ✅ Structured | ✅ Correct | ⚠️ Partial | ✅ Fixed |

### 🎯 Action Items

1. **Replace `universalAuditService.logCreation`** in `createTerm` with direct `createAuditLog`
2. **Replace `universalAuditService.logUpdate`** in `updateTerm` with direct `createAuditLog`
3. **Replace `universalAuditService.logDeletion`** in `deleteTerm` with direct `createAuditLog`
4. **Replace `universalAuditService.logStatusChange`** in `completeTerm` with direct `createAuditLog`
5. **Replace `universalAuditService.logStatusChange`** in `extendTerm` with direct `createAuditLog`
6. **Update `exportSKTerms`** userId extraction to match other fixed functions (optional improvement)

### 🔍 Pattern to Follow (from activateTerm)

All fixed functions should follow this pattern:
```javascript
await createAuditLog({
  userId: req.user?.id || req.user?.lydo_id || req.user?.lydoId || null,
  userType: req.user?.userType || 'admin',
  action: 'TitleCase', // Title case action
  resource: '/api/sk-terms', // Full API path
  resourceId: termId, // Term ID
  resourceName: termName, // Term name (not ID)
  details: {
    resourceType: 'sk-terms',
    termId: termId,
    termName: termName,
    // ... other relevant fields
  },
  ipAddress: req.ip || req.connection.remoteAddress,
  userAgent: req.get('User-Agent'),
  status: 'success'
}).catch(err => console.error('Audit log failed:', err));
```

### 📝 Special Cases

1. **completeTerm**: Action should be `'Complete'`, include `completionType`, `officialsAffected`, `reason`
2. **extendTerm**: Action should be `'Activate'` (since it reactivates the term), include `oldEndDate`, `newEndDate`, `reason`, `officialsAffected`
3. **deleteTerm**: This is a soft delete (sets `is_active = false`), should clearly indicate this in details




