"use strict";

require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');

const loggerMiddleware = require('./src/middlewares/loggerMiddleware');
const { notFoundHandler, errorHandler } = require('./src/middlewares/errorMiddleware');
const apiRoutes = require('./src/routes');
const viewRoutes = require('./src/routes/viewRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'job-board-secret-key-development';

// 1. ตั้งค่า Template Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.disable('x-powered-by');

// 2. Middleware บันทึกเวลาประมวลผล
app.use(loggerMiddleware);

// 3. แปลง Request Body (ทั้ง JSON และ URL-Encoded จาก Form หน้าเว็บ)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// 4. ตั้งค่า Session สำหรับระบบ Authentication ของหน้าเว็บ
app.use(session({
    name: 'jobboard.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60 * 1000
    }
}));

// 5. เสิร์ฟไฟล์ Static (CSS, JS, รูปภาพ, ฟอนต์)
app.use(express.static(path.join(__dirname, 'public')));

// 6. เส้นทางสำหรับหน้าเว็บ (View Routes)
app.use('/', viewRoutes);

// 7. เส้นทาง API ทั้งหมด (/api/...)
app.use('/api', apiRoutes);

// 8. จัดการ 404 สำหรับทั้ง API และหน้าเว็บ
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
        return notFoundHandler(req, res);
    }
    return res.status(404).render('errors/404', { title: '404 - ไม่พบหน้านี้' });
});

// 9. Error Handler รวม
app.use((error, req, res, next) => {
    console.error(error);

    if (req.originalUrl.startsWith('/api')) {
        return errorHandler(error, req, res, next);
    }

    if (req.path === '/login') {
        return res.status(500).render('pages/login', {
            title: 'เกิดข้อผิดพลาด - เข้าสู่ระบบ',
            values: {},
            errors: { form: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' },
            success: null,
            accountName: null,
            accountRole: null
        });
    }

    if (req.path === '/register') {
        return res.status(500).render('pages/register', {
            title: 'เกิดข้อผิดพลาด - สมัครสมาชิก',
            role: req.body?.role === 'company' ? 'company' : 'jobSeeker',
            values: req.body || {},
            errors: { form: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' },
            success: null
        });
    }

    return errorHandler(error, req, res, next);
});

// เริ่มต้นเซิร์ฟเวอร์
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
