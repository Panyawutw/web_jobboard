"use strict";

/**
 * ฟังก์ชันกลางสำหรับเรียกใช้งาน API ของระบบ
 * รองรับการส่ง JSON, แนบ Authorization Token อัตโนมัติ และจัดการ Error
 */
async function apiRequest(url, options = {}) {
    let response;
    const token = localStorage.getItem("token");

    const headers = {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        ...options.headers
    };

    try {
        response = await fetch(url, {
            ...options,
            headers
        });
    } catch (error) {
        throw new Error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่า Node.js กำลังทำงาน");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || `เกิดข้อผิดพลาด HTTP ${response.status}`);
    }

    return data;
}

/**
 * ฟังก์ชันสำหรับป้องกัน Cross Site Scripting (XSS)
 * แปลงอักขระพิเศษเป็น HTML Entities ก่อนนำไปแสดงผล
 */
function escapeHTML(value) {
    const entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return String(value ?? '').replace(/[&<>"']/g, (character) => {
        return entities[character];
    });
}
