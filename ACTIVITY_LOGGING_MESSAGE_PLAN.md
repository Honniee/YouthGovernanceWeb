# Activity Logging Message System - Planning Document

## Current Problem
- Activity logs currently show technical action codes like `CREATE_SURVEY_BATCH`, `VALIDATE_SURVEY_RESPONSE`
- Not user-friendly - admins need to interpret what each action means
- Missing context like who did what to which resource

## Proposed Solution
Add a `message` field to Activity_Logs that stores human-readable descriptions like:
- "Admin Juan Dela Cruz created survey batch 'KK Survey 2024 Q1'"
- "SK Official Maria Santos validated survey response for Youth John Doe"
- "Admin Pedro Reyes archived youth profile for Juan Dela Cruz"

## Database Schema Changes

### Option 1: Add `message` column (Recommended)
```sql
ALTER TABLE "Activity_Logs" 
ADD COLUMN message TEXT NULL;
```

### Option 2: Use existing `resource_name` field differently
- Store descriptive message in `resource_name` instead of ID
- Keep `resource_id` for the actual ID

**Decision: Option 1 is better** - keeps backward compatibility and doesn't break existing logic

## Message Format Structure

### Pattern:
`[User Role] [User Name] [Action Verb] [Resource Type] [Resource Name/Identifier]`

### Examples:

#### Survey Batch Operations
- Create: `"Admin [Name] created survey batch '[Batch Name]'"`
- Update: `"Admin [Name] updated survey batch '[Batch Name]'"`
- Delete: `"Admin [Name] deleted survey batch '[Batch Name]'"`
- Status Change: `"Admin [Name] changed status of survey batch '[Batch Name]' to '[Status]'"`

#### Validation Operations
- Validate: `"SK Official [Name] validated survey response for Youth [Youth Name]"`
- Reject: `"SK Official [Name] rejected survey response for Youth [Youth Name]"`
- Bulk Validate: `"SK Official [Name] validated [Count] survey responses"`

#### Staff Management
- Create: `"Admin [Name] created staff member '[Staff Name]'"`
- Update: `"Admin [Name] updated staff member '[Staff Name]'"`
- Activate: `"Admin [Name] activated staff member '[Staff Name]'"`
- Deactivate: `"Admin [Name] deactivated staff member '[Staff Name]'"`

#### SK Management
- Create: `"Admin [Name] created SK Official '[SK Name]' for [Barangay]"`
- Update: `"Admin [Name] updated SK Official '[SK Name]'"`
- Bulk Import: `"Admin [Name] imported [Count] SK Officials"`

#### Youth Management
- Archive: `"Admin [Name] archived youth profile for '[Youth Name]'"`
- Unarchive: `"Admin [Name] unarchived youth profile for '[Youth Name]'"`

#### Council Management
- Create Role: `"Admin [Name] created council role '[Role Name]'"`
- Create Member: `"Admin [Name] added '[Member Name]' as '[Role Name]' to council"`
- Update Member: `"Admin [Name] updated council member '[Member Name]'"`
- Delete Member: `"Admin [Name] removed '[Member Name]' from council"`

#### Authentication
- Login: `"Admin [Name] logged in"`
- Logout: `"Admin [Name] logged out"`
- Password Change: `"Admin [Name] changed password"`

## Implementation Plan

### Phase 1: Database Migration
1. Add `message` column to `Activity_Logs` table
2. Create migration script

### Phase 2: Update `createAuditLog` Function
1. Modify `backend/middleware/auditLogger.js`
2. Add `message` parameter (optional)
3. Generate message if not provided using helper function
4. Store message in database

### Phase 3: Create Message Generator Helper
1. Create `backend/utils/activityLogMessageGenerator.js`
2. Function: `generateActivityMessage(action, userInfo, resourceInfo, details)`
3. Map action codes to message templates
4. Fill in user names, resource names dynamically

### Phase 4: Update All Controllers
1. Update all `createAuditLog` calls to include `message`
2. Or let helper generate automatically based on action and context

### Phase 5: Update Frontend
1. Update `ActivityLogs.jsx` to display `message` instead of `action`
2. Show `message` as main content
3. Keep `action` in details for technical reference

## Message Generator Logic

```javascript
// Example helper function
export const generateActivityMessage = async (action, userInfo, resourceInfo, details) => {
  // Get user name from database if needed
  const userName = await getUserName(userInfo.userId, userInfo.userType);
  const userRole = formatUserRole(userInfo.userType);
  
  // Map actions to message templates
  const messageTemplates = {
    'CREATE_SURVEY_BATCH': `${userRole} ${userName} created survey batch '${resourceInfo.name}'`,
    'UPDATE_SURVEY_BATCH': `${userRole} ${userName} updated survey batch '${resourceInfo.name}'`,
    'DELETE_SURVEY_BATCH': `${userRole} ${userName} deleted survey batch '${resourceInfo.name}'`,
    'VALIDATE_SURVEY_RESPONSE': `${userRole} ${userName} validated survey response for Youth ${resourceInfo.youthName}`,
    'REJECT_SURVEY_RESPONSE': `${userRole} ${userName} rejected survey response for Youth ${resourceInfo.youthName}`,
    'CREATE_STAFF': `${userRole} ${userName} created staff member '${resourceInfo.name}'`,
    // ... more templates
  };
  
  return messageTemplates[action] || `${userRole} ${userName} performed ${action}`;
};
```

## Benefits
1. ✅ User-friendly - Easy to understand at a glance
2. ✅ Context-rich - Includes who, what, and which resource
3. ✅ Searchable - Can search by resource names, user names
4. ✅ Readable in reports - Better for export and reporting
5. ✅ Backward compatible - Old logs still work, new logs have messages

## Considerations
1. **Performance**: Fetching user/resource names might require database queries
   - Solution: Pass names in `details` when available, fetch if missing
   
2. **Consistency**: Need consistent message format across all actions
   - Solution: Centralized message generator with templates

3. **Localization**: Future-proof for multiple languages
   - Solution: Template-based approach makes i18n easier

4. **Existing Logs**: Old logs won't have messages
   - Solution: Show fallback to action code if message is null

## Next Steps
1. ✅ Get approval on plan
2. Create database migration
3. Implement message generator
4. Update auditLogger middleware
5. Update all controller calls
6. Update frontend display
7. Test and verify

