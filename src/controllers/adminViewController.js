"use strict";

const aclService = require('../services/aclService');
const auditLogger = require('../services/auditLogger');

// แดชบอร์ดผู้ดูแลระบบหน้าเดียวจบ: Dynamic ACL Matrix + Audit Logs (GET /admin)
async function showDashboard(req, res) {
  try {
    const data = await aclService.getAclMatrix();
    const recentLogs = await auditLogger.getLogs({ limit: 50 });

    res.render('admin/index', {
      title: 'ผู้ดูแลระบบ - Dynamic ACL & Logs',
      accountName: req.session?.accountName,
      accountRole: req.session?.accountRole,
      roles: data.roles,
      permissions: data.permissions,
      matrix: data.matrix,
      logs: recentLogs.logs
    });
  } catch (error) {
    res.status(500).send('Error loading admin portal: ' + error.message);
  }
}

module.exports = {
  showDashboard,
  showAclMatrix: showDashboard,
  showLogs: showDashboard
};
