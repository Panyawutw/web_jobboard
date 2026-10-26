"use strict";

// จัดการ 404 Not Found สำหรับ API
function notFoundHandler(req, res) {
    return res.status(404).json({
        error: 'ไม่พบ API endpoint ที่ร้องขอ'
    });
}

// จัดการข้อผิดพลาดทั่วไป
function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            error: 'ข้อมูล JSON ไม่ถูกต้อง'
        });
    }

    console.error('Unhandled Server Error:', err);

    if (req.method === 'POST' && req.path === '/register' && req.accepts('html')) {
        let message = 'สมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าฐานข้อมูลแล้วลองใหม่';
        if (err.code === '28P01') {
            message = 'เชื่อมต่อ PostgreSQL ไม่สำเร็จ กรุณาตรวจสอบ DATABASE_URL หรือ DB_PASSWORD ในไฟล์ .env';
        } else if (err.code === '42P01') {
            message = 'ฐานข้อมูลยังไม่มีตารางที่ระบบสมัครสมาชิกต้องใช้ กรุณาตรวจสอบ schema ของ PostgreSQL';
        } else if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(err.code)) {
            message = 'ไม่พบ PostgreSQL กรุณาเปิดฐานข้อมูลและตรวจสอบการตั้งค่าในไฟล์ .env';
        }

        return res.status(500).render('pages/register', {
            title: 'สมัครสมาชิก - FreelanceHub',
            role: req.body?.role === 'company' ? 'company' : 'jobSeeker',
            values: req.body || {},
            errors: { form: message },
            success: null
        });
    }

    return res.status(500).json({
        error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    });
}

module.exports = {
    notFoundHandler,
    errorHandler
};
