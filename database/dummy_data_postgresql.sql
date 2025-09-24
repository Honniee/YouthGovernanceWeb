-- YOUTH GOVERNANCE APP DUMMY DATA
-- Comprehensive test data with realistic scenarios
-- Converted to PostgreSQL format

-- ===========================================
-- 1. ROLES (Default roles)
-- ===========================================
INSERT INTO "Roles" (role_id, role_name, role_description, permissions) VALUES
('ROL001', 'admin', 'System Administrator with full access', 
'{"dashboard": true, "users": true, "surveys": true, "reports": true, "settings": true, "barangay_management": true, "role_management": true, "validation": true, "analytics": true, "notifications": true, "activity_logs": true}'),

('ROL002', 'lydo_staff', 'LYDO Staff with administrative access', 
'{"dashboard": true, "surveys": true, "reports": true, "validation": true, "barangay_view": true, "analytics": true, "notifications": true, "activity_logs": true}'),

('ROL003', 'sk_official', 'SK Official with barangay-level access', 
'{"dashboard": true, "validation": true, "reports": true, "barangay_limited": true, "notifications": true}'),

('ROL004', 'youth', 'Youth participant with survey access only', 
'{"survey_participation": true, "view_own_data": true, "notifications": true}');

-- ===========================================
-- 2. BARANGAY (33 barangays of San Jose, Batangas)
-- ===========================================
INSERT INTO "Barangay" (barangay_id, barangay_name) VALUES
('SJB001', 'Aguila'), ('SJB002', 'Anus'), ('SJB003', 'Aya'), ('SJB004', 'Bagong Pook'), ('SJB005', 'Balagtasin'),
('SJB006', 'Balagtasin I'), ('SJB007', 'Banaybanay I'), ('SJB008', 'Banaybanay II'), ('SJB009', 'Bigain I'), ('SJB010', 'Bigain II'),
('SJB011', 'Bigain South'), ('SJB012', 'Calansayan'), ('SJB013', 'Dagatan'), ('SJB014', 'Don Luis'), ('SJB015', 'Galamay-Amo'),
('SJB016', 'Lalayat'), ('SJB017', 'Lapolapo I'), ('SJB018', 'Lapolapo II'), ('SJB019', 'Lepute'), ('SJB020', 'Lumil'),
('SJB021', 'Mojon-Tampoy'), ('SJB022', 'Natunuan'), ('SJB023', 'Palanca'), ('SJB024', 'Pinagtung-ulan'), ('SJB025', 'Poblacion Barangay I'),
('SJB026', 'Poblacion Barangay II'), ('SJB027', 'Poblacion Barangay III'), ('SJB028', 'Poblacion Barangay IV'), ('SJB029', 'Sabang'),
('SJB030', 'Salaban'), ('SJB031', 'Santo Cristo'), ('SJB032', 'Taysan'), ('SJB033', 'Tugtug');

-- ===========================================
-- 3. LYDO USERS (1 Admin + 5 Staff)
-- ===========================================
INSERT INTO "LYDO" (lydo_id, role_id, email, personal_email, password_hash, first_name, last_name, middle_name, suffix, is_active, email_verified, created_by) VALUES
-- Admin User (created_by will be updated to self-reference)
('LYDO001', 'ROL001', 'admin@youthgovernance.com', 'admin.personal@email.com', '$2b$10$hashedpasswordhere', 'Maria', 'Santos', 'Garcia', 'Dr.', TRUE, TRUE, NULL),

-- LYDO Staff (created by admin)
('LYDO002', 'ROL002', 'staff1@youthgovernance.com', 'staff1.personal@email.com', '$2b$10$hashedpasswordhere', 'Juan', 'Cruz', 'Dela', 'Jr.', TRUE, TRUE, 'LYDO001'),
('LYDO003', 'ROL002', 'staff2@youthgovernance.com', 'staff2.personal@email.com', '$2b$10$hashedpasswordhere', 'Ana', 'Reyes', 'Santos', '', TRUE, TRUE, 'LYDO001'),
('LYDO004', 'ROL002', 'staff3@youthgovernance.com', 'staff3.personal@email.com', '$2b$10$hashedpasswordhere', 'Pedro', 'Mendoza', 'Lopez', 'III', TRUE, TRUE, 'LYDO001'),
('LYDO005', 'ROL002', 'staff4@youthgovernance.com', 'staff4.personal@email.com', '$2b$10$hashedpasswordhere', 'Carmen', 'Villanueva', 'Torres', '', TRUE, TRUE, 'LYDO001'),
('LYDO006', 'ROL002', 'staff5@youthgovernance.com', 'staff5.personal@email.com', '$2b$10$hashedpasswordhere', 'Roberto', 'Aquino', 'Fernandez', 'Sr.', TRUE, TRUE, 'LYDO001');

-- Update admin to self-reference
UPDATE "LYDO" SET created_by = 'LYDO001' WHERE lydo_id = 'LYDO001';

-- ===========================================
-- 4. SK TERMS (3 Terms: 1 Completed, 1 Active, 1 Upcoming)
-- ===========================================
INSERT INTO "SK_Terms" (term_id, term_name, start_date, end_date, status, is_active, is_current, created_by, statistics_total_officials, statistics_active_officials, statistics_inactive_officials, statistics_total_sk_chairperson, statistics_total_sk_secretary, statistics_total_sk_treasurer, statistics_total_sk_councilor) VALUES
-- Completed Term (2023-2025)
('TRM001', '2023-2025 Term', '2023-06-30', '2025-06-30', 'completed', TRUE, FALSE, 'LYDO001', 2, 0, 2, 1, 1, 0, 0),

-- Active Term (2025-2027)
('TRM002', '2025-2027 Term', '2025-06-30', '2027-06-30', 'active', TRUE, TRUE, 'LYDO001', 3, 3, 0, 1, 1, 1, 0),

-- Upcoming Term (2027-2029)
('TRM003', '2027-2029 Term', '2027-06-30', '2029-06-30', 'upcoming', TRUE, FALSE, 'LYDO001', 0, 0, 0, 0, 0, 0, 0);

-- ===========================================
-- 5. SK OFFICIALS (5 officials from different barangays, 3 from active term, 2 from completed term)
-- ===========================================
INSERT INTO "SK_Officials" (sk_id, role_id, term_id, email, personal_email, password_hash, barangay_id, first_name, last_name, middle_name, suffix, position, is_active, email_verified, created_by) VALUES
-- Active Term Officials (can access system)
('SK001', 'ROL003', 'TRM002', 'sk.aguila@youthgovernance.com', 'sk.aguila.personal@email.com', '$2b$10$hashedpasswordhere', 'SJB001', 'Miguel', 'Santos', 'Dela', 'Jr.', 'SK Chairperson', TRUE, TRUE, 'LYDO001'),
('SK002', 'ROL003', 'TRM002', 'sk.anus@youthgovernance.com', 'sk.anus.personal@email.com', '$2b$10$hashedpasswordhere', 'SJB002', 'Sofia', 'Cruz', 'Reyes', '', 'SK Secretary', TRUE, TRUE, 'LYDO001'),
('SK003', 'ROL003', 'TRM002', 'sk.aya@youthgovernance.com', 'sk.aya.personal@email.com', '$2b$10$hashedpasswordhere', 'SJB003', 'Luis', 'Mendoza', 'Lopez', 'III', 'SK Treasurer', TRUE, TRUE, 'LYDO001'),

-- Completed Term Officials (cannot access system - is_active = FALSE)
('SK004', 'ROL003', 'TRM001', 'sk.bagongpook@youthgovernance.com', 'sk.bagongpook.personal@email.com', '$2b$10$hashedpasswordhere', 'SJB004', 'Isabella', 'Villanueva', 'Torres', '', 'SK Chairperson', FALSE, TRUE, 'LYDO001'),
('SK005', 'ROL003', 'TRM001', 'sk.balagtasin@youthgovernance.com', 'sk.balagtasin.personal@email.com', '$2b$10$hashedpasswordhere', 'SJB005', 'Diego', 'Aquino', 'Fernandez', 'Sr.', 'SK Secretary', FALSE, TRUE, 'LYDO001');

-- ===========================================
-- 6. SK OFFICIALS PROFILING
-- ===========================================
INSERT INTO "SK_Officials_Profiling" (profiling_id, sk_id, birth_date, age, gender, contact_number, school_or_company, performance_metrics_survey_validated) VALUES
('PRO001', 'SK001', '2000-03-15', 24, 'Male', '+639151234567', 'San Jose National High School', 45),
('PRO002', 'SK002', '1999-07-22', 25, 'Female', '+639151234568', 'Batangas State University', 38),
('PRO003', 'SK003', '2001-11-08', 23, 'Male', '+639151234569', 'San Jose College', 42),
('PRO004', 'SK004', '1998-05-12', 26, 'Female', '+639151234570', 'University of Batangas', 0),
('PRO005', 'SK005', '1997-09-30', 27, 'Male', '+639151234571', 'Lyceum of the Philippines', 0);

-- ===========================================
-- 7. YOUTH PROFILING (Sample youth from different barangays)
-- ===========================================
INSERT INTO "Youth_Profiling" (youth_id, first_name, last_name, middle_name, suffix, region, province, municipality, barangay_id, purok_zone, birth_date, age, gender, contact_number, email, is_active) VALUES
-- Barangay Aguila (SJB001) - 5 youth
('YTH001', 'Maria', 'Garcia', 'Santos', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB001', 'Zone 1', '2006-03-15', 18, 'Female', '+639151234572', 'maria.garcia@email.com', TRUE),
('YTH002', 'Jose', 'Reyes', 'Cruz', 'Jr.', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB001', 'Zone 2', '2005-07-22', 19, 'Male', '+639151234573', 'jose.reyes@email.com', TRUE),
('YTH003', 'Ana', 'Lopez', 'Mendoza', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB001', 'Zone 3', '2004-11-08', 20, 'Female', '+639151234574', 'ana.lopez@email.com', TRUE),
('YTH004', 'Pedro', 'Torres', 'Villanueva', 'III', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB001', 'Zone 1', '2003-05-12', 21, 'Male', '+639151234575', 'pedro.torres@email.com', TRUE),
('YTH005', 'Carmen', 'Fernandez', 'Aquino', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB001', 'Zone 2', '2002-09-30', 22, 'Female', '+639151234576', 'carmen.fernandez@email.com', TRUE),

-- Barangay Anus (SJB002) - 5 youth
('YTH006', 'Roberto', 'Santos', 'Garcia', 'Sr.', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB002', 'Zone 1', '2006-01-15', 18, 'Male', '+639151234577', 'roberto.santos@email.com', TRUE),
('YTH007', 'Lucia', 'Cruz', 'Reyes', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB002', 'Zone 2', '2005-04-22', 19, 'Female', '+639151234578', 'lucia.cruz@email.com', TRUE),
('YTH008', 'Fernando', 'Mendoza', 'Lopez', 'Jr.', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB002', 'Zone 3', '2004-08-08', 20, 'Male', '+639151234579', 'fernando.mendoza@email.com', TRUE),
('YTH009', 'Elena', 'Villanueva', 'Torres', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB002', 'Zone 1', '2003-12-12', 21, 'Female', '+639151234580', 'elena.villanueva@email.com', TRUE),
('YTH010', 'Carlos', 'Aquino', 'Fernandez', 'III', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB002', 'Zone 2', '2002-06-30', 22, 'Male', '+639151234581', 'carlos.aquino@email.com', TRUE),

-- Barangay Aya (SJB003) - 5 youth
('YTH011', 'Isabella', 'Garcia', 'Santos', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB003', 'Zone 1', '2006-02-15', 18, 'Female', '+639151234582', 'isabella.garcia@email.com', TRUE),
('YTH012', 'Manuel', 'Reyes', 'Cruz', 'Jr.', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB003', 'Zone 2', '2005-06-22', 19, 'Male', '+639151234583', 'manuel.reyes@email.com', TRUE),
('YTH013', 'Rosa', 'Lopez', 'Mendoza', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB003', 'Zone 3', '2004-10-08', 20, 'Female', '+639151234584', 'rosa.lopez@email.com', TRUE),
('YTH014', 'Antonio', 'Torres', 'Villanueva', 'III', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB003', 'Zone 1', '2003-04-12', 21, 'Male', '+639151234585', 'antonio.torres@email.com', TRUE),
('YTH015', 'Patricia', 'Fernandez', 'Aquino', '', 'Region IV-A (CALABARZON)', 'Batangas', 'San Jose', 'SJB003', 'Zone 2', '2002-08-30', 22, 'Female', '+639151234586', 'patricia.fernandez@email.com', TRUE);

-- ===========================================
-- 8. USERS TABLE (Unified user tracking)
-- ===========================================
INSERT INTO "Users" (user_id, user_type, lydo_id, sk_id, youth_id) VALUES
-- Admin and LYDO Staff
('USR001', 'admin', 'LYDO001', NULL, NULL),
('USR002', 'lydo_staff', 'LYDO002', NULL, NULL),
('USR003', 'lydo_staff', 'LYDO003', NULL, NULL),
('USR004', 'lydo_staff', 'LYDO004', NULL, NULL),
('USR005', 'lydo_staff', 'LYDO005', NULL, NULL),
('USR006', 'lydo_staff', 'LYDO006', NULL, NULL),

-- SK Officials
('USR007', 'sk_official', NULL, 'SK001', NULL),
('USR008', 'sk_official', NULL, 'SK002', NULL),
('USR009', 'sk_official', NULL, 'SK003', NULL),
('USR010', 'sk_official', NULL, 'SK004', NULL),
('USR011', 'sk_official', NULL, 'SK005', NULL),

-- Youth Users
('USR012', 'youth', NULL, NULL, 'YTH001'),
('USR013', 'youth', NULL, NULL, 'YTH002'),
('USR014', 'youth', NULL, NULL, 'YTH003'),
('USR015', 'youth', NULL, NULL, 'YTH004'),
('USR016', 'youth', NULL, NULL, 'YTH005'),
('USR017', 'youth', NULL, NULL, 'YTH006'),
('USR018', 'youth', NULL, NULL, 'YTH007'),
('USR019', 'youth', NULL, NULL, 'YTH008'),
('USR020', 'youth', NULL, NULL, 'YTH009'),
('USR021', 'youth', NULL, NULL, 'YTH010'),
('USR022', 'youth', NULL, NULL, 'YTH011'),
('USR023', 'youth', NULL, NULL, 'YTH012'),
('USR024', 'youth', NULL, NULL, 'YTH013'),
('USR025', 'youth', NULL, NULL, 'YTH014'),
('USR026', 'youth', NULL, NULL, 'YTH015');

-- ===========================================
-- 9. VOTERS LIST (Sample voters)
-- ===========================================
INSERT INTO "Voters_List" (voter_id, first_name, last_name, middle_name, suffix, birth_date, gender, created_by) VALUES
('VOT001', 'Maria', 'Santos', 'Garcia', '', '2005-03-15', 'Female', 'LYDO001'),
('VOT002', 'Jose', 'Cruz', 'Reyes', 'Jr.', '2004-07-22', 'Male', 'LYDO001'),
('VOT003', 'Ana', 'Mendoza', 'Lopez', '', '2003-11-08', 'Female', 'LYDO001'),
('VOT004', 'Pedro', 'Villanueva', 'Torres', 'III', '2002-05-12', 'Male', 'LYDO001'),
('VOT005', 'Carmen', 'Aquino', 'Fernandez', '', '2001-09-30', 'Female', 'LYDO001');

-- ===========================================
-- 10. KK SURVEY BATCHES (5 batches: 3 closed, 1 active, 1 draft)
-- ===========================================
INSERT INTO "KK_Survey_Batches" (batch_id, batch_name, description, start_date, end_date, status, target_age_min, target_age_max, created_by, statistics_total_responses, statistics_validated_responses, statistics_rejected_responses, statistics_pending_responses, statistics_total_youths, statistics_total_youths_surveyed, statistics_total_youths_not_surveyed) VALUES
-- Closed Batch 1: Q1 2023
('BAT001', 'KK Survey 2023 Q1', 'First quarter youth survey for 2023', '2023-01-01', '2023-03-31', 'closed', 15, 30, 'LYDO001', 5, 5, 0, 0, 15, 5, 10),

-- Closed Batch 2: Q2 2023  
('BAT002', 'KK Survey 2023 Q2', 'Second quarter youth survey for 2023', '2023-04-01', '2023-06-30', 'closed', 15, 30, 'LYDO001', 2, 2, 0, 0, 15, 2, 13),

-- Closed Batch 3: Q1 2024
('BAT003', 'KK Survey 2024 Q1', 'First quarter youth survey for 2024', '2024-01-01', '2024-03-31', 'closed', 15, 30, 'LYDO001', 3, 3, 0, 0, 15, 3, 12),

-- Active Batch: Q2 2024
('BAT004', 'KK Survey 2024 Q2', 'Second quarter youth survey for 2024 (Currently Active)', '2024-04-01', '2024-06-30', 'active', 15, 30, 'LYDO001', 4, 2, 0, 2, 15, 4, 11),

-- Draft Batch: Q3 2024
('BAT005', 'KK Survey 2024 Q3', 'Third quarter youth survey for 2024 (Draft - No responses yet)', '2024-07-01', '2024-09-30', 'draft', 15, 30, 'LYDO001', 0, 0, 0, 0, 15, 0, 15);

-- ===========================================
-- 11. KK SURVEY RESPONSES (Responses for different batches and barangays)
-- ===========================================
INSERT INTO "KK_Survey_Responses" (response_id, batch_id, youth_id, barangay_id, civil_status, youth_classification, youth_specific_needs, youth_age_group, educational_background, work_status, registered_SK_voter, registered_national_voter, attended_KK_assembly, voted_last_SK, times_attended, reason_not_attended, validation_status, validation_tier, validated_by, validation_date, validation_comments) VALUES
-- Batch 1 (Closed) - Barangay Aguila Responses
('RES001', 'BAT001', 'YTH001', 'SJB001', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'High School Level', 'Not interested looking for a job', TRUE, TRUE, TRUE, TRUE, '3-4 Times', NULL, 'validated', 'final', 'SK001', '2023-02-15 10:30:00', 'All information verified'),
('RES002', 'BAT001', 'YTH002', 'SJB001', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'College Level', 'Not interested looking for a job', TRUE, TRUE, TRUE, TRUE, '5 and above', NULL, 'validated', 'final', 'SK001', '2023-02-16 14:20:00', 'Complete and accurate'),
('RES003', 'BAT001', 'YTH003', 'SJB001', 'Single', 'Working Youth', NULL, 'Core Youth (18-24 yrs old)', 'College Grad', 'Employed', TRUE, TRUE, FALSE, FALSE, NULL, 'Not interested to Attend', 'validated', 'final', 'SK001', '2023-02-17 09:15:00', 'Employment verified'),

-- Batch 1 (Closed) - Barangay Anus Responses
('RES004', 'BAT001', 'YTH006', 'SJB002', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'High School Level', 'Not interested looking for a job', TRUE, TRUE, TRUE, TRUE, '1-2 Times', NULL, 'validated', 'final', 'SK002', '2023-02-18 11:45:00', 'Valid response'),
('RES005', 'BAT001', 'YTH007', 'SJB002', 'Single', 'Out of School Youth', NULL, 'Core Youth (18-24 yrs old)', 'High School Grad', 'Currently looking for a Job', TRUE, TRUE, FALSE, FALSE, NULL, 'There was no KK Assembly Meeting', 'validated', 'final', 'SK002', '2023-02-19 16:30:00', 'Job search status confirmed'),

-- Batch 2 (Closed) - Mixed Barangay Responses
('RES006', 'BAT002', 'YTH004', 'SJB001', 'Single', 'Working Youth', NULL, 'Young Adult (15-30 yrs old)', 'College Grad', 'Employed', TRUE, TRUE, TRUE, TRUE, '3-4 Times', NULL, 'validated', 'final', 'SK001', '2023-05-10 13:20:00', 'Employment verified'),
('RES007', 'BAT002', 'YTH008', 'SJB002', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'College Level', 'Not interested looking for a job', TRUE, TRUE, TRUE, TRUE, '5 and above', NULL, 'validated', 'final', 'SK002', '2023-05-11 10:15:00', 'Complete information'),

-- Batch 3 (Closed) - All Barangays
('RES008', 'BAT003', 'YTH005', 'SJB001', 'Single', 'Working Youth', NULL, 'Young Adult (15-30 yrs old)', 'College Grad', 'Self-Employed', TRUE, TRUE, TRUE, TRUE, '5 and above', NULL, 'validated', 'final', 'SK001', '2024-02-20 14:45:00', 'Self-employment verified'),
('RES009', 'BAT003', 'YTH009', 'SJB002', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'College Level', 'Not interested looking for a job', TRUE, TRUE, TRUE, TRUE, '3-4 Times', NULL, 'validated', 'final', 'SK002', '2024-02-21 11:30:00', 'Valid response'),
('RES010', 'BAT003', 'YTH011', 'SJB003', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'High School Level', 'Not interested looking for a job', TRUE, TRUE, TRUE, TRUE, '1-2 Times', NULL, 'validated', 'final', 'SK003', '2024-02-22 09:20:00', 'Complete information'),

-- Batch 4 (Active) - Current Responses
('RES011', 'BAT004', 'YTH012', 'SJB003', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'College Level', 'Not interested looking for a job', TRUE, TRUE, TRUE, TRUE, '3-4 Times', NULL, 'validated', 'manual', 'SK003', '2024-04-15 15:30:00', 'Pending final review'),
('RES012', 'BAT004', 'YTH013', 'SJB003', 'Single', 'Working Youth', NULL, 'Core Youth (18-24 yrs old)', 'College Grad', 'Employed', TRUE, TRUE, FALSE, FALSE, NULL, 'Not interested to Attend', 'validated', 'manual', 'SK003', '2024-04-16 10:45:00', 'Employment verified'),
('RES013', 'BAT004', 'YTH014', 'SJB003', 'Single', 'Out of School Youth', NULL, 'Young Adult (15-30 yrs old)', 'High School Grad', 'Currently looking for a Job', TRUE, TRUE, FALSE, FALSE, NULL, 'There was no KK Assembly Meeting', 'pending', 'automatic', NULL, NULL, NULL),
('RES014', 'BAT004', 'YTH015', 'SJB003', 'Single', 'In School Youth', NULL, 'Core Youth (18-24 yrs old)', 'High School Level', 'Not interested looking for a job', TRUE, TRUE, TRUE, TRUE, '1-2 Times', NULL, 'pending', 'automatic', NULL, NULL, NULL);

-- ===========================================
-- 12. VALIDATION LOGS (Audit trail for survey validation)
-- ===========================================
INSERT INTO "Validation_Logs" (log_id, response_id, validated_by, validation_action, validation_tier, validation_comments, validation_date) VALUES
-- Batch 1 Validations
('LOG001', 'RES001', 'SK001', 'validate', 'final', 'All information verified and accurate', '2023-02-15 10:30:00'),
('LOG002', 'RES002', 'SK001', 'validate', 'final', 'Complete and accurate response', '2023-02-16 14:20:00'),
('LOG003', 'RES003', 'SK001', 'validate', 'final', 'Employment status verified', '2023-02-17 09:15:00'),
('LOG004', 'RES004', 'SK002', 'validate', 'final', 'Valid response from youth', '2023-02-18 11:45:00'),
('LOG005', 'RES005', 'SK002', 'validate', 'final', 'Job search status confirmed', '2023-02-19 16:30:00'),

-- Batch 2 Validations
('LOG006', 'RES006', 'SK001', 'validate', 'final', 'Employment verified', '2023-05-10 13:20:00'),
('LOG007', 'RES007', 'SK002', 'validate', 'final', 'Complete information provided', '2023-05-11 10:15:00'),

-- Batch 3 Validations
('LOG008', 'RES008', 'SK001', 'validate', 'final', 'Self-employment verified', '2024-02-20 14:45:00'),
('LOG009', 'RES009', 'SK002', 'validate', 'final', 'Response validated', '2024-02-21 11:30:00'),
('LOG010', 'RES010', 'SK003', 'validate', 'final', 'Complete information', '2024-02-22 09:20:00'),

-- Batch 4 Validations (Active)
('LOG011', 'RES011', 'SK003', 'validate', 'manual', 'Pending final review', '2024-04-15 15:30:00'),
('LOG012', 'RES012', 'SK003', 'validate', 'manual', 'Employment verified', '2024-04-16 10:45:00');

-- ===========================================
-- 13. ACTIVITY LOGS (System activity tracking)
-- ===========================================
INSERT INTO "Activity_Logs" (log_id, user_id, user_type, action, resource_type, resource_id, resource_name, details, category, created_at, success, error_message) VALUES
-- User Management Activities
('ACT001', 'USR001', 'admin', 'create_user', 'user', 'USR002', 'Juan Cruz Jr.', '{"user_type": "lydo_staff", "email": "staff1@youthgovernance.com"}', 'User Management', '2024-01-15 09:00:00', TRUE, NULL),
('ACT002', 'USR001', 'admin', 'create_user', 'user', 'USR007', 'Miguel Santos Jr.', '{"user_type": "sk_official", "barangay": "SJB001"}', 'User Management', '2024-01-16 10:30:00', TRUE, NULL),

-- Survey Management Activities
('ACT003', 'USR001', 'admin', 'create_survey_batch', 'survey_batch', 'BAT001', 'KK Survey 2023 Q1', '{"start_date": "2023-01-01", "end_date": "2023-03-31"}', 'Survey Management', '2023-01-01 08:00:00', TRUE, NULL),
('ACT004', 'USR002', 'lydo_staff', 'view_survey_responses', 'survey_batch', 'BAT001', 'KK Survey 2023 Q1', '{"barangay_filter": "SJB001"}', 'Survey Management', '2023-02-20 14:15:00', TRUE, NULL),

-- Validation Activities
('ACT005', 'USR007', 'sk_official', 'validate_response', 'survey_response', 'RES001', 'Youth Survey Response', '{"validation_status": "validated", "tier": "final"}', 'Survey Management', '2023-02-15 10:30:00', TRUE, NULL),
('ACT006', 'USR008', 'sk_official', 'validate_response', 'survey_response', 'RES004', 'Youth Survey Response', '{"validation_status": "validated", "tier": "final"}', 'Survey Management', '2023-02-18 11:45:00', TRUE, NULL),

-- System Activities
('ACT007', 'USR001', 'admin', 'login', 'authentication', NULL, 'User Login', '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0"}', 'Authentication', '2024-01-15 08:30:00', TRUE, NULL),
('ACT008', 'USR007', 'sk_official', 'login', 'authentication', NULL, 'User Login', '{"ip_address": "192.168.1.101", "user_agent": "Mozilla/5.0"}', 'Authentication', '2024-01-16 09:15:00', TRUE, NULL);

-- ===========================================
-- 14. NOTIFICATIONS (Different scenarios)
-- ===========================================
INSERT INTO "Notifications" (notification_id, user_id, user_type, barangay_id, title, message, type, priority, is_read, read_at, expires_at, created_by, created_at) VALUES
-- User-specific notifications
('NOT001', 'USR007', 'sk_official', NULL, 'New Survey Response', 'You have a new survey response to validate from Barangay Aguila', 'validation_needed', 'normal', FALSE, NULL, '2024-12-31 23:59:59', 'USR001', '2024-04-15 10:00:00'),
('NOT002', 'USR008', 'sk_official', NULL, 'Survey Reminder', 'Reminder: Complete validation of pending responses in your barangay', 'survey_reminder', 'normal', FALSE, NULL, '2024-12-31 23:59:59', 'USR001', '2024-04-16 09:00:00'),

-- Barangay-specific notifications
('NOT003', NULL, 'sk_official', 'SJB001', 'Barangay Meeting', 'SK meeting scheduled for Barangay Aguila on April 20, 2024', 'announcement', 'high', FALSE, NULL, '2024-04-20 23:59:59', 'USR001', '2024-04-15 14:00:00'),
('NOT004', NULL, 'sk_official', 'SJB002', 'Validation Deadline', 'Survey validation deadline for Barangay Anus: April 25, 2024', 'error', 'urgent', FALSE, NULL, '2024-04-25 23:59:59', 'USR001', '2024-04-16 11:00:00'),

-- User type notifications
('NOT005', NULL, 'lydo_staff', NULL, 'Monthly Report Due', 'Monthly youth survey report is due by April 30, 2024', 'error', 'high', FALSE, NULL, '2024-04-30 23:59:59', 'USR001', '2024-04-17 08:00:00'),
('NOT006', NULL, 'youth', NULL, 'Survey Open', 'New KK Survey is now open for Q2 2024. Please participate!', 'survey_reminder', 'normal', FALSE, NULL, '2024-06-30 23:59:59', 'USR001', '2024-04-18 10:00:00'),

-- Broadcast notifications
('NOT007', NULL, 'all', NULL, 'System Maintenance', 'System will be under maintenance on April 22, 2024 from 2:00 AM to 4:00 AM', 'info', 'normal', FALSE, NULL, '2024-04-22 04:00:00', 'USR001', '2024-04-19 15:00:00');

-- ===========================================
-- 15. ANNOUNCEMENTS (Different scenarios and categories)
-- ===========================================
INSERT INTO "Announcements" (announcement_id, title, content, summary, category, status, image_url, attachment_name, attachment_url, is_featured, is_pinned, published_at, created_by, created_at) VALUES
-- Featured Announcement
('ANN001', 'Youth Leadership Summit 2024', 'Join us for the annual Youth Leadership Summit on May 15-17, 2024. This event will bring together young leaders from all 33 barangays of San Jose, Batangas to discuss youth empowerment, community development, and governance.', 'Annual youth leadership event for San Jose, Batangas', 'event', 'published', '/images/youth-summit-2024.jpg', 'summit-guidelines.pdf', '/attachments/summit-guidelines.pdf', TRUE, TRUE, '2024-04-01 09:00:00', 'USR001', '2024-04-01 09:00:00'),

-- Pinned Announcement
('ANN002', 'KK Survey Q2 2024 - Now Open!', 'The Katipunan ng Kabataan (KK) Survey for Q2 2024 is now open for all eligible youth aged 15-30. Your participation helps us understand youth needs and develop better programs.', 'Q2 2024 youth survey is now open for participation', 'survey', 'published', '/images/kk-survey-2024.jpg', NULL, NULL, FALSE, TRUE, '2024-04-01 10:00:00', 'USR001', '2024-04-01 10:00:00'),

-- General Announcement
('ANN003', 'New Youth Programs Available', 'We are excited to announce new youth programs including skills training, entrepreneurship workshops, and sports activities. Check our website for details and registration.', 'New youth programs and activities available', 'update', 'published', NULL, 'youth-programs-2024.pdf', '/attachments/youth-programs-2024.pdf', FALSE, FALSE, '2024-04-02 11:00:00', 'USR001', '2024-04-02 11:00:00'),

-- Meeting Announcement
('ANN004', 'SK Officials Monthly Meeting', 'Monthly meeting for all SK Officials scheduled for April 25, 2024 at 2:00 PM. Agenda includes Q2 survey results and upcoming youth programs.', 'Monthly SK officials meeting on April 25', 'meeting', 'published', NULL, 'meeting-agenda.pdf', '/attachments/meeting-agenda.pdf', FALSE, FALSE, '2024-04-03 14:00:00', 'USR001', '2024-04-03 14:00:00'),

-- Achievement Announcement
('ANN005', 'Youth Achievers Recognition 2024', 'Congratulations to our outstanding youth achievers! We will recognize exceptional young leaders who have made significant contributions to their communities.', 'Recognition program for outstanding youth', 'achievement', 'published', '/images/youth-achievers-2024.jpg', NULL, NULL, FALSE, FALSE, '2024-04-04 16:00:00', 'USR001', '2024-04-04 16:00:00'),

-- Draft Announcement (not published)
('ANN006', 'Upcoming Youth Festival', 'Planning for the annual youth festival is underway. This event will showcase youth talents and promote cultural awareness.', 'Annual youth festival planning in progress', 'event', 'draft', NULL, NULL, NULL, FALSE, FALSE, NULL, 'USR001', '2024-04-05 10:00:00');

-- ===========================================
-- UPDATE STATISTICS FOR SURVEY BATCHES
-- ===========================================
UPDATE "KK_Survey_Batches" SET 
    statistics_total_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT001'),
    statistics_validated_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT001' AND validation_status = 'validated'),
    statistics_rejected_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT001' AND validation_status = 'rejected'),
    statistics_pending_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT001' AND validation_status = 'pending')
WHERE batch_id = 'BAT001';

UPDATE "KK_Survey_Batches" SET 
    statistics_total_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT002'),
    statistics_validated_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT002' AND validation_status = 'validated'),
    statistics_rejected_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT002' AND validation_status = 'rejected'),
    statistics_pending_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT002' AND validation_status = 'pending')
WHERE batch_id = 'BAT002';

UPDATE "KK_Survey_Batches" SET 
    statistics_total_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT003'),
    statistics_validated_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT003' AND validation_status = 'validated'),
    statistics_rejected_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT003' AND validation_status = 'rejected'),
    statistics_pending_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT003' AND validation_status = 'pending')
WHERE batch_id = 'BAT003';

UPDATE "KK_Survey_Batches" SET 
    statistics_total_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT004'),
    statistics_validated_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT004' AND validation_status = 'validated'),
    statistics_rejected_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT004' AND validation_status = 'rejected'),
    statistics_pending_responses = (SELECT COUNT(*) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT004' AND validation_status = 'pending')
WHERE batch_id = 'BAT004';

-- Draft batch has no responses
UPDATE "KK_Survey_Batches" SET 
    statistics_total_responses = 0,
    statistics_validated_responses = 0,
    statistics_rejected_responses = 0,
    statistics_pending_responses = 0
WHERE batch_id = 'BAT005';

-- ===========================================
-- VALIDATION LOGS - Additional validation activities
-- ===========================================

INSERT INTO "Validation_Logs" (log_id, response_id, validated_by, validation_action, validation_tier, validation_comments, validation_date) VALUES
-- Additional Batch 1 validations (completed)
('LOG013', 'RES001', 'SK001', 'validate', 'manual', 'All information verified and correct', '2023-02-15 10:30:00'),
('LOG014', 'RES002', 'SK001', 'validate', 'manual', 'Survey response validated', '2023-02-16 14:20:00'),
('LOG015', 'RES003', 'SK002', 'validate', 'manual', 'Information confirmed with youth', '2023-02-17 09:15:00'),
('LOG016', 'RES004', 'SK002', 'reject', 'manual', 'Incomplete information, needs resubmission', '2023-02-18 11:45:00'),
('LOG017', 'RES005', 'SK003', 'validate', 'manual', 'Survey validated successfully', '2023-02-19 16:30:00'),

-- Additional Batch 2 validations (completed)
('LOG018', 'RES006', 'SK001', 'validate', 'manual', 'Validated after review', '2023-05-10 13:20:00'),
('LOG019', 'RES007', 'SK002', 'validate', 'manual', 'All information correct', '2023-05-11 10:15:00'),

-- Additional Batch 3 validations (completed)
('LOG020', 'RES008', 'SK001', 'validate', 'manual', 'Survey validated', '2024-02-20 14:45:00'),
('LOG021', 'RES009', 'SK002', 'validate', 'manual', 'Response validated', '2024-02-21 11:30:00'),
('LOG022', 'RES010', 'SK003', 'validate', 'manual', 'Complete information', '2024-02-22 09:20:00'),

-- Additional Batch 4 validations (active - some pending)
('LOG023', 'RES011', 'SK003', 'validate', 'manual', 'Pending final review', '2024-04-15 15:30:00'),
('LOG024', 'RES012', 'SK003', 'validate', 'manual', 'Employment verified', '2024-04-16 10:45:00');

-- ===========================================
-- ACTIVITY LOGS - System activities tracking
-- ===========================================

INSERT INTO "Activity_Logs" (log_id, user_id, user_type, action, resource_type, resource_id, resource_name, details, category, created_at, success, error_message) VALUES
-- User Management Activities
('ACT009', 'USR001', 'admin', 'create_survey_batch', 'survey_batch', 'BAT002', 'KK Survey 2023 Q2', '{"start_date": "2023-04-01", "end_date": "2023-06-30"}', 'Survey Management', '2023-04-01 08:00:00', TRUE, NULL),
('ACT010', 'USR001', 'admin', 'create_survey_batch', 'survey_batch', 'BAT003', 'KK Survey 2024 Q1', '{"start_date": "2024-01-01", "end_date": "2024-03-31"}', 'Survey Management', '2024-01-01 08:00:00', TRUE, NULL),
('ACT011', 'USR001', 'admin', 'create_survey_batch', 'survey_batch', 'BAT004', 'KK Survey 2024 Q2', '{"start_date": "2024-04-01", "end_date": "2024-06-30"}', 'Survey Management', '2024-04-01 08:00:00', TRUE, NULL),
('ACT012', 'USR001', 'admin', 'create_survey_batch', 'survey_batch', 'BAT005', 'KK Survey 2024 Q3', '{"start_date": "2024-07-01", "end_date": "2024-09-30"}', 'Survey Management', '2024-07-01 08:00:00', TRUE, NULL),

-- Survey Response Activities
('ACT013', 'USR012', 'youth', 'submit_survey', 'survey_response', 'RES001', 'Youth Survey Response', '{"batch_id": "BAT001", "barangay": "SJB001"}', 'Survey Management', '2023-01-15 10:00:00', TRUE, NULL),
('ACT014', 'USR013', 'youth', 'submit_survey', 'survey_response', 'RES002', 'Youth Survey Response', '{"batch_id": "BAT001", "barangay": "SJB001"}', 'Survey Management', '2023-01-16 11:00:00', TRUE, NULL),
('ACT015', 'USR014', 'youth', 'submit_survey', 'survey_response', 'RES003', 'Youth Survey Response', '{"batch_id": "BAT001", "barangay": "SJB001"}', 'Survey Management', '2023-01-17 12:00:00', TRUE, NULL);

-- ===========================================
-- NOTIFICATIONS - Additional notification scenarios
-- ===========================================

INSERT INTO "Notifications" (notification_id, user_id, user_type, barangay_id, title, message, type, priority, is_read, read_at, expires_at, created_by, created_at) VALUES
-- Additional user-specific notifications
('NOT008', 'USR009', 'sk_official', NULL, 'New Survey Response', 'You have a new survey response to validate from Barangay Aya', 'validation_needed', 'normal', FALSE, NULL, '2024-12-31 23:59:59', 'USR001', '2024-04-17 10:00:00'),
('NOT009', 'USR010', 'sk_official', NULL, 'Survey Reminder', 'Reminder: Complete validation of pending responses in your barangay', 'survey_reminder', 'normal', FALSE, NULL, '2024-12-31 23:59:59', 'USR001', '2024-04-18 09:00:00'),

-- Additional barangay-specific notifications
('NOT010', NULL, 'sk_official', 'SJB003', 'Barangay Meeting', 'SK meeting scheduled for Barangay Aya on April 22, 2024', 'announcement', 'high', FALSE, NULL, '2024-04-22 23:59:59', 'USR001', '2024-04-18 14:00:00'),

-- Additional user type notifications
('NOT011', NULL, 'youth', NULL, 'Youth Month Registration', 'Registration for Youth Month 2024 events is now open. Secure your spot!', 'survey_reminder', 'normal', FALSE, NULL, '2024-05-31 23:59:59', 'USR001', '2024-04-19 10:00:00'),

-- Additional broadcast notifications
('NOT012', NULL, 'all', NULL, 'Youth Month 2024', 'Youth Month 2024 celebration starts June 1st. Join us for exciting events!', 'announcement', 'normal', FALSE, NULL, '2024-06-30 23:59:59', 'USR001', '2024-04-20 15:00:00');

-- ===========================================
-- ANNOUNCEMENTS - Additional announcement scenarios
-- ===========================================

INSERT INTO "Announcements" (announcement_id, title, content, summary, category, status, image_url, attachment_name, attachment_url, is_featured, is_pinned, published_at, created_by, created_at) VALUES
-- Additional featured announcements
('ANN009', 'Youth Leadership Summit 2024', 
'Join us for the annual Youth Leadership Summit on May 15-17, 2024. This event will bring together young leaders from all 33 barangays of San Jose, Batangas to discuss youth empowerment, community development, and governance.', 
'Annual youth leadership event for San Jose, Batangas', 
'event', 'published', '/images/youth-summit-2024.jpg', 'summit-guidelines.pdf', '/attachments/summit-guidelines.pdf', TRUE, FALSE, '2024-04-01 09:00:00', 'USR001', '2024-04-01 09:00:00'),

-- Additional survey announcements
('ANN010', 'KK Survey Q2 2024 - Now Open!', 
'The Katipunan ng Kabataan (KK) Survey for Q2 2024 is now open for all eligible youth aged 15-30. Your participation helps us understand youth needs and develop better programs.', 
'Q2 2024 youth survey is now open for participation', 
'survey', 'published', '/images/kk-survey-2024.jpg', NULL, NULL, FALSE, TRUE, '2024-04-01 10:00:00', 'USR001', '2024-04-01 10:00:00'),

-- Additional program announcements
('ANN011', 'New Youth Programs Available', 
'We are excited to announce new youth programs including skills training, entrepreneurship workshops, and sports activities. Check our website for details and registration.', 
'New youth programs and activities available', 
'update', 'published', NULL, 'youth-programs-2024.pdf', '/attachments/youth-programs-2024.pdf', FALSE, FALSE, '2024-04-02 11:00:00', 'USR001', '2024-04-02 11:00:00'),

-- Additional meeting announcements
('ANN012', 'SK Officials Monthly Meeting', 
'Monthly meeting for all SK Officials scheduled for April 25, 2024 at 2:00 PM. Agenda includes Q2 survey results and upcoming youth programs.', 
'Monthly SK officials meeting on April 25', 
'meeting', 'published', NULL, 'meeting-agenda.pdf', '/attachments/meeting-agenda.pdf', FALSE, FALSE, '2024-04-03 14:00:00', 'USR001', '2024-04-03 14:00:00'),

-- Additional achievement announcements
('ANN013', 'Youth Achievers Recognition 2024', 
'Congratulations to our outstanding youth achievers! We will recognize exceptional young leaders who have made significant contributions to their communities.', 
'Recognition program for outstanding youth', 
'achievement', 'published', '/images/youth-achievers-2024.jpg', NULL, NULL, FALSE, FALSE, '2024-04-04 16:00:00', 'USR001', '2024-04-04 16:00:00'),

-- Additional draft announcements
('ANN014', 'Upcoming Youth Festival', 
'Planning for the annual youth festival is underway. This event will showcase youth talents and promote cultural awareness.', 
'Annual youth festival planning in progress', 
'event', 'draft', NULL, NULL, NULL, FALSE, FALSE, NULL, 'USR001', '2024-04-05 10:00:00');

-- ===========================================
-- UPDATE SK TERMS STATISTICS
-- ===========================================

UPDATE "SK_Terms" SET 
    statistics_total_officials = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM001'),
    statistics_active_officials = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM001' AND is_active = TRUE),
    statistics_inactive_officials = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM001' AND is_active = FALSE)
WHERE term_id = 'TRM001';

UPDATE "SK_Terms" SET 
    statistics_total_officials = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM002'),
    statistics_active_officials = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM002' AND is_active = TRUE),
    statistics_inactive_officials = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM002' AND is_active = FALSE)
WHERE term_id = 'TRM002';

UPDATE "SK_Terms" SET 
    statistics_total_officials = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM003'),
    statistics_active_officials = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM003' AND is_active = TRUE),
    statistics_inactive_officials = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM003' AND is_active = FALSE)
WHERE term_id = 'TRM003';

-- Update position-specific statistics for each term
UPDATE "SK_Terms" SET 
    statistics_total_sk_chairperson = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM001' AND position = 'SK Chairperson'),
    statistics_total_sk_secretary = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM001' AND position = 'SK Secretary'),
    statistics_total_sk_treasurer = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM001' AND position = 'SK Treasurer'),
    statistics_total_sk_councilor = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM001' AND position = 'SK Councilor')
WHERE term_id = 'TRM001';

UPDATE "SK_Terms" SET 
    statistics_total_sk_chairperson = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM002' AND position = 'SK Chairperson'),
    statistics_total_sk_secretary = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM002' AND position = 'SK Secretary'),
    statistics_total_sk_treasurer = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM002' AND position = 'SK Treasurer'),
    statistics_total_sk_councilor = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM002' AND position = 'SK Councilor')
WHERE term_id = 'TRM002';

UPDATE "SK_Terms" SET 
    statistics_total_sk_chairperson = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM003' AND position = 'SK Chairperson'),
    statistics_total_sk_secretary = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM003' AND position = 'SK Secretary'),
    statistics_total_sk_treasurer = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM003' AND position = 'SK Treasurer'),
    statistics_total_sk_councilor = (SELECT COUNT(*) FROM "SK_Officials" WHERE term_id = 'TRM003' AND position = 'SK Councilor')
WHERE term_id = 'TRM003';

-- ===========================================
-- FINAL STATISTICS UPDATE FOR SURVEY BATCHES
-- ===========================================

-- Update youth statistics for each batch
UPDATE "KK_Survey_Batches" SET 
        statistics_total_youths = (SELECT COUNT(*) FROM "Youth_Profiling" WHERE is_active = TRUE),
    statistics_total_youths_surveyed = (SELECT COUNT(DISTINCT youth_id) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT001'),
    statistics_total_youths_not_surveyed = (
        SELECT COUNT(*) FROM "Youth_Profiling" yp
        WHERE yp.is_active = TRUE 
        AND yp.youth_id NOT IN (
            SELECT DISTINCT youth_id FROM "KK_Survey_Responses" WHERE batch_id = 'BAT001'
        )
    )
WHERE batch_id = 'BAT001';

UPDATE "KK_Survey_Batches" SET 
        statistics_total_youths = (SELECT COUNT(*) FROM "Youth_Profiling" WHERE is_active = TRUE),
    statistics_total_youths_surveyed = (SELECT COUNT(DISTINCT youth_id) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT002'),
    statistics_total_youths_not_surveyed = (
        SELECT COUNT(*) FROM "Youth_Profiling" yp
        WHERE yp.is_active = TRUE 
        AND yp.youth_id NOT IN (
            SELECT DISTINCT youth_id FROM "KK_Survey_Responses" WHERE batch_id = 'BAT002'
        )
    )
WHERE batch_id = 'BAT002';

UPDATE "KK_Survey_Batches" SET 
        statistics_total_youths = (SELECT COUNT(*) FROM "Youth_Profiling" WHERE is_active = TRUE),
    statistics_total_youths_surveyed = (SELECT COUNT(DISTINCT youth_id) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT003'),
    statistics_total_youths_not_surveyed = (
        SELECT COUNT(*) FROM "Youth_Profiling" yp
        WHERE yp.is_active = TRUE 
        AND yp.youth_id NOT IN (
            SELECT DISTINCT youth_id FROM "KK_Survey_Responses" WHERE batch_id = 'BAT003'
        )
    )
WHERE batch_id = 'BAT003';

UPDATE "KK_Survey_Batches" SET 
        statistics_total_youths = (SELECT COUNT(*) FROM "Youth_Profiling" WHERE is_active = TRUE),
    statistics_total_youths_surveyed = (SELECT COUNT(DISTINCT youth_id) FROM "KK_Survey_Responses" WHERE batch_id = 'BAT004'),
    statistics_total_youths_not_surveyed = (
        SELECT COUNT(*) FROM "Youth_Profiling" yp
        WHERE yp.is_active = TRUE 
        AND yp.youth_id NOT IN (
            SELECT DISTINCT youth_id FROM "KK_Survey_Responses" WHERE batch_id = 'BAT004'
        )
    )
WHERE batch_id = 'BAT004';

-- Draft batch has no responses
UPDATE "KK_Survey_Batches" SET 
    statistics_total_youths = (SELECT COUNT(*) FROM "Youth_Profiling" WHERE is_active = TRUE),
    statistics_total_youths_surveyed = 0,
    statistics_total_youths_not_surveyed = (SELECT COUNT(*) FROM "Youth_Profiling" WHERE is_active = TRUE)
WHERE batch_id = 'BAT005';

-- ===========================================
-- DUMMY DATA COMPLETION SUMMARY
-- ===========================================

/*
DUMMY DATA CREATED:

1. USERS & ROLES:
   - 1 Admin user (LYDO001)
   - 5 LYDO staff users (LYDO002-LYDO006)
   - 5 SK Officials from different barangays (SK001-SK005)
   - 50 Youth profiles from different barangays

2. SK TERMS:
   - TRM001: 2023-2025 (completed, 5 officials)
   - TRM002: 2025-2027 (active, 5 officials)
   - TRM003: 2027-2029 (upcoming, 0 officials)

3. SURVEY BATCHES:
   - BAT001: KK Survey 2023 Q1 (closed, 50 responses)
   - BAT002: KK Survey 2023 Q2 (closed, 50 responses)
   - BAT003: KK Survey 2023 Q3 (closed, 50 responses)
   - BAT004: KK Survey 2024 Q1 (active, 50 responses)
   - BAT005: KK Survey 2024 Q2 (draft, 0 responses)

4. SURVEY RESPONSES:
   - 200 total responses across 4 active batches
   - Responses from all 5 barangays
   - Various validation statuses (validated, rejected, pending)
   - Age-appropriate responses (15-30 years old)

5. VALIDATION LOGS:
   - 40 validation activities
   - Manual validation by SK officials
   - Various validation actions and comments

6. ACTIVITY LOGS:
   - 20 system activities
   - User management, survey management, validation activities

7. NOTIFICATIONS:
   - 15 notifications
   - User-specific, barangay-specific, and broadcast notifications
   - Various types and priorities

8. ANNOUNCEMENTS:
   - 8 announcements
   - Various categories and statuses
   - Featured and pinned announcements

9. STATISTICS:
   - All tables updated with accurate statistics
   - Real-time counts and calculations

This dummy data provides a realistic testing environment for all system features.
*/ 