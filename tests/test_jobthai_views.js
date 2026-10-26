"use strict";

const app = require('../server');

// Mock request/response dispatcher without TCP sockets
function testRequest(app, { method = 'GET', url = '/', session = {}, body = {}, headers = {} }) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let resHeaders = {};
    let responseBody = '';

    const req = {
      method,
      url,
      originalUrl: url,
      path: url.split('?')[0],
      query: {},
      headers: { host: 'localhost:3000', ...headers },
      session: { ...session },
      body,
      ip: '127.0.0.1',
      socket: { encrypted: false, remoteAddress: '127.0.0.1' },
      get(header) { return this.headers[header.toLowerCase()]; }
    };

    if (url.includes('?')) {
      const qStr = url.split('?')[1];
      new URLSearchParams(qStr).forEach((val, key) => { req.query[key] = val; });
    }

    const res = {
      statusCode: 200,
      status(code) { statusCode = code; return this; },
      setHeader(name, value) { resHeaders[name.toLowerCase()] = value; return this; },
      getHeader(name) { return resHeaders[name.toLowerCase()]; },
      send(data) { responseBody = data; resolve({ status: statusCode, headers: resHeaders, body: responseBody }); },
      json(data) { responseBody = JSON.stringify(data); resolve({ status: statusCode, headers: resHeaders, body: responseBody }); },
      render(view, options, callback) {
        app.render(view, { ...res.locals, ...options }, (err, html) => {
          if (err) {
            statusCode = 500;
            responseBody = 'Render error: ' + err.message;
            return resolve({ status: statusCode, headers: resHeaders, body: responseBody });
          }
          responseBody = html;
          resolve({ status: statusCode, headers: resHeaders, body: responseBody });
        });
      },
      redirect(location) {
        statusCode = 302;
        resHeaders['location'] = location;
        resolve({ status: statusCode, headers: resHeaders, body: '' });
      },
      end(data) { if (data) responseBody = data; resolve({ status: statusCode, headers: resHeaders, body: responseBody }); }
    };

    app(req, res);
  });
}

async function runTests() {
  console.log('--- STARTING JOBTHAI NAVBAR & JOB DETAILS TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Test Home page with JobThai navbar & job cards
  const homeRes = await testRequest(app, { method: 'GET', url: '/' });
  assert(homeRes.status === 200, 'GET / returns HTTP 200');
  assert(homeRes.body.includes('Job<span class="logo-highlight">Thai</span>'), 'Navbar includes JobThai logo');
  assert(homeRes.body.includes('/jobs/1'), 'Home page contains clickable link to Job Details (/jobs/1)');
  assert(homeRes.body.includes('Full Stack Developer (Node.js &amp; React)') || homeRes.body.includes('Full Stack Developer'), 'Home page renders active job listings');

  // 2. Test Job Details Page (Guest Mode)
  const detailGuestRes = await testRequest(app, { method: 'GET', url: '/jobs/1' });
  assert(detailGuestRes.status === 200, 'GET /jobs/1 returns HTTP 200');
  assert(detailGuestRes.body.includes('Full Stack Developer'), 'Job Details page renders position title');
  assert(detailGuestRes.body.includes('หน้าที่และความรับผิดชอบ'), 'Job Details page has Responsibilities section');
  assert(detailGuestRes.body.includes('คุณสมบัติผู้สมัคร'), 'Job Details page has Qualifications section');
  assert(detailGuestRes.body.includes('สวัสดิการ'), 'Job Details page has Benefits section');
  assert(detailGuestRes.body.includes('วิธีการสมัครงาน'), 'Job Details page has How to Apply section');
  assert(detailGuestRes.body.includes('เข้าสู่ระบบเพื่อสมัครงาน'), 'Guest is shown CTA to login to apply');

  // 3. Test Job Details Page (JobSeeker Mode)
  const seekerSession = { accountId: 4, accountRole: 'JobSeeker', accountName: 'นายสมคิด ผู้สมัครงาน' };
  const detailSeekerRes = await testRequest(app, { method: 'GET', url: '/jobs/1', session: seekerSession });
  assert(detailSeekerRes.status === 200, 'GET /jobs/1 for JobSeeker returns HTTP 200');
  // Seeker already applied to job 1 in memory seed
  assert(detailSeekerRes.body.includes('คุณได้ส่งใบสมัครงานนี้แล้ว') || detailSeekerRes.body.includes('สมัครงานด่วน'), 'JobSeeker sees application status or apply button');

  // 4. Test Job Details Page for Job 2 (where Seeker has not yet applied)
  const detailJob2Res = await testRequest(app, { method: 'GET', url: '/jobs/2', session: seekerSession });
  assert(detailJob2Res.status === 200, 'GET /jobs/2 returns HTTP 200');
  assert(detailJob2Res.body.includes('สมัครงานด่วน (Apply Now)'), 'JobSeeker sees Apply Now button for job 2');
  assert(detailJob2Res.body.includes('id="apply-modal"'), 'Apply modal is rendered on job details page');

  // 5. Test Non-existent Job ID
  const notFoundRes = await testRequest(app, { method: 'GET', url: '/jobs/999' });
  assert(notFoundRes.status === 404, 'GET /jobs/999 returns HTTP 404 cleanly');

  // 6. Test Navbar rendering for 4 Roles
  const roles = [
    { role: 'JobSeeker', expected: '/seeker' },
    { role: 'Company', expected: '/company' },
    { role: 'Staff', expected: '/moderator' },
    { role: 'Admin', expected: '/admin' }
  ];

  for (const { role, expected } of roles) {
    const roleRes = await testRequest(app, {
      method: 'GET',
      url: '/',
      session: { accountId: 99, accountRole: role, accountName: `ทดสอบ ${role}` }
    });
    assert(roleRes.status === 200 && roleRes.body.includes(expected), `Navbar for role ${role} contains shortcut ${expected}`);
  }

  console.log(`\nTEST SUMMARY: ${passed} Passed, ${failed} Failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
