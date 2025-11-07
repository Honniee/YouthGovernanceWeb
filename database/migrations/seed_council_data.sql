-- Seed data for LYDO Council
-- This file creates initial council roles and members for testing
-- NOTE: SK Chairperson and Vice Chairperson are fetched from SK_Officials table separately

-- Insert council roles (excluding Chairperson and Vice Chairperson as they come from SK)
INSERT INTO "LYDO_Council_Roles" (id, role_name, role_description, created_by) VALUES
('LYDCROL001', 'Education Representative', 'Sector representative focusing on Education and youth learning initiatives', 'USR001'),
('LYDCROL002', 'Health Representative', 'Sector representative focusing on Health and wellness programs', 'USR001'),
('LYDCROL003', 'Governance Representative', 'Sector representative focusing on Governance and youth participation in government', 'USR001'),
('LYDCROL004', 'Social Inclusion & Equity Representative', 'Sector representative focusing on Social Inclusion and Equity for all youth', 'USR001'),
('LYDCROL005', 'Global Mobility Representative', 'Sector representative focusing on Global Mobility and international exchanges', 'USR001'),
('LYDCROL006', 'Environment Protection Representative', 'Sector representative focusing on Environmental protection and sustainability', 'USR001'),
('LYDCROL007', 'Active Citizenship Representative', 'Sector representative focusing on Active Citizenship and civic engagement', 'USR001'),
('LYDCROL008', 'Peacebuilding & Security Representative', 'Sector representative focusing on Peacebuilding and Security initiatives', 'USR001'),
('LYDCROL009', 'Economic Empowerment Representative', 'Sector representative focusing on Economic Empowerment and entrepreneurship', 'USR001'),
('LYDCROL010', 'Agriculture Representative', 'Sector representative focusing on Agriculture and sustainable farming', 'USR001')
ON CONFLICT (id) DO NOTHING;

-- Insert council members (match current schema: id, role_id, member_name, is_active, created_by)
INSERT INTO "LYDO_Council_Members" (
  id,
  role_id,
  member_name,
  is_active,
  created_by
) VALUES
-- Sector Representatives
('LYDCMEM001', 'LYDCROL001', 'Luis Emmanuel Ramos', TRUE, 'USR001'),

('LYDCMEM002', 'LYDCROL002', 'Jarred Vincent M. Asi', TRUE, 'USR001'),

('LYDCMEM003', 'LYDCROL003', 'Christia Nasel M. Luna', TRUE, 'USR001'),

('LYDCMEM004', 'LYDCROL003', 'Marc Adrian D. Marinas', TRUE, 'USR001'),

('LYDCMEM005', 'LYDCROL004', 'Larry P. Gotgotao Jr.', TRUE, 'USR001'),

('LYDCMEM006', 'LYDCROL005', 'Juvhi Isabel Teofila F. Kamus', TRUE, 'USR001'),

('LYDCMEM007', 'LYDCROL006', 'Christopher B. Umali', TRUE, 'USR001'),

('LYDCMEM008', 'LYDCROL007', 'Lian Airisteah M. San Pedro', TRUE, 'USR001'),

('LYDCMEM009', 'LYDCROL008', 'Rica Helaena B. Rea', TRUE, 'USR001'),

('LYDCMEM010', 'LYDCROL009', 'Danna Shiori Briones', TRUE, 'USR001'),

('LYDCMEM011', 'LYDCROL010', 'Josh Zyk L. Lumanglas', TRUE, 'USR001')
ON CONFLICT (id) DO NOTHING;

-- Create initial council page record
INSERT INTO "LYDO_Council_Page" (id, hero_url_1, hero_url_2, hero_url_3, created_by) 
VALUES ('LYDCPAGE001', NULL, NULL, NULL, 'USR001')
ON CONFLICT (id) DO NOTHING;

-- Display summary
SELECT 
  'LYDO Council Seed Data' as summary,
  (SELECT COUNT(*) FROM "LYDO_Council_Roles") as roles_created,
  (SELECT COUNT(*) FROM "LYDO_Council_Members") as members_created
FROM "LYDO_Council_Roles"
LIMIT 1;

SELECT 'Council seed data created successfully!' as status;
