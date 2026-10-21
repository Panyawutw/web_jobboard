"use strict";

// ตรวจสอบว่าเป็น admin หรือไม่
function checkAdmin(req, res) {
    return res.status(200).json({
        message: 'Admin access granted',
        user: req.user
    });
}

module.exports = {
    checkAdmin
};
