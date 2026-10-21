"use strict";

// ข้อมูลตัวอย่างของงาน
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

// ฟังก์ชันตรวจสอบความถูกต้องของข้อมูลงาน
function validateJob(body) {
    // ตรวจสอบว่าข้อมูลที่ส่งมามีชนิดเป็น string และไม่ว่างเปล่า
    const title = typeof body.title === 'string'
        ? body.title.trim()
        : '';
    const category = typeof body.category === 'string'
        ? body.category.trim()
        : '';
    const location = typeof body.location === 'string'
        ? body.location.trim()
        : '';
        const description = typeof body.description === 'string'
        ? body.description.trim()
        : '';

        // ตรวจสอบว่าข้อมูลที่จำเป็นถูกกรอกครบถ้วน
        if (!title || !category || !location || !description) {
            return {
                error: "กรุณากรอกข้อมูลให้ครบถ้วน"
            };
        }
        
        if (
            body.budget === "" ||
            body.budget === null ||
            body.budget === undefined 
        ) {
            return {
                error: "กรุณากรอกงบประมาณ"
            };
        }
            
        const budget = Number(body.budget);

        if (!Number.isInteger(budget) || budget <= 0) {
            return {
                error: "งบประมาณต้องเป็นตัวเลขที่มากกว่า 0"
            };
        }

    return {
        data: {
            title,
            category,
            budget,
            location,
            description
        }
    };
}

// ดึงรายการงานและรองรับการค้นหา/กรองผ่าน Query Parameters
function getAllJobs ({search = '',category = '',minBudget = null,maxBudget = null} = {}) {
    
    return jobs.filter((job) => {
        const matchesSearch =
            job.title.toLowerCase().includes(search) ||
            job.category.toLowerCase().includes(search) ||
            job.location.toLowerCase().includes(search);

        const matchesCategory =
            category === '' ||
            category === 'all' ||
            job.category.toLowerCase() === category;

        const matchesMinBudget =
            minBudget === null ||
            job.budget >= minBudget;

        const matchesMaxBudget =
            maxBudget === null ||
            job.budget <= maxBudget;

        return (
            matchesSearch &&
            matchesCategory &&
            matchesMinBudget &&
            matchesMaxBudget
        );
    });
}

// ฟังก์ชัน ดึงข้อมูลงานตามรหัส
function getJobById(id) {
    return jobs.find(job => job.id === id) || null;
}

// ฟังก์ชัน สร้างงานใหม่
function createJob(jobData) {
    const nextId = jobs.reduce(
        (maxId, job) => Math.max(maxId, (job && job.id) ? job.id : 0), 0
    ) + 1;

    const newJob = {
        id: nextId,
        ...jobData
    };

    jobs.push(newJob);
    return newJob;
}

module.exports = {
    validateJob,
    getAllJobs,
    createJob
};