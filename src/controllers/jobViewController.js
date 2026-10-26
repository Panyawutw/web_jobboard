"use strict";

const jobModel = require('../models/jobModel');

// แสดงหน้าแรกและรายการค้นหางาน (GET / หรือ GET /jobs)
async function showHomePageings(req, res) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';

    const approvedJobs = await jobModel.getAllJobs({
      status: 'approved',
      search,
      category: category === 'all' ? '' : category
    });

    const categories = [
      'ทั้งหมด',
      'Web Development',
      'Design',
      'Mobile App',
      'Data & AI',
      'Marketing'
    ];

    res.render('pages/index', {
      title: 'FreelanceHub - แพลตฟอร์มหางานและสมัครงานยอดนิยม',
      accountName: req.session ? req.session.accountName : null,
      accountRole: req.session ? req.session.accountRole : null,
      jobs: approvedJobs,
      search,
      category: category || 'ทั้งหมด',
      categories
    });
  } catch (error) {
    console.error('Error loading jobs:', error);
    res.status(500).render('errors/404', {
      title: 'เกิดข้อผิดพลาดในการโหลดรายการงาน',
      message: error.message
    });
  }
}

// แสดงหน้ารายละเอียดงาน (GET /jobs/:id) - 
async function showJobDetail(req, res) {
  try {
    const jobId = Number(req.params.id);
    if (!jobId || isNaN(jobId)) {
      return res.status(404).render('errors/404', {
        title: 'ไม่พบประกาศงาน',
        message: 'รหัสตำแหน่งงานไม่ถูกต้องหรือไม่พบในระบบ'
      });
    }

    const job = await jobModel.getJobById(jobId);
    if (!job) {
      return res.status(404).render('errors/404', {
        title: 'ไม่พบตำแหน่งงานนี้',
        message: 'ประกาศงานนี้อาจหมดอายุหรือถูกลบออกจากระบบแล้ว'
      });
    }

    // ตรวจสอบว่าผู้ใช้ที่ล็อกอิน (JobSeeker) ได้เคยส่งใบสมัครงานนี้แล้วหรือไม่
    let hasApplied = false;
    let userApplication = null;
    const accountId = req.session ? req.session.accountId : null;
    const accountRole = req.session ? req.session.accountRole : null;

    if (accountId && String(accountRole).toLowerCase() === 'jobseeker') {
      const myApplications = await jobModel.getApplicationsByApplicant(accountId);
      userApplication = myApplications.find(a => Number(a.job_id) === jobId) || null;
      hasApplied = !!userApplication;
    }

    // ดึงงานอื่นๆ ที่เกี่ยวข้องเพื่อนำไปแสดงในแถบข้าง (Related Jobs)
    const allApproved = await jobModel.getAllJobs({ status: 'approved' });
    const relatedJobs = allApproved
      .filter(j => Number(j.id) !== jobId)
      .slice(0, 3);

    res.render('pages/job-detail', {
      title: `${job.title} - ${job.company_name || 'FreelanceHub'}`,
      job,
      hasApplied,
      userApplication,
      relatedJobs,
      accountName: req.session ? req.session.accountName : null,
      accountRole: req.session ? req.session.accountRole : null,
      accountId
    });
  } catch (error) {
    console.error('Error loading job detail:', error);
    res.status(500).render('errors/404', {
      title: 'เกิดข้อผิดพลาด',
      message: error.message
    });
  }
}

module.exports = {
  showHomePageings,
  showJobDetail
};
