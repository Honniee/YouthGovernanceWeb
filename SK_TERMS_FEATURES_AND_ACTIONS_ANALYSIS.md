# SK Terms - Features & Actions Analysis

## 📋 Overview

The SK Terms Management system is a comprehensive module for managing SK (Sangguniang Kabataan) terms, including creation, lifecycle management, statistics tracking, and reporting.

---

## 🎯 **Core Features**

### 1. **Term Lifecycle Management**
- **Create** new SK terms with validation
- **Update** existing term details (name, dates)
- **Delete** terms (soft delete)
- **Activate** upcoming terms to active status
- **Complete** active terms (with account access management)
- **Extend** completed terms back to active status

### 2. **Term Status System**
- **Status Types**:
  - `upcoming` - Term created but not yet started
  - `active` - Currently active term (only one can be active at a time)
  - `completed` - Term that has ended
  - `draft` - Optional draft status for future terms

### 3. **Term Data Management**
- Term Name (e.g., "2025-2027 Term")
- Start Date & End Date
- Statistics tracking (officials count, positions breakdown)
- Completion tracking (completion type, completed by, completed at)
- Status change history (reason, timestamp, user)

### 4. **Account Access Management**
- When a term is **completed**: All SK officials' account access is disabled
- When a term is **extended**: All SK officials' account access is re-enabled
- Tracks `account_access_updated_at` and `account_access_updated_by`

### 5. **Term Queries & Filtering**
- Get all terms with pagination
- Get active term only
- Get term by ID
- Get term history
- Filter by status
- Sort by various fields (start_date, end_date, term_name, status, created_at)

### 6. **Statistics & Reporting**
- **Overall Statistics**: Total terms, active terms, completed terms, upcoming terms
- **Term-Specific Statistics**: 
  - Total officials, active/inactive officials
  - Position breakdown (Chairperson, Secretary, Treasurer, Councilor)
  - Barangay representation
  - Barangay breakdown
- **Term Officials**: List all officials in a term
- **Term Officials by Barangay**: Grouped by barangay with profiling data
- **Term Detailed Export**: Export officials grouped by barangay (CSV, Excel, PDF)

### 7. **Export Functionality**
- **SK Terms List Export**: Export all terms list (CSV, Excel, PDF)
- **Term Detailed Export**: Export officials for a specific term, grouped by barangay
- Supports multiple formats
- Client-side export with backend logging

### 8. **Validation & Suggestions**
- Date conflict validation (no overlapping terms)
- Suggested date ranges for new terms
- Validation for term activation
- Validation for term completion
- Force completion option (bypasses some validations)

### 9. **Notifications**
- Notifications sent when terms are created, updated, activated, completed, or extended
- Admin notifications for term status changes
- SK Official notifications when account access changes

---

## ⚡ **All Different Actions**

### **CRUD Operations**

| Action | Endpoint | Method | Description | Activity Log Action |
|--------|----------|--------|-------------|-------------------|
| **Create Term** | `/api/sk-terms` | POST | Create a new SK term | `Create` |
| **Update Term** | `/api/sk-terms/:id` | PUT | Update term details (name, dates) | `Update` |
| **Delete Term** | `/api/sk-terms/:id` | DELETE | Soft delete a term | `Delete` |
| **Get Term** | `/api/sk-terms/:id` | GET | Get term details by ID | (Read-only, no log) |
| **Get All Terms** | `/api/sk-terms` | GET | List all terms with pagination | (Read-only, no log) |
| **Get Active Term** | `/api/sk-terms/active` | GET | Get currently active term | (Read-only, no log) |

### **Status Management Operations**

| Action | Endpoint | Method | Description | Activity Log Action | Side Effects |
|--------|----------|--------|-------------|-------------------|--------------|
| **Activate Term** | `/api/sk-terms/:id/activate` | PATCH | Activate an upcoming term | `Activate` | Sets status to 'active', deactivates any existing active term |
| **Complete Term** | `/api/sk-terms/:id/complete` | PATCH | Mark active term as completed | `Complete` + `Deactivate` (for each official) | Sets status to 'completed', disables account access for all officials |
| **Extend Term** | `/api/sk-terms/:id/extend` | PATCH | Re-activate a completed term | `Activate` (term) + `Activate` (for each official) | Sets status back to 'active', re-enables account access |

### **Data Retrieval Operations**

| Action | Endpoint | Method | Description | Activity Log Action |
|--------|----------|--------|-------------|-------------------|
| **Get Term Officials** | `/api/sk-terms/:id/officials` | GET | List all officials in a term | (Read-only, no log) |
| **Get Term Statistics** | `/api/sk-terms/:id/statistics` | GET | Get statistics for a specific term | (Read-only, no log) |
| **Get Term Officials by Barangay** | `/api/sk-terms/:id/officials-by-barangay` | GET | Get officials grouped by barangay | (Read-only, no log) |
| **Get Term History** | `/api/sk-terms/history` | GET | Get historical terms list | (Read-only, no log) |
| **Get Term Statistics (Overall)** | `/api/sk-terms/statistics` | GET | Get overall term statistics | (Read-only, no log) |

### **Export Operations**

| Action | Endpoint | Method | Description | Activity Log Action | Format |
|--------|----------|--------|-------------|-------------------|--------|
| **Export SK Terms List** | `/api/sk-terms/export` | GET | Export terms list | `Export` | CSV, Excel, PDF |
| **Export Term Detailed** | `/api/sk-terms/:id/export-detailed` | GET | Export term officials grouped by barangay | `Export` | CSV, Excel, PDF |

### **Utility Operations**

| Action | Endpoint | Method | Description | Activity Log Action |
|--------|----------|--------|-------------|-------------------|
| **Get Suggested Dates** | `/api/sk-terms/suggested-dates` | GET | Get suggested date ranges for new terms | (Read-only, no log) |
| **Debug Term Status** | `/api/sk-terms/debug/status` | GET | Debug endpoint to check all terms status | (Read-only, no log) |

---

## 📊 **Action Categories for Activity Logging**

### **1. Creation Actions**
- `Create` - Creating a new SK term

### **2. Modification Actions**
- `Update` - Updating term details (name, dates)
- `Activate` - Activating a term (status change)
- `Complete` - Completing a term (status change + account access changes)
- `Activate` (via extend) - Extending a completed term

### **3. Deletion Actions**
- `Delete` - Soft deleting a term

### **4. Export Actions**
- `Export` - Exporting terms list or term detailed report

### **5. Account Access Actions** (Triggered by term operations)
- `Deactivate` - Disabling SK official account access (when term completes)
- `Activate` - Re-enabling SK official account access (when term extends)

---

## 🔄 **Action Flow Examples**

### **Example 1: Term Lifecycle**
1. **Create** → Term created with status 'upcoming'
2. **Activate** → Status changed to 'active'
3. **Complete** → Status changed to 'completed', all officials' accounts disabled
4. **Extend** → Status changed back to 'active', all officials' accounts re-enabled

### **Example 2: Export Flow**
1. Admin requests export → `Export` action logged
2. Frontend generates file client-side
3. Activity log shows: "Admin [Name] exported SK Terms Export - CSV (10 terms)"

### **Example 3: Complete Term with Officials**
When completing a term:
1. Term status updated → `Complete` action for the term
2. For each official:
   - Account access disabled → `Deactivate` action for each SK official

### **Example 4: Extend Term with Officials**
When extending a term:
1. Term status updated → `Activate` action for the term (with actionType: 'extend')
2. For each official:
   - Account access re-enabled → `Activate` action for each SK official

---

## 🎯 **Key Differences Between Actions**

### **Activate vs Extend (both use 'Activate' action)**
- **Activate**: Upcoming → Active (normal activation)
- **Extend**: Completed → Active (via extend endpoint, with `actionType: 'extend'` in details)

### **Complete vs Delete**
- **Complete**: Term ends, status becomes 'completed', officials' accounts disabled
- **Delete**: Term is soft-deleted (removed from active list but data retained)

### **Export Types**
- **SK Terms List Export**: All terms list export
- **Term Detailed Export**: Specific term's officials grouped by barangay

---

## 📝 **Current Activity Logging Status**

### ✅ **Properly Logged** (using direct `createAuditLog`)
- ✅ `createTerm` → `Create`
- ✅ `updateTerm` → `Update`
- ✅ `deleteTerm` → `Delete`
- ✅ `activateTerm` → `Activate`
- ✅ `completeTerm` → `Complete` + `Deactivate` (for officials)
- ✅ `extendTerm` → `Activate` (term) + `Activate` (for officials)
- ✅ `exportSKTerms` → `Export`
- ✅ `exportTermDetailed` → `Export`

### 📋 **Not Logged** (Read-only operations)
- Get operations (list, get by ID, get active, etc.)
- Statistics queries
- Suggested dates
- Debug endpoints

---

## 🎯 **Summary**

The SK Terms system has **8 writable actions** that generate activity logs:
1. **Create** - Create term
2. **Update** - Update term
3. **Delete** - Delete term
4. **Activate** - Activate term (or extend term)
5. **Complete** - Complete term
6. **Deactivate** - Disable official accounts (during completion)
7. **Activate** - Re-enable official accounts (during extension)
8. **Export** - Export terms or term detailed reports

All actions are now properly logged with:
- ✅ Title case actions
- ✅ Proper resource names (term names, not IDs)
- ✅ Structured details objects
- ✅ Correct resource types
- ✅ Proper user ID extraction




