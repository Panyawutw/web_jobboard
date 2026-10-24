"use strict";

// ==========================================
// [FRONTEND] การเชื่อมต่อ Firebase Authentication บนหน้าเว็บ
// ==========================================
// โค้ดส่วนนี้ทำงานบนเบราว์เซอร์ของผู้ใช้งาน (Client-side)
// มีหน้าที่:
// 1. เชื่อมต่อกับ Firebase SDK บนหน้าบ้าน
// 2. แสดงหน้าต่าง Popup สำหรับเข้าสู่ระบบผ่าน Google และ GitHub
// 3. รับ ID Token จาก Firebase ส่งต่อไปยัง Backend เพื่อบันทึก Session และข้อมูลผู้ใช้

// ข้อมูลการตั้งค่า Firebase ที่ได้จาก Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBeDmz8m-_c6tnZUMxb5YrR5-uDbP7KKIc",
  authDomain: "auth-871bd.firebaseapp.com",
  projectId: "auth-871bd",
  storageBucket: "auth-871bd.firebasestorage.app",
  messagingSenderId: "934009136060",
  appId: "1:934009136060:web:3a20c2d06041fb3fe581b9",
  measurementId: "G-ZEVV9XQETX"
};

// 1. เริ่มต้นระบบ Firebase บนเบราว์เซอร์
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
}

// 2. สร้าง Provider สำหรับ Google และ GitHub
const auth = typeof firebase !== 'undefined' ? firebase.auth() : null;
const googleProvider = typeof firebase !== 'undefined' ? new firebase.auth.GoogleAuthProvider() : null;
const githubProvider = typeof firebase !== 'undefined' ? new firebase.auth.GithubAuthProvider() : null;

if (googleProvider) {
  googleProvider.addScope('profile');
  googleProvider.addScope('email');
}

if (githubProvider) {
  githubProvider.addScope('user:email');
}

// 3. ฟังก์ชันหลักสำหรับเรียกหน้าต่าง Popup เข้าสู่ระบบ (Google / GitHub)
async function loginWithFirebase(providerName, targetRole = 'jobSeeker') {
  if (!auth) {
    alert('ระบบ Firebase ยังไม่พร้อมใช้งาน กรุณารีเฟรชหน้าเว็บอีกครั้ง');
    return;
  }

  const provider = providerName === 'google' ? googleProvider : githubProvider;

  try {
    // 3.1 เปิดหน้าต่าง Popup ของ Google หรือ GitHub ให้ผู้ใช้ยืนยันตัวตน
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    // 3.2 ดึง Firebase ID Token จากผลลัพธ์
    const idToken = await user.getIdToken();

    // 3.3 ส่ง ID Token และ Role ไปยัง Backend Node.js
    const response = await fetch('/api/auth/firebase-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idToken,
        role: targetRole
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // 3.4 เข้าสู่ระบบสำเร็จ ย้ายไปยังหน้าแรก
      window.location.href = data.redirectUrl || '/';
    } else {
      alert(data.message || 'การเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  } catch (error) {
    console.error('// [FRONTEND] Firebase Auth Error:', error);
    if (error.code === 'auth/popup-closed-by-user') {
      // ผู้ใช้กดยกเลิกหรือปิด Popup เอง ไม่ต้องแจ้งเตือนข้อผิดพลาด
      return;
    }
    if (error.code === 'auth/account-exists-with-different-credential') {
      alert('อีเมลนี้เคยลงทะเบียนไว้ด้วยอีกช่องทางหนึ่งแล้ว กรุณาเข้าสู่ระบบด้วยช่องทางเดิม');
      return;
    }
    alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + (error.message || error.code));
  }
}

// 4. ผูกการทำงานเข้ากับปุ่ม Google และ GitHub บนหน้าจออัตโนมัติ
document.addEventListener('DOMContentLoaded', () => {
  // ตรวจสอบว่าอยู่ในหน้าสมัครสมาชิกสำหรับบริษัทหรือไม่
  const isCompanyRegister = window.location.search.includes('role=company');
  const userRole = isCompanyRegister ? 'company' : 'jobSeeker';

  // ค้นหาปุ่ม Google (ทั้งในหน้า Login และ Register)
  const googleButtons = document.querySelectorAll('a[href*="/auth/google"], .btn-google');
  googleButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      loginWithFirebase('google', userRole);
    });
  });

  // ค้นหาปุ่ม GitHub (ทั้งในหน้า Login และ Register)
  const githubButtons = document.querySelectorAll('a[href*="/auth/github"], .btn-github');
  githubButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      loginWithFirebase('github', userRole);
    });
  });

  // ผูกการทำงานเมื่อกดปุ่ม "ออกจากระบบ" ให้ Sign Out ออกจาก Firebase ด้วย
  const logoutForms = document.querySelectorAll('form[action="/logout"]');
  logoutForms.forEach((form) => {
    form.addEventListener('submit', async () => {
      try {
        if (auth) {
          await auth.signOut();
        }
      } catch (err) {
        console.warn('Firebase SignOut Warning:', err);
      }
    });
  });
});
