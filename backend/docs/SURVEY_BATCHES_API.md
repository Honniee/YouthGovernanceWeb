# Survey Batches API Documentation

## Overview
The Survey Batches API provides comprehensive management for KK (Katipunan ng Kabataan) survey batches, including CRUD operations, status management, and business rule enforcement.

## Base URL
```
/api/survey-batches
```

## Authentication
All endpoints require authentication using JWT tokens and Admin role access.

**Headers Required:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Business Rules
1. **Single Active KK Survey**: Only one KK survey can be active at a time
2. **Date Validation**: No overlapping survey periods for non-closed batches
3. **Status Transitions**: Strict rules for status changes
4. **Age Range**: Target age must be between 15-30 years

---

## Endpoints

### 1. Create Survey Batch

**POST** `/api/survey-batches`

Creates a new survey batch with validation and business rule checks.

**Request Body:**
```json
{
  "batchName": "KK Survey 2024 Q4 - Youth Development",
  "description": "Quarterly survey for youth development assessment",
  "startDate": "2024-10-01",
  "endDate": "2024-10-31",
  "targetAgeMin": 15,
  "targetAgeMax": 30
}
```

**Response:**
```json
{
  "success": true,
  "message": "Survey batch created successfully",
  "data": {
    "batchId": "BAT006",
    "batchName": "KK Survey 2024 Q4 - Youth Development",
    "description": "Quarterly survey for youth development assessment",
    "startDate": "2024-10-01",
    "endDate": "2024-10-31",
    "status": "draft",
    "targetAgeMin": 15,
    "targetAgeMax": 30,
    "createdBy": "LYDO001",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Validation Rules:**
- `batchName`: Required, 3-100 characters
- `startDate`: Required, valid date, cannot be in past
- `endDate`: Required, valid date, must be after start date
- `targetAgeMin/Max`: Optional, 15-30 range, max > min

---

### 2. Get All Survey Batches

**GET** `/api/survey-batches`

Retrieves survey batches with filtering, pagination, and sorting.

**Query Parameters:**
```
GET /api/survey-batches?page=1&pageSize=10&status=active&search=KK&sortBy=created_at&sortOrder=desc&includeStats=true
```

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | integer | Page number (1+) | 1 |
| `pageSize` | integer | Items per page (1-100) | 10 |
| `status` | string | Filter by status (`active`, `closed`, `draft`) | all |
| `search` | string | Search in batch names | none |
| `sortBy` | string | Sort field | `created_at` |
| `sortOrder` | string | Sort direction (`asc`, `desc`) | `desc` |
| `includeStats` | boolean | Include calculated statistics | false |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "batchId": "BAT002",
      "batchName": "KK Survey 2024 Q2 - Leadership Focus",
      "status": "active",
      "startDate": "2024-03-01",
      "endDate": "2024-04-30",
      "statisticsTotalResponses": 890,
      "responseRate": 49.44,
      "daysRemaining": 15,
      "isOverdue": false
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### 3. Get Single Survey Batch

**GET** `/api/survey-batches/:id`

Retrieves a specific survey batch by ID.

**Parameters:**
- `id`: Batch ID (e.g., BAT001)

**Query Parameters:**
- `includeStats`: boolean - Include calculated statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "BAT002",
    "batchName": "KK Survey 2024 Q2 - Leadership Focus",
    "description": "KK survey focusing on youth leadership development",
    "startDate": "2024-03-01",
    "endDate": "2024-04-30",
    "status": "active",
    "targetAgeMin": 15,
    "targetAgeMax": 30,
    "createdBy": "LYDO001",
    "createdAt": "2024-02-15T09:00:00Z",
    "updatedAt": "2024-03-01T08:00:00Z",
    "pausedAt": null,
    "pausedBy": null,
    "pausedReason": null,
    "statisticsTotalResponses": 890,
    "statisticsValidatedResponses": 750,
    "responseRate": 49.44,
    "validationRate": 84.27,
    "daysRemaining": 15,
    "isOverdue": false
  }
}
```

---

### 4. Update Survey Batch

**PUT** `/api/survey-batches/:id`

Updates survey batch information with validation.

**Request Body:**
```json
{
  "batchName": "KK Survey 2024 Q2 - Leadership Development (Updated)",
  "description": "Updated description for leadership survey",
  "endDate": "2024-05-15"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Survey batch updated successfully",
  "data": {
    "batchId": "BAT002",
    "batchName": "KK Survey 2024 Q2 - Leadership Development (Updated)",
    "updatedAt": "2024-01-15T14:30:00Z"
  }
}
```

---

### 5. Delete Survey Batch

**DELETE** `/api/survey-batches/:id`

Deletes a survey batch (with restrictions).

**Response:**
```json
{
  "success": true,
  "message": "Survey batch deleted successfully"
}
```

**Business Rules:**
- Cannot delete active survey batches
- Must close batch first before deletion

---

## Status Management

### 6. Update Batch Status

**PATCH** `/api/survey-batches/:id/status`

Updates survey batch status with audit trail.

**Request Body:**
```json
{
  "status": "active",
  "action": "pause",
  "reason": "System maintenance required"
}
```

**Available Actions:**
- `activate`: Draft → Active
- `pause`: Active → Paused (with reason)
- `resume`: Paused → Active
- `close`: Active → Closed
- `force-activate`: Draft → Active (ignores start date)
- `force-close`: Active → Closed (updates end date to today)

**Response:**
```json
{
  "success": true,
  "message": "Survey batch paused successfully",
  "data": {
    "batchId": "BAT002",
    "status": "active",
    "pausedAt": "2024-01-15T15:00:00Z",
    "pausedBy": "LYDO001",
    "pausedReason": "System maintenance required"
  }
}
```

---

## Statistics & Utilities

### 7. Get Batch Statistics

**GET** `/api/survey-batches/:id/statistics`

Retrieves detailed statistics for a specific batch.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalResponses": 890,
    "validatedResponses": 750,
    "rejectedResponses": 45,
    "pendingResponses": 95,
    "totalYouths": 1800,
    "totalYouthsSurveyed": 890,
    "totalYouthsNotSurveyed": 910,
    "responseRate": 49.44,
    "validationRate": 84.27
  }
}
```

### 8. Get Dashboard Statistics

**GET** `/api/survey-batches/statistics/dashboard`

Retrieves overall statistics for dashboard.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBatches": 5,
    "activeBatches": 1,
    "closedBatches": 3,
    "draftBatches": 1,
    "totalResponses": 3238,
    "totalYouthsSurveyed": 3238
  }
}
```

### 9. Get Batches Needing Auto-Update

**GET** `/api/survey-batches/utilities/auto-update`

Returns batches that need automatic status updates based on dates.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "batchId": "BAT003",
      "batchName": "KK Survey 2024 Q3 - Sports & Recreation",
      "currentStatus": "draft",
      "suggestedStatus": "active",
      "reason": "Start date reached"
    }
  ]
}
```

### 10. Check Business Rules

**GET** `/api/survey-batches/utilities/business-rules`

Validates business rules for date conflicts and active KK surveys.

**Query Parameters:**
- `startDate`: Date to check (YYYY-MM-DD)
- `endDate`: Date to check (YYYY-MM-DD)
- `excludeBatchId`: Batch ID to exclude from checks

**Response:**
```json
{
  "success": true,
  "data": {
    "activeKKSurvey": {
      "hasActiveKK": true,
      "activeBatches": [
        {
          "batchId": "BAT002",
          "batchName": "KK Survey 2024 Q2 - Leadership Focus"
        }
      ]
    },
    "dateConflicts": {
      "hasConflicts": false,
      "conflicts": []
    }
  }
}
```

---

## Bulk Operations

### 11. Bulk Update Status

**POST** `/api/survey-batches/bulk/status`

Updates status for multiple batches simultaneously.

**Request Body:**
```json
{
  "batchIds": ["BAT001", "BAT003", "BAT005"],
  "status": "closed",
  "reason": "End of quarter closure"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk operation completed. 3 successful, 0 failed.",
  "data": {
    "successful": [
      {
        "batchId": "BAT001",
        "success": true,
        "data": { "status": "closed" }
      }
    ],
    "failed": []
  }
}
```

---

## Error Responses

### Validation Errors (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "batchName",
      "message": "Batch name is required",
      "value": ""
    }
  ]
}
```

### Business Rule Violations (400)
```json
{
  "success": false,
  "message": "Only one active Katipunan ng Kabataan survey is allowed at a time. Currently active: KK Survey 2024 Q2"
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Survey batch not found"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Failed to create survey batch",
  "error": "Database connection failed" // Only in development
}
```

---

## Rate Limiting

- **General Routes**: 100 requests per 15 minutes per IP
- **Bulk Operations**: 10 requests per 15 minutes per IP

---

## Client-Side Auto-Update Implementation

### React Hook Example
```javascript
import { useEffect } from 'react';
import { surveyBatchesAPI } from './api';

const useAutoStatusUpdate = () => {
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await surveyBatchesAPI.getBatchesNeedingUpdate();
        
        if (response.data.length > 0) {
          // Show notification or automatically update
          console.log('Batches needing update:', response.data);
          // Optional: Trigger automatic updates
        }
      } catch (error) {
        console.error('Auto-update check failed:', error);
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);
    
    // Check immediately on mount
    checkForUpdates();

    return () => clearInterval(interval);
  }, []);
};
```

---

## Testing Examples

### Using cURL

**Create Batch:**
```bash
curl -X POST http://localhost:3001/api/survey-batches \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchName": "Test KK Survey 2024",
    "description": "Test survey for API",
    "startDate": "2024-12-01",
    "endDate": "2024-12-31"
  }'
```

**Get All Batches:**
```bash
curl -X GET "http://localhost:3001/api/survey-batches?includeStats=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Update Status:**
```bash
curl -X PATCH http://localhost:3001/api/survey-batches/BAT001/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active",
    "action": "pause",
    "reason": "Maintenance break"
  }'
```

---

## Notes

1. **Database Functions**: The API leverages PostgreSQL functions for business logic validation
2. **Audit Trail**: All status changes are logged with user, timestamp, and reason
3. **Pagination**: Large result sets are automatically paginated
4. **Security**: All endpoints require admin authentication and include rate limiting
5. **Validation**: Comprehensive input validation with detailed error messages

---

**Version**: 1.0  
**Last Updated**: 2024  
**Maintainer**: Youth Development Office API Team



