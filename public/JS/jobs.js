"use strict";

/**
 * จัดการระบบงาน (Jobs Management)
 * รองรับ: โหลดรายการงาน, ค้นหา/กรอง, ดูรายละเอียด, เพิ่มงาน, แก้ไขงาน, และลบงาน
 */
document.addEventListener("DOMContentLoaded", () => {
    // ดึง Elements สำหรับรายการงานและตัวกรอง
    const searchInput = document.getElementById("search-input");
    const categorySelect = document.getElementById("categories");
    const budgetSelect = document.getElementById("budgetfilter");
    const jobList = document.getElementById("job-list");
    const jobDetail = document.getElementById("job-detail");

    // ดึง Elements สำหรับฟอร์มงาน
    const jobForm = document.getElementById("job-form");
    const titleInput = document.getElementById("job-title");
    const categoryInput = document.getElementById("job-category");
    const budgetInput = document.getElementById("job-budget");
    const locationInput = document.getElementById("job-location");
    const descriptionInput = document.getElementById("job-description");
    const formTitle = document.getElementById("form-title");
    const submitBtn = jobForm ? jobForm.querySelector("button[type='submit']") : null;
    const resetFormBtn = document.getElementById("reset-form");

    // ถ้าหน้านี้ไม่มี jobList แปลว่าไม่ใช่หน้าจัดการงาน ให้จบการทำงาน
    if (!jobList) return;

    let jobs = [];         // Array สำหรับเก็บข้อมูลงาน
    let editJobId = null;  // เก็บ ID ของงานที่กำลังแก้ไข (ถ้ามี)
    let isSaving = false;  // ป้องกันการ submit ซ้ำ

    // แสดงข้อความ Error บนรายการงาน
    function showError(message) {
        jobList.textContent = "";
        const errorMessage = document.createElement('p');
        errorMessage.setAttribute('role', 'alert');
        errorMessage.textContent = message;
        jobList.appendChild(errorMessage);
    }

    // เรนเดอร์การ์ดงาน
    function renderJobs(jobArray) {
        if (!jobArray || jobArray.length === 0) {
            jobList.innerHTML = "<p>ไม่พบงานที่ตรงกับเงื่อนไข</p>";
            return;
        }

        jobList.innerHTML = jobArray.map((job) => `
            <div class="job-card">
                <h3>${escapeHTML(job.title)}</h3>
                <p>หมวดหมู่: ${escapeHTML(job.category)}</p>
                <p>งบประมาณ: ${Number(job.budget).toLocaleString()} บาท</p>
                <p>สถานที่: ${escapeHTML(job.location)}</p>
                
                <button type="button" class="view-details" data-job-id="${job.id}">
                    ดูรายละเอียด
                </button>
                <button type="button" class="edit-job" data-job-id="${job.id}">
                    แก้ไข
                </button>
                <button type="button" class="delete-job" data-job-id="${job.id}">
                    ลบ
                </button>
            </div>
        `).join("");
    }

    // กรองงานตามเงื่อนไขค้นหา หมวดหมู่ และงบประมาณ
    function filterJobs() {
        const searchText = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const selectedCategory = categorySelect ? categorySelect.value.toLowerCase() : 'all';
        const selectedBudget = budgetSelect ? budgetSelect.value : 'all';

        const filteredJobs = jobs.filter((job) => {
            const title = (job.title || '').toLowerCase();
            const category = (job.category || '').toLowerCase();

            const matchesSearch = title.includes(searchText) || category.includes(searchText);
            const matchesCategory = selectedCategory === "all" || category === selectedCategory;

            let matchesBudget = true;
            if (selectedBudget === "under10k") {
                matchesBudget = job.budget < 10000;
            } else if (selectedBudget === "10to20k") {
                matchesBudget = job.budget >= 10000 && job.budget <= 20000;
            } else if (selectedBudget === "over20k") {
                matchesBudget = job.budget > 20000;
            }

            return matchesSearch && matchesCategory && matchesBudget;
        });

        renderJobs(filteredJobs);
    }

    // โหลดรายการงานจาก API
    async function loadJobs() {
        jobList.textContent = "กำลังโหลดรายการงาน...";

        try {
            jobs = await apiRequest('/api/jobs');
            filterJobs();
        } catch (error) {
            showError(error.message);
        }
    }

    // ผูก Event Listener ค้นหาและกรอง
    if (searchInput) searchInput.addEventListener("input", filterJobs);
    if (categorySelect) categorySelect.addEventListener("change", filterJobs);
    if (budgetSelect) budgetSelect.addEventListener("change", filterJobs);

    // VIEW: ดูรายละเอียดงาน
    jobList.addEventListener("click", async (event) => {
        const button = event.target.closest(".view-details");
        if (!button || !jobDetail) return;

        const clickedId = Number(button.dataset.jobId);
        jobDetail.textContent = "กำลังโหลดรายละเอียด...";

        try {
            const job = await apiRequest(`/api/jobs/${clickedId}`);

            jobDetail.innerHTML = `
                <h3>${escapeHTML(job.title)}</h3>
                <p>หมวดหมู่: ${escapeHTML(job.category)}</p>
                <p>งบประมาณ: ${Number(job.budget).toLocaleString()} บาท</p>
                <p>สถานที่: ${escapeHTML(job.location)}</p>
                <p>รายละเอียด: ${escapeHTML(job.description)}</p>
            `;
        } catch (error) {
            jobDetail.textContent = error.message;
        }
    });

    // UPDATE: นำข้อมูลไปใส่ในฟอร์มเพื่อแก้ไข
    jobList.addEventListener("click", async (event) => {
        const button = event.target.closest(".edit-job");
        if (!button || !jobForm) return;

        const clickedId = Number(button.dataset.jobId);

        try {
            const job = await apiRequest(`/api/jobs/${clickedId}`);

            editJobId = job.id;
            titleInput.value = job.title;
            categoryInput.value = job.category;
            budgetInput.value = job.budget;
            locationInput.value = job.location;
            descriptionInput.value = job.description;

            if (formTitle) formTitle.textContent = "แก้ไขงาน";
            if (submitBtn) submitBtn.textContent = "บันทึกการแก้ไข";

            jobForm.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (error) {
            alert(error.message);
        }
    });

    // รีเซ็ตฟอร์ม
    function resetJobForm() {
        if (!jobForm) return;
        jobForm.reset();
        editJobId = null;
        if (formTitle) formTitle.textContent = "เพิ่มงานใหม่";
        if (submitBtn) {
            submitBtn.textContent = "เพิ่มงาน";
            submitBtn.disabled = false;
        }
        isSaving = false;
    }

    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', (event) => {
            event.preventDefault();
            resetJobForm();
        });
    }

    // ตรวจสอบข้อมูลฟอร์ม
    function validateForm(data) {
        if (!data.title || !data.category || !data.budget || !data.location || !data.description) {
            return "กรุณากรอกข้อมูลให้ครบทุกช่อง";
        }
        if (!Number.isFinite(data.budget) || data.budget <= 0) {
            return "งบประมาณต้องเป็นตัวเลขที่มากกว่า 0";
        }
        return null;
    }

    // CREATE & UPDATE: ส่งฟอร์มงาน
    if (jobForm) {
        jobForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (isSaving) return;

            const rawBudget = budgetInput.value.trim();
            const newJobData = {
                title: titleInput.value.trim(),
                category: categoryInput.value.trim(),
                budget: rawBudget === "" ? NaN : Number(rawBudget),
                location: locationInput.value.trim(),
                description: descriptionInput.value.trim()
            };

            const validationError = validateForm(newJobData);
            if (validationError) {
                alert(validationError);
                return;
            }

            isSaving = true;
            if (submitBtn) submitBtn.disabled = true;

            try {
                if (editJobId !== null) {
                    await apiRequest(`/api/jobs/${editJobId}`, {
                        method: "PUT",
                        body: JSON.stringify(newJobData)
                    });
                    alert("แก้ไขงานเรียบร้อยแล้ว");
                } else {
                    await apiRequest("/api/jobs", {
                        method: "POST",
                        body: JSON.stringify(newJobData)
                    });
                    alert("เพิ่มงานเรียบร้อยแล้ว");
                }

                resetJobForm();
                if (jobDetail) {
                    jobDetail.innerHTML = "<p>เลือก View Details ของงานเพื่อดูรายละเอียด</p>";
                }
                await loadJobs();
            } catch (error) {
                alert(error.message);
            } finally {
                isSaving = false;
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // DELETE: ลบงาน
    jobList.addEventListener("click", async (event) => {
        const button = event.target.closest(".delete-job");
        if (!button) return;

        const clickedId = Number(button.dataset.jobId);
        const selectedJob = jobs.find((job) => job.id === clickedId);

        if (!selectedJob) {
            alert("ไม่พบงานที่ต้องการลบ");
            return;
        }

        const confirmed = confirm(`ต้องการลบงาน "${selectedJob.title}" ใช่หรือไม่?`);
        if (!confirmed) return;

        button.disabled = true;

        try {
            await apiRequest(`/api/jobs/${clickedId}`, {
                method: "DELETE"
            });

            if (editJobId === clickedId) {
                resetJobForm();
            }

            if (jobDetail) {
                jobDetail.innerHTML = "<p>เลือก View Details ของงานเพื่อดูรายละเอียด</p>";
            }

            await loadJobs();
            alert("ลบงานเรียบร้อยแล้ว");
        } catch (error) {
            alert(error.message);
            button.disabled = false;
        }
    });

    // เริ่มต้นโหลดงานเมื่อเปิดหน้า
    loadJobs();
});
