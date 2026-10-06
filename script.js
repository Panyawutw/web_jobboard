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
//ดึง Element จาก HTML มาเตรียมไว้ใช้งาน
const searchInput = document.getElementById("search-input");
const jobList = document.getElementById("job-list");
const categorySelect = document.getElementById("categories");
const budgetSelect = document.getElementById("budgetfilter");

//ดักจับเหตุการณ์เมื่อผู้ใช้พิมพ์ค้นหา
searchInput.addEventListener("input", () =>{

    const searchText = searchInput.value.toLowerCase(); // อ่านค่าที่ผู้ใช้พิมพ์ปัจจุบัน
    // ค้นหางานที่ชื่อ หรือ หมวดหมู่มีคำค้นหาซ่อนอยู่
    const searchresult = jobs.filter(item => 
        item.title.toLowerCase().includes(searchText) 
        || 
        item.category.toLowerCase().includes(searchText)
    );

    // แปลงข้อมูลงานที่หาเจอ ให้กลายเป็นโครงสร้าง HTML (Card)
    const jobCards = searchresult.map(job => {
        return `
            <div>
                <h2>"${job.title}"</h2>
                <p>Category: "${job.category}"</p>
                <p>Budget: "${job.budget}" บาท</p>
                <p>Location: "${job.location}"</p>
                <button data-job-id="${job.id}" >View Details</button>
            </div>
        `;
    });
    // รวม Card ทั้งหมดเข้าด้วยกัน แล้วพ่นออกไปแสดงผลบนหน้าเว็บ
    jobList.innerHTML = jobCards.join("");
});


// ดักจับการเปลี่ยนตัวเลือกใน Dropdown (Select)
categorySelect.addEventListener("change", () => {

    const selectedCategory = categorySelect.value.toLowerCase();
    let filteredJobs = [];
    if (selectedCategory === "all") {
       filteredJobs = jobs;
} else {
        filteredJobs = jobs.filter(job =>
         job.category.toLowerCase() === selectedCategory
        );
} 
const jobCards = filteredJobs.map(job => {
        return `
            <div>
                <h2>"${job.title}"</h2>
                <p>Category: "${job.category}"</p>
                <p>Budget: "${job.budget}" บาท</p>
                <p>Location: "${job.location}"</p>
                <button data-job-id="${job.id}" >View Details</button>
            </div>
        `;
    });
    
    jobList.innerHTML = jobCards.join("");
});



budgetSelect.addEventListener("change" , () =>{
const selectedBudget = budgetSelect.value;
let filteredJobs = [];

if( selectedBudget === "All"){
    filteredJobs = jobs;
}else if(selectedBudget === "under10k"){
    filteredJobs = jobs.filter( item =>
    item.budget < 10000
    );
}else if(selectedBudget === "10to20k"){
    filteredJobs = jobs.filter( item =>
    item.budget >= 10000 && item.budget <= 20000
    );
}else if(selectedBudget === "over20k"){
    filteredJobs = jobs.filter( item =>
    item.budget > 20000
    );
}

const jobCards = filteredJobs.map( job =>{
    return `
        <div>
            <h2>"${job.title}"</h2>
            <p>Category: "${job.category}"</p>
            <p>Budget: "${job.budget}" บาท</p>
            <p>Location: "${job.location}"</p>
            <button data-job-id="${job.id}" >View Details</button>
        </div>
    `;
});

jobList.innerHTML = jobCards.join("");
});

jobList.addEventListener("click", (event) => {
    
    const button = event.target.closest("button[data-job-id]");
    
    if (button) {
        const clickedId = Number(button.dataset.jobId);
        const selectedJob = jobs.find(job => job.id === clickedId);
        console.log(selectedJob); 
}
});