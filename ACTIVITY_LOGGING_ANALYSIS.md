# Activity Logging Analysis Report

## Current Status

### ✅ Routes/Controllers WITH Activity Logging:
1. **Staff Management** (`staffController.js`) - ✅ Has `createAuditLog` for:
   - CREATE, UPDATE, DELETE, ACTIVATE, DEACTIVATE, BULK operations, EXPORT

2. **SK Officials** (`skOfficialsController.js`) - ✅ Has `createAuditLog` for:
   - CREATE, UPDATE, DELETE, BULK_IMPORT, EXPORT

3. **SK Terms** (`skTermsController.js`) - ✅ Has `createAuditLog` for:
   - Various operations including EXPORT

4. **Survey Batches** (`surveyBatchesController.js`) - ✅ Has `createAuditLog` for:
   - CREATE_SURVEY_BATCH, UPDATE_SURVEY_BATCH, DELETE_SURVEY_BATCH, BULK_UPDATE, EXPORT

5. **Announcements** (`announcementsController.js`) - ✅ Has `activityLogService.logActivity` for:
   - create, update, delete, bulk_update_status

6. **Authentication** (`auth.js`) - ✅ Has direct INSERT for:
   - LOGIN, LOGOUT

### ❌ Routes/Controllers MISSING Activity Logging:

1. **Validation Queue** (`validationQueueController.js`) - ❌ CRITICAL MISSING:
   - `validateQueueItem` (approve/reject) - NO logging
   - `bulkValidateQueueItems` - NO logging
   - These are SK Official actions that should be logged!

2. **Youth Management** (`youthController.js`) - ❌ MISSING:
   - `archiveYouth` - NO logging
   - `unarchiveYouth` - NO logging

3. **Council Management** (`councilController.js`) - ❌ MISSING:
   - `createCouncilRole` - NO logging
   - `updateCouncilRole` - NO logging
   - `deleteCouncilRole` - NO logging
   - `createCouncilMember` - NO logging
   - `updateCouncilMember` - NO logging
   - `deleteCouncilMember` - NO logging
   - `updateCouncilPage` - NO logging

4. **Survey Responses** (`surveyResponsesController.js`) - ❌ MISSING:
   - `saveSurveyResponse` - NO logging (youth auto-save)
   - `submitSurveyResponse` - NO logging (youth submission)
   - `createProfileAndSubmitSurvey` - NO logging (youth direct submission)

5. **Youth Profiles** (`youthProfilesController.js`) - ❌ MISSING:
   - All operations need to be checked

6. **System Notice** (`systemNoticeController.js`) - ❌ NEEDS CHECK:
   - All operations need to be checked

7. **Notifications** - ❌ NEEDS CHECK:
   - All operations need to be checked

8. **Statistics** - Usually read-only, may not need logging

## Issues Identified

### Critical Gaps:
1. **Validation Actions** - When SK officials validate/reject survey responses, this critical action is NOT logged to Activity_Logs. This should definitely be logged.

2. **Youth Actions** - When youth submit surveys or update profiles, these actions are NOT logged.

3. **Inconsistent Pattern** - Some controllers use `createAuditLog`, others use `activityLogService.logActivity`, creating inconsistency.

4. **Middleware Not Used** - The `auditLogger` middleware exists but is commented out in staff routes and not applied elsewhere.

## Recommendations

### Priority 1 (Critical):
1. Add activity logging to `validateQueueItem` and `bulkValidateQueueItems` in `validationQueueController.js`
   - Action: `VALIDATE_SURVEY_RESPONSE` or `REJECT_SURVEY_RESPONSE`
   - User: SK Official (from `req.user`)
   - Resource: Survey Response
   - Category: `Survey Management` or `Data Validation`

### Priority 2 (High):
2. Add activity logging to Youth actions:
   - `submitSurveyResponse` - Youth submitting survey
   - `createProfileAndSubmitSurvey` - Youth creating profile and submitting
   - `archiveYouth` / `unarchiveYouth` - Admin archiving youth

3. Add activity logging to Council Management:
   - All CRUD operations for roles and members

### Priority 3 (Medium):
4. Standardize on one logging approach (`createAuditLog` from `auditLogger.js`)
5. Consider applying `auditLogger` middleware globally or per-route-group

## Next Steps

1. Add logging to validation actions (Priority 1)
2. Add logging to youth actions (Priority 2)
3. Add logging to council actions (Priority 2)
4. Review and standardize logging approach

