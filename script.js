const jobs = [
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

// เก็บ ID ของงานที่กำลังแก้ไข
let editJobId = null;


// ฟังก์ชันสำหรับแสดงรายการงาน
function renderJobs(jobArray) {
    jobList.innerHTML = "";

    if (jobArray.length === 0) {
        jobList.innerHTML = "<p>ไม่พบงานที่ตรงกับเงื่อนไข</p>";
        return;
    }

    jobArray.forEach((job) => {
        const jobCard = document.createElement("div");

        jobCard.className = "job-card";

        jobCard.innerHTML = `
            <h3>${job.title}</h3>
            <p>หมวดหมู่: ${job.category}</p>
            <p>งบประมาณ: ${job.budget.toLocaleString()} บาท</p>
            <p>สถานที่: ${job.location}</p>

            <button
                type="button"
                class="view-details"
                data-job-id="${job.id}">View Details</button>

            <button
                type="button"
                class="edit-job"
                data-job-id="${job.id}">Edit</button>

            <button
                type="button"
                class="delete-job"
                data-job-id="${job.id}">Delete</button>
        `;

        jobList.appendChild(jobCard);
    });
}


// ฟังก์ชันสำหรับกรองงานตามเงื่อนไขค้นหาและตัวกรอง
function filterJobs() {
    const searchText = searchInput.value.trim().toLowerCase();
    const selectedCategory = categorySelect.value.toLowerCase();
    const selectedBudget = budgetSelect.value;

    const filteredJobs = jobs.filter((job) => {
        const matchesSearch =
            job.title.toLowerCase().includes(searchText) ||
            job.category.toLowerCase().includes(searchText);

        const matchesCategory =
            selectedCategory === "all" ||
            job.category.toLowerCase() === selectedCategory;

        let matchesBudget = true;

        if (selectedBudget === "under10k") {
            matchesBudget = job.budget < 10000;
        } else if (selectedBudget === "10to20k") {
            matchesBudget =
                job.budget >= 10000 && job.budget <= 20000;
        } else if (selectedBudget === "over20k") {
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
    const button = event.target.closest("button.view-details");

    if (!button) return;

    const clickedId = Number(button.dataset.jobId);
    const selectedJob = jobs.find((job) => job.id === clickedId);

    if (!selectedJob) return;

    jobDetail.innerHTML = `
        <h2>${selectedJob.title}</h2>
        <p>หมวดหมู่: ${selectedJob.category}</p>
        <p>งบประมาณ: ${selectedJob.budget.toLocaleString()} บาท</p>
        <p>สถานที่: ${selectedJob.location}</p>
        <p>รายละเอียด: ${selectedJob.description}</p>
    `;
});


// UPDATE: เลือกงานแล้วนำข้อมูลใส่ในฟอร์ม
jobList.addEventListener("click", (event) => {
    const button = event.target.closest("button.edit-job");

    if (!button) return;

    const clickedId = Number(button.dataset.jobId);
    const selectedJob = jobs.find((job) => job.id === clickedId);

    if (!selectedJob) return;

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


// DELETE: ลบงาน
jobList.addEventListener("click", (event) => {
    const button = event.target.closest("button.delete-job");

    if (!button) return;

    const clickedId = Number(button.dataset.jobId);
    const selectedJob = jobs.find((job) => job.id === clickedId);

    if (!selectedJob) return;

    const confirmed = confirm(
        `ต้องการลบงาน "${selectedJob.title}" ใช่หรือไม่?`
    );

    if (!confirmed) return;

    // ลบเฉพาะงานที่มี ID ตรงกับงานที่เลือก
    const jobIndex = jobs.findIndex((job) => job.id === clickedId);

    if (jobIndex === -1) return;

    jobs.splice(jobIndex, 1);

    // ถ้ากำลังแก้ไขงานที่ถูกลบ ให้ล้างฟอร์ม
    if (editJobId === clickedId) {
        editJobId = null;
        jobForm.reset();

        formTitle.textContent = "เพิ่มงานใหม่";
        submitBtn.textContent = "เพิ่มงาน";
    }

    // ล้างรายละเอียด ถ้ากำลังแสดงงานที่ถูกลบ
    jobDetail.innerHTML = "";

    filterJobs();

    alert("ลบงานเรียบร้อยแล้ว");
});


// CREATE + UPDATE: เพิ่มงานใหม่หรือบันทึกการแก้ไข
jobForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const newtitle = titleInput.value.trim();
    const newcategory = categoryInput.value.trim();
    const newbudget = budgetInput.value.trim();
    const newlocation = locationInput.value.trim();
    const newdescription = descriptionInput.value.trim();

    // ตรวจสอบข้อมูลที่จำเป็น
    if (
        !newtitle ||
        !newcategory ||
        !newbudget ||
        !newlocation ||
        !newdescription
    ) {
        alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
        return;
    }

    const budgetNum = Number(newbudget);

    if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
        alert("งบประมาณต้องเป็นตัวเลขที่มากกว่า 0");
        return;
    }

    // UPDATE: ถ้ามี editJobId ให้แก้ไขงานเดิม
    if (editJobId !== null) {
        const jobIndex = jobs.findIndex(
            (job) => job.id === editJobId
        );

        if (jobIndex === -1) {
            alert("ไม่พบงานที่ต้องการแก้ไข");
            editJobId = null;
            return;
        }

        jobs[jobIndex] = {
            ...jobs[jobIndex],
            title: newtitle,
            category: newcategory,
            budget: budgetNum,
            location: newlocation,
            description: newdescription
        };

        alert("แก้ไขงานเรียบร้อยแล้ว");

    } else {
        // CREATE: สร้าง ID ใหม่โดยไม่ซ้ำกับงานเดิม
        const newId = jobs.reduce(
            (maxId, job) => Math.max(maxId, job.id),
            0
        ) + 1;

        const newJobData = {
            id: newId,
            title: newtitle,
            category: newcategory,
            budget: budgetNum,
            location: newlocation,
            description: newdescription
        };

        jobs.push(newJobData);

        alert("เพิ่มงานเรียบร้อยแล้ว");
    }

    // กลับสู่โหมดเพิ่มงาน
    editJobId = null;

    jobForm.reset();

    formTitle.textContent = "เพิ่มงานใหม่";
    submitBtn.textContent = "เพิ่มงาน";

    jobDetail.innerHTML = "";

    // แสดงรายการล่าสุดตามเงื่อนไขค้นหาและตัวกรอง
    filterJobs();
});

// แสดงงานเมื่อเปิดหน้าเว็บครั้งแรก
filterJobs();