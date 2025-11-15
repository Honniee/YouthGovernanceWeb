# 🔄 Refresh Tokens Table Migration

## Status: ⚠️ **MIGRATION REQUIRED**

The `Refresh_Tokens` table **must be created** before the httpOnly cookies authentication will work.

## Current Usage

The code is **actively using** the `Refresh_Tokens` table in:

1. **Login** (`backend/routes/auth.js`):
   - Stores refresh token hash when user logs in
   - `INSERT INTO "Refresh_Tokens" ...`

2. **Token Refresh** (`backend/routes/authRefresh.js`):
   - Validates refresh token from database
   - `SELECT FROM "Refresh_Tokens" ...`

3. **Logout** (`backend/routes/auth.js`):
   - Revokes refresh token from database
   - `DELETE FROM "Refresh_Tokens" ...`

## ⚠️ If Table Doesn't Exist

If the table doesn't exist, you'll get errors like:
- `relation "Refresh_Tokens" does not exist`
- Login will fail
- Token refresh will fail

## ✅ How to Run Migration

### Option 1: Using Migration Runner (Recommended)

```bash
cd backend
node scripts/runMigrations.js --migration=create_refresh_tokens_table
```

### Option 2: Manual SQL Execution

```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database

# Run the migration
\i backend/migrations/create_refresh_tokens_table.sql
```

### Option 3: Direct SQL (if using pgAdmin or other tool)

Copy and paste the contents of `backend/migrations/create_refresh_tokens_table.sql` into your SQL editor and execute.

## 🔍 Verify Table Exists

```sql
-- Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'Refresh_Tokens'
);

-- Check table structure
\d "Refresh_Tokens"

-- Check if any tokens exist
SELECT COUNT(*) FROM "Refresh_Tokens";
```

## 📋 Table Structure

The table has these columns:
- `token_hash` (PRIMARY KEY): SHA-256 hash of refresh token
- `user_id`: User identifier
- `user_type`: User type (admin, lydo_staff, sk_official, youth)
- `expires_at`: Token expiration timestamp
- `created_at`: Token creation timestamp
- `revoked_at`: Token revocation timestamp (nullable)

## 🚨 Important Notes

1. **Migration uses `CREATE TABLE IF NOT EXISTS`** - Safe to run multiple times
2. **Table is required** - Authentication will fail without it
3. **No data loss** - Migration only creates the table structure

## ✅ After Migration

Once the table is created:
1. Restart your backend server
2. Try logging in
3. Check backend logs for any errors
4. Verify tokens are being stored: `SELECT * FROM "Refresh_Tokens" LIMIT 5;`

