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

    return res.status(500).json({
        error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    });
}

module.exports = {
    notFoundHandler,
    errorHandler
};
