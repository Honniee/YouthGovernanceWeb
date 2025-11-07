# 📊 Batch-Specific Clustering System

## ✅ Overview

The Youth Clustering System now supports **batch-specific clustering**, allowing you to:

1. ✅ **Cluster each survey batch separately**
2. ✅ **Compare segments across different batches over time**
3. ✅ **Track youth development trends across batches**
4. ✅ **Still support clustering ALL batches together** (batch_id = NULL)

---

## 🎯 Three Clustering Modes

### **Mode 1: Per Batch (Recommended)**
```javascript
POST /api/clustering/run
{
  "scope": "municipality",
  "batchId": "BATCH001"  // Cluster only this batch
}
```
**Use Case**: After validating a new batch, cluster just that batch's youth

---

### **Mode 2: Per Barangay Per Batch**
```javascript
POST /api/clustering/run
{
  "scope": "barangay",
  "barangayId": "BAR001",
  "batchId": "BATCH001"  // Cluster this barangay for this batch
}
```
**Use Case**: SK Official wants to see their barangay's segments for a specific batch

---

### **Mode 3: All Batches Together**
```javascript
POST /api/clustering/run
{
  "scope": "municipality"
  // No batchId = cluster ALL batches
}
```
**Use Case**: Get overall municipality-wide view across all surveys

---

## 📋 Database Changes

### **Migration: 034_add_batch_support_to_clustering.sql**

**Run this in pgAdmin**:
```sql
-- Located at: database/migrations/034_add_batch_support_to_clustering.sql
```

**Changes**:
- ✅ Added `batch_id` column to `Youth_Segments`
- ✅ Added `batch_id` column to `Clustering_Runs`
- ✅ Updated indexes for batch filtering
- ✅ Foreign keys to `Survey_Batches` (if table exists)

---

## 🔄 Typical Workflow

### **Step 1: New Survey Batch Created**
```
SK Officials collect youth surveys → Batch: "BATCH002"
```

### **Step 2: LYDO Validates Responses**
```
LYDO reviews and validates responses in BATCH002
```

### **Step 3: Run Clustering for Batch**
```javascript
POST /api/clustering/run
{
  "scope": "municipality",
  "batchId": "BATCH002"
}
```

### **Step 4: View Results**
```javascript
GET /api/clustering/segments?scope=municipality&batchId=BATCH002
```

### **Step 5: Compare with Previous Batch**
```javascript
// Get BATCH001 segments
GET /api/clustering/segments?scope=municipality&batchId=BATCH001

// Get BATCH002 segments
GET /api/clustering/segments?scope=municipality&batchId=BATCH002

// Compare: Did youth segments change?
```

---

## 📊 Example: Tracking Youth Over Time

### **Batch 1 (Jan 2025)**
```
Segment 1: "Educated Job Seekers" - 45 youth (30%)
Segment 2: "Working Youth" - 80 youth (53%)
Segment 3: "Early Career Youth" - 25 youth (17%)
```

### **Batch 2 (July 2025)**
```
Segment 1: "Educated Job Seekers" - 30 youth (22%) ⬇️ Decreased!
Segment 2: "Working Youth" - 95 youth (70%) ⬆️ Increased!
Segment 3: "Early Career Youth" - 11 youth (8%) ⬇️ Decreased!
```

**Insight**: Employment programs are working! More youth moved from "Job Seekers" to "Working Youth"

---

## 🎓 For Your Thesis

### **Research Benefits**:

1. **Longitudinal Analysis**
   - Track youth development over time
   - Measure program effectiveness
   - Identify trends

2. **Comparative Studies**
   - Before/after program implementation
   - Seasonal variations
   - Policy impact assessment

3. **Data Quality**
   - Each batch clustered independently
   - More reliable segments per batch
   - Better for smaller datasets

---

## 🧪 Testing Batch Clustering

### **Test Command**:
```bash
cd backend
node test-clustering.js
```

**Expected Output**:
```
Run Type: manual
Scope: municipality
Barangay ID: N/A
Batch ID: N/A (All batches)  ← Default: clusters all batches
```

### **Test with Specific Batch**:
Modify the test file or use the API endpoint directly.

---

## 📝 API Endpoints Updated

All endpoints now support optional `batchId` parameter:

### **1. Run Clustering**
```
POST /api/clustering/run
Body: { scope, barangayId?, batchId? }
```

### **2. Get Segments**
```
GET /api/clustering/segments?scope=municipality&batchId=BATCH001
```

### **3. Get Stats**
```
GET /api/clustering/stats?scope=municipality&batchId=BATCH001
```

### **4. Get Recommendations**
```
GET /api/clustering/recommendations?scope=municipality&batchId=BATCH001
```

### **5. Get Runs**
```
GET /api/clustering/runs?scope=municipality&batchId=BATCH001
```

---

## 💡 Best Practices

### **When to Cluster Per Batch**:
✅ After each new survey batch is validated  
✅ For temporal analysis (comparing batches)  
✅ When batches represent different time periods  
✅ For smaller datasets (batch-specific clustering works better)

### **When to Cluster All Batches**:
✅ For overall municipality view  
✅ When you have many small batches  
✅ For aggregate statistics  
✅ When batches don't represent time periods

---

## 🚀 Next Steps

1. ✅ **Run the Migration**
   ```sql
   -- In pgAdmin, run: 034_add_batch_support_to_clustering.sql
   ```

2. ✅ **Test Batch Clustering**
   ```bash
   cd backend
   node test-clustering.js
   ```

3. ✅ **Update Frontend** (when ready)
   - Add batch selector dropdown
   - Show batch comparison charts
   - "Run Clustering for This Batch" button

---

## 📊 Database Schema

### **Youth_Segments Table**
```
├── segment_id (PK)
├── scope ('municipality' | 'barangay')
├── barangay_id (FK) - NULL = all barangays
├── batch_id (FK) - NULL = all batches  ← NEW!
├── ...other fields...
```

### **Clustering_Runs Table**
```
├── run_id (PK)
├── scope ('municipality' | 'barangay')
├── barangay_id (FK)
├── batch_id (FK) ← NEW!
├── ...other fields...
```

---

## ✅ Summary

Your clustering system now supports:

1. ✅ **Per-batch clustering** - Cluster each survey batch separately
2. ✅ **Cross-batch clustering** - Cluster all batches together
3. ✅ **Batch comparison** - Compare segments across batches
4. ✅ **Temporal analysis** - Track youth development over time
5. ✅ **Flexible filtering** - By scope, barangay, AND batch

**This is perfect for your thesis!** You can show:
- How youth segments evolved over time
- Impact of programs on segment distribution
- Trends in youth development

---

**Good luck!** 🎓✨

