"use strict";

const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// ตรวจสอบยืนยันตัวตนแบบ Hybrid (รองรับทั้ง JWT Header และ Express Session)
async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null;
    
    // 1. ตรวจสอบผ่าน JWT Token ก่อน (สำหรับ Client ที่ส่ง Token มาตรงๆ)
    if (token) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('JWT_SECRET is not set in .env file');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        try {
            const payload = jwt.verify(token, secret, {
                algorithms: ['HS256'],
                issuer: 'job_board',
                audience: 'job_board_frontend'
            });

            if (!payload || typeof payload.sub !== 'string' || !/^[1-9]\d*$/.test(payload.sub)) {
                return res.status(401).json({ error: 'Token ไม่ถูกต้อง' });
            }

            // ค้นหาผู้ใช้จากตาราง accounts หรือ users พร้อม fallback
            const userModel = require('../models/userModel');
            let user = null;
            try {
                const result = await pool.query(
                    `SELECT accounts.id, accounts.email, accounts.role,
                            COALESCE(job_seekers.first_name || ' ' || job_seekers.last_name,
                                     companies.company_name, companies.username, accounts.email) AS name
                     FROM accounts
                     LEFT JOIN job_seekers ON job_seekers.account_id = accounts.id
                     LEFT JOIN companies ON companies.account_id = accounts.id
                     WHERE accounts.id = $1`,
                    [payload.sub]
                );
                if (result.rows.length > 0) {
                    user = result.rows[0];
                }
            } catch (dbErr) {
                user = await userModel.findUserById(payload.sub);
            }

            if (!user) {
                user = await userModel.findUserById(payload.sub);
            }

            if (!user) {
                return res.status(401).json({ error: 'ไม่พบบัญชีผู้ใช้' });
            }

            req.userId = String(user.id);
            req.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            };

            return next();
        } catch (error) {
            if (['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'].includes(error.name)) {
                return res.status(401).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' });
            }
            console.error('Authentication error:', error);
            return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบผู้ใช้' });
        }
    }

    // 2. หากไม่มี JWT Token ให้ตรวจสอบผ่าน Session ของหน้าเว็บ (Session Bridge)
    if (req.session && req.session.accountId) {
        req.userId = String(req.session.accountId);
        req.user = {
            id: req.session.accountId,
            name: req.session.accountName || 'ผู้ใช้งาน',
            email: req.session.email || '',
            role: req.session.accountRole || 'jobSeeker'
        };
        return next();
    }

    return res.status(401).json({
        error: 'กรุณา Login เพื่อเข้าสู่ระบบ'
    });
}

// Middleware สำหรับ Protected Web Routes (/app/...) ตรวจสอบว่ามี Session หรือไม่
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.accountId) {
        return next();
    }
    return res.redirect('/login');
}

// Middleware ตรวจสอบสิทธิ์ตาม Role
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'กรุณาเข้าสู่ระบบ'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้'
            });
        }

        next();
    };
}

module.exports = {
    authenticateToken,
    ensureAuthenticated,
    requireRole
};
