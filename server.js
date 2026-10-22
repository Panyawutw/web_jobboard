"use strict";

require('dotenv').config();

const express = require('express');
const path = require('path');

const loggerMiddleware = require('./src/middlewares/loggerMiddleware');
const { notFoundHandler, errorHandler } = require('./src/middlewares/errorMiddleware');
const apiRoutes = require('./src/routes');
const viewRoutes = require('./src/routes/viewRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. ตั้งค่า Template Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// 2. Middleware บันทึกเวลาประมวลผล
app.use(loggerMiddleware);

// 3. แปลง JSON Body
app.use(express.json({ limit: '10mb' }));

// 4. เสิร์ฟไฟล์ Static (CSS, JS, รูปภาพ)
app.use(express.static(path.join(__dirname, 'public')));

// 5. เส้นทางสำหรับหน้าเว็บ (View Routes)
app.use('/', viewRoutes);

// 6. เส้นทาง API ทั้งหมด (/api/...)
app.use('/api', apiRoutes);

// 7. จัดการ 404 สำหรับทั้ง API และหน้าเว็บ
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
        return notFoundHandler(req, res);
    }
    return res.status(404).render('errors/404', { title: '404 - ไม่พบหน้านี้' });
});

// 8. Error Handler รวม
app.use(errorHandler);

// เริ่มต้นเซิร์ฟเวอร์
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
