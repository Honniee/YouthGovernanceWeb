# SK Terms Enhanced Features Documentation

## Overview

This document describes the enhanced features implemented for SK Terms management, including automatic status transitions, force completion, term extension, and comprehensive audit logging.

## New Features

### 1. Automatic Status Transitions

**Purpose:** Automatically update term statuses based on current date without manual intervention.

**Logic:**
- **Upcoming → Active:** When `start_date = current_date`
- **Active → Completed:** When `end_date = current_date`

**Implementation:**
- Daily cron job runs at midnight
- Updates term statuses and disables account access for completed terms
- Sends notifications to admin and affected officials
- Logs all changes in activity logs

**API Endpoints:**
- `GET /api/cron/update-term-statuses` - Daily automatic update (requires cron secret)
- `GET /api/cron/manual-update-term-statuses` - Manual trigger for testing
- `GET /api/cron/pending-status-updates` - Get terms that need status updates

### 2. Force Completion

**Purpose:** Allow admins to complete terms before their natural end date.

**Features:**
- Updates end date to current date when force completing
- Disables account access for all officials in the term
- Sends notifications to affected officials
- Comprehensive audit logging

**API Endpoint:**
- `PATCH /api/sk-terms/:id/complete` with `{ force: true }`

**Validation:**
- Term must exist and be active
- Cannot force complete if validation fails (unless force=true)

### 3. Term Extension

**Purpose:** Allow completed terms to be reactivated with a new end date.

**Features:**
- Only completed terms can be extended
- New end date must be in the future
- Cannot extend if there's already an active term
- Re-enables account access for all officials
- Sends notifications to affected officials

**API Endpoint:**
- `PATCH /api/sk-terms/:id/extend` with `{ newEndDate: "YYYY-MM-DD", reason: "optional" }`

**Validation:**
- Term must be completed
- New end date must be in the future
- No active term conflicts

### 4. Account Access Control

**Purpose:** Automatically manage official account access based on term status.

**Logic:**
- **Term Completed:** Disable account access for all officials
- **Term Extended:** Re-enable account access for all officials
- **Automatic Completion:** Disable account access automatically

**Database Fields:**
- `account_access` (BOOLEAN) - Whether official can access their account
- `account_access_updated_at` (TIMESTAMP) - When access was last updated
- `account_access_updated_by` (VARCHAR) - Who updated the access

### 5. Enhanced Audit Logging

**Purpose:** Track all status changes and account access modifications.

**Logged Actions:**
- `TERM_ACTIVATED` - Term status changed to active
- `TERM_COMPLETED` - Term status changed to completed
- `TERM_EXTENDED` - Term extended from completed to active
- `ACCOUNT_ACCESS_DISABLED` - Official account access disabled
- `ACCOUNT_ACCESS_ENABLED` - Official account access enabled

**Audit Fields:**
- `completion_type` - automatic/forced/manual
- `completed_by` - Who completed the term
- `completed_at` - When term was completed
- `last_status_change_at` - Last status change timestamp
- `last_status_change_by` - Who made the last status change
- `status_change_reason` - Reason for status change

## Database Schema Changes

### SK_Terms Table Additions

```sql
-- Audit fields for completion tracking
ALTER TABLE "SK_Terms" 
ADD COLUMN completion_type TEXT CHECK (completion_type IN ('automatic', 'forced', 'manual')) DEFAULT NULL,
ADD COLUMN completed_by VARCHAR(20) DEFAULT NULL,
ADD COLUMN completed_at TIMESTAMP DEFAULT NULL,
ADD COLUMN last_status_change_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN last_status_change_by VARCHAR(20) DEFAULT NULL,
ADD COLUMN status_change_reason TEXT DEFAULT NULL;
```

### SK_Officials Table Additions

```sql
-- Account access control fields
ALTER TABLE "SK_Officials" 
ADD COLUMN account_access BOOLEAN DEFAULT TRUE,
ADD COLUMN account_access_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN account_access_updated_by VARCHAR(20) DEFAULT NULL;
```

## API Reference

### Complete Term (with Force Option)

```http
PATCH /api/sk-terms/:id/complete
Content-Type: application/json

{
  "force": true  // Optional: force completion and update end date to today
}
```

**Response:**
```json
{
  "success": true,
  "message": "SK Term force completed successfully",
  "data": {
    "termId": "TRM001",
    "termName": "2023-2025 Term",
    "status": "completed",
    "completionType": "forced",
    "endDate": "2024-01-15",
    "officialsAffected": 28,
    "updatedAt": "2024-01-15T00:00:00Z"
  }
}
```

### Extend Term

```http
PATCH /api/sk-terms/:id/extend
Content-Type: application/json

{
  "newEndDate": "2025-06-30",
  "reason": "Extended due to special circumstances"
}
```

**Response:**
```json
{
  "success": true,
  "message": "SK Term extended successfully",
  "data": {
    "termId": "TRM001",
    "termName": "2023-2025 Term",
    "status": "active",
    "newEndDate": "2025-06-30",
    "officialsAffected": 28,
    "updatedAt": "2024-01-15T00:00:00Z"
  }
}
```

### Manual Status Update

```http
GET /api/cron/manual-update-term-statuses
```

**Response:**
```json
{
  "success": true,
  "message": "Manual term status update completed successfully",
  "data": {
    "changes": {
      "activated": [
        {
          "term_id": "TRM002",
          "term_name": "2025-2027 Term",
          "start_date": "2025-01-15",
          "end_date": "2027-01-14"
        }
      ],
      "completed": [
        {
          "term_id": "TRM001",
          "term_name": "2023-2025 Term",
          "start_date": "2023-01-15",
          "end_date": "2025-01-15"
        }
      ]
    },
    "timestamp": "2024-01-15T00:00:00Z"
  }
}
```

## Frontend Integration

### Service Methods

```javascript
// Force complete a term
await skTermsService.completeSKTerm(termId, true);

// Extend a term
await skTermsService.extendSKTerm(termId, '2025-06-30', 'Extended due to special circumstances');

// Trigger manual status update
await skTermsService.triggerManualStatusUpdate();

// Get pending status updates
await skTermsService.getPendingStatusUpdates();
```

### UI Components

The frontend includes:
- Force completion option in term action menu
- Term extension modal with date picker and reason field
- Status indicators showing completion type
- Account access status for officials

## Cron Job Setup

### Environment Variables

Add to your `.env` file:
```env
CRON_SECRET=your-secure-cron-secret-here
```

### Cron Job Configuration

Set up a daily cron job to run at midnight:

```bash
# Add to crontab
0 0 * * * curl -H "X-Cron-Secret: your-secure-cron-secret-here" http://your-domain.com/api/cron/update-term-statuses
```

### Manual Testing

Test the automatic updates manually:
```bash
curl http://localhost:3001/api/cron/manual-update-term-statuses
```

## Security Considerations

1. **Cron Secret:** All cron endpoints require a secret header for security
2. **Role-Based Access:** All term operations require admin role
3. **Audit Trail:** All changes are logged with user context
4. **Validation:** Comprehensive validation prevents invalid operations
5. **Transaction Safety:** All operations use database transactions

## Error Handling

The system provides detailed error messages for:
- Validation failures
- Database constraint violations
- Permission errors
- Network issues

All errors are logged and include context for debugging.

## Monitoring

Monitor the system using:
- Activity logs for all status changes
- Notification delivery status
- Cron job execution logs
- Database performance metrics

## Future Enhancements

Potential future features:
- Email notifications for status changes
- Dashboard for monitoring pending updates
- Bulk operations for multiple terms
- Advanced reporting on term lifecycle
- Integration with external calendar systems
