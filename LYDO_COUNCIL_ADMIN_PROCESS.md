# LYDO Council - Admin User Process

Based on the **actual database schema**, here's the admin user process:

## Database Schema Overview

### Tables:
1. **`LYDO_Council_Roles`** - Define the different types of council roles
2. **`LYDO_Council_Members`** - Store actual council members
3. **`LYDO_Council_Page`** - Store hero images for the public page

---

## Recommended Admin User Process

### **Step 1: First-Time Setup - Create Council Roles**

**Purpose**: Define the different types of roles in the council (e.g., "Chairperson", "Vice Chairperson", "Sector Representative - Education", etc.)

**Admin Actions:**
1. Navigate to **Admin Dashboard → LYDO Council → Manage Roles**
2. Click **"Add New Role"**
3. Fill in:
   - **Role ID**: Auto-generated or manual (e.g., "LYDCROL001")
   - **Role Name**: e.g., "Chairperson", "Vice Chairperson", "Education Representative"
   - **Role Description**: Brief description of what this role entails
4. Click **"Save"**
5. Repeat for all council roles needed

**Example Roles:**
- Chairperson
- Vice Chairperson  
- Sector Representative - Education
- Sector Representative - Health
- Sector Representative - Environment
- Sector Representative - Sports
- etc.

---

### **Step 2: Add Council Members**

**Purpose**: Add actual people to fill the council roles

**Admin Actions:**
1. Navigate to **Admin Dashboard → LYDO Council → Manage Members**
2. Click **"Add New Member"**
3. Fill in:
   - **Member ID**: Auto-generated or manual (e.g., "LYDCMEM001")
   - **Role**: Select from dropdown (populated from `LYDO_Council_Roles`)
   - **Member Name**: Full name of the person (e.g., "Hon. Mark H. Arre")
   - **Active Status**: Checkbox (default: checked)
4. Click **"Save"**
5. Member is now visible on the public council page

---

### **Step 3: Manage Council Page Hero Images**

**Purpose**: Set the carousel images displayed on the public council page

**Admin Actions:**
1. Navigate to **Admin Dashboard → LYDO Council → Page Settings**
2. Fill in image URLs:
   - **Hero Image 1**: URL for first carousel image
   - **Hero Image 2**: URL for second carousel image
   - **Hero Image 3**: URL for third carousel image
3. Click **"Save Images"**
4. Images are immediately displayed on the public page

---

### **Step 4: Edit Existing Members**

**Purpose**: Update member information or deactivate them

**Admin Actions:**
1. Navigate to **Admin Dashboard → LYDO Council → Manage Members**
2. Find the member in the table
3. Click **"Edit"** button
4. Modify any field:
   - Change role assignment
   - Update name (e.g., name correction)
   - Toggle active status (to show/hide from public page)
5. Click **"Save Changes"**

---

### **Step 5: Deactivate Members (Instead of Delete)**

**Purpose**: Remove members from public view without deleting their record

**Admin Actions:**
1. Navigate to **Admin Dashboard → LYDO Council → Manage Members**
2. Click **"Edit"** on a member
3. Uncheck **"Active"** checkbox
4. Click **"Save Changes"**
5. Member is now hidden from public view but record remains

**Note**: For permanent deletion, add a separate "Delete" action with confirmation.

---

## Workflow Diagram

```
Start
  ↓
Has Council Roles? ───No──→ Create Roles (Step 1)
  ↓Yes                           ↓
  ↓                          Has Council Roles? ───Yes──→
  ↓                          ↓ No
  ↓                          Start Over
  ↓
Add Members (Step 2)
  ↓
Set Hero Images (Step 3)
  ↓
Monitor Public View
  ↓
Changes Needed? ──Yes─→ Edit Members (Step 4)
  ↓No                      ↓
  ↓                    Save Changes
  ↓                       ↓
  ↓───────────────────────┘
End
```

---

## Recommended UI/UX Improvements

### **Current Issues with Frontend:**
The current frontend (`frontend/src/pages/admin/LYDOCouncil.jsx` and `frontend/src/pages/public/LYDOCouncil.jsx`) expects fields that don't exist in the schema:

**Expected but Missing:**
- `focus` - Advocacy area/focus
- `description` - Member description
- `photo_url_1/2/3` - Photo URLs
- `term_start/end` - Term dates
- `sort_order` - Display ordering

**Schema Has:**
- `role_id` - Reference to roles table
- `member_name` - Just the name

### **Recommended Approach:**

#### **Option A: Extend Schema (Preferred)**
Add the missing fields to `LYDO_Council_Members`:
```sql
ALTER TABLE "LYDO_Council_Members"
ADD COLUMN focus VARCHAR(100),
ADD COLUMN description TEXT,
ADD COLUMN photo_url_1 TEXT,
ADD COLUMN photo_url_2 TEXT,
ADD COLUMN photo_url_3 TEXT,
ADD COLUMN term_start DATE,
ADD COLUMN term_end DATE,
ADD COLUMN sort_order INTEGER DEFAULT 0;
```

#### **Option B: Redesign Frontend**
Simplify the frontend to only show role name and member name, matching current schema.

---

## Complete Admin Workflow

### **Initial Setup (One-Time)**
1. **Create Council Roles**
   - Access: Admin → LYDO Council → Roles
   - Create all role types needed
   - Example: Chairperson, Vice Chair, Education Rep, Health Rep, etc.

### **Regular Operations**
2. **Add Council Members**
   - Access: Admin → LYDO Council → Members
   - Select role from dropdown
   - Enter member name
   - Set as active
   - Save

3. **Update Hero Images**
   - Access: Admin → LYDO Council → Page Settings
   - Enter/update image URLs
   - Save

4. **Manage Active Members**
   - Edit: Change role or name
   - Deactivate: Hide from public view
   - Reactivate: Show on public view

### **Public Display Logic**
- Show only members where `is_active = TRUE`
- Join with `LYDO_Council_Roles` to get role details
- Display by role order (hardcoded or via sort_order if added)

---

## Future Enhancements

1. **Batch Import**: Import multiple members from CSV
2. **Photo Management**: Actual file upload instead of URLs
3. **Term Tracking**: Use term dates to auto-deactivate expired members
4. **Role Hierarchy**: Automatic ordering based on role importance
5. **Audit Trail**: Track who created/modified records (already tracked via `created_by`)

---

## Database Relationship

```
LYDO_Council_Roles (Parent)
    ↓ (role_id FK)
LYDO_Council_Members (Child)

Examples:
- Role: "Chairperson" (LYDCROL001)
  → Members: "Hon. Mark H. Arre" (LYDCMEM001)
  
- Role: "Education Representative" (LYDCROL005)
  → Members: "Jane Doe" (LYDCMEM010), "John Smith" (LYDCMEM011)
```

This structure allows **multiple members per role** (e.g., multiple education representatives), which is flexible for a real council structure.
