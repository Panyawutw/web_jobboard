"use strict";

const express = require('express');
const multer = require('multer');
const router = express.Router();

const appViewController = require('../controllers/appViewController');
const { ensureAuthenticatedWeb } = require('../middlewares/aclMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// บังคับล็อกอินสำหรับทุกเส้นทางภายใต้ /app/...
router.use(ensureAuthenticatedWeb);

router.get('/', appViewController.showDashboard);
router.get('/dashboard', appViewController.showDashboard);
router.get('/jobs', appViewController.showJobs);
router.get('/jobs/new', appViewController.showNewJobForm);
router.post('/jobs/new', upload.single('file'), appViewController.handleCreateJob);
router.get('/jobs/:id', appViewController.showJobDetail);
router.get('/my-jobs', appViewController.showMyJobs);

module.exports = router;
