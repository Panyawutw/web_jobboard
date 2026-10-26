"use strict";

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const auditLogger = require('../services/auditLogger');


// สมัครสมาชิก(Register)
async function register(req, res, next) {
    try {
        const { name, email, password, role } = req.body || {};

        // ตรวจสอบชนิดข้อมูล
        if (
            typeof name !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string'
        ) {
            return res.status(400).json({
                error: 'กรุณากรอกชื่อ อีเมล และรหัสผ่านให้ถูกต้อง'
            });
        }

        // ตรวจสอบประเภทบัญชี (หากไม่ระบุ ให้เป็นค่าเริ่มต้น 'freelancer')
        const allowedRoles = ['freelancer', 'client', 'user', 'employer'];
        const selectedRole = role ? String(role).trim().toLowerCase() : 'freelancer';

        if (!allowedRoles.includes(selectedRole)) {
            return res.status(400).json({
                error: 'ประเภทบัญชีไม่ถูกต้อง'
            });
        }

        // ทำความสะอาดข้อมูล
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        // ตรวจสอบชื่อ (ตามขนาด Schema VARCHAR(100))
        if (cleanName.length < 1 || cleanName.length > 100) {
            return res.status(400).json({
                error: 'ชื่อต้องมีความยาว 1–100 ตัวอักษร'
            });
        }

        // ตรวจสอบรูปแบบอีเมล (ตามขนาด Schema VARCHAR(255))
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (cleanEmail.length > 255 || !emailPattern.test(cleanEmail)) {
            return res.status(400).json({
                error: 'รูปแบบอีเมลไม่ถูกต้อง'
            });
        }

        // ตรวจสอบความยาวรหัสผ่าน (ขั้นต่ำ 8 ตัวอักษร)
        if (password.length < 8) {
            return res.status(400).json({
                error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
            });
        }

        // bcrypt รองรับรหัสผ่านได้สูงสุด 72 ไบต์
        if (Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({
                error: 'รหัสผ่านยาวเกินขีดจำกัดที่ระบบรองรับ'
            });
        }

        // Hash รหัสผ่าน (12 rounds ตาม OWASP)
        const passwordHash = await bcrypt.hash(password, 12);

        // บันทึกลงฐานข้อมูลผ่าน UserModel
        const createdUser = await userModel.createUser({
            name: cleanName,
            email: cleanEmail,
            passwordHash,
            role: selectedRole
        });

        return res.status(201).json({
            message: 'สมัครสมาชิกสำเร็จ',
            user: createdUser
        });

    } catch (error) {
        // Postgre DB error code 23505 = duplicate value (อีเมลซ้ำ)
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'อีเมลนี้ถูกใช้แล้ว'
            });
        }

        return next(error);
    }
}

// การเข้าสู่ระบบ(Login)
async function login(req, res, next) {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                error: 'กรุณากรอกอีเมลและรหัสผ่าน'
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        if (
            cleanEmail.length > 255 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            return res.status(401).json({
                error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        // ค้นหาผู้ใช้จาก UserModel
        const user = await userModel.findUserByEmail(cleanEmail);

        // ตรวจสอบรหัสผ่านด้วย bcrypt
        if (
            !user ||
            !(await bcrypt.compare(password, user.password_hash))
        ) {
            await auditLogger.logEvent({
                userId: user ? user.id : null,
                usernameOrEmail: cleanEmail,
                ipAddress: req.ip,
                eventType: 'AUTH_LOGIN_FAILED',
                resource: '/api/auth/login',
                action: 'POST',
                status: 'FAILED',
                details: { attemptedEmail: cleanEmail, reason: 'Invalid password or user not found' }
            });
            return res.status(401).json({
                error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        const secret = process.env.JWT_SECRET || 'job-board-secret-key-development';

        // สร้าง JWT
        const token = jwt.sign(
            { role: user.role },
            secret,
            {
                subject: String(user.id),
                expiresIn: '8h',
                issuer: 'job_board',
                audience: 'job_board_frontend',
                algorithm: 'HS256'
            }
        );

        await auditLogger.logEvent({
            userId: user.id,
            usernameOrEmail: user.email,
            ipAddress: req.ip,
            eventType: 'AUTH_LOGIN_SUCCESS',
            resource: '/api/auth/login',
            action: 'POST',
            status: 'SUCCESS',
            details: { role: user.role }
        });

        return res.status(200).json({
            message: 'เข้าสู่ระบบสำเร็จ',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        return next(error);
    }
}

// ขอข้อมูลผู้ใช้ (GET /api/auth/me)
async function getMe(req, res, next) {
    try {
        if (req.user) {
            return res.status(200).json({
                user: req.user
            });
        }

        const user = await userModel.findUserById(req.userId);

        if (!user) {
            return res.status(401).json({
                error: 'ไม่พบบัญชีผู้ใช้'
            });
        }

        return res.status(200).json({
            user
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    register,
    login,
    getMe
};