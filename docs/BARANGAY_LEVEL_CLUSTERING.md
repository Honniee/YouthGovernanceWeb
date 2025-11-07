# Barangay-Level Clustering Feature

## Overview

The Youth Segmentation system now supports **two-level clustering analysis**:
1. **Municipality-Wide**: Analyze all youth across all barangays
2. **Barangay-Specific**: Analyze youth within a single barangay for localized insights

This enables LYDO Admin to:
- Compare youth characteristics across different barangays
- Identify barangay-specific needs and priorities
- Create targeted programs for specific communities
- Track program effectiveness at the barangay level

---

## How It Works

### 1. **Frontend UI (Admin Dashboard)**

#### **Location:** `frontend/src/pages/admin/YouthSegmentation.jsx`

**New Features:**
- **Scope Selector**: Toggle between "Municipality-Wide" and "Specific Barangay"
- **Barangay Dropdown**: Select from 33 barangays (only visible when "Specific Barangay" is selected)
- **Current View Indicator**: Shows which scope and barangay is currently being analyzed
- **Batch Filter**: Can be combined with barangay filtering

**UI Flow:**
```
1. Admin selects "Specific Barangay" scope
2. Barangay dropdown appears
3. Admin selects a barangay (e.g., "Aguila")
4. Click "Run Clustering Now"
5. System analyzes only youth from that barangay
6. Results show barangay-specific segments and recommendations
```

---

### 2. **Backend Implementation**

#### **Database Support:**
The clustering tables already support barangay filtering:
- `Youth_Segments.barangay_id` - Links segments to specific barangays
- `Clustering_Runs.barangay_id` - Tracks which barangay was analyzed

#### **API Endpoints:**
All clustering endpoints support `scope` and `barangayId` parameters:

```javascript
// GET /api/clustering/segments
?scope=barangay&barangayId=SJB001

// GET /api/clustering/stats
?scope=barangay&barangayId=SJB001

// GET /api/clustering/runs
?scope=barangay&barangayId=SJB001

// POST /api/clustering/run
{
  "scope": "barangay",
  "barangayId": "SJB001",
  "batchId": "BAT999" // Optional
}
```

---

## Usage Examples

### **Example 1: Analyze Barangay Aguila**

**Steps:**
1. Go to `/admin/survey/segmentation`
2. Click "Specific Barangay"
3. Select "Aguila" from dropdown
4. Select batch (or "All Batches")
5. Click "Run Clustering Now"

**Result:**
```
Youth Segmentation - Barangay: Aguila

Currently Viewing: Barangay: Aguila • Batch: KK Assembly 2024

Statistics:
- Total Youth: 40
- Active Segments: 3
- Quality Score: 45.2%

Segments:
1. Civic-Minded Youth (15 youth, 37.5%)
   - Highly engaged in community governance (68% civic participation)
   - KEY INSIGHT: High civic engagement but unemployed suggests they need job opportunities
   - Recommend: Youth leadership programs with employment pathways

2. Opportunity Seekers (12 youth, 30.0%)
   - Educated but underemployed youth (8% employment despite medium education)
   - KEY INSIGHT: This is a critical window - without intervention, they risk prolonged unemployment
   - Recommend: Targeted job fairs, skills training

3. Active Workforce Youth (13 youth, 32.5%)
   - Economically stable (100% employment rate)
   - KEY INSIGHT: Lower civic engagement suggests work-life balance challenges
   - Recommend: Workplace-based civic programs
```

---

### **Example 2: Compare Multiple Barangays**

**To compare barangays:**
1. Run clustering for "Barangay Aguila"
2. Note the segments and recommendations
3. Switch to "Barangay Anus"
4. Run clustering again
5. Compare the results side-by-side

**Insights you can discover:**
- Which barangays have high unemployment?
- Which barangays have low civic engagement?
- Which barangays need education programs vs. job programs?
- Which barangays have youth with special needs?

---

## Key Benefits

### **1. Localized Insights**
Instead of one-size-fits-all programs, you get **barangay-specific recommendations**:
- Barangay A: Needs job training programs (high unemployment)
- Barangay B: Needs civic engagement programs (low participation)
- Barangay C: Needs education support (many out-of-school youth)

### **2. Resource Allocation**
Identify which barangays need the most resources:
```
Priority Ranking:
1. Barangay X: 45 High-Need Youth (CRITICAL)
2. Barangay Y: 32 Opportunity Seekers (HIGH)
3. Barangay Z: 18 Civic-Minded Youth (MEDIUM)
```

### **3. Program Impact Measurement**
Run clustering before and after program implementation:
```
Barangay Aguila - Before Program:
- Opportunity Seekers: 40% (16 youth)
- Employment Rate: 15%

Barangay Aguila - After Job Fair Program:
- Opportunity Seekers: 20% (8 youth)
- Employment Rate: 45%

Impact: 50% reduction in job seekers!
```

---

## Technical Implementation Details

### **Frontend State Management:**
```javascript
const [scope, setScope] = useState('municipality');
const [selectedBarangay, setSelectedBarangay] = useState('all');
const [barangays, setBarangays] = useState([]);

// Auto-reset barangay when switching to municipality
const handleScopeChange = (newScope) => {
  setScope(newScope);
  if (newScope === 'municipality') {
    setSelectedBarangay('all');
  }
};
```

### **API Service Call:**
```javascript
const filters = {
  scope: scope,
  barangayId: (scope === 'barangay' && selectedBarangay !== 'all') 
    ? selectedBarangay 
    : null,
  batchId: selectedBatch === 'all' ? null : selectedBatch
};

const segments = await clusteringService.getSegments(filters);
```

### **Backend Query:**
```javascript
// In clusteringController.js
export const getSegments = async (req, res) => {
  const { scope = 'municipality', barangayId = null, batchId = null } = req.query;
  
  let query = `
    SELECT * FROM "Youth_Segments"
    WHERE is_active = true AND scope = $1
  `;
  const params = [scope];
  
  if (barangayId) {
    query += ` AND barangay_id = $${params.length + 1}`;
    params.push(barangayId);
  }
  
  if (batchId) {
    query += ` AND batch_id = $${params.length + 1}`;
    params.push(batchId);
  }
  
  const result = await client.query(query, params);
  res.json({ success: true, data: result.rows });
};
```

---

## Data Requirements

### **Minimum Youth per Barangay:**
- **Minimum:** 10 validated responses (clustering will run, but with warnings)
- **Recommended:** 50+ validated responses for reliable segments
- **Ideal:** 100+ validated responses for high-quality analysis

### **What if a barangay has too few youth?**
The system will:
1. Run the clustering anyway
2. Show data quality warnings
3. Suggest "Consider municipality-wide analysis for better insights"

---

## For Your Thesis

### **Research Contribution:**
This two-level clustering demonstrates:
- **Scalability**: System works at both macro (municipality) and micro (barangay) levels
- **Flexibility**: Adapts to different administrative needs
- **Practicality**: Aligns with real-world governance structures in the Philippines

### **Thesis Defense Points:**
1. **"Why barangay-level clustering?"**
   - Barangays have different demographics, economies, and needs
   - One-size-fits-all programs are inefficient
   - Local SK officials need localized data for their communities

2. **"How does it differ from municipality-wide?"**
   - Municipality-wide: Broad trends, policy-level insights
   - Barangay-level: Specific actions, program implementation

3. **"What's the technical challenge?"**
   - Small sample sizes in some barangays
   - Data quality varies across barangays
   - System handles this with adaptive K-selection and quality warnings

---

## Next Steps

### **Potential Enhancements:**
1. **Barangay Comparison Dashboard**: Side-by-side comparison of multiple barangays
2. **Automated Barangay Reports**: Generate PDF reports for each barangay
3. **SK Official Access**: Allow SK officials to view only their barangay's data
4. **Temporal Comparison**: Track how a barangay changes over time

---

## Summary

✅ **Municipality-Wide**: Big picture, policy decisions, resource allocation
✅ **Barangay-Specific**: Targeted programs, local action, SK official empowerment
✅ **Combined with Batch Filtering**: Track changes over time at both levels

**Use Case:**
- LYDO Admin uses municipality-wide to identify regional priorities
- SK Officials use barangay-specific to design local programs
- Both levels combined = comprehensive youth development strategy






