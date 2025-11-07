# SK Terms Management - Activity Logs Table Analysis

## Current Table Structure

### Activity_Logs Table (Lines 340-362)
```sql
CREATE TABLE "Activity_Logs" (
    log_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) NULL,
    user_type TEXT CHECK (user_type IN ('admin', 'lydo_staff', 'sk_official', 'youth', 'anonymous')) NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'survey', 'user', 'validation', etc.
    resource_id VARCHAR(20) NULL,
    resource_name VARCHAR(100) NULL,
    message TEXT NULL;  -- ❌ SYNTAX ERROR: Should be comma, not semicolon
    details JSONB,
    category TEXT CHECK (category IN (..., 'Term Management', ...)) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES "Users"(user_id) ON DELETE SET NULL
);
```

## Issues Found

### 1. Syntax Error ❌
- **Line 349**: `message TEXT NULL;` should be `message TEXT NULL,` (comma, not semicolon)
- This will cause the CREATE TABLE statement to fail

### 2. Current Resource Type Usage
- SK Terms Controller uses: `resourceType: 'sk-terms'` in details object
- AuditLogger extracts from resource path: `/api/sk-terms` → `sk-terms`
- This is consistent and correct ✅

### 3. Category Usage
- Category: `'Term Management'` is included in CHECK constraint ✅
- Current usage: AuditLogger auto-determines category based on action and resource
- SK Terms operations should use `'Term Management'` category ✅

### 4. Indexes
Current indexes:
- ✅ `idx_activity_logs_resource` on (resource_type, resource_id) - Good for filtering by SK Terms
- ✅ `idx_activity_logs_created_at` - Good for sorting by date
- ✅ `idx_activity_logs_user_id` - Good for filtering by user
- ✅ `idx_activity_logs_action` - Good for filtering by action type

**Recommendation**: Add index on category for better filtering:
- ❌ Missing: `idx_activity_logs_category` on (category)

## Recommended Fixes

### Fix 1: Syntax Error
```sql
-- Line 349: Change semicolon to comma
message TEXT NULL,  -- Fixed
```

### Fix 2: Add Category Index (Optional but Recommended)
```sql
CREATE INDEX idx_activity_logs_category ON "Activity_Logs" (category);
```

## Current SK Terms Activity Logging

### Operations Being Logged:
1. ✅ **Create** - Term creation
2. ✅ **Update** - Term updates (name, dates)
3. ✅ **Delete** - Term deletion (soft delete)
4. ✅ **Activate** - Term activation
5. ✅ **Complete** - Term completion
6. ✅ **Export** - Term exports

### Data Structure:
```javascript
{
  userId: req.user?.lydo_id || req.user?.lydoId || null,
  userType: 'admin',
  action: 'Create' | 'Update' | 'Delete' | 'Activate' | 'Complete',
  resource: '/api/sk-terms',
  resourceId: term_id,
  resourceName: term_name,
  details: {
    resourceType: 'sk-terms',
    termId: term_id,
    termName: term_name,
    startDate: start_date,
    endDate: end_date,
    status: status
  },
  category: 'Term Management' // Auto-determined by auditLogger
}
```

## Migration Needed

1. Fix the syntax error if table already exists (ALTER TABLE)
2. Add category index for better query performance
3. Verify all SK Terms operations are properly logged



