# Email Templates Reference

This document lists all available email templates in the LYDO Youth Governance System.

## 📧 Available Email Templates (9 Total)

### 1. **staffWelcome** ✅ (Updated with New Design)
- **Subject:** "Welcome to LYDO Youth Governance System"
- **Purpose:** Sent to new staff members when their account is created
- **Required Data Fields:**
  - `firstName` - Staff first name
  - `lastName` - Staff last name
  - `lydoId` - Staff ID
  - `personalEmail` - Personal email address
  - `orgEmail` - Organization email address
  - `password` - Temporary password
  - `roleName` (optional) - Role name
  - `role` (optional) - Role type
- **Optional Fields:**
  - `announcementBanner` - Banner message at top of email
  - `logoUrl` - Municipality logo URL (auto-added from env)
  - `frontendUrl` - Frontend URL (auto-added from env)
  - `contactEmail` - Contact email (auto-added from env)
  - `contactPhone` - Contact phone (auto-added from env)
- **Design:** ✅ New professional design with circular logo container

---

### 2. **skOfficialWelcome** ✅ (New - Updated with New Design)
- **Subject:** "Welcome to SK Governance - Your Account Credentials"
- **Purpose:** Sent to new SK Officials when their account is created with login credentials
- **Required Data Fields:**
  - `firstName` - SK Official first name
  - `lastName` - SK Official last name
  - `skId` - SK Official ID
  - `position` - SK Official position
  - `barangayName` - Barangay name
  - `password` - Temporary password
- **Optional Fields:**
  - `orgEmail` - Organization email (used as username)
  - `announcementBanner` - Banner message at top of email
  - `logoUrl` - Municipality logo URL (auto-added from env)
  - `frontendUrl` - Frontend URL (auto-added from env)
  - `contactEmail` - Contact email (auto-added from env)
  - `contactPhone` - Contact phone (auto-added from env)
- **Design:** ✅ New professional design with circular logo container

---

### 3. **skOfficialCreated**
- **Subject:** "New SK Official Created - Action Required"
- **Purpose:** Notification when a new SK Official is registered in the system (admin notification, not credentials)
- **Required Data Fields:**
  - `fullName` - SK Official full name
  - `position` - Position/role
  - `barangayName` - Barangay name
  - `skId` - SK Official ID
  - `personalEmail` - Personal email
  - `orgEmail` - Organization email
  - `status` - Account status
  - `termName` - SK Term name
  - `createdAt` - Creation timestamp
- **Design:** ⚠️ Old design (green header)

---

### 4. **termActivated**
- **Subject:** "SK Term Activated - System Update"
- **Purpose:** Notification when a new SK Term is activated
- **Required Data Fields:**
  - `termName` - Term name
  - `termId` - Term ID
  - `startDate` - Term start date
  - `endDate` - Term end date
  - `activatedAt` - Activation timestamp
  - `activatedBy` - User who activated the term
- **Design:** ⚠️ Old design (purple header)

---

### 5. **criticalSystemAlert**
- **Subject:** "🚨 CRITICAL: System Alert - Immediate Action Required"
- **Purpose:** Critical system alerts requiring immediate attention
- **Required Data Fields:**
  - `alertType` - Type of alert
  - `severity` - Alert severity level
  - `timestamp` - Alert timestamp
  - `description` - Alert description
- **Optional Fields:**
  - `errorMessage` - Error message details
- **Design:** ⚠️ Old design (red header)

---

### 6. **bulkOperationComplete**
- **Subject:** "Bulk Operation Completed - Results Summary"
- **Purpose:** Summary of bulk operations (imports, updates, etc.)
- **Required Data Fields:**
  - `operationType` - Type of operation
  - `totalRecords` - Total records processed
  - `successCount` - Number of successful operations
  - `errorCount` - Number of errors
  - `startTime` - Operation start time
  - `endTime` - Operation end time
- **Optional Fields:**
  - `fileName` - Name of file processed
  - `errors` - Array of error messages
- **Design:** ⚠️ Old design (cyan header)

---

### 7. **surveyValidated** ✅ (Updated with New Design)
- **Subject:** "Your Survey Has Been Validated - LYDO Youth Governance"
- **Purpose:** Sent to youth when their survey submission is approved
- **Required Data Fields:**
  - `batchName` - Survey batch name
- **Optional Fields:**
  - `userName` - Youth full name (auto-generated if not provided)
  - `validationDate` - Validation date
  - `validatedBy` - Name of validator
  - `validationTier` - Validation tier (automatic/manual)
  - `logoUrl` - Municipality logo URL (auto-added from env)
  - `frontendUrl` - Frontend URL (auto-added from env)
  - `contactEmail` - Contact email (auto-added from env)
  - `contactPhone` - Contact phone (auto-added from env)
- **Design:** ✅ New professional design with circular logo container

---

### 8. **surveyRejected** ✅ (Updated with New Design)
- **Subject:** "Survey Status Update - LYDO Youth Governance"
- **Purpose:** Sent to youth when their survey submission is rejected/needs revision
- **Required Data Fields:**
  - `batchName` - Survey batch name
- **Optional Fields:**
  - `userName` - Youth full name (auto-generated if not provided)
  - `validationDate` - Review date
  - `comments` - Rejection reason/comments
  - `logoUrl` - Municipality logo URL (auto-added from env)
  - `frontendUrl` - Frontend URL (auto-added from env)
  - `contactEmail` - Contact email (auto-added from env)
  - `contactPhone` - Contact phone (auto-added from env)
- **Design:** ✅ New professional design with circular logo container

---

### 9. **surveyPending** ✅ (Updated with New Design)
- **Subject:** "Survey Submission Received - LYDO Youth Governance"
- **Purpose:** Sent to youth when their survey submission is received and pending review
- **Required Data Fields:**
  - `batchName` - Survey batch name
- **Optional Fields:**
  - `userName` - Youth full name (auto-generated if not provided)
  - `submissionDate` - Submission date
  - `logoUrl` - Municipality logo URL (auto-added from env)
  - `frontendUrl` - Frontend URL (auto-added from env)
  - `contactEmail` - Contact email (auto-added from env)
  - `contactPhone` - Contact phone (auto-added from env)
- **Design:** ✅ New professional design with circular logo container

---

## 🎨 Design Status

### ✅ Updated Templates (New Professional Design)
- `staffWelcome` - Staff login credentials
- `skOfficialWelcome` - SK Official login credentials (NEW)
- `surveyValidated` - Survey approved
- `surveyRejected` - Survey rejected
- `surveyPending` - Survey pending review

**Features:**
- Dark header gradient (#2c3e50 to #34495e)
- Circular logo container (white circle with logo or "LYDO" text)
- Professional status badges
- Consistent footer with contact information
- Responsive design

### ⚠️ Pending Update (Old Design)
- `skOfficialCreated` - Admin notification (not credentials)
- `termActivated` - Term activation notification
- `criticalSystemAlert` - Critical system alerts
- `bulkOperationComplete` - Bulk operation summaries

---

## 📝 Usage Example

```javascript
import emailService from '../services/emailService.js';

// Send survey validated email
await emailService.sendTemplatedEmail(
  'surveyValidated',
  {
    userName: 'John Doe',
    batchName: 'Q1 2024 Youth Survey',
    validationDate: new Date().toISOString(),
    validatedBy: 'Admin User'
  },
  'youth@example.com'
);
```

---

## 🔧 Environment Variables

The following environment variables are automatically added to all email templates:

- `EMAIL_LOGO_URL` or `MUNICIPALITY_LOGO_URL` - Logo image URL
- `FRONTEND_URL` - Frontend URL for links
- `CONTACT_EMAIL` - Contact email address
- `CONTACT_PHONE` - Contact phone number

---

## 📋 Template Validation

Each template has required fields that are validated before sending. If required fields are missing, the email will not be sent and an error will be logged.

---

## 🚀 Where Templates Are Used

1. **staffWelcome** - `backend/controllers/staffController.js` (staff creation with credentials)
2. **skOfficialWelcome** - ✅ **IMPLEMENTED** - Used by `sendSKWelcomeEmail` in `emailService.js` and `notificationService.js`
3. **surveyValidated** - `backend/controllers/validationQueueController.js`, `backend/controllers/directSurveySubmissionController.js`
4. **surveyRejected** - `backend/controllers/validationQueueController.js`
5. **surveyPending** - `backend/controllers/directSurveySubmissionController.js`
6. **skOfficialCreated** - `backend/controllers/skOfficialsController.js` (admin notification)
7. **termActivated** - `backend/controllers/skTermsController.js`
8. **criticalSystemAlert** - System monitoring/alerting
9. **bulkOperationComplete** - Bulk import/export operations

---

## 📝 Notes

- All templates support both HTML and plain text versions
- Templates automatically fall back to default values if optional fields are not provided
- Logo support: If `EMAIL_LOGO_URL` is set, the logo image will be displayed. Otherwise, "LYDO" text will be shown in the circular container.
- Contact information is automatically added from environment variables if not provided in the data object.

