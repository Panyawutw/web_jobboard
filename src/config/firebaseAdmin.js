"use strict";

// ==========================================
// [BACKEND] การตั้งค่า Firebase Admin SDK
// ==========================================
// ไฟล์นี้ทำหน้าที่เริ่มต้นระบบ Firebase Admin สำหรับฝั่ง Backend (Node.js)
// เพื่อใช้ในการตรวจสอบความถูกต้องของ ID Token ที่ส่งมาจากหน้าบ้าน (Frontend)

const fs = require('fs');
const path = require('path');
const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// รหัสโปรเจกต์ Firebase ของคุณ
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'auth-871bd';

// ตำแหน่งไฟล์ Service Account Key (ถ้ามี)
const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

// ตรวจสอบว่าเคยดาวน์โหลด Service Account Key มาไว้หรือไม่
let app;
const apps = getApps();
if (apps.length > 0) {
  app = apps[0];
} else if (fs.existsSync(serviceAccountPath)) {
  // กรณีมีไฟล์ Service Account Key
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: FIREBASE_PROJECT_ID
  });
  console.log('// [BACKEND] Firebase Admin: เริ่มต้นระบบด้วยไฟล์ Service Account สำเร็จ');
} else {
  // กรณีไม่มีไฟล์ Key ให้เริ่มต้นระบบด้วย Project ID (สามารถตรวจสอบ ID Token ได้เช่นกัน)
  app = initializeApp({
    projectId: FIREBASE_PROJECT_ID
  });
  console.log(`// [BACKEND] Firebase Admin: เริ่มต้นระบบด้วย Project ID: ${FIREBASE_PROJECT_ID}`);
}

const auth = getAuth(app);

module.exports = {
  app,
  auth
};
