"use strict";

require('dotenv').config();

const express = require('express');
const path = require('path');

const loggerMiddleware = require('./src/middlewares/loggerMiddleware');
const { notFoundHandler, errorHandler } = require('./src/middlewares/errorMiddleware');
const apiRoutes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware สำหรับบันทึกเวลาการทำงานของ API
app.use(loggerMiddleware);

// แปลง JSON ที่ส่งมาจาก Client ให้เป็น JavaScript object
app.use(express.json({ limit: '10mb' }));

// กำหนดเส้นทางสำหรับไฟล์ static (เช่น HTML, CSS, JS) ในโฟลเดอร์ 'public'
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', apiRoutes);

// 404 สำหรับ /api
app.use('/api', notFoundHandler);

// Error Handler
app.use(errorHandler);

// เริ่มต้นเซิร์ฟเวอร์
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
    
