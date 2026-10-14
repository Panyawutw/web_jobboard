"use strict";

let jobs = [
    {
        id: 1,
        title: "Frontend Developer",
        category: "Web Development",
        budget: 15000,
        location: "Remote",
        description: "พัฒนาเว็บไซต์ส่วน Frontend"
    },
    {
        id: 2,
        title: "UI Designer",
        category: "Design",
        budget: 8000,
        location: "Remote",
        description: "ออกแบบหน้าตาและประสบการณ์การใช้งานเว็บไซต์"
    },
    {
        id: 3,
        title: "Backend Developer",
        category: "Web Development",
        budget: 20000,
        location: "Bangkok",
        description: "พัฒนาระบบ Backend และ API"
    },
    {
        id: 4,
        title: "Full Stack",
        category: "Web Development",
        budget: 30000,
        location: "Bangkok",
        description: "พัฒนาทั้งส่วน Frontend และ Backend"
    },
    {
        id: 5,
        title: "Android",
        category: "Android",
        budget: 6000,
        location: "หนองคาย",
        description: "พัฒนาแอปพลิเคชัน Android"
    },
    {
        id: 6,
        title: "Data Analyst",
        category: "java",
        budget: 6500,
        location: "หนองคาย",
        description: "วิเคราะห์และจัดการข้อมูล"
    },
    {
        id: 7,
        title: "Data Engineer",
        category: "c#",
        budget: 40000,
        location: "อุดร",
        description: "พัฒนาระบบจัดการและประมวลผลข้อมูล"
    },
    {
        id: 8,
        title: "DevOps",
        category: "python",
        budget: 40000,
        location: "ภูเก็ต",
        description: "ดูแลระบบและกระบวนการ Deploy"
    }
]; 

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

// เก็บ ID ของงานที่กำลังแก้ไข
let editJobId = null;

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
jobList.addEventListener("click", (event) => {
    const button = event.target.closest(".view-details");

    if (!button) return;

    const clickedId = Number(button.dataset.jobId);
    const selectedJob = jobs.find((job) => job.id === clickedId);

    if (!selectedJob) {
        jobDetail.textContent = "ไม่พบข้อมูลงานนี้";
        return;
    }

    jobDetail.innerHTML = `
        <h2>${escapeHTML(selectedJob.title)}</h2>
        <p>หมวดหมู่: ${escapeHTML(selectedJob.category)}</p>
        <p>งบประมาณ: ${selectedJob.budget.toLocaleString()} บาท</p>
        <p>สถานที่: ${escapeHTML(selectedJob.location)}</p>
        <p>รายละเอียด: ${escapeHTML(selectedJob.description)}</p>
    `;
});


// UPDATE: เลือกงานแล้วนำข้อมูลใส่ในฟอร์ม
jobList.addEventListener("click", (event) => {
    const button = event.target.closest(".edit-job");

    if (!button) return;

    const clickedId = Number(button.dataset.jobId);
    const selectedJob = jobs.find((job) => job.id === clickedId);

    if (!selectedJob) {
        alert("ไม่พบงานที่ต้องการแก้ไข");
        return;
    }

    editJobId = selectedJob.id;

    titleInput.value = selectedJob.title;
    categoryInput.value = selectedJob.category;
    budgetInput.value = selectedJob.budget;
    locationInput.value = selectedJob.location;
    descriptionInput.value = selectedJob.description;

    formTitle.textContent = "แก้ไขงาน";
    submitBtn.textContent = "บันทึกการแก้ไข";

    jobForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
});

// ฟังก์ชันสำหรับรีเซ็ตฟอร์มและกลับสู่โหมดเพิ่มงานใหม่
function resetJobForm() {
    jobForm.reset();
    editJobId = null;
    formTitle.textContent = "เพิ่มงานใหม่";
    submitBtn.textContent = "เพิ่มงาน";
}

// CREATE + UPDATE: เพิ่มงานใหม่หรือบันทึกการแก้ไข
jobForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const newJobData = {
        title: titleInput.value.trim(),
        category: categoryInput.value.trim(),
        budget: Number(budgetInput.value),
        location: locationInput.value.trim(),
        description: descriptionInput.value.trim()
    };

    // ตรวจสอบความถูกต้องของข้อมูลฟอร์ม
    const validationError = validateForm({
        ...newJobData,
        budget: budgetInput.value.trim() 
            ? Number(budgetInput.value) 
            : NaN
    });

    if(validationError) {
        alert(validationError);
        return;
    }

    // ตรวจสอบว่ากำลังแก้ไขงานหรือเพิ่มงานใหม่
    if(editJobId !== null) {
        const editJobId = jobs.findIndex(
            (job) => job.id === editJobId
        );

        if(editJobId === -1) {
            alert("ไม่พบงานที่ต้องการแก้ไข");
            return;
        }

        jobs[editJobId] = {
            ...jobs[editJobId],
            ...newJobData
        };

        alert("แก้ไขงานเรียบร้อยแล้ว");

    } else {

        // สร้าง ID ใหม่โดยหาค่า ID สูงสุดแล้วบวก 1
        const newId = jobs.reduce(
            (maxId, job) => Math.max(maxId, job.id),
             0) + 1;

             jobs.push({
                id: newId,
                ...newJobData
             });

        alert("เพิ่มงานใหม่เรียบร้อยแล้ว");
    }

    // รีเซ็ตฟอร์มและแสดงรายการงานใหม่
    resetJobForm();
    jobDetail.innerHTML = "";
    filterJobs();
});

// DELETE: ลบงาน
jobList.addEventListener("click", (event) => {
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

    // ลบเฉพาะงานที่มี ID ตรงกับงานที่เลือก
    const editJobId = jobs.findIndex((job) => job.id === clickedId);

    if (editJobId === -1) return;

    jobs.splice(editJobId, 1);

    // ถ้ากำลังแก้ไขงานที่ถูกลบ ให้ล้างฟอร์ม
    if (editJobId === clickedId) {
        resetJobForm();
    }

    // ล้างรายละเอียด ถ้ากำลังแสดงงานที่ถูกลบ
    jobDetail.innerHTML = "<p>เลือก View Details ของงานดพื่อดูรายละเอียด</p>";

    filterJobs();

    alert("ลบงานเรียบร้อยแล้ว");
});

// แสดงงานเมื่อเปิดหน้าเว็บครั้งแรก
filterJobs();