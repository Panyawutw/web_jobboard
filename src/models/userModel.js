"use strict";

const pool = require('../config/db');

// Fallback seed users for the 4 roles
const fallbackAccounts = [
  {
    id: 1,
    name: 'ผู้ดูแลระบบ (Admin)',
    email: 'admin@jobboard.com',
    password_hash: '$2b$10$KzIpLTqx/5eiu7pf2v7kWO7y2Ca7W.8JfA9gOuu3SFgWM1xz9Ucui',
    role: 'Admin'
  },
  {
    id: 2,
    name: 'บริษัท เทคโนโลยี อินโนเวชั่น จำกัด',
    email: 'company@jobboard.com',
    password_hash: '$2b$10$KzIpLTqx/5eiu7pf2v7kWO7y2Ca7W.8JfA9gOuu3SFgWM1xz9Ucui',
    role: 'Company'
  },
  {
    id: 3,
    name: 'เจ้าหน้าที่ตรวจสอบ (Moderator Staff)',
    email: 'staff@jobboard.com',
    password_hash: '$2b$10$KzIpLTqx/5eiu7pf2v7kWO7y2Ca7W.8JfA9gOuu3SFgWM1xz9Ucui',
    role: 'Staff'
  },
  {
    id: 4,
    name: 'นายสมคิด ผู้สมัครงาน (Job Seeker)',
    email: 'seeker@jobboard.com',
    password_hash: '$2b$10$KzIpLTqx/5eiu7pf2v7kWO7y2Ca7W.8JfA9gOuu3SFgWM1xz9Ucui',
    role: 'JobSeeker'
  },
  {
    id: 5,
    name: 'ผู้ใช้งานทั่วไป (Job Seeker 2)',
    email: 'user@jobboard.com',
    password_hash: '$2b$10$KzIpLTqx/5eiu7pf2v7kWO7y2Ca7W.8JfA9gOuu3SFgWM1xz9Ucui',
    role: 'JobSeeker'
  }
];

async function createUser({ name, email, passwordHash, role = 'JobSeeker' }) {
    try {
        const result = await pool.query(
            `INSERT INTO accounts (name, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email, role, created_at`,
            [name, email, passwordHash, role]
        );
        return result.rows[0];
    } catch (err) {
        const newId = fallbackAccounts.length + 1;
        const newUser = { id: newId, name, email, password_hash: passwordHash, role };
        fallbackAccounts.push(newUser);
        return { id: newId, name, email, role, created_at: new Date() };
    }
}

async function findUserByEmail(email) {
    const cleanEmail = String(email).trim().toLowerCase();
    try {
        const result = await pool.query(
            `SELECT id, name, email, password_hash, role, created_at
             FROM accounts
             WHERE LOWER(email) = LOWER($1)`,
            [cleanEmail]
        );
        if (result.rows.length > 0) return result.rows[0];
    } catch (err) { /* fallback */ }

    return fallbackAccounts.find(u => u.email.toLowerCase() === cleanEmail) || null;
}

async function findUserById(id) {
    const numId = Number(id);
    try {
        const result = await pool.query(
            `SELECT id, name, email, role, created_at
             FROM accounts
             WHERE id = $1`,
            [numId]
        );
        if (result.rows.length > 0) return result.rows[0];
    } catch (err) { /* fallback */ }

    return fallbackAccounts.find(u => u.id === numId) || null;
}

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    fallbackAccounts
};
