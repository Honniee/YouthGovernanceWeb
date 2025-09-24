-- YOUTH GOVERNANCE APP DATABASE SCHEMA
-- Complete permission system with Roles table
-- Converted to PostgreSQL

-- 1. BARANGAY TABLE
CREATE TABLE "Barangay" (
    barangay_id VARCHAR(20) PRIMARY KEY, -- e.g., 'SJB001', 'SJB002'
    barangay_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_barangay_name ON "Barangay" (barangay_name);

-- 2. ROLES TABLE
CREATE TABLE "Roles" (
    role_id VARCHAR(20) PRIMARY KEY, -- e.g., 'ROL001', 'ROL002'
    role_name VARCHAR(50) NOT NULL UNIQUE,
    role_description TEXT,
    permissions JSONB, -- Store permissions as JSONB (PostgreSQL native JSON)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_role_name ON "Roles" (role_name);
CREATE INDEX idx_active_roles ON "Roles" (is_active);

-- 3. LYDO TABLE (Admin and LYDO Staff)
CREATE TABLE "LYDO" (
    lydo_id VARCHAR(20) PRIMARY KEY, -- e.g., 'LYDO001', 'LYDO002'
    role_id VARCHAR(20) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    personal_email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    suffix VARCHAR(50),
    profile_picture VARCHAR(255), -- File path to profile picture
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deactivated BOOLEAN DEFAULT FALSE,
    deactivated_at TIMESTAMP NULL,
    FOREIGN KEY (role_id) REFERENCES "Roles"(role_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES "LYDO"(lydo_id) ON DELETE RESTRICT
);

CREATE INDEX idx_lydo_email ON "LYDO" (email);
CREATE INDEX idx_lydo_role_id ON "LYDO" (role_id);
CREATE INDEX idx_lydo_active ON "LYDO" (is_active);
CREATE INDEX idx_lydo_created_by ON "LYDO" (created_by);

-- 4. SK_TERMS TABLE (New table for term management)
CREATE TABLE "SK_Terms" (
    term_id VARCHAR(20) PRIMARY KEY, -- e.g., 'TRM001', 'TRM002'
    term_name VARCHAR(100) NOT NULL, -- e.g., '2023-2025 Term', '2025-2027 Term'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT CHECK (status IN ('active', 'completed', 'upcoming')) DEFAULT 'upcoming',
    is_active BOOLEAN DEFAULT TRUE,
    is_current BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    statistics_total_officials INTEGER DEFAULT 0,
    statistics_active_officials INTEGER DEFAULT 0,
    statistics_inactive_officials INTEGER DEFAULT 0,
    statistics_total_sk_chairperson INTEGER DEFAULT 0,
    statistics_total_sk_secretary INTEGER DEFAULT 0,
    statistics_total_sk_treasurer INTEGER DEFAULT 0,
    statistics_total_sk_councilor INTEGER DEFAULT 0,
    -- Enhanced audit fields for term management
    completion_type TEXT CHECK (completion_type IN ('automatic', 'forced', 'manual')) DEFAULT NULL,
    completed_by VARCHAR(20) DEFAULT NULL,
    completed_at TIMESTAMP DEFAULT NULL,
    last_status_change_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_status_change_by VARCHAR(20) DEFAULT NULL,
    status_change_reason TEXT DEFAULT NULL,
    FOREIGN KEY (created_by) REFERENCES "LYDO"(lydo_id) ON DELETE RESTRICT,
    FOREIGN KEY (completed_by) REFERENCES "LYDO"(lydo_id) ON DELETE SET NULL,
    FOREIGN KEY (last_status_change_by) REFERENCES "LYDO"(lydo_id) ON DELETE SET NULL
);

CREATE INDEX idx_sk_terms_term_name ON "SK_Terms" (term_name);
CREATE INDEX idx_sk_terms_dates ON "SK_Terms" (start_date, end_date);
CREATE INDEX idx_sk_terms_status ON "SK_Terms" (status);
CREATE INDEX idx_sk_terms_active ON "SK_Terms" (is_active);
CREATE INDEX idx_sk_terms_completion ON "SK_Terms" (completion_type, completed_at);
CREATE INDEX idx_sk_terms_status_changes ON "SK_Terms" (last_status_change_at, last_status_change_by);

-- 5. SK_OFFICIALS TABLE
CREATE TABLE "SK_Officials" (
    sk_id VARCHAR(20) PRIMARY KEY, -- e.g., 'SK001', 'SK002'
    role_id VARCHAR(20) NOT NULL,
    term_id VARCHAR(20) NOT NULL, -- NEW: Link to specific term
    email VARCHAR(100) UNIQUE NOT NULL,
    personal_email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    barangay_id VARCHAR(20) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    suffix VARCHAR(50),
    position TEXT CHECK (position IN ('SK Chairperson', 'SK Secretary', 'SK Treasurer', 'SK Councilor')) NOT NULL,
    profile_picture VARCHAR(255), -- File path to profile picture
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Account access control fields
    account_access BOOLEAN DEFAULT TRUE,
    account_access_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    account_access_updated_by VARCHAR(20) DEFAULT NULL,
    FOREIGN KEY (role_id) REFERENCES "Roles"(role_id) ON DELETE RESTRICT,
    FOREIGN KEY (barangay_id) REFERENCES "Barangay"(barangay_id) ON DELETE RESTRICT,
    FOREIGN KEY (term_id) REFERENCES "SK_Terms"(term_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES "LYDO"(lydo_id) ON DELETE RESTRICT,
    FOREIGN KEY (account_access_updated_by) REFERENCES "LYDO"(lydo_id) ON DELETE SET NULL
);

CREATE INDEX idx_sk_officials_full_name ON "SK_Officials" (last_name, first_name, middle_name, suffix);
CREATE INDEX idx_sk_officials_email ON "SK_Officials" (email);
CREATE INDEX idx_sk_officials_role_id ON "SK_Officials" (role_id);
CREATE INDEX idx_sk_officials_barangay_id ON "SK_Officials" (barangay_id);
CREATE INDEX idx_sk_officials_term_id ON "SK_Officials" (term_id);
CREATE INDEX idx_sk_officials_active ON "SK_Officials" (is_active);
CREATE INDEX idx_sk_officials_account_access ON "SK_Officials" (account_access, account_access_updated_at);

-- 6. SK_OFFICIALS_PROFILING TABLE
CREATE TABLE "SK_Officials_Profiling" (
    profiling_id VARCHAR(20) PRIMARY KEY, -- e.g., 'PRO001', 'PRO002'
    sk_id VARCHAR(20) NOT NULL,
    birth_date DATE NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT CHECK (gender IN ('Male', 'Female')) NOT NULL,
    contact_number VARCHAR(20) UNIQUE NOT NULL,
    school_or_company VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performance_metrics_survey_validated INTEGER DEFAULT 0,
    FOREIGN KEY (sk_id) REFERENCES "SK_Officials"(sk_id) ON DELETE CASCADE
);

CREATE INDEX idx_sk_profiling_sk_id ON "SK_Officials_Profiling" (sk_id);

-- 7. YOUTH_PROFILING TABLE
CREATE TABLE "Youth_Profiling" (
    youth_id VARCHAR(20) PRIMARY KEY, -- e.g., 'YTH001', 'YTH002'
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    suffix VARCHAR(50),
    region VARCHAR(50) NOT NULL DEFAULT 'Region IV-A (CALABARZON)',
    province VARCHAR(50) NOT NULL DEFAULT 'Batangas',
    municipality VARCHAR(50) NOT NULL DEFAULT 'San Jose',
    barangay_id VARCHAR(20) NOT NULL,
    purok_zone VARCHAR(50),
    birth_date DATE NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT CHECK (gender IN ('Male', 'Female')) NOT NULL,
    contact_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (barangay_id) REFERENCES "Barangay"(barangay_id) ON DELETE RESTRICT
);

CREATE INDEX idx_youth_profiling_barangay_id ON "Youth_Profiling" (barangay_id);
CREATE INDEX idx_youth_profiling_age ON "Youth_Profiling" (age);
CREATE INDEX idx_youth_profiling_active ON "Youth_Profiling" (is_active);

-- 8. USERS TABLE (for tracking all users)
CREATE TABLE "Users" (
    user_id VARCHAR(20) PRIMARY KEY, -- e.g., 'USR001', 'USR002'
    user_type TEXT CHECK (user_type IN ('admin', 'lydo_staff', 'sk_official', 'youth')) NOT NULL,
    lydo_id VARCHAR(20) NULL,
    sk_id VARCHAR(20) NULL,
    youth_id VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lydo_id) REFERENCES "LYDO"(lydo_id) ON DELETE CASCADE,
    FOREIGN KEY (sk_id) REFERENCES "SK_Officials"(sk_id) ON DELETE CASCADE,
    FOREIGN KEY (youth_id) REFERENCES "Youth_Profiling"(youth_id) ON DELETE CASCADE
);

CREATE INDEX idx_users_user_type ON "Users" (user_type);
CREATE INDEX idx_users_lydo_id ON "Users" (lydo_id);
CREATE INDEX idx_users_sk_id ON "Users" (sk_id);
CREATE INDEX idx_users_youth_id ON "Users" (youth_id);

-- 9. VOTERS_LIST TABLE
CREATE TABLE "Voters_List" (
    voter_id VARCHAR(20) PRIMARY KEY, -- e.g., 'VOT001', 'VOT002'
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    suffix VARCHAR(50),
    birth_date DATE NOT NULL,
    gender TEXT CHECK (gender IN ('Male', 'Female')),
    created_by VARCHAR(20) NOT NULL,
    FOREIGN KEY (created_by) REFERENCES "LYDO"(lydo_id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_voters_list_name ON "Voters_List" (first_name, last_name);

-- 10. KK_SURVEY_BATCHES TABLE
CREATE TABLE "KK_Survey_Batches" (
    -- Primary Key
    batch_id VARCHAR(20) PRIMARY KEY,                    -- e.g., 'BAT001', 'BAT002'
    
    -- Basic Information
    batch_name VARCHAR(100) NOT NULL,                    -- e.g., 'KK Survey 2024 Q1'
    description TEXT,                                     -- Optional description
    
    -- Date Range
    start_date DATE NOT NULL,                            -- Survey start date
    end_date DATE NOT NULL,                              -- Survey end date
    
    -- Status Management
    status TEXT CHECK (status IN ('active', 'closed', 'draft')) DEFAULT 'draft',
    
    -- Target Demographics
    target_age_min INTEGER DEFAULT 15,                   -- Minimum age for survey
    target_age_max INTEGER DEFAULT 30,                   -- Maximum age for survey
    
    -- Audit Trail
    created_by VARCHAR(20) NOT NULL,                     -- LYDO ID who created
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,      -- Creation timestamp
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,      -- Last update timestamp
    
    -- Pause/Resume Audit Trail (for maintenance)
    paused_at TIMESTAMP NULL,                            -- When batch was paused
    paused_by VARCHAR(20) NULL,                          -- Who paused the batch
    paused_reason TEXT NULL,                             -- Reason for pausing
    resumed_at TIMESTAMP NULL,                           -- When batch was resumed
    resumed_by VARCHAR(20) NULL,                         -- Who resumed the batch
    
    -- Foreign Key Constraints
    FOREIGN KEY (created_by) REFERENCES "LYDO"(lydo_id) ON DELETE RESTRICT,
    FOREIGN KEY (paused_by) REFERENCES "LYDO"(lydo_id) ON DELETE SET NULL,
    FOREIGN KEY (resumed_by) REFERENCES "LYDO"(lydo_id) ON DELETE SET NULL
);

-- 11. KK_SURVEY_RESPONSES TABLE
CREATE TABLE "KK_Survey_Responses" (
    response_id VARCHAR(20) PRIMARY KEY, -- e.g., 'RES001', 'RES002'
    batch_id VARCHAR(20) NOT NULL,
    youth_id VARCHAR(20) NOT NULL,
    barangay_id VARCHAR(20) NOT NULL,
    
    -- I. PROFILE Section (from questionnaire)
    civil_status TEXT CHECK (civil_status IN ('Single', 'Married', 'Widowed', 'Divorced', 'Separated', 'Annulled', 'Unknown', 'Live-in')),
    youth_classification TEXT CHECK (youth_classification IN ('In School Youth', 'Out of School Youth', 'Working Youth', 'Youth w/Specific Needs')) NOT NULL,
    youth_specific_needs TEXT CHECK (youth_specific_needs IN ('Person w/Disability', 'Children in Conflict w/ Law', 'Indigenous People')) NULL,
    youth_age_group TEXT CHECK (youth_age_group IN ('Child Youth (15-17 yrs old)', 'Core Youth (18-24 yrs old)', 'Young Adult (15-30 yrs old)')),
    educational_background TEXT CHECK (educational_background IN ('Elementary Level', 'Elementary Grad', 'High School Level', 'High School Grad', 'Vocational Grad', 'College Level', 'College Grad', 'Masters Level', 'Masters Grad', 'Doctorate Level', 'Doctorate Graduate')),
    work_status TEXT CHECK (work_status IN ('Employed', 'Unemployed', 'Self-Employed', 'Currently looking for a Job', 'Not interested looking for a job')),
    registered_SK_voter BOOLEAN,
    registered_national_voter BOOLEAN,
    attended_KK_assembly BOOLEAN,
    voted_last_SK BOOLEAN,
    times_attended TEXT CHECK (times_attended IN ('1-2 Times', '3-4 Times', '5 and above')) NULL,
    reason_not_attended TEXT CHECK (reason_not_attended IN ('There was no KK Assembly Meeting', 'Not interested to Attend')) NULL,
    
    -- Validation and technical fields
    validation_status TEXT CHECK (validation_status IN ('pending', 'validated', 'rejected')) DEFAULT 'pending',
    validation_tier TEXT CHECK (validation_tier IN ('automatic', 'manual', 'final')) DEFAULT 'automatic',
    validated_by VARCHAR(20) NULL, -- SK Official ID
    validation_date TIMESTAMP NULL,
    validation_comments TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES "KK_Survey_Batches"(batch_id) ON DELETE RESTRICT,
    FOREIGN KEY (youth_id) REFERENCES "Youth_Profiling"(youth_id) ON DELETE RESTRICT,
    FOREIGN KEY (barangay_id) REFERENCES "Barangay"(barangay_id) ON DELETE RESTRICT,
    FOREIGN KEY (validated_by) REFERENCES "SK_Officials"(sk_id) ON DELETE SET NULL
);

CREATE INDEX idx_kk_responses_batch_id ON "KK_Survey_Responses" (batch_id);
CREATE INDEX idx_kk_responses_youth_id ON "KK_Survey_Responses" (youth_id);
CREATE INDEX idx_kk_responses_barangay_id ON "KK_Survey_Responses" (barangay_id);
CREATE INDEX idx_kk_responses_validation_status ON "KK_Survey_Responses" (validation_status);
CREATE INDEX idx_kk_responses_validation_tier ON "KK_Survey_Responses" (validation_tier);
CREATE INDEX idx_kk_responses_created_at ON "KK_Survey_Responses" (created_at);

-- 12. VALIDATION_LOGS TABLE
CREATE TABLE "Validation_Logs" (
    log_id VARCHAR(20) PRIMARY KEY, -- e.g., 'LOG001', 'LOG002'
    response_id VARCHAR(20) NOT NULL,
    validated_by VARCHAR(20) NOT NULL, -- SK Official ID
    validation_action TEXT CHECK (validation_action IN ('validate', 'reject')) NOT NULL,
    validation_tier TEXT CHECK (validation_tier IN ('automatic', 'manual', 'final')) NOT NULL,
    validation_comments TEXT,
    validation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (response_id) REFERENCES "KK_Survey_Responses"(response_id) ON DELETE CASCADE,
    FOREIGN KEY (validated_by) REFERENCES "SK_Officials"(sk_id) ON DELETE RESTRICT
);

CREATE INDEX idx_validation_logs_response_id ON "Validation_Logs" (response_id);
CREATE INDEX idx_validation_logs_validated_by ON "Validation_Logs" (validated_by);
CREATE INDEX idx_validation_logs_validation_action ON "Validation_Logs" (validation_action);
CREATE INDEX idx_validation_logs_validation_date ON "Validation_Logs" (validation_date);

-- 13. ACTIVITY_LOGS TABLE
CREATE TABLE "Activity_Logs" (
    log_id VARCHAR(20) PRIMARY KEY, -- e.g., 'ACT001', 'ACT002'
    user_id VARCHAR(20) NULL, -- Can be NULL for anonymous actions
    user_type TEXT CHECK (user_type IN ('admin', 'lydo_staff', 'sk_official', 'youth', 'anonymous')) NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'survey', 'user', 'validation', etc.
    resource_id VARCHAR(20) NULL,
    resource_name VARCHAR(100) NULL,
    details JSONB, -- Additional details about the action
    category TEXT CHECK (category IN ('Authentication', 'User Management', 'Survey Management', 'Announcement', 'Activity Log', 'Data Export', 'Data Management', 'System Management', 'SK Management', 'Term Management', 'Youth Management', 'Voter Management', 'Notification Management', 'Bulk Operations', 'System Events', 'Data Validation', 'Report Generation', 'File Management', 'Email Operations', 'Security Events')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES "Users"(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_activity_logs_user_id ON "Activity_Logs" (user_id);
CREATE INDEX idx_activity_logs_user_type ON "Activity_Logs" (user_type);
CREATE INDEX idx_activity_logs_action ON "Activity_Logs" (action);
CREATE INDEX idx_activity_logs_resource ON "Activity_Logs" (resource_type, resource_id);
CREATE INDEX idx_activity_logs_created_at ON "Activity_Logs" (created_at);

-- 14. NOTIFICATIONS TABLE
CREATE TABLE "Notifications" (
    notification_id VARCHAR(20) PRIMARY KEY, -- e.g., 'NOT001', 'NOT002'
    user_id VARCHAR(20) NULL, -- NULL for broadcast notifications
    user_type TEXT CHECK (user_type IN ('admin', 'lydo_staff', 'sk_official', 'youth', 'all')) NULL, -- Target user type
    barangay_id VARCHAR(20) NULL, -- Target specific barangay
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'error', 'announcement', 'survey_reminder', 'validation_needed', 'sk_term_end', 'kk_batch_end')) DEFAULT 'info',
    priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL, -- Auto-expire notifications
    created_by VARCHAR(20) NOT NULL, -- Who created the notification
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES "Users"(user_id) ON DELETE CASCADE,
    FOREIGN KEY (barangay_id) REFERENCES "Barangay"(barangay_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES "Users"(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_id ON "Notifications" (user_id);
CREATE INDEX idx_notifications_user_type ON "Notifications" (user_type);
CREATE INDEX idx_notifications_barangay_id ON "Notifications" (barangay_id);
CREATE INDEX idx_notifications_type ON "Notifications" (type);
CREATE INDEX idx_notifications_priority ON "Notifications" (priority);
CREATE INDEX idx_notifications_is_read ON "Notifications" (is_read);
CREATE INDEX idx_notifications_created_at ON "Notifications" (created_at);
CREATE INDEX idx_notifications_expires_at ON "Notifications" (expires_at);

-- 15. ANNOUNCEMENTS TABLE
CREATE TABLE "Announcements" (
    announcement_id VARCHAR(20) PRIMARY KEY, -- e.g., 'ANN001', 'ANN002'
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    summary VARCHAR(500) NULL, -- Short summary for preview
    category TEXT CHECK (category IN ('projects', 'programs', 'activities', 'announcements', 'achievement',)) DEFAULT 'programs',
    status TEXT CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
    image_url VARCHAR(255) NULL,
    attachment_name VARCHAR(255) NULL,
    attachment_url VARCHAR(255) NULL,
    is_featured BOOLEAN DEFAULT FALSE, -- Featured announcements appear first
    is_pinned BOOLEAN DEFAULT FALSE, -- Pinned announcements stay at top
    published_at TIMESTAMP NULL,
    created_by VARCHAR(20) NOT NULL, -- Who created the announcement
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES "Users"(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_announcements_status ON "Announcements" (status);
CREATE INDEX idx_announcements_is_featured ON "Announcements" (is_featured);
CREATE INDEX idx_announcements_is_pinned ON "Announcements" (is_pinned);
CREATE INDEX idx_announcements_category ON "Announcements" (category);
CREATE INDEX idx_announcements_published_at ON "Announcements" (published_at);
CREATE INDEX idx_announcements_created_at ON "Announcements" (created_at);

ALTER TABLE "Announcements" 
ADD COLUMN location VARCHAR(100) NULL,        -- Where the event happens
ADD COLUMN event_date DATE NULL,             -- When the actual event happens
ADD COLUMN end_date DATE NULL;               -- When the event ends (for multi-day events)

-- Add indexes for performance
CREATE INDEX idx_announcements_event_date ON "Announcements" (event_date);
CREATE INDEX idx_announcements_location ON "Announcements" (location);

-- Create functions for updating timestamps (PostgreSQL doesn't have ON UPDATE CASCADE)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating updated_at columns
CREATE TRIGGER update_barangay_updated_at BEFORE UPDATE ON "Barangay" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON "Roles" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lydo_updated_at BEFORE UPDATE ON "LYDO" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sk_terms_updated_at BEFORE UPDATE ON "SK_Terms" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sk_officials_updated_at BEFORE UPDATE ON "SK_Officials" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sk_profiling_updated_at BEFORE UPDATE ON "SK_Officials_Profiling" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_youth_profiling_updated_at BEFORE UPDATE ON "Youth_Profiling" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "Users" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voters_list_updated_at BEFORE UPDATE ON "Voters_List" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kk_batches_updated_at BEFORE UPDATE ON "KK_Survey_Batches" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kk_responses_updated_at BEFORE UPDATE ON "KK_Survey_Responses" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON "Announcements" 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

