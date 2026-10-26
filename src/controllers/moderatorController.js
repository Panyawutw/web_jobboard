"use strict";

const jobModel = require('../models/jobModel');
const auditLogger = require('../services/auditLogger');

// แสดงหน้า Moderator Single Page (GET /moderator)
async function showModeratorPage(req, res) {
  try {
    const jobs = await jobModel.getAllJobs({});

    res.render('moderator/index', {
      title: 'ระบบตรวจสอบประกาศงาน - Moderator',
      accountName: req.session.accountName,
      accountRole: req.session.accountRole,
      jobs
    });
  } catch (error) {
    res.status(500).send('Error loading moderator portal: ' + error.message);
  }
}

// ตรวจสอบอนุมัติประกาศงาน (PATCH /api/moderator/jobs/:id/status)
async function updateJobStatus(req, res) {
  try {
    const staffId = req.session.accountId;
    const jobId = Number(req.params.id);
    const { status, moderatorNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
    }

    const updated = await jobModel.updateJobStatus(jobId, status, moderatorNote);

    await auditLogger.logEvent({
      userId: staffId,
      usernameOrEmail: req.session.email || req.session.accountName,
      ipAddress: req.ip,
      eventType: 'JOB_MODERATION',
      resource: `/api/moderator/jobs/${jobId}`,
      action: 'PATCH',
      status: 'SUCCESS',
      details: { jobId, status, moderatorNote }
    });

    return res.status(200).json({ message: 'ตรวจสอบประกาศงานเรียบร้อย', job: updated });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  showModeratorPage,
  updateJobStatus
};
