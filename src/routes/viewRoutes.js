"use strict";

const express = require('express');
const router = express.Router();

// เส้นทางสำหรับแสดงผลหน้าเว็บผ่าน EJS
router.get('/', (req, res) => {
    res.render('pages/index', { title: 'FreelanceHub - แพลตฟอร์มค้นหาและจัดการงานฟรีแลนซ์' });
});

router.get('/login', (req, res) => {
    res.render('pages/login', {
        title: 'เข้าสู่ระบบ - FreelanceHub',
        pageScript: 'auth.js'
    });
});

router.get('/register', (req, res) => {
    res.render('pages/register', {
        title: 'สมัครสมาชิก - FreelanceHub',
        pageScript: 'auth.js'
    });
});

router.get('/history', (req, res) => {
    res.render('pages/history', { title: 'ประวัติการทำงาน - FreelanceHub' });
});

module.exports = router;
