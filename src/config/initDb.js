"use strict";

const pool = require('./db');

const initSql = `
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('jobSeeker', 'company', 'admin')),
  oauth_provider VARCHAR(50),
  oauth_id VARCHAR(255),
  terms_accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255);

CREATE TABLE IF NOT EXISTS job_seekers (
  account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  headline VARCHAR(255),
  bio TEXT,
  skills TEXT
);

ALTER TABLE job_seekers ADD COLUMN IF NOT EXISTS headline VARCHAR(255);
ALTER TABLE job_seekers ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE job_seekers ADD COLUMN IF NOT EXISTS skills TEXT;

CREATE TABLE IF NOT EXISTS companies (
  account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100) NOT NULL,
  contact_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  contact_email VARCHAR(255) NOT NULL UNIQUE,
  website VARCHAR(255),
  description TEXT
);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_applications (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  cover_letter TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_seekers_name ON job_seekers(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_applications_acc ON job_applications(account_id);
`;

async function initializeDatabase() {
  try {
    await pool.query(initSql);
    console.log('PostgreSQL schema initialized successfully (accounts, job_seekers, companies, reset_tokens, applications).');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initializeDatabase };
