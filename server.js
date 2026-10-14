const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// แปลง JSON ที่ส่งมาจาก Client ให้เป็น JavaScript object
app.use(express.json());

// กำหนดเส้นทางสำหรับไฟล์ static (เช่น HTML, CSS, JS) ในโฟลเดอร์ 'public'
app.use(express.static(path.join(__dirname, 'public')));

// กำหนดเส้นทางสำหรับ API
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server is running'
    });
});


// ข้อมูลตัวอย่างสำหรับทดลอง API
// ขั้นนี้ยังเก็บข้อมูลไว้ในหน่วยความจำเท่านั้น
const jobs = [
    {
        id: 1,
        title: "Frontend Developer",
        category: "Web Development",
        budget: 15000,
        location: "Remote"
    },
    {
        id: 2,
        title: "UI Designer",
        category: "Design",
        budget: 8000,
        location: "Remote"
    },
    {
        id: 3,
        title: "Backend Developer",
        category: "Web Development",
        budget: 20000,
        location: "Bangkok"
    }
];

app.get('/api/jobs', (req, res) => {
    res.json(jobs);
});

// เริ่มต้นเซิร์ฟเวอร์
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
    