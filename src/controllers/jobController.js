"use strict";

const jobModel = require('../models/jobModel');

// Controller สำหรับดึงรายการงาน
function getAllJobs(req, res) {
    const search = String(req.query.search || '')
        .trim()
        .toLowerCase();

    const category = String(req.query.category || '')
        .trim()
        .toLowerCase();

    const minBudget = req.query.minBudget === undefined
        ? null
        : Number(req.query.minBudget);

    const maxBudget = req.query.maxBudget === undefined
        ? null
        : Number(req.query.maxBudget);

    // ตรวจสอบความถูกต้องของเงื่อนไขงบประมาณ
    if (
        (minBudget !== null && 
            (!Number.isFinite(minBudget) || minBudget < 0)) ||
        (maxBudget !== null && 
            (!Number.isFinite(maxBudget) || maxBudget < 0))
    ) {
        return res.status(400).json({
            error: 'งบประมาณต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป'
        });
    }

    if (
        minBudget !== null &&
        maxBudget !== null &&
        minBudget > maxBudget
    ) {
        return res.status(400).json({
            error: 'งบประมาณขั้นต่ำต้องไม่มากกว่างบประมาณสูงสุด'
        });
    }

    const filteredJobs = jobModel.getAllJobs({
        search,
        category,
        minBudget,
        maxBudget
    });

    return res.status(200).json(filteredJobs);
}

// ดึงข้อมูลงานตามรหัส
function getJobById(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "รหัสงานต้องเป็นตัวเลขที่มากกว่า 0"
        });
    }

    const job = jobModel.getJobById(id);

    if (!job) {
        return res.status(404).json({
            error: "ไม่พบงานที่มีรหัสนี้"
        });
    }

    return res.status(200).json(job);
}

// สร้างงานใหม่
function createJob(req, res) {
    const result = jobModel.validateJob(req.body || {});

    if (result.error) {
        return res.status(400).json({
            error: result.error
        });
    }

    const createdJob = jobModel.createJob(result.data);

    return res.status(201).json(createdJob);
}
// แก้ไขงานตามรหัส
function updateJob(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "รหัสงานไม่ถูกต้อง"
        });
    }

    const existingJob = jobModel.getJobById(id);
    if (!existingJob) {
        return res.status(404).json({
            error: "ไม่พบงานที่ต้องการแก้ไข"
        });
    }

    const result = jobModel.validateJob(req.body || {});

    if (result.error) {
        return res.status(400).json({
            error: result.error
        });
    }

    const updatedJob = jobModel.updateJob(id, result.data);

    return res.status(200).json(updatedJob);
}

// ลบงานตามรหัส
function deleteJob(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "รหัสงานไม่ถูกต้อง"
        });
    }

    const deletedJob = jobModel.deleteJob(id);

    if (!deletedJob) {
        return res.status(404).json({
            error: "ไม่พบงานที่ต้องการลบ"
        });
    }

    return res.status(200).json({
        message: "ลบงานสำเร็จ",
        job: deletedJob
    });
}

module.exports = {
    getAllJobs,
    getJobById,
    createJob,
    updateJob,
    deleteJob
};