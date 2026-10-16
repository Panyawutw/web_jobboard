"use strict";

//ดึง Element จาก HTML  
const searchInput = document.getElementById("search-input"); 
const jobList = document.getElementById("job-list"); 
const categorySelect = document.getElementById("categories"); 
const budgetSelect = document.getElementById("budgetfilter"); 
const jobDetail = document.getElementById("job-detail"); 
 
// ดึง Element ของฟอร์มและอินพุตสำหรับเพิ่มงานใหม่ 
const jobForm = document.getElementById("job-form"); 
const titleInput = document.getElementById("job-title"); 
const categoryInput = document.getElementById("job-category"); 
const budgetInput = document.getElementById("job-budget"); 
const locationInput = document.getElementById("job-location"); 
const descriptionInput = document.getElementById("job-description"); 

const formTitle = document.getElementById("form-title");
const submitBtn = jobForm.querySelector("button[type='submit']");
const resetFormBtn = document.getElementById("reset-form");

let jobs = []; // Array สำหรับเก็บข้อมูลงาน
let editJobId = null; // เก็บ ID ของงานที่กำลังแก้ไข
let isSaving = false; // ป้องกันการกด submit ซ้ำ


async function apiRequest(url, options = {}){

    let response;

    try {
        response = await fetch(url, {
            ...options,
            headers: {
                ...(options.body
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...options.headers
            }
        });    
    } catch (error) {
        throw new Error(
            "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่า Node.js กำลังทำงาน"
        );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.error || `เกิดข้อผิดพลาด HTTP ${response.status}`
        );
    }

    return data;

}

// ฟังก์ชันสำหรับป้องกัน Cross Site Scripting (XSS)
function escapeHTML(value) {
    const entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return String(value).replace(/[&<>"']/g, (character) => {
        return entities[character];
    });
}

function showError(message) {
    jobList.textContent = "";

    const errorMessage = document.createElement('p');
    errorMessage.setAttribute('role','alert');
    errorMessage.textContent = message;

    jobList.appendChild(errorMessage);
}

// ฟังก์ชันสำหรับแสดงรายการงาน
function renderJobs(jobArray) {
   
    if (jobArray.length === 0) {
        jobList.innerHTML = "<p>ไม่พบงานที่ตรงกับเงื่อนไข</p>";
        return;
    }

    jobList.innerHTML = jobArray.map((job) => `
        <div class="job-card">
            <h3>${escapeHTML(job.title)}</h3>
            <p>หมวดหมู่: ${escapeHTML(job.category)}</p>
            <p>งบประมาณ: ${job.budget.toLocaleString()} บาท</p>
            <p>สถานที่: ${escapeHTML(job.location)}</p>
            
            <button
                type="button" 
                class="view-details" 
                data-job-id="${job.id}">
                ดูรายละเอียด
            </button>

            <button 
                type="button" 
                class="edit-job" 
                data-job-id="${job.id}">
                แก้ไข
            </button>

            <button 
                type="button" 
                class="delete-job" 
                data-job-id="${job.id}">
                ลบ
            </button>
        </div>
    `).join("");
}

async function loadJobs() {
    jobList.textContent = "กำลังโหลดรายการงาน...";

    try {
        jobs = await apiRequest('/api/jobs');
        filterJobs();
    } catch (error) {
        showError(error.message);
    }
}

// ฟังก์ชันสำหรับกรองงานตามเงื่อนไขค้นหาและตัวกรอง
function filterJobs() {
    const searchText = searchInput.value.trim().toLowerCase();
    const selectedCategory = categorySelect.value.toLowerCase();
    const selectedBudget = budgetSelect.value;

    const filteredJobs = jobs.filter((job) => {
        const title = job.title.toLowerCase();
        const category = job.category.toLowerCase();

        const matchesSearch = 
        title.includes(searchText) || 
        category.includes(searchText);

        const matchesCategory =
        selectedCategory === "all" || 
        category === selectedCategory;

        let matchesBudget = true;

        if(selectedBudget === "under10k") {
            matchesBudget = job.budget < 10000;
        } else if(selectedBudget === "10to20k") {
            matchesBudget = 
            job.budget >= 10000 && 
            job.budget <= 20000;
        }else if(selectedBudget === "over20k") {
            matchesBudget = job.budget > 20000;
        }

        return matchesSearch && matchesCategory && matchesBudget;

    });
    renderJobs(filteredJobs);
}

// เพิ่ม Event Listener สำหรับการค้นหาและตัวกรอง
searchInput.addEventListener("input", filterJobs);
categorySelect.addEventListener("change", filterJobs);
budgetSelect.addEventListener("change", filterJobs);

// VIEW: แสดงรายละเอียดงาน
jobList.addEventListener("click", async (event) => {
    const button = event.target.closest(".view-details");

    if (!button) return;

    const clickedId = Number(button.dataset.jobId);
    jobDetail.textContent = "กำลังโหลดรายละเอียด...";

    try {
        const job =await apiRequest(`/api/jobs/${clickedId}`);

    jobDetail.innerHTML = `
            <h3>${escapeHTML(job.title)}</h3>
            <p>หมวดหมู่: ${escapeHTML(job.category)}</p>
            <p>งบประมาณ: ${job.budget.toLocaleString()} บาท</p>
            <p>สถานที่: ${escapeHTML(job.location)}</p>
            <p>รายละเอียด: ${escapeHTML(job.description)}</p>
        `;
    } catch (error) {
        jobDetail.textContent = error.message;
    }
});

// UPDATE: เลือกงานแล้วนำข้อมูลใส่ในฟอร์ม
jobList.addEventListener("click", async (event) => {
    const button = event.target.closest(".edit-job");

    if (!button) return;

    const clickedId = Number(button.dataset.jobId);
    

     try {
        const job = await apiRequest(`/api/jobs/${clickedId}`);

        editJobId = job.id;

        titleInput.value = job.title;
        categoryInput.value = job.category;
        budgetInput.value = job.budget;
        locationInput.value = job.location;
        descriptionInput.value = job.description;

        formTitle.textContent = "แก้ไขงาน";
        submitBtn.textContent = "บันทึกการแก้ไข";

        jobForm.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    } catch (error) {
        alert(error.message);
    }
});

// ฟังก์ชันสำหรับรีเซ็ตฟอร์มและกลับสู่โหมดเพิ่มงานใหม่
function resetJobForm() {
    jobForm.reset();
    editJobId = null;
    formTitle.textContent = "เพิ่มงานใหม่";
    submitBtn.textContent = "เพิ่มงาน";
    submitBtn.disabled = false;
    isSaving = false;
}

resetFormBtn.addEventListener('click',(event) => {
    event.preventDefault();
    resetJobForm();
});

// ฟังก์ชันสำหรับตรวจสอบความถูกต้องของข้อมูลฟอร์ม
function validateForm(data) {
    if (
        !data.title ||
        !data.category ||
        !data.budget ||
        !data.location ||
        !data.description
    ) {
        return "กรุณากรอกข้อมูลให้ครบทุกช่อง";
    }
    if(!Number.isFinite(data.budget) || data.budget <= 0) {
        return "งบประมาณต้องเป็นตัวเลขที่มากกว่า 0";
    }
    return null;
    
}



// CREATE + UPDATE: เพิ่มงานใหม่หรือบันทึกการแก้ไข
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
    submitBtn.disabled = true;

    try {
        if (editJobId !== null) {
            // UPDATE
            await apiRequest(`/api/jobs/${editJobId}`, {
                method: "PUT",
                body: JSON.stringify(newJobData)
            });

            alert("แก้ไขงานเรียบร้อยแล้ว");
        } else {
            // CREATE
            await apiRequest("/api/jobs", {
                method: "POST",
                body: JSON.stringify(newJobData)
            });

            alert("เพิ่มงานเรียบร้อยแล้ว");
        }

        resetJobForm();
        jobDetail.innerHTML =
            "<p>เลือก View Details ของงานเพื่อดูรายละเอียด</p>";

        await loadJobs();
    } catch (error) {
        alert(error.message);
    } finally {
        isSaving = false;
        submitBtn.disabled = false;
    }
});

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

    const confirmed = confirm(
        `ต้องการลบงาน "${selectedJob.title}" ใช่หรือไม่?`
    );

    if (!confirmed) return;

    button.disabled = true;

        try {
        await apiRequest(`/api/jobs/${clickedId}`, {
            method: "DELETE"
        });

        if (editJobId === clickedId) {
            resetJobForm();
        }

        jobDetail.innerHTML =
            "<p>เลือก View Details ของงานเพื่อดูรายละเอียด</p>";

        await loadJobs();

        alert("ลบงานเรียบร้อยแล้ว");
    } catch (error) {
        alert(error.message);
        button.disabled = false;
    }
});

// แสดงงานเมื่อเปิดหน้าเว็บครั้งแรก
loadJobs();