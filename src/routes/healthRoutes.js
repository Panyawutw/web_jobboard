"use strict";

const express = require('express');
const router = express.Router();

const healthController = require('../controllers/healthController');

// เส้นทางตรวจสอบสถานะเซิร์ฟเวอร์
router.get('/health', healthController.getHealth);

// เส้นทางตรวจสอบสถานะฐานข้อมูล
router.get('/db-health', healthController.getDbHealth);

// เส้นทางตรวจสอบโครงสร้างฐานข้อมูล
router.get('/health/db/structure', healthController.getDbStructure);

module.exports = router;
