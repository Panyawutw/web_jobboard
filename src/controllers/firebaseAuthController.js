"use strict";

// ==========================================
// [BACKEND] ตัวจัดการการเข้าสู่ระบบด้วย Firebase
// ==========================================
// Controller นี้ทำหน้าที่:
// 1. รับ ID Token จากหน้าบ้าน (Frontend)
// 2. ตรวจสอบ Token ผ่าน Firebase Admin SDK
// 3. ดึงข้อมูลผู้ใช้ (อีเมล, ชื่อ, รูปภาพ, ผู้ให้บริการล็อกอิน)
// 4. บันทึกหรือค้นหาบัญชีในฐานข้อมูล PostgreSQL (accounts, job_seekers, companies)
// 5. บันทึก Express Session ให้ผู้ใช้เข้าสู่ระบบหน้าเว็บได้ทันที

const { auth } = require('../config/firebaseAdmin');
const { findOrCreateOAuthAccount } = require('../models/accountModel');

// ฟังก์ชันประมวลผลเมื่อผู้ใช้ล็อกอินสำเร็จจาก Firebase ที่หน้าบ้าน
async function firebaseLogin(req, res, next) {
  try {
    const { idToken, role } = req.body;

    // 1. ตรวจสอบว่าส่ง ID Token มาหรือไม่
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบ ID Token กรุณาลองใหม่อีกครั้ง'
      });
    }

    // 2. ตรวจสอบความถูกต้องของ Token กับระบบ Firebase Admin
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (verifyError) {
      console.error('// [BACKEND] Firebase ID Token Verification Failed:', verifyError.message);
      return res.status(401).json({
        success: false,
        message: 'การตรวจสอบสิทธิ์กับ Firebase ล้มเหลว หรือ Token หมดอายุ'
      });
    }

    // 3. สกัดข้อมูลบัญชีจาก Decoded Token
    const uid = decodedToken.uid;
    const signInProvider = decodedToken.firebase ? decodedToken.firebase.sign_in_provider : 'firebase';
    const email = decodedToken.email || `${signInProvider.replace('.com', '')}_${uid}@oauth.local`;
    const name = decodedToken.name || email.split('@')[0];

    // แปลงชื่อ Provider: 'google.com' -> 'google', 'github.com' -> 'github'
    let provider = 'google';
    if (signInProvider === 'github.com') {
      provider = 'github';
    } else if (signInProvider === 'google.com') {
      provider = 'google';
    }

    // กำหนดประเภทบทบาท (role): 'jobSeeker' หรือ 'company'
    const targetRole = role === 'company' ? 'company' : 'jobSeeker';

    // 4. ค้นหาหรือสร้างผู้ใช้ใหม่ใน PostgreSQL (ใช้โมเดลเดิมที่มีอยู่)
    const account = await findOrCreateOAuthAccount({
      provider,
      providerId: uid,
      email,
      name,
      role: targetRole
    });

    // 5. บันทึก Express Session เพื่อให้หน้าเว็บรับรู้สถานะการเข้าสู่ระบบ
    if (req.session) {
      req.session.accountId = account.id;
      req.session.accountRole = account.role;
      req.session.accountName = account.name;
      req.session.email = account.email;

      req.session.save((saveError) => {
        if (saveError) {
          console.error('// [BACKEND] Session save error:', saveError);
          return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการบันทึก Session'
          });
        }

        // ส่งผลลัพธ์พร้อม URL สำหรับเปลี่ยนหน้า (Redirect)
        return res.json({
          success: true,
          message: 'เข้าสู่ระบบด้วย Firebase สำเร็จ',
          redirectUrl: '/'
        });
      });
    } else {
      return res.json({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        redirectUrl: '/'
      });
    }
  } catch (error) {
    console.error('// [BACKEND] Firebase login controller error:', error);
    const databaseUnavailable = ['28P01', '42P01', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code);
    return res.status(500).json({
      success: false,
      message: databaseUnavailable
        ? 'ระบบฐานข้อมูลยังไม่พร้อม กรุณาตรวจสอบการตั้งค่า PostgreSQL ในไฟล์ .env'
        : 'เกิดข้อผิดพลาดในการประมวลผลบนเซิร์ฟเวอร์'
    });
  }
}

module.exports = {
  firebaseLogin
};
