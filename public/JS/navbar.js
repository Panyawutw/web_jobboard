"use strict";

// จัดการการเปิด-ปิดเมนู Navbar สำหรับหน้าจอมือถือ (Responsive Navbar)
document.addEventListener("DOMContentLoaded", () => {
    const navToggle = document.getElementById('navToggle');
    const navWrapper = document.getElementById('navWrapper');

    if (navToggle && navWrapper) {
        navToggle.addEventListener('click', () => {
            navWrapper.classList.toggle('show');
            navToggle.classList.toggle('open');
        });
    }
});
