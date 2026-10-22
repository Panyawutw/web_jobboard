"use strict";

const registerForm = document.getElementById("register-form");
const registerMessage = document.getElementById("register-message");
const registerButton = document.getElementById("register-btn");

const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("auth-message");
const loginButton = document.getElementById("login-btn");

async function submitAuthRequest(url, payload) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.error || `เกิดข้อผิดพลาด HTTP ${response.status}`);
    }

    return result;
}

if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("register-name").value.trim();
        const email = document.getElementById("register-email").value.trim();
        const password = document.getElementById("register-password").value;
        const role = document.getElementById("register-role").value;

        registerMessage.textContent = "";
        registerMessage.setAttribute("role", "status");
        registerButton.disabled = true;

        try {
            const result = await submitAuthRequest("/api/auth/register", {
                name,
                email,
                password,
                role
            });

            registerMessage.textContent = `${result.message || "สมัครสมาชิกสำเร็จ"} เข้าสู่ระบบได้จากหน้า Login`;
            registerForm.reset();
        } catch (error) {
            registerMessage.textContent = error.message || "สมัครสมาชิกไม่สำเร็จ กรุณาลองอีกครั้ง";
            registerMessage.setAttribute("role", "alert");
        } finally {
            registerButton.disabled = false;
        }
    });
}

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;

        loginMessage.textContent = "";
        loginMessage.setAttribute("role", "status");
        loginButton.disabled = true;

        try {
            const result = await submitAuthRequest("/api/auth/login", { email, password });

            if (!result.token) {
                throw new Error("ไม่ได้รับ Token จากเซิร์ฟเวอร์");
            }

            localStorage.setItem("token", result.token);
            loginMessage.textContent = "เข้าสู่ระบบเรียบร้อย กำลังไปยังหน้าหลัก...";
            window.location.assign("/");
        } catch (error) {
            localStorage.removeItem("token");
            loginMessage.textContent = error.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง";
            loginMessage.setAttribute("role", "alert");
        } finally {
            loginButton.disabled = false;
        }
    });
}
