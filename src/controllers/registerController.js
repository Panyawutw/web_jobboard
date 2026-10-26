"use strict";

const {
  createJobSeeker,
  createCompany,
  emailExists,
  usernameExists
} = require('../models/accountModel');

const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value) => (typeof value === 'string' ? value.trim() : '');

// ตรวจสอบความถูกต้องของข้อมูลตามประเภทบัญชี (Job Seeker / Company)
function validate(body) {
  const role = body.role === 'company'
    ? 'company'
    : body.role === 'jobSeeker'
      ? 'jobSeeker'
      : '';

  const values = Object.fromEntries(
    Object.entries(body).map(([key, value]) => [key, clean(value)])
  );
  const errors = {};

  if (!role) errors.role = 'กรุณาเลือกประเภทบัญชี';

  const requiredFields = role === 'company'
    ? [
        ['username', 'ชื่อผู้ใช้'],
        ['accountEmail', 'อีเมลบัญชี'],
        ['companyName', 'ชื่อบริษัท'],
        ['businessType', 'ลักษณะธุรกิจ'],
        ['contactName', 'ชื่อผู้ติดต่อ'],
        ['phone', 'เบอร์โทร'],
        ['contactEmail', 'อีเมลติดต่อ']
      ]
    : [
        ['firstName', 'ชื่อ'],
        ['lastName', 'นามสกุล'],
        ['email', 'อีเมล']
      ];

  for (const [field, label] of requiredFields) {
    if (!values[field]) errors[field] = `กรุณากรอก${label}`;
  }

  const emailFields = role === 'company'
    ? [
        ['accountEmail', 'อีเมลบัญชี'],
        ['contactEmail', 'อีเมลติดต่อ']
      ]
    : [['email', 'อีเมล']];

  for (const [field, label] of emailFields) {
    if (values[field] && !validEmail.test(values[field])) {
      errors[field] = `${label}ไม่ถูกต้อง`;
    }
  }

  if (!values.password) {
    errors.password = 'กรุณากรอกรหัสผ่าน';
  } else if (values.password.length < 8) {
    errors.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  } else if (Buffer.byteLength(values.password, 'utf8') > 72) {
    errors.password = 'รหัสผ่านยาวเกินขีดจำกัดความปลอดภัย';
  }

  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'รหัสผ่านไม่ตรงกัน';
  }

  if (!body.termsAccepted) {
    errors.termsAccepted = 'กรุณายอมรับเงื่อนไขการใช้บริการและนโยบายความเป็นส่วนตัว';
  }

  return { role, values, errors };
}

// แสดงหน้าสมัครสมาชิก (GET /register)
async function showRegister(req, res) {
  const role = req.query.role === 'company' ? 'company' : 'jobSeeker';
  const accountName = req.session ? req.session.accountName : null;

  const errors = {};
  if (req.query.error === 'google_missing_client_id') {
    errors.form = 'ยังไม่ได้ตั้งค่าการสมัครผ่าน Google คุณยังสมัครด้วยแบบฟอร์มด้านล่างได้';
  } else if (req.query.error === 'github_missing_client_id') {
    errors.form = 'ยังไม่ได้ตั้งค่าการสมัครผ่าน GitHub คุณยังสมัครด้วยแบบฟอร์มด้านล่างได้';
  } else if (req.query.error === 'oauth_failed') {
    errors.form = 'การยืนยันตัวตนผ่าน OAuth ล้มเหลว กรุณาลองใหม่อีกครั้ง';
  } else if (req.query.error === 'oauth_denied') {
    errors.form = 'คุณได้ยกเลิกการสมัครสมาชิกผ่านผู้ให้บริการภายนอก';
  }

  res.render('pages/register', {
    title: 'สมัครสมาชิก | FreelanceHub',
    role,
    values: {},
    errors,
    success: null,
    accountName: accountName || null
  });
}

function startCompanySession(req, res, next, accountId, values) {
  if (!req.session) {
    return res.redirect('/login?welcome=1');
  }

  req.session.regenerate((error) => {
    if (error) return next(error);

    req.session.accountId = accountId;
    req.session.accountRole = 'company';
    req.session.accountName = values.companyName.trim();
    req.session.email = values.accountEmail.trim().toLowerCase();
    req.session.cookie.maxAge = 8 * 60 * 60 * 1000;

    req.session.save((saveError) => {
      if (saveError) return next(saveError);
      return res.redirect('/company');
    });
  });
}
// รับคำขอสมัครสมาชิกจากแบบฟอร์ม (POST /register)
async function register(req, res, next) {
  const { role, values, errors } = validate(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(422).render('pages/register', {
      title: 'สมัครสมาชิก | FreelanceHub',
      role: role || 'jobSeeker',
      values,
      errors,
      success: null
    });
  }

  try {
    // ตรวจสอบอีเมลแยกตามช่อง เพื่อแจ้งตำแหน่งที่ซ้ำได้ถูกต้อง
    const duplicateEmailErrors = {};
    if (role === 'company') {
      if (await emailExists(values.accountEmail)) {
        duplicateEmailErrors.accountEmail = 'อีเมลบัญชีนี้มีอยู่ในระบบแล้ว';
      }
      if (await emailExists(values.contactEmail)) {
        duplicateEmailErrors.contactEmail = 'อีเมลติดต่อนี้มีบัญชีในระบบแล้ว';
      }
    } else if (await emailExists(values.email)) {
      duplicateEmailErrors.email = 'อีเมลนี้มีบัญชีในระบบแล้ว';
    }

    if (Object.keys(duplicateEmailErrors).length > 0) {
      return res.status(409).render('pages/register', {
        title: 'สมัครสมาชิก | FreelanceHub',
        role,
        values,
        errors: duplicateEmailErrors,
        success: null
      });
    }

    // ตรวจสอบ username ซ้ำสำหรับบัญชีบริษัท
    if (role === 'company' && (await usernameExists(values.username))) {
      return res.status(409).render('pages/register', {
        title: 'สมัครสมาชิก | FreelanceHub',
        role,
        values,
        errors: {
          username: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว'
        },
        success: null
      });
    }

    // บันทึกลง PostgreSQL ตาม Role
    if (role === 'company') {
      const accountId = await createCompany(values);
      return startCompanySession(req, res, next, accountId, values);
    }

    await createJobSeeker(values);

    return res.status(201).render('pages/register', {
      title: 'สมัครสมาชิกสำเร็จ | FreelanceHub',
      role,
      values: {},
      errors: {},
      success: 'สร้างบัญชีเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบได้'
    });
  } catch (error) {
    // Postgre error 23505 = unique_violation
    if (error.code === '23505') {
      return res.status(409).render('pages/register', {
        title: 'สมัครสมาชิก | FreelanceHub',
        role,
        values,
        errors: {
          accountEmail: 'อีเมลหรือชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว',
          email: 'อีเมลนี้มีอยู่ในระบบแล้ว'
        },
        success: null
      });
    }

    return next(error);
  }
}

// Placeholder จัดการเมื่อยังไม่ได้เชื่อมต่อ OAuth กับภายนอก
function oauthNotConfigured(req, res) {
  const message = 'การเข้าสู่ระบบผ่านผู้ให้บริการภายนอก (Google / GitHub) ยังไม่ได้ตั้งค่า Client ID และ Secret ในระบบหลังบ้าน';

  if (req.query.from === 'login') {
    return res.status(501).render('pages/login', {
      title: 'เข้าสู่ระบบ | FreelanceHub',
      values: {},
      errors: { form: message },
      success: null,
      accountName: null,
      accountRole: null
    });
  }

  return res.status(501).render('pages/register', {
    title: 'สมัครสมาชิก | FreelanceHub',
    role: 'jobSeeker',
    values: {},
    errors: { form: message },
    success: null
  });
}

module.exports = {
  showRegister,
  register,
  oauthNotConfigured
};
