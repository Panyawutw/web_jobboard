"use strict";

const pool = require('../config/db');

// ตรวจสอบสถานะของเซิร์ฟเวอร์
function getHealth  (req, res) {
   return res.status(200).json({
        status: 'OK',
        message: 'Server is running'
    });
}

// ตรวจสอบการเชื่อมต่อฐานข้อมูล
async function getDbHealth (req, res, next) {
    try {
        const result = await pool.query(`
            SELECT
                NOW() AS current_time,
                current_database() AS database_name
        `);

        return res.status(200).json({
            status: 'connected',
            database: result.rows[0].database_name,
            currentTime: result.rows[0].current_time
        });
    } catch (error) {
        return next(error);
    }
}

// ตรวจสอบโครงสร้างตาราง jobs และทดสอบอ่านข้อมูลจากฐานข้อมูล
async function getDbStructure (req, res, next) {
    try {

        // ดึงโครงสร้างคอลัมน์ของตาราง jobs
        const columnsResult = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'jobs'
            ORDER BY ordinal_position;
        `);

        // ตรวจสอบว่ามีคอลัมน์ที่ต้องการหรือไม่
        if (columnsResult.rows.length === 0) {
            return res.status(404).json({
                status: 'ERROR',
                message: 'ไม่พบตาราง jobs ในฐานข้อมูล กรุณารัน schema.sql ก่อน'
            });
        }

        // ตรวจสอบว่ามีคอลัมน์ที่ API ต้องใช้มีครบถ้วน
        const requiredColumns = ['id', 'title', 'category', 'budget', 'location', 'description'];
        const existingColumns = columnsResult.rows.map(col => col.column_name);
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

        // ทดสอบอ่านข้อมูลจริงจากฐานข้อมูล
        const sampleJobsResult = await pool.query(
            'SELECT id, title, category, budget, location, description FROM jobs ORDER BY id ASC LIMIT 5'
        );

        return res.status(200).json({
            status: 'OK',
            table: 'jobs',
            columns: columnsResult.rows,
            columnVerification: {
                requiredColumns,
                isComplete: missingColumns.length === 0,
                missingColumns
            },
            sampleCount: sampleJobsResult.rowCount,
            sampleData: sampleJobsResult.rows
        });
    } catch (error) {
        return res.status(500).json({
            status: 'ERROR',
            message: 'ตรวจสอบโครงสร้างฐานข้อมูลล้มเหลว',
            error: error.message
        });
    }
}

module.exports = {
    getHealth,
    getDbHealth,
    getDbStructure
};