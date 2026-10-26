"use strict";

require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');

const loggerMiddleware = require('./src/middlewares/loggerMiddleware');
const { notFoundHandler, errorHandler } = require('./src/middlewares/errorMiddleware');
const apiRoutes = require('./src/routes');
const viewRoutes = require('./src/routes/viewRoutes');
const adminViewRoutes = require('./src/routes/adminViewRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const moderatorRoutes = require('./src/routes/moderatorRoutes');
const seekerRoutes = require('./src/routes/seekerRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'job-board-secret-key-development';

// 1. Template Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.disable('x-powered-by');

// 2. Logger Middleware
app.use(loggerMiddleware);

// 3. Request Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// 4. Session Configuration
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

// 4.1 Global Session Locals (ส่งต่อไปยังทุก view รวมถึง navbar)
app.use((req, res, next) => {
    res.locals.accountName = req.session ? req.session.accountName : null;
    res.locals.accountRole = req.session ? req.session.accountRole : null;
    res.locals.accountId = req.session ? req.session.accountId : null;
    res.locals.currentPath = req.path;
    next();
});

// 5. Static Assets (Public)
app.use(express.static(path.join(__dirname, 'public')));

// 6. Dedicated Single-Page Routes for Each Role
app.use('/company', companyRoutes);       // หน้าเดียวสำหรับ บริษัท / ผู้ว่าจ้าง
app.use('/moderator', moderatorRoutes);   // หน้าเดียวสำหรับ เจ้าหน้าที่ตรวจสอบ
app.use('/seeker', seekerRoutes);         // หน้าเดียวสำหรับ ผู้สมัครงาน
app.use('/app', seekerRoutes);            // รองรับ path /app ตาม AGENT.md
app.use('/admin', adminViewRoutes);       // หน้าเดียวสำหรับ Admin (Dynamic ACL & Logs)

// 7. Public Routes
app.use('/', viewRoutes);

// 8. APIs
app.use('/api', apiRoutes);

// 9. 404 Handler
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
        return notFoundHandler(req, res);
    }
    return res.status(404).render('errors/404', {
        title: '404 - ไม่พบหน้านี้',
        accountName: req.session ? req.session.accountName : null,
        accountRole: req.session ? req.session.accountRole : null
    });
});

// 10. Error Handler
app.use((error, req, res, next) => {
    console.error(error);
    if (req.originalUrl.startsWith('/api')) {
        return errorHandler(error, req, res, next);
    }
    return errorHandler(error, req, res, next);
});

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;
