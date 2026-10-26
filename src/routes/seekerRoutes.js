"use strict";

const express = require('express');
const router = express.Router();
const seekerController = require('../controllers/seekerController');
const { ensureAuthenticatedWeb } = require('../middlewares/aclMiddleware');

router.use(ensureAuthenticatedWeb);

// Web Page
router.get('/', seekerController.showSeekerPage);

module.exports = router;
