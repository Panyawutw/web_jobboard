"use strict";

const {
  emailExists,
  createPasswordResetToken,
  findPasswordResetToken,
  deletePasswordResetToken,
  updatePasswordByEmail
} = require('../models/accountModel');

// แสดงหน้าขอรีเซ็ตรหัสผ่าน (GET /forgot-password)
function showForgotPassword(req, res) {
  res.render('pages/forgot-password', {
    title: 'ลืมรหัสผ่าน | FreelanceHub',
    values: {},
    errors: {},
    success: null,
    resetLink: null,
    accountName: req.session ? req.session.accountName : null
  });
}

// ส่งคำขอรีเซ็ตรหัสผ่าน (POST /forgot-password)
async function sendResetLink(req, res, next) {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const errors = {};

  if (!email) {
    errors.email = 'กรุณากรอกอีเมลของคุณ';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).render('pages/forgot-password', {
      title: 'ลืมรหัสผ่าน | FreelanceHub',
      values: { email },
      errors,
      success: null,
      resetLink: null,
      accountName: req.session ? req.session.accountName : null
    });
  }

  try {
    const exists = await emailExists(email);

    if (!exists) {
      // เพื่อความปลอดภัยตาม OWASP ไม่ควรเปิดเผยว่าอีเมลนี้มีอยู่ในระบบหรือไม่
      return res.render('pages/forgot-password', {
        title: 'ลืมรหัสผ่าน | FreelanceHub',
        values: {},
        errors: {},
        success: 'หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณเรียบร้อยแล้ว',
        resetLink: null,
        accountName: req.session ? req.session.accountName : null
      });
    }

    const token = await createPasswordResetToken(email);
    const host = req.get('host');
    const resetLink = `${req.protocol}://${host}/reset-password?token=${token}`;

    return res.render('pages/forgot-password', {
      title: 'ลืมรหัสผ่าน | FreelanceHub',
      values: {},
      errors: {},
      success: 'สร้างลิงก์สำหรับตั้งรหัสผ่านใหม่เรียบร้อยแล้ว (ลิงก์มีอายุ 1 ชั่วโมง)',
      resetLink,
      accountName: req.session ? req.session.accountName : null
    });
  } catch (error) {
    return next(error);
  }
}

// แสดงหน้าตั้งรหัสผ่านใหม่ (GET /reset-password)
async function showResetPassword(req, res, next) {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';

  if (!token) {
    return res.render('pages/reset-password', {
      title: 'ตั้งรหัสผ่านใหม่ | FreelanceHub',
      invalidToken: true,
      token: '',
      errors: {},
      accountName: req.session ? req.session.accountName : null
    });
  }

  try {
    const tokenRecord = await findPasswordResetToken(token);

    if (!tokenRecord) {
      return res.render('pages/reset-password', {
        title: 'ตั้งรหัสผ่านใหม่ | FreelanceHub',
        invalidToken: true,
        token: '',
        errors: {},
        accountName: req.session ? req.session.accountName : null
      });
    }

    return res.render('pages/reset-password', {
      title: 'ตั้งรหัสผ่านใหม่ | FreelanceHub',
      invalidToken: false,
      token,
      email: tokenRecord.email,
      errors: {},
      accountName: req.session ? req.session.accountName : null
    });
  } catch (error) {
    return next(error);
  }
}

// บันทึกรหัสผ่านใหม่ (POST /reset-password)
async function handleResetPassword(req, res, next) {
  const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const confirmPassword = typeof req.body.confirmPassword === 'string' ? req.body.confirmPassword : '';
  const errors = {};

  if (!password) {
    errors.password = 'กรุณากรอกรหัสผ่านใหม่';
  } else if (password.length < 8) {
    errors.password = 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
  } else if (Buffer.byteLength(password, 'utf8') > 72) {
    errors.password = 'รหัสผ่านยาวเกินขีดจำกัดความปลอดภัย';
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = 'รหัสผ่านไม่ตรงกัน';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).render('pages/reset-password', {
      title: 'ตั้งรหัสผ่านใหม่ | FreelanceHub',
      invalidToken: false,
      token,
      errors,
      accountName: req.session ? req.session.accountName : null
    });
  }

  try {
    const tokenRecord = await findPasswordResetToken(token);

    if (!tokenRecord) {
      return res.render('pages/reset-password', {
        title: 'ตั้งรหัสผ่านใหม่ | FreelanceHub',
        invalidToken: true,
        token: '',
        errors: {},
        accountName: req.session ? req.session.accountName : null
      });
    }

    await updatePasswordByEmail(tokenRecord.email, password);
    await deletePasswordResetToken(token);

    return res.redirect('/login?reset_success=1');
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  showForgotPassword,
  sendResetLink,
  showResetPassword,
  handleResetPassword
};
