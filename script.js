const jobs = [ 
    { 
        id: 1, 
        title: "Frontend Developer", 
        category: "Web Development", 
        budget: 15000, 
        location: "Remote", 
        description: "Frontend Job Details" 
    }, 
    { 
        id: 2, 
        title: "UI Designer", 
        category: "Design", 
        budget: 8000, 
        location: "Remote", 
        description: "UI Job Details" 
    }, 
    { 
        id: 3, 
        title: "Backend Developer", 
        category: "Web Development", 
        budget: 20000, 
        location: "Bangkok", 
        description: "Backend Job Details" 
    }, 
    { 
        id: 4, 
        title: "Full Stack", 
        category: "Web Development", 
        budget: 30000, 
        location: "Bangkok", 
        description: "FullStack Job Details" 
    }, 
    { 
        id: 5, 
        title: "Android", 
        category: "Android", 
        budget: 6000, 
        location: "หนองคาย", 
        description: "Android Job Details" 
    }, 
    { 
        id: 6, 
        title: "Data Analyst", 
        category: "java", 
        budget: 6500, 
        location: "หนองคาย", 
        description: "DataAnalyst Job Details" 
    }, 
    { 
        id: 7, 
        title: "Data Engineer", 
        category: "c#", 
        budget: 40000, 
        location: "อุดร", 
        description: "DataEngineer Job Details" 
    }, 
    { 
        id: 8, 
        title: "DevOps", 
        category: "python", 
        budget: 40000, 
        location: "ภูเก็ต", 
        description: "DevOps Job Details" 
    } 
 
 
]; 
//ดึง Element จาก HTML  
const searchInput = document.getElementById("search-input"); 
const jobList = document.getElementById("job-list"); 
const categorySelect = document.getElementById("categories"); 
const budgetSelect = document.getElementById("budgetfilter"); 
const jobDetail = document.getElementById("job-detail"); 
 
 
const jobForm = document.getElementById("job-form"); 
const titleInput = document.getElementById("job-title"); 
const categoryInput = document.getElementById("job-category"); 
const budgetInput = document.getElementById("job-budget"); 
const locationInput = document.getElementById("job-location"); 
const descriptionInput = document.getElementById("job-description"); 
 
function renderJobs(jobArray) { 
    if (jobArray.length === 0) { 
        jobList.innerHTML = "<p>ไม่พบข้อมูลงาน</p>"; 
        return; 
    } 
    
    const jobCards = jobArray.map(job => {
         return `
            <div> 
                <h2>"${job.title}"</h2> 
                <p>Category: "${job.category}"</p> 
                <p>Budget: "${job.budget}" บาท</p> 
                <p>Location: "${job.location}"</p> 
                <button data-job-id="${job.id}" >View Details</button> 
            </div> 
            `}); 
            jobList.innerHTML = jobCards.join(""); 
        }
 
function filterJobs() { 
    // อ่านค่าปัจจุบันจากตัวกรองทั้งสาม 
    const searchText = searchInput.value.trim().toLowerCase(); 
    const selectedCategory = categorySelect.value.toLowerCase(); 
    const selectedBudget = budgetSelect.value; 
 
    //  กรองงานโดยตรวจสอบทุกเงื่อนไข 
    const filteredJobs = jobs.filter(job => { 
        // ค้นหาจากชื่องานหรือหมวดหมู่ 
        const matchesSearch = 
            job.title.toLowerCase().includes(searchText) || 
            job.category.toLowerCase().includes(searchText); 
 
        // ตรวจสอบหมวดหมู่ 
        const matchesCategory = 
            selectedCategory === "all" || 
            job.category.toLowerCase() === selectedCategory; 
 
        // ตรวจสอบงบประมาณ 
        let matchesBudget = false; 
 
        if (selectedBudget === "All") { 
            matchesBudget = true; 
        } else if (selectedBudget === "under10k") { 
            matchesBudget = job.budget < 10000; 
        } else if (selectedBudget === "10to20k") { 
            matchesBudget = 
                job.budget >= 10000 && job.budget <= 20000; 
        } else if (selectedBudget === "over20k") { 
            matchesBudget = job.budget > 20000; 
        } 
 
        // ต้องผ่านทั้งสามกลุ่มเงื่อนไข 
        return matchesSearch && matchesCategory && matchesBudget; 
    }); 
 
    // แสดงเฉพาะงานที่ผ่านเงื่อนไข 
    renderJobs(filteredJobs); 
} 
 
// ค้นหาเมื่อผู้ใช้พิมพ์ 
searchInput.addEventListener("input", filterJobs); 
 
// กรองใหม่เมื่อเปลี่ยนหมวดหมู่ 
categorySelect.addEventListener("change", filterJobs); 
 
// กรองใหม่เมื่อเปลี่ยนงบประมาณ 
budgetSelect.addEventListener("change", filterJobs); 
 
// แสดงงานครั้งแรก 
filterJobs(); 
 
jobList.addEventListener("click", (event) => { 
     
    const button = event.target.closest("button[data-job-id]"); 
     
    if (button) { 
        const clickedId = Number(button.dataset.jobId); 
        const selectedJob = jobs.find(job => job.id === clickedId); 
         
        if(selectedJob){ 
            jobDetail.innerHTML = ` 
                <h2>รายละเอียดงาน</h2> 
                <p><strong>ตำแหน่ง:</strong> ${selectedJob.title}</p> 
                <p><strong>ประเภท:</strong> ${selectedJob.category}</p> 
                <p><strong>งบประมาณ:</strong> ${selectedJob.budget} บาท</p> 
                <p><strong>สถานที่:</strong> ${selectedJob.location}</p> 
                <p><strong>รายละเอียด:</strong> ${selectedJob.description}</p> 
            `; 
        }else { 
            jobDetail.innerHTML = "<p>ไม่พบข้อมูลงาน</p>"; 
        } 
} 
}); 
 
// เพิ่มงานใหม่
jobForm.addEventListener("submit", (event) => { 
     
    event.preventDefault(); 
 
    const newtitle = titleInput.value.trim(); 
    const newcategory = categoryInput.value.trim(); 
    const newbudget = budgetInput.value.trim(); 
    const newlocation = locationInput.value.trim(); 
    const newdescription = descriptionInput.value.trim(); 
 
    if (!newtitle){ 
        alert("กรุณากรอกตำแหน่งงาน"); 
        return; 
    } 
 
    if(!newcategory){ 
        alert("กรุณากรอกประเภทงาน"); 
        return; 
    } 
 
    if(!newbudget) { 
        alert("กรุณากรอกงบประมาณ"); 
        return; 
    } 
 
    const budgetNum = Number(newbudget); 
 
    if (isNaN(budgetNum) || budgetNum <= 0){ 
        alert("กรุณากรอกงบประมาณให้ถูกต้อง"); 
        return; 
    } 
 
    if(!newlocation){ 
        alert("กรุณากรอกสถานที่"); 
        return; 
    } 
 
    if(!newdescription){ 
        alert("กรุณากรอกรายละเอียดงาน"); 
        return; 
    } 
 

const newId = jobs.length > 0 ? Math.max(...jobs.map(j => j.id)) + 1 : 1; 
   const newJobDate = { 
        id: newId, 
        title: newtitle, 
        category: newcategory, 
        budget: budgetNum, 
        location: newlocation, 
        description: newdescription 
    }; 
  
    jobs.push(newJobDate); 
    renderJobs(jobs); 
    jobForm.reset(); 
 
});