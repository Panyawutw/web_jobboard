"use strict";

// นำเข้า express router
const express = require('express');
const router = express.Router();

// นำเข้า router files อื่นๆ
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const jobRoutes = require('./jobRoutes');
const adminRoutes = require('./adminRoutes');

// รวม routes ทั้งหมดภายใต้ /api
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/jobs', jobRoutes);
router.use('/admin', adminRoutes);

module.exports = router;