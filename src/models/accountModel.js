"use strict";

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const BCRYPT_ROUNDS = 12;

// Hash รหัสผ่านด้วย bcrypt ตามข้อกำหนดความปลอดภัยใน AGENT.md
async function hashPassword(password) {
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

// บันทึกบัญชีผู้สมัครงาน (Job Seeker) พร้อมสร้าง Transaction ใน PostgreSQL
async function createJobSeeker(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hashedPassword = await hashPassword(data.password);
    const email = data.email.trim().toLowerCase();

    const accountRes = await client.query(
      `INSERT INTO accounts (email, password_hash, role)
       VALUES ($1, $2, 'jobSeeker')
       RETURNING id`,
      [email, hashedPassword]
    );

    const accountId = accountRes.rows[0].id;

    await client.query(
      `INSERT INTO job_seekers (account_id, first_name, last_name)
       VALUES ($1, $2, $3)`,
      [accountId, data.firstName.trim(), data.lastName.trim()]
    );

    // สร้างข้อมูลลง users table ควบคู่ด้วย เพื่อรองรับการทำงานกับระบบเดิม
    try {
      const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`;
      await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'freelancer')
         ON CONFLICT (email) DO NOTHING`,
        [fullName, email, hashedPassword]
      );
    } catch {
      // ข้ามกรณีข้อผิดพลาดของตารางเดิม
    }

    await client.query('COMMIT');
    return accountId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// บันทึกบัญชีบริษัท (Company) พร้อมสร้าง Transaction ใน PostgreSQL
async function createCompany(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hashedPassword = await hashPassword(data.password);
    const accountEmail = data.accountEmail.trim().toLowerCase();
    const contactEmail = data.contactEmail.trim().toLowerCase();

    const accountRes = await client.query(
      `INSERT INTO accounts (email, password_hash, role)
       VALUES ($1, $2, 'company')
       RETURNING id`,
      [accountEmail, hashedPassword]
    );

    const accountId = accountRes.rows[0].id;

    await client.query(
      `INSERT INTO companies (
         account_id,
         username,
         company_name,
         business_type,
         contact_name,
         phone,
         contact_email
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        accountId,
        data.username.trim(),
        data.companyName.trim(),
        data.businessType.trim(),
        data.contactName.trim(),
        data.phone.trim(),
        contactEmail
      ]
    );

    // บันทึกลง users ควบคู่ด้วย
    try {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'employer')
         ON CONFLICT (email) DO NOTHING`,
        [data.companyName.trim(), accountEmail, hashedPassword]
      );
    } catch {
      // ข้ามกรณีข้อผิดพลาดของตารางเดิม
    }

    await client.query('COMMIT');
    return accountId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ตรวจสอบว่าอีเมลนี้มีอยู่ในระบบแล้วหรือไม่
async function emailExists(email) {
  const cleanEmail = email.trim().toLowerCase();
  const result = await pool.query(
    `SELECT 1 FROM accounts WHERE LOWER(email) = LOWER($1)
     UNION
     SELECT 1 FROM companies WHERE LOWER(contact_email) = LOWER($1)
     LIMIT 1`,
    [cleanEmail]
  );
  return result.rows.length > 0;
}

// ตรวจสอบว่าชื่อผู้ใช้ของบริษัทนี้ซ้ำหรือไม่
async function usernameExists(username) {
  const cleanUsername = username.trim().toLowerCase();
  const result = await pool.query(
    `SELECT 1 FROM companies WHERE LOWER(username) = LOWER($1) LIMIT 1`,
    [cleanUsername]
  );
  return result.rows.length > 0;
}

// ตรวจสอบความถูกต้องของการเข้าสู่ระบบ (Authenticate)
async function authenticate(identifier, password) {
  const cleanIdentifier = identifier.trim().toLowerCase();

  const result = await pool.query(
    `SELECT
       accounts.id,
       accounts.email,
       accounts.password_hash,
       accounts.role,
       COALESCE(
         job_seekers.first_name || ' ' || job_seekers.last_name,
         companies.company_name,
         companies.username
       ) AS name
     FROM accounts
     LEFT JOIN job_seekers ON job_seekers.account_id = accounts.id
     LEFT JOIN companies ON companies.account_id = accounts.id
     WHERE LOWER(accounts.email) = LOWER($1)
        OR LOWER(companies.username) = LOWER($1)
     LIMIT 1`,
    [cleanIdentifier]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const account = result.rows[0];
  const isMatch = await bcrypt.compare(password, account.password_hash);

  if (!isMatch) {
    return null;
  }

  return {
    id: account.id,
    email: account.email,
    role: account.role,
    name: account.name
  };
}

// ค้นหาหรือสร้างบัญชีใหม่จากการเข้าสู่ระบบผ่าน OAuth (Google / GitHub)
async function findOrCreateOAuthAccount({ provider, providerId, email, name, role = 'jobSeeker' }) {
  const cleanEmail = (email || `${provider}_${providerId}@oauth.local`).trim().toLowerCase();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. ค้นหาจาก oauth_provider และ oauth_id ก่อน
    let result = await client.query(
      `SELECT accounts.id, accounts.email, accounts.role,
              COALESCE(job_seekers.first_name || ' ' || job_seekers.last_name, companies.company_name, accounts.email) AS name
       FROM accounts
       LEFT JOIN job_seekers ON job_seekers.account_id = accounts.id
       LEFT JOIN companies ON companies.account_id = accounts.id
       WHERE oauth_provider = $1 AND oauth_id = $2
       LIMIT 1`,
      [provider, String(providerId)]
    );

    if (result.rows.length > 0) {
      await client.query('COMMIT');
      return result.rows[0];
    }

    // 2. ค้นหาจากอีเมลเดิมในระบบ (Link Account)
    result = await client.query(
      `SELECT accounts.id, accounts.email, accounts.role,
              COALESCE(job_seekers.first_name || ' ' || job_seekers.last_name, companies.company_name, accounts.email) AS name
       FROM accounts
       LEFT JOIN job_seekers ON job_seekers.account_id = accounts.id
       LEFT JOIN companies ON companies.account_id = accounts.id
       WHERE LOWER(accounts.email) = LOWER($1)
       LIMIT 1`,
      [cleanEmail]
    );

    if (result.rows.length > 0) {
      const existingAccount = result.rows[0];
      await client.query(
        `UPDATE accounts SET oauth_provider = $1, oauth_id = $2 WHERE id = $3`,
        [provider, String(providerId), existingAccount.id]
      );
      await client.query('COMMIT');
      return existingAccount;
    }

    // 3. สร้างบัญชีใหม่
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await hashPassword(randomPassword);

    const newAccountRes = await client.query(
      `INSERT INTO accounts (email, password_hash, role, oauth_provider, oauth_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [cleanEmail, hashedPassword, role, provider, String(providerId)]
    );

    const accountId = newAccountRes.rows[0].id;
    const nameParts = (name || 'ผู้ใช้งาน ทั่วไป').trim().split(' ');
    const firstName = nameParts[0] || 'ผู้ใช้งาน';
    const lastName = nameParts.slice(1).join(' ') || 'OAuth';

    await client.query(
      `INSERT INTO job_seekers (account_id, first_name, last_name)
       VALUES ($1, $2, $3)`,
      [accountId, firstName, lastName]
    );

    // Sync กับ users table
    try {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'freelancer')
         ON CONFLICT (email) DO NOTHING`,
        [`${firstName} ${lastName}`, cleanEmail, hashedPassword]
      );
    } catch {
      // ข้ามกรณีข้อผิดพลาดของตารางเดิม
    }

    await client.query('COMMIT');

    return {
      id: accountId,
      email: cleanEmail,
      role,
      name: `${firstName} ${lastName}`
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// สร้างและบันทึกโทเค็นรีเซ็ตรหัสผ่าน (Password Reset Token)
async function createPasswordResetToken(email) {
  const cleanEmail = email.trim().toLowerCase();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 ชั่วโมง

  // ลบ token เก่าของอีเมลนี้ทิ้งก่อน
  await pool.query(
    `DELETE FROM password_reset_tokens WHERE LOWER(email) = LOWER($1)`,
    [cleanEmail]
  );

  await pool.query(
    `INSERT INTO password_reset_tokens (email, token, expires_at)
     VALUES ($1, $2, $3)`,
    [cleanEmail, token, expiresAt]
  );

  return token;
}

// ค้นหาและตรวจสอบโทเค็นรีเซ็ตรหัสผ่าน
async function findPasswordResetToken(token) {
  const result = await pool.query(
    `SELECT email, token, expires_at
     FROM password_reset_tokens
     WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [token]
  );
  return result.rows[0] || null;
}

// ลบโทเค็นที่ใช้งานแล้ว
async function deletePasswordResetToken(token) {
  await pool.query(
    `DELETE FROM password_reset_tokens WHERE token = $1`,
    [token]
  );
}

// อัปเดตรหัสผ่านใหม่ให้กับอีเมล
async function updatePasswordByEmail(email, newPassword) {
  const cleanEmail = email.trim().toLowerCase();
  const hashedPassword = await hashPassword(newPassword);

  await pool.query(
    `UPDATE accounts
     SET password_hash = $1
     WHERE LOWER(email) = LOWER($2)`,
    [hashedPassword, cleanEmail]
  );

  // อัปเดต users table ด้วยถ้ามี
  try {
    await pool.query(
      `UPDATE users
       SET password_hash = $1
       WHERE LOWER(email) = LOWER($2)`,
      [hashedPassword, cleanEmail]
    );
  } catch {
    // ignore
  }
}

// ดึงข้อมูลบัญชีและโปรไฟล์แบบละเอียด (สำหรับหน้า Dashboard)
async function getAccountDetailsById(id) {
  const result = await pool.query(
    `SELECT
       accounts.id,
       accounts.email,
       accounts.role,
       accounts.oauth_provider,
       accounts.created_at,
       job_seekers.first_name,
       job_seekers.last_name,
       job_seekers.headline,
       job_seekers.bio,
       job_seekers.skills,
       companies.username,
       companies.company_name,
       companies.business_type,
       companies.contact_name,
       companies.phone,
       companies.contact_email,
       companies.website,
       companies.description,
       COALESCE(
         job_seekers.first_name || ' ' || job_seekers.last_name,
         companies.company_name,
         companies.username,
         accounts.email
       ) AS display_name
     FROM accounts
     LEFT JOIN job_seekers ON job_seekers.account_id = accounts.id
     LEFT JOIN companies ON companies.account_id = accounts.id
     WHERE accounts.id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

// อัปเดตโปรไฟล์ผู้สมัครงาน
async function updateJobSeekerProfile(accountId, { firstName, lastName, headline, bio, skills }) {
  await pool.query(
    `UPDATE job_seekers
     SET first_name = $1, last_name = $2, headline = $3, bio = $4, skills = $5
     WHERE account_id = $6`,
    [firstName.trim(), lastName.trim(), headline || null, bio || null, skills || null, accountId]
  );
}

// อัปเดตโปรไฟล์บริษัท
async function updateCompanyProfile(accountId, { companyName, businessType, contactName, phone, website, description }) {
  await pool.query(
    `UPDATE companies
     SET company_name = $1, business_type = $2, contact_name = $3, phone = $4, website = $5, description = $6
     WHERE account_id = $7`,
    [companyName.trim(), businessType.trim(), contactName.trim(), phone.trim(), website || null, description || null, accountId]
  );
}

// ดึงประวัติการสมัครงานของผู้ใช้ (Job Applications)
async function getApplicationsByAccountId(accountId) {
  const result = await pool.query(
    `SELECT
       job_applications.id,
       job_applications.job_id,
       job_applications.cover_letter,
       job_applications.status,
       job_applications.applied_at
     FROM job_applications
     WHERE job_applications.account_id = $1
     ORDER BY job_applications.applied_at DESC`,
    [accountId]
  );
  return result.rows;
}

// ดึงรายการผู้สมัครงานสำหรับบริษัท
async function getApplicantsForCompanyJobs() {
  const result = await pool.query(
    `SELECT
       job_applications.id AS application_id,
       job_applications.job_id,
       job_applications.status,
       job_applications.applied_at,
       accounts.email,
       job_seekers.first_name,
       job_seekers.last_name,
       job_seekers.headline,
       job_seekers.skills
     FROM job_applications
     JOIN accounts ON accounts.id = job_applications.account_id
     LEFT JOIN job_seekers ON job_seekers.account_id = accounts.id
     ORDER BY job_applications.applied_at DESC
     LIMIT 20`
  );
  return result.rows;
}

// บันทึกการสมัครงาน
async function applyForJob(accountId, jobId, coverLetter = '') {
  const result = await pool.query(
    `INSERT INTO job_applications (job_id, account_id, cover_letter, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING id, job_id, status, applied_at`,
    [jobId, accountId, coverLetter]
  );
  return result.rows[0];
}

module.exports = {
  createJobSeeker,
  createCompany,
  emailExists,
  usernameExists,
  authenticate,
  findOrCreateOAuthAccount,
  createPasswordResetToken,
  findPasswordResetToken,
  deletePasswordResetToken,
  updatePasswordByEmail,
  getAccountDetailsById,
  updateJobSeekerProfile,
  updateCompanyProfile,
  getApplicationsByAccountId,
  getApplicantsForCompanyJobs,
  applyForJob
};
