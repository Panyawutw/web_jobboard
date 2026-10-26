"use strict";

const pool = require('../config/db');

// In-memory fallback
let memoryJobs = [
  {
    id: 1,
    title: "Full Stack Developer (Node.js & React)",
    category: "Web Development",
    budget: 35000,
    location: "Bangkok / Hybrid (ใกล้ MRT พระราม 9)",
    description: "พัฒนาและดูแลระบบเว็บแอปพลิเคชันของบริษัท ทำงานแบบ Hybrid สัปดาห์ละ 2 วัน พร้อมสวัสดิการครบครัน",
    status: "approved",
    created_by: 2,
    company_name: "บริษัท เทคโนโลยี อินโนเวชั่น จำกัด",
    job_type: "งานประจำ (Full Time)",
    work_format: "Hybrid (เข้าออฟฟิศ 2 วัน/สัปดาห์)",
    vacancies: "2 อัตรา",
    experience: "1 - 3 ปี (ยินดีรับนักศึกษาจบใหม่)",
    responsibilities: [
      "ออกแบบและพัฒนาระบบ Web Application ทั้ง Front-end (React) และ Back-end (Node.js & Express)",
      "ออกแบบและจัดการฐานข้อมูล PostgreSQL รวมถึงการเขียนและปรับแต่ง SQL Queries",
      "พัฒนาและเชื่อมต่อ RESTful APIs และบูรณาการร่วมกับ Third-party Services",
      "ทำงานร่วมกับทีม Product, UI/UX Designer และ QA ภายใต้กระบวนการ Agile/Scrum",
      "ดูแลความปลอดภัยของระบบและการทำ Automated Unit Testing"
    ],
    qualifications: [
      "ปริญญาตรีขึ้นไป สาขาวิทยาการคอมพิวเตอร์, เทคโนโลยีสารสนเทศ หรือสาขาที่เกี่ยวข้อง",
      "มีทักษะการเขียนโปรแกรมด้วย JavaScript / TypeScript, Node.js และ React",
      "มีความเข้าใจในโครงสร้างข้อมูล REST API, HTTP Protocol และฐานข้อมูลเชิงสัมพันธ์ (SQL)",
      "คุ้นเคยกับการใช้งาน Git Version Control",
      "มีความรับผิดชอบ สามารถทำงานร่วมกับผู้อื่นได้ดี และกระตือรือร้นในการเรียนรู้เทคโนโลยีใหม่ๆ",
      "ยินดีพิจารณานักศึกษาจบใหม่ที่มีความตั้งใจและมีผลงานโปรเจกต์หรือ Portfolio"
    ],
    benefits: [
      "ประกันสังคม และประกันสุขภาพกลุ่ม (IPD / OPD)",
      "โบนัสประจำปีตามผลประกอบการ และการปรับฐานเงินเดือนประจำปี",
      "รูปแบบการทำงาน Hybrid (WFH 2-3 วันต่อสัปดาห์)",
      "วันหยุดพักผ่อนประจำปี (Annual Leave) 10-15 วัน",
      "สนับสนุนงบประมาณพัฒนาตนเอง (คอร์สเรียนออนไลน์, หนังสือ, ค่าสอบ Certificate)",
      "เครื่องคอมพิวเตอร์สำหรับการทำงาน (MacBook หรือ Notebook ประสิทธิภาพสูง)",
      "ขนม กาแฟ เครื่องดื่มฟรีในออฟฟิศ และกิจกรรมสังสรรค์ Outing ประจำปี"
    ],
    company_address: "123 อาคารอินโนเวชั่น ทาวเวอร์ ชั้น 18 ถนนรัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310",
    company_phone: "02-123-4567 ต่อ 101",
    company_email: "hr@techinnovation.co.th",
    created_at: new Date(Date.now() - 86400000)
  },
  {
    id: 2,
    title: "UI/UX Designer ออกแบบแอปพลิเคชัน",
    category: "Design",
    budget: 28000,
    location: "Remote (Work from Anywhere)",
    description: "ออกแบบ User Interface และ User Journey สำหรับ Mobile Application และ Web Platform",
    status: "approved",
    created_by: 2,
    company_name: "บริษัท เทคโนโลยี อินโนเวชั่น จำกัด",
    job_type: "งานประจำ (Full Time)",
    work_format: "Work from Home 100% (Remote)",
    vacancies: "1 อัตรา",
    experience: "1 - 4 ปี",
    responsibilities: [
      "วิเคราะห์และออกแบบ User Flow, Wireframe และ High-fidelity Interactive Prototypes ด้วย Figma",
      "ทำ User Research และทดสอบ Usability Testing กับผู้ใช้งานจริงเพื่อนำฟีดแบ็กมาปรับปรุงระบบ",
      "สร้างและดูแล Design System ร่วมกับทีมนักพัฒนาเพื่อให้ได้มาตรฐานเดียวกัน",
      "ประสานงานใกล้ชิดกับ Product Manager และ Developer เพื่อให้งานออกแบบถูกนำไปพัฒนาได้ถูกต้อง"
    ],
    qualifications: [
      "ปริญญาตรีในสาขาการออกแบบ, นิเทศศิลป์, IT หรือสาขาที่เกี่ยวข้อง",
      "เชี่ยวชาญการใช้โปรแกรม Figma และเครื่องมือ Prototyping",
      "มี Portfolio แสดงผลงานการออกแบบ UI/UX สำหรับเว็บหรือแอปพลิเคชันที่ชัดเจน",
      "เข้าใจหลักการ Design Thinking และ Human-Centered Design",
      "มีทักษะในการสื่อสาร นำเสนอผลงาน และรับฟังความคิดเห็นเพื่อการพัฒนา"
    ],
    benefits: [
      "ทำงานแบบ Remote 100% สามารถทำงานจากที่ไหนก็ได้ (Work from Anywhere)",
      "ประกันสุขภาพกลุ่ม และประกันอุบัติเหตุ",
      "งบเบิกซื้ออุปกรณ์ทำงานและหน้าจอเสริมสำหรับ WFH",
      "โบนัสประจำปีตามผลงาน",
      "วันลาพักร้อน 12 วันต่อปี"
    ],
    company_address: "123 อาคารอินโนเวชั่น ทาวเวอร์ ถนนรัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ",
    company_phone: "02-123-4567 ต่อ 102",
    company_email: "design-team@techinnovation.co.th",
    created_at: new Date(Date.now() - 43200000)
  },
  {
    id: 3,
    title: "Mobile App Developer (Flutter / React Native)",
    category: "Mobile App",
    budget: 40000,
    location: "Bangkok / Hybrid (BTS อโศก)",
    description: "พัฒนาแอปพลิเคชันบน iOS และ Android ด้วย Flutter รองรับผู้ใช้งานจำนวนมาก",
    status: "approved",
    created_by: 2,
    company_name: "บริษัท ดิจิทัล ซิสเต็มส์ คอร์ป จำกัด",
    job_type: "งานประจำ (Full Time)",
    work_format: "Hybrid (เข้าออฟฟิศ 1 วัน/สัปดาห์)",
    vacancies: "1 อัตรา",
    experience: "1 - 3 ปี",
    responsibilities: [
      "พัฒนา Mobile Application สำหรับ iOS และ Android ด้วย Flutter หรือ React Native",
      "เชื่อมต่อ REST APIs และบริการคลาวด์ เช่น Firebase, Cloud Messaging",
      "จัดการกระบวนการ Publish App ขึ้น App Store และ Google Play Store",
      "ปรับแต่ง Performance และ Memory Optimization ให้แอปพลิเคชันทำงานลื่นไหล"
    ],
    qualifications: [
      "มีประสบการณ์พัฒนา Mobile Application ด้วย Flutter (Dart) หรือ React Native",
      "เข้าใจการจัดการ State Management (Bloc, Provider หรือ Riverpod)",
      "เคยมีผลงานแอปพลิเคชันที่เผยแพร่บน App Store หรือ Google Play มาก่อน",
      "มีทักษะในการแก้ปัญหา และสื่อสารทำงานร่วมกับทีมได้เป็นอย่างดี"
    ],
    benefits: [
      "ประกันสังคม และประกันสุขภาพกลุ่มชั้นนำ",
      "โบนัสประจำปี 1-3 เดือนตามผลงาน",
      "เข้าออฟฟิศเพียงสัปดาห์ละ 1 วัน (วันอื่นๆ WFH)",
      "จัดหาอุปกรณ์ Mac mini / MacBook สำหรับการพัฒนาแอป"
    ],
    company_address: "อาคารเอ็กซ์เชนจ์ ทาวเวอร์ ชั้น 22 ถนนสุขุมวิท เขตคลองเตย กรุงเทพมหานคร (BTS อโศก)",
    company_phone: "02-987-6543",
    company_email: "career@digitalsystems.co.th",
    created_at: new Date(Date.now() - 172800000)
  }
];

let memoryApplications = [
  {
    id: 1,
    job_id: 1,
    job_title: "Full Stack Developer (Node.js & React)",
    applicant_id: 4,
    applicant_name: "นายสมคิด ผู้สมัครงาน (Job Seeker)",
    cover_note: "มีประสบการณ์ Node.js และ React 3 ปี พร้อมเริ่มงานทันทีครับ",
    resume_id: null,
    resume_name: "Somkid_Resume.pdf",
    status: "pending",
    created_at: new Date()
  }
];

function validateJob(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const location = typeof body.location === 'string' ? body.location.trim() : 'Remote';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const budget = Number(body.budget);

  if (!title || !category || !description) {
    return { error: "กรุณากรอกข้อมูลให้ครบถ้วน (ชื่องาน, หมวดหมู่, รายละเอียด)" };
  }
  if (!Number.isFinite(budget) || budget <= 0) {
    return { error: "งบประมาณ/เงินเดือนต้องเป็นตัวเลขมากกว่า 0" };
  }

  return {
    data: {
      title,
      category,
      budget,
      location,
      description,
      status: body.status || 'pending',
      created_by: body.created_by ? Number(body.created_by) : null
    }
  };
}

async function getAllJobs({ search = '', category = '', status = '', createdBy = null } = {}) {
  try {
    let whereClauses = [];
    let params = [];
    let paramIdx = 1;

    if (search) {
      whereClauses.push(`(LOWER(j.title) LIKE $${paramIdx} OR LOWER(j.description) LIKE $${paramIdx})`);
      params.push(`%${search.toLowerCase()}%`);
      paramIdx++;
    }
    if (category && category.toLowerCase() !== 'all') {
      whereClauses.push(`LOWER(j.category) = $${paramIdx++}`);
      params.push(category.toLowerCase());
    }
    if (status && status.toLowerCase() !== 'all') {
      whereClauses.push(`j.status = $${paramIdx++}`);
      params.push(status);
    }
    if (createdBy !== null) {
      whereClauses.push(`j.created_by = $${paramIdx++}`);
      params.push(Number(createdBy));
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const query = `
      SELECT j.*, COALESCE(a.name, a.email) AS company_name
      FROM jobs j
      LEFT JOIN accounts a ON a.id = j.created_by
      ${whereStr}
      ORDER BY j.created_at DESC
    `;
    const res = await pool.query(query, params);
    if (res.rows.length > 0 || whereClauses.length > 0) return res.rows;
  } catch (err) { /* fallback */ }

  return memoryJobs.filter(j => {
    if (search && !j.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && category.toLowerCase() !== 'all' && j.category.toLowerCase() !== category.toLowerCase()) return false;
    if (status && status.toLowerCase() !== 'all' && j.status !== status) return false;
    if (createdBy !== null && Number(j.created_by) !== Number(createdBy)) return false;
    return true;
  });
}

async function getJobById(id) {
  const jobId = Number(id);
  let job = null;
  try {
    const res = await pool.query(`
      SELECT j.*, COALESCE(a.name, a.email) AS company_name, a.email AS company_email, a.phone AS company_phone
      FROM jobs j
      LEFT JOIN accounts a ON a.id = j.created_by
      WHERE j.id = $1
    `, [jobId]);
    if (res.rows.length > 0) job = res.rows[0];
  } catch (err) { /* fallback */ }

  if (!job) {
    job = memoryJobs.find(j => j.id === jobId) || null;
  }

  if (job) {
    // เสริมข้อมูลสำหรับแสดงผลบนหน้ารายละเอียดงานแบบ JobThai
    job.job_type = job.job_type || 'งานประจำ (Full Time)';
    job.work_format = job.work_format || (job.location && job.location.includes('Remote') ? 'Work from Home 100%' : 'Hybrid (เข้าออฟฟิศ 2 วัน/สัปดาห์)');
    job.vacancies = job.vacancies || '1 - 2 อัตรา';
    job.experience = job.experience || '1 - 3 ปี (ยินดีรับนักศึกษาจบใหม่)';
    job.company_address = job.company_address || '123 อาคารอินโนเวชั่น ทาวเวอร์ ถนนรัชดาภิเษก เขตห้วยขวาง กรุงเทพมหานคร';
    job.company_phone = job.company_phone || '02-123-4567';
    job.company_email = job.company_email || 'hr@jobboard.com';

    if (!job.responsibilities || !job.responsibilities.length) {
      job.responsibilities = [
        `ปฏิบัติงานในตำแหน่ง ${job.title} ตามที่ได้รับมอบหมาย`,
        'ร่วมวางแผน ออกแบบ และพัฒนางานให้เสร็จสิ้นตรงตามเวลาและมาตรฐานคุณภาพของบริษัท',
        'ประสานงานร่วมกับทีมที่เกี่ยวข้องเพื่อแก้ปัญหาและพัฒนาการดำเนินงานให้ราบรื่น',
        'ติดตามและปรับปรุงผลงานให้มีประสิทธิภาพสูงสุด'
      ];
    }
    if (!job.qualifications || !job.qualifications.length) {
      job.qualifications = [
        'วุฒิการศึกษาระดับปริญญาตรีขึ้นไป ในสาขาที่เกี่ยวข้องกับตำแหน่งงาน',
        `มีความรู้และทักษะความเชี่ยวชาญในสายงาน ${job.category || 'ที่เกี่ยวข้อง'}`,
        'มีความรับผิดชอบ ละเอียดรอบคอบ และสามารถทำงานร่วมกับทีมได้ดี',
        'ยินดีพิจารณาทั้งผู้มีประสบการณ์ และผู้เริ่มต้นทำงานที่มีความกระตือรือร้น'
      ];
    }
    if (!job.benefits || !job.benefits.length) {
      job.benefits = [
        'ประกันสังคม และประกันสุขภาพกลุ่ม',
        'โบนัสประจำปีตามผลการดำเนินงาน',
        'วันหยุดพักผ่อนประจำปี (Annual Leave)',
        'งบสนับสนุนการอบรมและพัฒนาทักษะตนเอง',
        'เครื่องคอมพิวเตอร์และอุปกรณ์สำหรับทำงาน'
      ];
    }
  }

  return job;
}

async function createJob(data) {
  try {
    const res = await pool.query(`
      INSERT INTO jobs (title, category, budget, location, description, status, created_by)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6)
      RETURNING *
    `, [data.title, data.category, data.budget, data.location, data.description, data.created_by]);
    return res.rows[0];
  } catch (err) {
    const newId = memoryJobs.length > 0 ? Math.max(...memoryJobs.map(j => j.id)) + 1 : 1;
    const newJob = { id: newId, ...data, status: 'pending', created_at: new Date() };
    memoryJobs.unshift(newJob);
    return newJob;
  }
}

async function updateJobStatus(id, status, moderatorNote = null) {
  const jobId = Number(id);
  try {
    const res = await pool.query(`
      UPDATE jobs SET status = $1, moderator_note = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *
    `, [status, moderatorNote, jobId]);
    if (res.rows.length > 0) return res.rows[0];
  } catch (err) { /* fallback */ }

  const job = memoryJobs.find(j => j.id === jobId);
  if (job) {
    job.status = status;
    job.moderator_note = moderatorNote;
    return job;
  }
  return null;
}

// ==========================================
// Job Applications (ระบบสมัครงาน & แนบ Resume)
// ==========================================
async function applyForJob({ jobId, applicantId, coverNote, resumeId, resumeName }) {
  try {
    const res = await pool.query(`
      INSERT INTO job_applications (job_id, applicant_id, cover_note, resume_attachment_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [Number(jobId), Number(applicantId), coverNote, resumeId]);
    return res.rows[0];
  } catch (err) { /* fallback */ }

  const job = await getJobById(jobId);
  const newApp = {
    id: memoryApplications.length + 1,
    job_id: Number(jobId),
    job_title: job ? job.title : 'งาน',
    applicant_id: Number(applicantId),
    applicant_name: 'ผู้สมัครงาน',
    cover_note: coverNote,
    resume_id: resumeId,
    resume_name: resumeName || 'Resume.pdf',
    status: 'pending',
    created_at: new Date()
  };
  memoryApplications.unshift(newApp);
  return newApp;
}

async function getApplicationsByApplicant(applicantId) {
  try {
    const res = await pool.query(`
      SELECT a.*, j.title AS job_title, j.category, j.budget,
             att.original_name AS resume_name
      FROM job_applications a
      JOIN jobs j ON j.id = a.job_id
      LEFT JOIN attachments att ON att.id = a.resume_attachment_id
      WHERE a.applicant_id = $1
      ORDER BY a.created_at DESC
    `, [Number(applicantId)]);
    if (res.rows.length > 0) return res.rows;
  } catch (err) { /* fallback */ }

  return memoryApplications.filter(a => Number(a.applicant_id) === Number(applicantId));
}

async function getApplicationsForCompany(companyId) {
  try {
    const res = await pool.query(`
      SELECT a.*, j.title AS job_title,
             COALESCE(acc.name, acc.email) AS applicant_name,
             att.original_name AS resume_name, att.id AS resume_file_id
      FROM job_applications a
      JOIN jobs j ON j.id = a.job_id
      JOIN accounts acc ON acc.id = a.applicant_id
      LEFT JOIN attachments att ON att.id = a.resume_attachment_id
      WHERE j.created_by = $1
      ORDER BY a.created_at DESC
    `, [Number(companyId)]);
    if (res.rows.length > 0) return res.rows;
  } catch (err) { /* fallback */ }

  return memoryApplications;
}

async function updateApplicationStatus(appId, status) {
  const aId = Number(appId);
  try {
    const res = await pool.query(`
      UPDATE job_applications SET status = $1 WHERE id = $2 RETURNING *
    `, [status, aId]);
    if (res.rows.length > 0) return res.rows[0];
  } catch (err) { /* fallback */ }

  const app = memoryApplications.find(a => a.id === aId);
  if (app) {
    app.status = status;
    return app;
  }
  return null;
}

module.exports = {
  validateJob,
  getAllJobs,
  getJobById,
  createJob,
  updateJobStatus,
  applyForJob,
  getApplicationsByApplicant,
  getApplicationsForCompany,
  updateApplicationStatus
};
