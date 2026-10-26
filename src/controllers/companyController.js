"use strict";

const jobModel = require('../models/jobModel');
const auditLogger = require('../services/auditLogger');

// แสดงหน้า Company Single Page (GET /company)
async function showCompanyPage(req, res) {
  try {
    const companyId = req.session.accountId;
    const jobs = await jobModel.getAllJobs({ createdBy: companyId });
    const applications = await jobModel.getApplicationsForCompany(companyId);

    res.render('company/index', {
      title: 'หน้าจัดการสำหรับบริษัท - FreelanceHub',
      accountName: req.session.accountName,
      accountRole: req.session.accountRole,
      jobs,
      applications
    });
  } catch (error) {
    res.status(500).send('Error loading company portal: ' + error.message);
  }
}

// สร้างประกาศรับสมัครงานใหม่ (POST /api/company/jobs)
async function createJob(req, res) {
  try {
    const companyId = req.session.accountId;
    const { title, category, budget, location, description } = req.body;

    const validation = jobModel.validateJob({ title, category, budget, location, description });
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    validation.data.created_by = companyId;
    const createdJob = await jobModel.createJob(validation.data);

    await auditLogger.logEvent({
      userId: companyId,
      usernameOrEmail: req.session.email || req.session.accountName,
      ipAddress: req.ip,
      eventType: 'JOB_CREATE',
      resource: `/api/company/jobs/${createdJob.id}`,
      action: 'POST',
      status: 'SUCCESS',
      details: { jobId: createdJob.id, title: createdJob.title }
    });

    return res.status(201).json({ message: 'ลงประกาศงานสำเร็จ', job: createdJob });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// พิจารณาใบสมัคร (PATCH /api/company/applications/:id/status)
async function updateApplicationStatus(req, res) {
  try {
    const companyId = req.session.accountId;
    const appId = Number(req.params.id);
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
    }

    const updated = await jobModel.updateApplicationStatus(appId, status);

    await auditLogger.logEvent({
      userId: companyId,
      usernameOrEmail: req.session.email || req.session.accountName,
      ipAddress: req.ip,
      eventType: 'APPLICATION_STATUS_CHANGE',
      resource: `/api/company/applications/${appId}`,
      action: 'PATCH',
      status: 'SUCCESS',
      details: { applicationId: appId, newStatus: status }
    });

    return res.status(200).json({ message: 'อัปเดตผลการพิจารณาสำเร็จ', application: updated });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  showCompanyPage,
  createJob,
  updateApplicationStatus
};
