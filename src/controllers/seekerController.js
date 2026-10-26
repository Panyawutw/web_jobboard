"use strict";

const jobModel = require('../models/jobModel');
const fileService = require('../services/fileService');
const auditLogger = require('../services/auditLogger');

// แสดงหน้า Job Seeker Single Page (GET /seeker หรือ /app)
async function showSeekerPage(req, res) {
  try {
    const applicantId = req.session.accountId;
    const approvedJobs = await jobModel.getAllJobs({ status: 'approved' });
    const myApplications = await jobModel.getApplicationsByApplicant(applicantId);

    res.render('seeker/index', {
      title: 'ค้นหาและสมัครงาน - Job Seeker',
      accountName: req.session.accountName,
      accountRole: req.session.accountRole,
      jobs: approvedJobs,
      myApplications
    });
  } catch (error) {
    res.status(500).send('Error loading job seeker portal: ' + error.message);
  }
}

// ส่งใบสมัครงานพร้อมแนบ Resume (POST /api/seeker/apply)
async function applyForJob(req, res) {
  try {
    const applicantId = req.session.accountId;
    const { jobId, coverNote } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'ไม่พบรหัสงานที่ต้องการสมัคร' });
    }

    let resumeAttachment = null;
    if (req.file) {
      resumeAttachment = await fileService.saveUploadedFile({
        file: req.file,
        uploadedBy: applicantId,
        relatedEntityType: 'application'
      });

      await auditLogger.logEvent({
        userId: applicantId,
        usernameOrEmail: req.session.email || req.session.accountName,
        ipAddress: req.ip,
        eventType: 'FILE_UPLOAD',
        resource: `/api/files/${resumeAttachment.id}`,
        action: 'POST',
        status: 'SUCCESS',
        details: { resumeId: resumeAttachment.id, originalName: resumeAttachment.original_name }
      });
    }

    const application = await jobModel.applyForJob({
      jobId,
      applicantId,
      coverNote: coverNote || '',
      resumeId: resumeAttachment ? resumeAttachment.id : null,
      resumeName: resumeAttachment ? resumeAttachment.original_name : null
    });

    await auditLogger.logEvent({
      userId: applicantId,
      usernameOrEmail: req.session.email || req.session.accountName,
      ipAddress: req.ip,
      eventType: 'APPLICATION_SUBMIT',
      resource: `/api/seeker/apply/${jobId}`,
      action: 'POST',
      status: 'SUCCESS',
      details: { jobId, applicationId: application.id }
    });

    return res.status(201).json({ message: 'ส่งใบสมัครสำเร็จ', application });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  showSeekerPage,
  applyForJob
};
