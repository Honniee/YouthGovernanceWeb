# Bulk Export Activity Logging Comparison

## 📊 Comparison Across Pages

### **1. Staff Management** ✅ **HAS ACTIVITY LOGGING**

**Location**: `frontend/src/pages/admin/StaffManagement.jsx` (lines 378-393)

**Implementation**:
```javascript
// Log export to backend for activity logs (fire and forget)
try {
  const queryParams = new URLSearchParams();
  queryParams.append('format', 'json'); // Use JSON to avoid download
  queryParams.append('logFormat', format); // Pass actual format for logging
  queryParams.append('selectedIds', selectedItems.join(','));
  
  api.get(`/staff/export?${queryParams.toString()}`).catch(err => {
    console.error('Failed to log export activity:', err);
  });
}
```

**Activity Log Data**:
- ✅ `format`: `'json'` (to prevent file download)
- ✅ `logFormat`: Actual format (`'csv'`, `'excel'`, `'pdf'`)
- ✅ `selectedIds`: Comma-separated list of selected staff IDs
- ✅ Backend endpoint: `/api/staff/export`

---

### **2. SK Management** ✅ **HAS ACTIVITY LOGGING**

**Location**: `frontend/src/pages/admin/SKManagement.jsx` (lines 530-549)

**Implementation**:
```javascript
// Log export to backend for activity logs (fire and forget)
const actualFormat = format === 'xlsx' ? 'excel' : format;
try {
  const queryParams = new URLSearchParams();
  queryParams.append('format', 'json'); // Use JSON to avoid download
  queryParams.append('logFormat', actualFormat); // Pass actual format for logging
  queryParams.append('selectedIds', selectedItems.join(','));
  if (activeTerm?.termId) {
    queryParams.append('termId', activeTerm.termId);
  }
  
  api.get(`/sk-officials/export/csv?${queryParams.toString()}`).catch(err => {
    console.error('Failed to log export activity:', err);
  });
}
```

**Activity Log Data**:
- ✅ `format`: `'json'` (to prevent file download)
- ✅ `logFormat`: Actual format (`'csv'`, `'excel'`, `'pdf'`)
- ✅ `selectedIds`: Comma-separated list of selected SK IDs
- ✅ `termId`: Active term ID (optional, for context)
- ✅ Backend endpoint: `/api/sk-officials/export/csv`

---

### **3. Youth Management** ✅ **HAS ACTIVITY LOGGING**

**Location**: `frontend/src/pages/admin/YouthManagement.jsx` (lines 475-491)

**Implementation**:
```javascript
// Log export to backend for activity logs (fire and forget)
const actualFormat = format === 'xlsx' ? 'excel' : format;
try {
  const queryParams = new URLSearchParams();
  queryParams.append('format', 'json'); // Use JSON to avoid download
  queryParams.append('logFormat', actualFormat); // Pass actual format for logging
  queryParams.append('selectedIds', selectedItems.join(','));
  
  api.get(`/youth/export?${queryParams.toString()}`).catch(err => {
    console.error('Failed to log export activity:', err);
  });
}
```

**Activity Log Data**:
- ✅ `format`: `'json'` (to prevent file download)
- ✅ `logFormat`: Actual format (`'csv'`, `'excel'`, `'pdf'`)
- ✅ `selectedIds`: Comma-separated list of selected youth IDs
- ✅ Backend endpoint: `/api/youth/export`

---

### **4. SK Terms Management** ❌ **MISSING ACTIVITY LOGGING**

**Location**: `frontend/src/pages/admin/SKTerms.jsx` (lines 512-540)

**Current Implementation**:
```javascript
const bulkExportHook = useExport({
  exportFunction: async (format, style = null) => {
    try {
      // ❌ WRONG: This is for detailed term export, not bulk term list export
      const resp = activeTerm?.termId ? await skService.exportTermDetailed(activeTerm.termId, 'json') : { success: false };
      if (resp.success) showSuccessToast('Export logged', 'Your export was recorded successfully');

      const selectedTermsData = termsData.filter(term => selectedItems.includes(term.termId));
      // ... export logic (CSV, PDF, Excel) ...
      
      // ❌ MISSING: No activity logging for bulk export!
      return { success: true };
    }
  }
});
```

**Issues**:
1. ❌ **No activity logging** - Doesn't call backend to log the export
2. ❌ **Wrong API call** - Calls `skService.exportTermDetailed()` which is for detailed term reports, not bulk term list exports
3. ❌ **Incorrect context** - Uses `activeTerm?.termId` which is not relevant for bulk term selection
4. ❌ **Missing parameters**:
   - No `format=json` to prevent download
   - No `logFormat` to specify actual format
   - No `selectedIds` to track which terms were exported
   - No `count` to track number of exported terms

---

## 📋 **Summary Table**

| Page | Activity Logging | Backend Endpoint | Parameters Sent |
|------|------------------|------------------|-----------------|
| **Staff** | ✅ Yes | `/api/staff/export` | `format`, `logFormat`, `selectedIds` |
| **SK Officials** | ✅ Yes | `/api/sk-officials/export/csv` | `format`, `logFormat`, `selectedIds`, `termId` |
| **Youth** | ✅ Yes | `/api/youth/export` | `format`, `logFormat`, `selectedIds` |
| **SK Terms** | ❌ **NO** | N/A | N/A |

---

## 🔧 **Required Fix for SK Terms**

**Add activity logging** to `bulkExportHook` in `SKTerms.jsx`:

```javascript
const bulkExportHook = useExport({
  exportFunction: async (format, style = null) => {
    try {
      const selectedTermsData = termsData.filter(term => selectedItems.includes(term.termId));
      if (selectedTermsData.length === 0) {
        throw new Error('No terms selected for export');
      }

      // Export logic (existing)
      if (format === 'csv') {
        const rows = buildTermCsvRows(selectedTermsData);
        downloadCsv('sk-terms-selected.csv', rows);
      } else if (format === 'pdf') {
        openTermsPrintPdf('SK Terms (Selected)', selectedTermsData);
      } else if (format === 'excel') {
        const xml = buildExcelXml(selectedTermsData);
        downloadExcel('sk-terms-selected.xls', xml);
      }
      
      // ✅ ADD THIS: Log export to backend for activity logs
      const actualFormat = format === 'xlsx' ? 'excel' : format;
      try {
        const queryParams = new URLSearchParams();
        queryParams.append('format', 'json'); // Use JSON to avoid download
        queryParams.append('logFormat', actualFormat); // Pass actual format for logging
        queryParams.append('count', selectedTermsData.length.toString()); // Number of exported terms
        queryParams.append('selectedIds', selectedItems.join(',')); // Selected term IDs
        queryParams.append('exportType', 'bulk'); // Indicate this is a bulk export
        
        const apiModule = await import('../../services/api.js');
        const api = apiModule.default;
        api.get(`/sk-terms/export?${queryParams.toString()}`).catch(err => {
          console.error('Failed to log export activity:', err);
        });
      } catch (err) {
        console.error('Failed to log export activity:', err);
      }
      
      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Failed to export selected terms');
    }
  }
});
```

---

## ✅ **What Needs to Be Fixed**

1. ❌ **Remove wrong API call**: Remove `skService.exportTermDetailed()` call (line 516)
2. ✅ **Add activity logging**: Call `/api/sk-terms/export` with proper parameters
3. ✅ **Include count**: Pass `count` parameter with number of selected terms
4. ✅ **Include selectedIds**: Pass `selectedIds` parameter with comma-separated term IDs
5. ✅ **Include exportType**: Pass `exportType=bulk` to differentiate from main export

---

## 📝 **Backend Endpoint Expected**

The backend endpoint `/api/sk-terms/export` should already exist (used by main export). It should handle:
- `format=json`: Return JSON instead of file download
- `logFormat`: Actual export format (`csv`, `excel`, `pdf`)
- `count`: Number of exported items
- `selectedIds`: Comma-separated list of term IDs (for bulk export)
- `exportType`: `'bulk'` to indicate bulk export vs. full export
- `tab`: Active tab context (optional, for main export)




