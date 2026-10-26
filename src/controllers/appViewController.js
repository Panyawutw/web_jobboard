"use strict";

const jobModel = require('../models/jobModel');
const fileService = require('../services/fileService');
const aclService = require('../services/aclService');
const auditLogger = require('../services/auditLogger');

// 1. หน้าหลักของระบบสมาชิก (GET /app)
async function showDashboard(req, res) {
  try {
    const userId = req.session.accountId;
    const userRole = req.session.accountRole;

    const myJobs = await jobModel.getAllJobs({ createdBy: userId });
    const assignedJobs = await jobModel.getAllJobs({ assignedTo: userId });
    const allJobs = await jobModel.getAllJobs({});

    res.render('app/dashboard', {
      title: 'พื้นที่ทำงานของสมาชิก - FreelanceHub',
      accountName: req.session.accountName,
      accountRole: userRole,
      accountId: userId,
      myJobs,
      assignedJobs,
      allJobsCount: allJobs.length
    });
  } catch (error) {
    res.status(500).send('Error loading app dashboard: ' + error.message);
  }
}

// 2. หน้ารายการงานทั้งหมด (GET /app/jobs)
async function showJobs(req, res) {
  try {
    const search = req.query.search || '';
    const category = req.query.category || 'all';
    const status = req.query.status || 'all';

    const jobs = await jobModel.getAllJobs({
      search,
      category,
      status
    });

    res.render('app/jobs', {
      title: 'รายการงานในระบบ - FreelanceHub',
      accountName: req.session.accountName,
      accountRole: req.session.accountRole,
      jobs,
      filters: { search, category, status }
    });
  } catch (error) {
    res.status(500).send('Error loading jobs: ' + error.message);
  }
}

// 3. หน้าส่งคำขอ / เพิ่มงานใหม่พร้อมแนบไฟล์ (GET /app/jobs/new)
async function showNewJobForm(req, res) {
  res.render('app/job-form', {
    title: 'ส่งคำขอเพิ่มงานใหม่ - FreelanceHub',
    accountName: req.session.accountName,
    accountRole: req.session.accountRole,
    job: null,
    errors: {}
  });
}

// บันทึกคำขอเพิ่มงานใหม่ (POST /app/jobs/new)
async function handleCreateJob(req, res) {
  try {
    const userId = req.session.accountId;
    const { title, category, budget, location, description } = req.body;

    const result = jobModel.validateJob({ title, category, budget, location, description });
    if (result.error) {
      return res.status(400).render('app/job-form', {
        title: 'ส่งคำขอเพิ่มงานใหม่ - FreelanceHub',
        accountName: req.session.accountName,
        accountRole: req.session.accountRole,
        job: req.body,
        errors: { form: result.error }
      });
    }

    result.data.created_by = userId;
    const newJob = await jobModel.createJob(result.data);

    // หากมีการแนบไฟล์มาด้วย
    if (req.file) {
      await fileService.saveUploadedFile({
        file: req.file,
        uploadedBy: userId,
        relatedEntityType: 'job',
        relatedEntityId: newJob.id
      });

      await auditLogger.logEvent({
        userId,
        usernameOrEmail: req.session.email || req.session.accountName,
        ipAddress: req.ip,
        eventType: 'FILE_UPLOAD',
        resource: `/app/jobs/${newJob.id}`,
        action: 'POST',
        status: 'SUCCESS',
        details: { jobId: newJob.id, originalName: req.file.originalname, size: req.file.size }
      });
    }

    await auditLogger.logEvent({
      userId,
      usernameOrEmail: req.session.email || req.session.accountName,
      ipAddress: req.ip,
      eventType: 'JOB_CREATE',
      resource: `/app/jobs/${newJob.id}`,
      action: 'POST',
      status: 'SUCCESS',
      details: { jobId: newJob.id, title: newJob.title, budget: newJob.budget }
    });

    return res.redirect(`/app/jobs/${newJob.id}?created=1`);
  } catch (error) {
    return res.status(500).render('app/job-form', {
      title: 'ส่งคำขอเพิ่มงานใหม่ - FreelanceHub',
      accountName: req.session.accountName,
      accountRole: req.session.accountRole,
      job: req.body,
      errors: { form: error.message }
    });
  }
}

// 4. หน้ารายละเอียดงาน (GET /app/jobs/:id)
async function showJobDetail(req, res) {
  try {
    const jobId = Number(req.params.id);
    const job = await jobModel.getJobById(jobId);

    if (!job) {
      return res.status(404).render('errors/404', {
        title: '404 - ไม่พบงานที่ระบุ',
        message: 'ไม่พบงานที่ท่านต้องการดูรายละเอียด'
      });
    }

    const attachments = await fileService.getAttachmentsByEntity('job', jobId);
    job.attachments = attachments;

    const currentUser = {
      id: req.session.accountId,
      role: req.session.accountRole,
      name: req.session.accountName
    };

    const isOwner = Number(job.created_by) === Number(currentUser.id);
    const isAssigned = Number(job.assigned_to) === Number(currentUser.id);
    const canApprove = await aclService.hasPermission(currentUser.role, 'jobs.approve');
    const canUpdateStatus = await aclService.hasPermission(currentUser.role, 'jobs.status_update');

    res.render('app/job-detail', {
      title: `${job.title} - FreelanceHub`,
      accountName: req.session.accountName,
      accountRole: req.session.accountRole,
      job,
      isOwner,
      isAssigned,
      canApprove,
      canUpdateStatus,
      success: req.query.created ? 'สร้างคำของานเรียบร้อยแล้ว' : null
    });
  } catch (error) {
    res.status(500).send('Error loading job detail: ' + error.message);
  }
}

// 5. หน้างานของฉัน (GET /app/my-jobs)
async function showMyJobs(req, res) {
  try {
    const userId = req.session.accountId;
    const myJobs = await jobModel.getAllJobs({ createdBy: userId });

    res.render('app/my-jobs', {
      title: 'งานของฉัน - FreelanceHub',
      accountName: req.session.accountName,
      accountRole: req.session.accountRole,
      jobs: myJobs
    });
  } catch (error) {
    res.status(500).send('Error loading my jobs: ' + error.message);
  }
}

module.exports = {
  showDashboard,
  showJobs,
  showNewJobForm,
  handleCreateJob,
  showJobDetail,
  showMyJobs
};
