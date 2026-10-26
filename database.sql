-- ============================================================
-- FreelanceHub / Web Job Board - Database Schema & Seeds
-- 4 Roles: Admin, Company, Staff (Moderator), JobSeeker
-- ============================================================

-- 1. ตารางบทบาท (Roles)
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตารางรายการสิทธิ์ (Permissions)
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  module VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ตารางจับคู่สิทธิ์และบทบาท (Role x Permission Matrix)
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 4. ตารางบัญชีผู้ใช้งาน (Accounts)
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL,
  name VARCHAR(150),
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- เพิ่มฟิลด์ OAuth ให้ฐานข้อมูลเดิมที่สร้างตาราง accounts ไว้แล้วด้วย
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_oauth_identity
  ON accounts (oauth_provider, oauth_id)
  WHERE oauth_provider IS NOT NULL AND oauth_id IS NOT NULL;

-- 4.1 โปรไฟล์ผู้สมัครและบัญชีบริษัท (ใช้โดยการสมัครสมาชิกและหน้าโปรไฟล์)
CREATE TABLE IF NOT EXISTS job_seekers (
  account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  headline VARCHAR(255),
  bio TEXT,
  skills TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
  account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(150) NOT NULL,
  contact_name VARCHAR(200) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. ตารางประกาศรับสมัครงาน (Jobs)
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  budget NUMERIC(12, 2) NOT NULL CHECK (budget >= 0),
  location VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  moderator_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. ตารางใบสมัครงาน (Job Applications)
CREATE TABLE IF NOT EXISTS job_applications (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  cover_note TEXT,
  resume_attachment_id INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. ตารางจัดเก็บไฟล์อัปโหลด (Attachments - Resume / Documents)
CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. ตารางประวัติการใช้งานระบบ (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  username_or_email VARCHAR(255),
  ip_address VARCHAR(100),
  event_type VARCHAR(100) NOT NULL,
  resource VARCHAR(255),
  action VARCHAR(50),
  status VARCHAR(50) NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_apps_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_apps_user ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);

-- ============================================================
-- SEED DATA
-- ============================================================

-- 1. บันทึก 4 บทบาทหลัก
INSERT INTO roles (name, description, is_system) VALUES
  ('Admin', 'ผู้ดูแลระบบ: จัดการ Dynamic ACL Matrix และดู Audit Logs', TRUE),
  ('Company', 'บริษัท/ผู้ว่าจ้าง: สร้างประกาศงาน และพิจารณาอนุมัติ/ปฏิเสธผู้สมัคร', TRUE),
  ('Staff', 'เจ้าหน้าที่ตรวจสอบ: ตรวจสอบและอนุมัติประกาศงานก่อนเผยแพร่', TRUE),
  ('JobSeeker', 'ผู้สมัครงาน: ค้นหางาน ส่งใบสมัคร และแนบไฟล์ Resume', TRUE)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 2. บันทึกรายการสิทธิ์ (Permissions)
INSERT INTO permissions (code, name, module, description) VALUES
  ('jobs.read', 'ค้นหาและอ่านรายละเอียดงาน', 'jobs', 'สิทธิ์ดูประกาศงาน'),
  ('jobs.create', 'สร้างประกาศรับสมัครงาน', 'jobs', 'สิทธิ์ลงประกาศงานใหม่ของบริษัท'),
  ('jobs.moderate', 'ตรวจสอบและอนุมัติประกาศงาน', 'jobs', 'สิทธิ์เปลี่ยนสถานะงานเป็น Approved หรือ Rejected'),
  ('applications.apply', 'ส่งใบสมัครและแนบ Resume', 'applications', 'สิทธิ์สมัครงาน'),
  ('applications.review', 'ดูใบสมัครและอนุมัติ/ปฏิเสธผู้สมัคร', 'applications', 'สิทธิ์พิจารณาผู้สมัครงานของบริษัท'),
  ('files.upload', 'อัปโหลดไฟล์ Resume/เอกสาร', 'files', 'สิทธิ์ส่งไฟล์ขึ้นระบบ'),
  ('files.download', 'ดาวน์โหลดไฟล์แนบ', 'files', 'สิทธิ์ดาวน์โหลดไฟล์ที่ได้รับอนุญาต'),
  ('acl.manage', 'กำหนดสิทธิ์ Dynamic ACL Matrix', 'acl', 'สิทธิ์แก้ไข Role x Permission Matrix'),
  ('logs.read', 'ดูประวัติ Audit Logs', 'logs', 'สิทธิ์ตรวจสอบประวัติการใช้งาน')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 3. กำหนดสิทธิ์เริ่มต้น (Role Permissions)
-- Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'Admin'
ON CONFLICT DO NOTHING;

-- Company
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Company' AND p.code IN (
  'jobs.read', 'jobs.create', 'applications.review', 'files.download'
)
ON CONFLICT DO NOTHING;

-- Staff (Moderator)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Staff' AND p.code IN (
  'jobs.read', 'jobs.moderate'
)
ON CONFLICT DO NOTHING;

-- JobSeeker
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'JobSeeker' AND p.code IN (
  'jobs.read', 'applications.apply', 'files.upload', 'files.download'
)
ON CONFLICT DO NOTHING;

-- 4. บัญชีทดสอบ 4 Roles (รหัสผ่าน: FreelanceHub-Demo!2026#)
-- Hash: $2b$10$KzIpLTqx/5eiu7pf2v7kWO7y2Ca7W.8JfA9gOuu3SFgWM1xz9Ucui
INSERT INTO accounts (email, password_hash, role, name, phone) VALUES
  ('admin@jobboard.com', '$2b$10$KzIpLTqx/5eiu7pf2v7kWO7y2Ca7W.8JfA9gOuu3SFgWM1xz9Ucui', 'Admin', 'ผู้ดูแลระบบ (Admin)', '0810000001'),
  ('company@jobboard.com', '$2b$10$KzIpLTqx/5eiu7pf2v7kWO7y2Ca7W.8JfA9gOuu3SFgWM1xz9Ucui', 'Company', 'บริษัท เทคโนโลยี อินโนเวชั่น จำกัด', '0810000002'),
  ('staff@jobboard.com', '$2b$10$KzIpLTqx/5eiu7pf2v7kWO7y2Ca7W.8JfA9gOuu3SFgWM1xz9Ucui', 'Staff', 'เจ้าหน้าที่ตรวจสอบ (Moderator Staff)', '0810000003'),
  ('seeker@jobboard.com', '$2b$10$KzIpLTqx/5eiu7pf2v7kWO7y2Ca7W.8JfA9gOuu3SFgWM1xz9Ucui', 'JobSeeker', 'นายสมคิด ผู้สมัครงาน (Job Seeker)', '0810000004')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, name = EXCLUDED.name;

-- ตัวอย่างประกาศงานเริ่มต้น
INSERT INTO jobs (title, category, budget, location, description, status, created_by)
SELECT 'Full Stack Developer (Node.js & React)', 'Web Development', 35000, 'Bangkok / Hybrid', 'พัฒนาและดูแลระบบเว็บแอปพลิเคชันของบริษัท ทำงานแบบ Hybrid สัปดาห์ละ 2 วัน', 'approved', a.id
FROM accounts a WHERE a.email = 'company@jobboard.com' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO jobs (title, category, budget, location, description, status, created_by)
SELECT 'UI/UX Designer ออกแบบแอปพลิเคชัน', 'Design', 22000, 'Remote', 'ออกแบบ User Interface และ User Journey สำหรับ Mobile Application', 'pending', a.id
FROM accounts a WHERE a.email = 'company@jobboard.com' LIMIT 1
ON CONFLICT DO NOTHING;
