"use strict";

const jobModel = require('../models/jobModel');
const fileService = require('../services/fileService');
const auditLogger = require('../services/auditLogger');
const aclService = require('../services/aclService');

// ดึงรายการงานทั้งหมด
async function getAllJobs(req, res) {
  try {
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();
    const status = String(req.query.status || '').trim();

    const minBudget = req.query.minBudget !== undefined && req.query.minBudget !== ''
      ? Number(req.query.minBudget)
      : null;

    const maxBudget = req.query.maxBudget !== undefined && req.query.maxBudget !== ''
      ? Number(req.query.maxBudget)
      : null;

    if (
      (minBudget !== null && (!Number.isFinite(minBudget) || minBudget < 0)) ||
      (maxBudget !== null && (!Number.isFinite(maxBudget) || maxBudget < 0))
    ) {
      return res.status(400).json({ error: 'งบประมาณต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป' });
    }

    if (minBudget !== null && maxBudget !== null && minBudget > maxBudget) {
      return res.status(400).json({ error: 'งบประมาณขั้นต่ำต้องไม่มากกว่างบประมาณสูงสุด' });
    }

    // ตรวจสอบเงื่อนไข Ownership / Role filtering
    let createdBy = req.query.createdBy ? Number(req.query.createdBy) : null;
    let assignedTo = req.query.assignedTo ? Number(req.query.assignedTo) : null;

    const currentUser = req.user;
    if (currentUser) {
      const userRole = String(currentUser.role).toLowerCase();
      // หากผู้ใช้มีเฉพาะสิทธิ์ jobs.read_own ให้บังคับกรองเฉพาะงานของตนเอง
      const canReadAll = await aclService.hasPermission(currentUser.role, 'jobs.read');
      const canReadOwn = await aclService.hasPermission(currentUser.role, 'jobs.read_own');

      if (!canReadAll && canReadOwn) {
        createdBy = currentUser.id;
      }
    }

    const filteredJobs = await jobModel.getAllJobs({
      search,
      category,
      minBudget,
      maxBudget,
      status,
      createdBy,
      assignedTo
    });

    return res.status(200).json(filteredJobs);
  } catch (error) {
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงรายการงาน' });
  }
}

// ดึงข้อมูลงานตาม ID พร้อมรายการไฟล์แนบ
async function getJobById(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "รหัสงานต้องเป็นตัวเลขที่มากกว่า 0" });
    }

    const job = await jobModel.getJobById(id);

    if (!job) {
      return res.status(404).json({ error: "ไม่พบงานที่มีรหัสนี้" });
    }

    // ดึงไฟล์แนบที่เกี่ยวข้องกับงานนี้
    const attachments = await fileService.getAttachmentsByEntity('job', id);
    job.attachments = attachments;

    return res.status(200).json(job);
  } catch (error) {
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลงาน' });
  }
}

// สร้างงานใหม่
async function createJob(req, res) {
  try {
    const result = jobModel.validateJob(req.body || {});

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // ผูก ID ผู้สร้างงาน (Ownership)
    const userId = req.user?.id || req.session?.accountId;
    result.data.created_by = userId ? Number(userId) : null;

    const createdJob = await jobModel.createJob(result.data);

    // บันทึก Log การสร้างงาน
    await auditLogger.logEvent({
      userId,
      usernameOrEmail: req.user?.email || req.session?.accountName || 'User',
      ipAddress: req.ip,
      eventType: 'JOB_CREATE',
      resource: `/api/jobs/${createdJob.id}`,
      action: 'POST',
      status: 'SUCCESS',
      details: { jobId: createdJob.id, title: createdJob.title, budget: createdJob.budget }
    });

    return res.status(201).json(createdJob);
  } catch (error) {
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างงาน' });
  }
}

// แก้ไขงานตามรหัส (ตรวจสอบ Ownership)
async function updateJob(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "รหัสงานไม่ถูกต้อง" });
    }

    const existingJob = await jobModel.getJobById(id);
    if (!existingJob) {
      return res.status(404).json({ error: "ไม่พบงานที่ต้องการแก้ไข" });
    }

    // ตรวจสอบสิทธิ์และ Ownership (Server-side Ownership Check)
    const currentUser = req.user || { id: req.session?.accountId, role: req.session?.accountRole };
    const userRole = String(currentUser?.role || '').toLowerCase();
    const isOwner = Number(existingJob.created_by) === Number(currentUser?.id);

    const canUpdateAll = await aclService.hasPermission(currentUser?.role, 'jobs.update');
    const canUpdateOwn = await aclService.hasPermission(currentUser?.role, 'jobs.update_own');

    const isAuthorized = userRole === 'admin' || canUpdateAll || (isOwner && canUpdateOwn);

    if (!isAuthorized) {
      await auditLogger.logEvent({
        userId: currentUser?.id,
        usernameOrEmail: currentUser?.email || currentUser?.name,
        ipAddress: req.ip,
        eventType: 'ACCESS_DENIED',
        resource: req.originalUrl,
        action: 'PUT',
        status: 'DENIED',
        details: { jobId: id, ownerId: existingJob.created_by, attemptBy: currentUser?.id }
      });
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขงานนี้ (ต้องเป็นเจ้าของงานหรือผู้ดูแล)' });
    }

    const result = jobModel.validateJob(req.body || {});
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    const updatedJob = await jobModel.updateJob(id, result.data);

    await auditLogger.logEvent({
      userId: currentUser?.id,
      usernameOrEmail: currentUser?.email || currentUser?.name,
      ipAddress: req.ip,
      eventType: 'JOB_UPDATE',
      resource: `/api/jobs/${id}`,
      action: 'PUT',
      status: 'SUCCESS',
      details: { jobId: id, title: updatedJob.title }
    });

    return res.status(200).json(updatedJob);
  } catch (error) {
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไขงาน' });
  }
}

// ปรับสถานะงาน (Workflow State Transition: pending -> approved/rejected -> in_progress -> completed)
async function updateJobStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const { status, reviewerNote, assignedTo } = req.body || {};

    const existingJob = await jobModel.getJobById(id);
    if (!existingJob) {
      return res.status(404).json({ error: "ไม่พบงานที่ต้องการปรับสถานะ" });
    }

    const currentUser = req.user || { id: req.session?.accountId, role: req.session?.accountRole };
    const userRole = String(currentUser?.role || '').toLowerCase();

    // ตรวจสอบสิทธิ์ตาม Workflow
    const canApprove = await aclService.hasPermission(currentUser?.role, 'jobs.approve');
    const canUpdateStatus = await aclService.hasPermission(currentUser?.role, 'jobs.status_update');

    const isAssignedStaff = Number(existingJob.assigned_to) === Number(currentUser?.id);

    let allowed = false;

    // Admin / Manager มีสิทธิ์อนุมัติ/ปฏิเสธ หรือมอบหมาย
    if (userRole === 'admin' || canApprove) {
      allowed = true;
    } else if (canUpdateStatus && (isAssignedStaff || userRole === 'staff')) {
      // Staff ปรับสถานะเป็น in_progress หรือ completed
      if (['in_progress', 'completed'].includes(status)) {
        allowed = true;
      }
    }

    if (!allowed) {
      await auditLogger.logEvent({
        userId: currentUser?.id,
        usernameOrEmail: currentUser?.email || currentUser?.name,
        ipAddress: req.ip,
        eventType: 'ACCESS_DENIED',
        resource: req.originalUrl,
        action: 'PATCH',
        status: 'DENIED',
        details: { jobId: id, targetStatus: status, userRole: currentUser?.role }
      });
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ปรับสถานะงานนี้' });
    }

    const updated = await jobModel.updateJobStatus(id, {
      status,
      reviewerNote,
      assignedTo: assignedTo !== undefined ? Number(assignedTo) : undefined
    });

    await auditLogger.logEvent({
      userId: currentUser?.id,
      usernameOrEmail: currentUser?.email || currentUser?.name,
      ipAddress: req.ip,
      eventType: 'JOB_STATUS_CHANGE',
      resource: `/api/jobs/${id}/status`,
      action: 'PATCH',
      status: 'SUCCESS',
      details: { jobId: id, from: existingJob.status, to: status, reviewerNote }
    });

    return res.status(200).json({
      message: 'ปรับปรุงสถานะงานเรียบร้อยแล้ว',
      job: updated
    });
  } catch (error) {
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการปรับสถานะงาน' });
  }
}

// ลบงานตามรหัส (ตรวจสอบ Ownership)
async function deleteJob(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "รหัสงานไม่ถูกต้อง" });
    }

    const existingJob = await jobModel.getJobById(id);
    if (!existingJob) {
      return res.status(404).json({ error: "ไม่พบงานที่ต้องการลบ" });
    }

    const currentUser = req.user || { id: req.session?.accountId, role: req.session?.accountRole };
    const userRole = String(currentUser?.role || '').toLowerCase();
    const isOwner = Number(existingJob.created_by) === Number(currentUser?.id);

    const canDeleteAll = await aclService.hasPermission(currentUser?.role, 'jobs.delete');
    const canDeleteOwn = await aclService.hasPermission(currentUser?.role, 'jobs.delete_own');

    const isAuthorized = userRole === 'admin' || canDeleteAll || (isOwner && canDeleteOwn);

    if (!isAuthorized) {
      await auditLogger.logEvent({
        userId: currentUser?.id,
        usernameOrEmail: currentUser?.email || currentUser?.name,
        ipAddress: req.ip,
        eventType: 'ACCESS_DENIED',
        resource: req.originalUrl,
        action: 'DELETE',
        status: 'DENIED',
        details: { jobId: id, ownerId: existingJob.created_by, attemptBy: currentUser?.id }
      });
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ลบงานนี้' });
    }

    const deletedJob = await jobModel.deleteJob(id);

    await auditLogger.logEvent({
      userId: currentUser?.id,
      usernameOrEmail: currentUser?.email || currentUser?.name,
      ipAddress: req.ip,
      eventType: 'JOB_DELETE',
      resource: `/api/jobs/${id}`,
      action: 'DELETE',
      status: 'SUCCESS',
      details: { jobId: id, title: deletedJob.title }
    });

    return res.status(200).json({
      message: "ลบงานสำเร็จ",
      job: deletedJob
    });
  } catch (error) {
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบงาน' });
  }
}

module.exports = {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob
};
