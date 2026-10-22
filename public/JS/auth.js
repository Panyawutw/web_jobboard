"use strict";

/**
 * จัดการระบบยืนยันตัวตน (Authentication)
 * รองรับ: เข้าสู่ระบบ (Login), ออกจากระบบ (Logout), กู้คืนเซสชัน (Restore Session), และสมัครสมาชิก (Register)
 */
document.addEventListener("DOMContentLoaded", () => {
    // ดึง Elements สำหรับ Login & Session
    const loginForm = document.getElementById("login-form");
    const loginEmailInput = document.getElementById("login-email");
    const loginPasswordInput = document.getElementById("login-password");
    const loginBtn = document.getElementById("login-btn");
    const authMessage = document.getElementById("auth-message");
    const userSession = document.getElementById("user-session");
    const userInfo = document.getElementById("user-info");
    const logoutBtn = document.getElementById("logout-btn");

    // ดึง Elements สำหรับ Register
    const registerForm = document.getElementById("register-form");
    const registerNameInput = document.getElementById("register-name");
    const registerEmailInput = document.getElementById("register-email");
    const registerPasswordInput = document.getElementById("register-password");
    const registerRoleSelect = document.getElementById("register-role");
    const registerBtn = document.getElementById("register-btn");
    const registerMessage = document.getElementById("register-message");

    // ฟังก์ชันแสดงสถานะเมื่อเข้าสู่ระบบแล้ว
    function showLoggedInUser(user) {
        if (loginForm) loginForm.hidden = true;
        if (userSession) userSession.hidden = false;
        if (userInfo) userInfo.textContent = `เข้าสู่ระบบแล้ว: ${user.name} (${user.email}) [${user.role}]`;
        if (authMessage) authMessage.textContent = '';
    }

    // ฟังก์ชันแสดงสถานะเมื่อออกจากระบบ
    function showLoggedOutUser() {
        if (loginForm) loginForm.hidden = false;
        if (userSession) userSession.hidden = true;
        if (userInfo) userInfo.textContent = '';
    }

    // จัดการการส่งฟอร์ม Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = loginEmailInput.value.trim();
            const password = loginPasswordInput.value.trim();

            if (authMessage) authMessage.textContent = '';
            if (loginBtn) loginBtn.disabled = true;

            try {
                const data = await apiRequest('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                if (typeof data.token !== 'string' || !data.token) {
                    throw new Error("ไม่ได้รับ Token จากเซิร์ฟเวอร์");
                }

                localStorage.setItem('token', data.token);
                loginPasswordInput.value = '';

                const meResult = await apiRequest('/api/auth/me');
                showLoggedInUser(meResult.user);

                if (authMessage) {
                    authMessage.textContent = 'เข้าสู่ระบบเรียบร้อยแล้ว';
                    authMessage.style.color = 'green';
                }

                // ถ้าอยู่ในหน้า /login ให้กลับหน้าแรกหลังจากล็อกอิน
                if (window.location.pathname === '/login') {
                    setTimeout(() => { window.location.href = '/'; }, 1000);
                }

            } catch (error) {
                localStorage.removeItem('token');
                showLoggedOutUser();
                if (authMessage) {
                    authMessage.textContent = error.message;
                    authMessage.style.color = 'red';
                }
            } finally {
                if (loginBtn) loginBtn.disabled = false;
            }
        });
    }

    // จัดการปุ่ม Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            if (loginPasswordInput) loginPasswordInput.value = '';
            showLoggedOutUser();
            if (authMessage) {
                authMessage.textContent = 'ออกจากระบบเรียบร้อยแล้ว';
                authMessage.style.color = 'inherit';
            }
        });
    }

    // กู้คืน Session เดิมจาก Token เมื่อโหลดหน้าเว็บ
    async function restoreSession() {
        const token = localStorage.getItem('token');

        if (!token) {
            showLoggedOutUser();
            return;
        }

        if (loginForm) loginForm.hidden = true;
        if (userSession) userSession.hidden = false;
        if (authMessage) authMessage.textContent = 'กำลังกู้คืนเซสชัน...';

        try {
            const meResult = await apiRequest('/api/auth/me');
            showLoggedInUser(meResult.user);
        } catch (error) {
            localStorage.removeItem('token');
            showLoggedOutUser();
            if (authMessage) {
                authMessage.textContent = 'เซสชันหมดอายุ โปรดเข้าสู่ระบบใหม่อีกครั้ง';
                authMessage.style.color = 'red';
            }
        }
    }

    // จัดการการส่งฟอร์ม Register (ถ้ามีฟอร์มในหน้านั้น)
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const name = registerNameInput.value.trim();
            const email = registerEmailInput.value.trim();
            const password = registerPasswordInput.value;
            const role = registerRoleSelect ? registerRoleSelect.value : 'freelancer';

            if (registerMessage) registerMessage.textContent = '';
            if (registerBtn) registerBtn.disabled = true;

            try {
                await apiRequest('/api/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ name, email, password, role })
                });

                if (registerMessage) {
                    registerMessage.textContent = 'สมัครสมาชิกสำเร็จ! กำลังนำท่านไปหน้าเข้าสู่ระบบ...';
                    registerMessage.style.color = 'green';
                }

                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500);

            } catch (error) {
                if (registerMessage) {
                    registerMessage.textContent = error.message;
                    registerMessage.style.color = 'red';
                }
            } finally {
                if (registerBtn) registerBtn.disabled = false;
            }
        });
    }

    // เรียกกู้คืน session ทันทีที่เปิดหน้า
    restoreSession();
});
