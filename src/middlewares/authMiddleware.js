"use strict";

const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// ตรวจสอบ Token
async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null;
    
    if (!token) {
        return res.status(401).json({
            error: 'กรุณา Login เพื่อเข้าสู่ระบบ'
        });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        console.error('JWT_SECRET is not set in .env file');
        return res.status(500).json({
            error: 'Server configuration error'
        });
    }

    try {
        const payload = jwt.verify(token, secret, {
            algorithms: ['HS256'],
            issuer: 'job_board',
            audience: 'job_board_frontend'
        });

        if (
            !payload ||
            typeof payload.sub !== 'string' ||
            !/^[1-9]\d*$/.test(payload.sub) 
        ) {
            return res.status(401).json({
                error: 'Token ไม่ถูกต้อง'
            });
        }

        const result = await pool.query(
            `SELECT id, name, email, role
             FROM users
             WHERE id = $1`,
            [payload.sub]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'ไม่พบบัญชีผู้ใช้'
            });
        }

        const user = result.rows[0];

        if (!['user', 'admin', 'client', 'freelancer', 'employer'].includes(user.role)) {
            return res.status(403).json({
                error: 'ไม่ได้รับอนุญาตให้เข้าถึง'
            });
        }

        req.userId = String(user.id);
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        if (
            error.name === 'TokenExpiredError' ||
            error.name === 'JsonWebTokenError' ||
            error.name === 'NotBeforeError' 
        ) {
            return res.status(401).json({
                error: 'Token ไม่ถูกต้องหรือหมดอายุ'
            });
        }
        console.error('Authentication error:', error);
        return res.status(500).json({
            error: 'เกิดข้อผิดพลาดในการตรวจสอบผู้ใช้'
        });
    }
}

// Middleware ตรวจสอบสิทธิ์
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'กรุณาเข้าสู่ระบบ'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
            });
        }

        next();
    };
}

module.exports = {
    authenticateToken,
    requireRole
};