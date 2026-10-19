"use strict";

require('dotenv').config();

const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const app = express();

const bcrypt = require('bcrypt');
const pool = require('./db');
const PORT = process.env.PORT || 3000;

// Middleware สำหรับบันทึกเวลาการทำงานของ API
app.use((req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;

        console.log(
            `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
        );
    });

    next();
});

// แปลง JSON ที่ส่งมาจาก Client ให้เป็น JavaScript object
app.use(express.json({ limit: '10mb' }));

// กำหนดเส้นทางสำหรับไฟล์ static (เช่น HTML, CSS, JS) ในโฟลเดอร์ 'public'
app.use(express.static(path.join(__dirname, 'public')));

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

// ตรวจสอบสถานะของเซิร์ฟเวอร์
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server is running'
    });
});

// ตรวจสอบการเชื่อมต่อฐานข้อมูล
app.get('/api/db-health', async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT
                NOW() AS current_time,
                current_database() AS database_name
        `);

        return res.status(200).json({
            status: 'connected',
            database: result.rows[0].database_name,
            currentTime: result.rows[0].current_time
        });
    } catch (error) {
        return next(error);
    }
});

// ตรวจสอบโครงสร้างตาราง jobs และทดสอบอ่านข้อมูลจากฐานข้อมูล
app.get('/api/health/db/structure', async (req, res) => {
    try {

        // ดึงโครงสร้างคอลัมน์ของตาราง jobs
        const columnsResult = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'jobs'
            ORDER BY ordinal_position;
        `);

        // ตรวจสอบว่ามีคอลัมน์ที่ต้องการหรือไม่
        if (columnsResult.rows.length === 0) {
            return res.status(404).json({
                status: 'ERROR',
                message: 'ไม่พบตาราง jobs ในฐานข้อมูล กรุณารัน schema.sql ก่อน'
            });
        }

        // ตรวจสอบว่ามีคอลัมน์ที่ API ต้องใช้มีครบถ้วน
        const requiredColumns = ['id', 'title', 'category', 'budget', 'location', 'description'];
        const existingColumns = columnsResult.rows.map(col => col.column_name);
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

        // ทดสอบอ่านข้อมูลจริงจากฐานข้อมูล
        const sampleJobsResult = await pool.query(
            'SELECT id, title, category, budget, location, description FROM jobs ORDER BY id ASC LIMIT 5'
        );

        return res.status(200).json({
            status: 'OK',
            table: 'jobs',
            columns: columnsResult.rows,
            columnVerification: {
                requiredColumns,
                isComplete: missingColumns.length === 0,
                missingColumns
            },
            sampleCount: sampleJobsResult.rowCount,
            sampleData: sampleJobsResult.rows
        });
    } catch (error) {
        return res.status(500).json({
            status: 'ERROR',
            message: 'ตรวจสอบโครงสร้างฐานข้อมูลล้มเหลว',
            error: error.message
        });
    }
});

// ดึงรายการงานและรองรับการค้นหา/กรองผ่าน Query Parameters
app.get('/api/jobs', (req, res) => {
    const search = String(req.query.search || '')
        .trim()
        .toLowerCase();
    
    const category = String(req.query.category || '')
        .trim()
        .toLowerCase();

    const minBudget = req.query.minBudget === undefined
        ? null
        : Number(req.query.minBudget);

    const maxBudget = req.query.maxBudget === undefined
        ? null
        : Number(req.query.maxBudget);

    // ตรวจสอบงบประมาณที่ส่งมา
    if (
        (minBudget !== null &&
            (!Number.isFinite(minBudget) || minBudget < 0)) ||
        (maxBudget !== null &&
            (!Number.isFinite(maxBudget) || maxBudget < 0))
    ) {
        return res.status(400).json({
            error: 'งบประมาณต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป'
        });
    }

    if (
        minBudget !== null &&
        maxBudget !== null &&
        minBudget > maxBudget
    ) {
        return res.status(400).json({
            error: 'งบประมาณขั้นต่ำต้องไม่มากกว่างบประมาณสูงสุด'
        });
    }
    
    const filteredJobs = jobs.filter((job) => {
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

    res.status(200).json(filteredJobs);
});


// ดึงข้อมูลงานตามรหัส
app.get('/api/jobs/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "รหัสงานต้องเป็นตัวเลขที่มากกว่า 0"
        });
    }

    const job = jobs.find(job => job.id === id);
    
    if (!job) {
        return res.status(404).json({
            error: "ไม่พบงานที่มีรหัสนี้"
        });
    }

    res.json(job);
});


// เพิ่มงานใหม่
app.post('/api/jobs', authenticateToken,
     requireRole('user', 'client', 'freelancer', 'admin'),
     (req, res) => {
    
    const result = validateJob(req.body || {});

    if (result.error) {
        return res.status(400).json({
            error: result.error 
        });
    }

    const nextId = jobs.reduce(
        (maxId, job) => Math.max(maxId, (job && job.id) ? job.id : 0), 0
    ) + 1;

    const createdJob = {
        id: nextId,
        ...result.data
    };

    jobs.push(createdJob);

    res.status(201).json(createdJob);
});

// แก้ไขงานตามรหัส
app.put('/api/jobs/:id', 
    authenticateToken,
    requireRole('user', 'client', 'freelancer', 'admin'),
    (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "รหัสงานไม่ถูกต้อง"
        });
    }

    const index = jobs.findIndex((job) => job.id === id);

    if (index === -1) {
        return res.status(404).json({
            error: "ไม่พบงานที่ต้องการแก้ไข"
        });
    }

    const result = validateJob(req.body || {});

    if (result.error) {
        return res.status(400).json({
            error: result.error
        });
    }

    jobs[index] = {
        id,
        ...result.data
    };

    res.json(jobs[index]);
});
  
// ลบงานตามรหัส
app.delete('/api/jobs/:id',
    authenticateToken,
    requireRole('user', 'client', 'freelancer', 'admin'),
    (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "รหัสงานไม่ถูกต้อง"
        });
    }

    const index = jobs.findIndex((job) => job.id === id);

    if (index === -1) {
        return res.status(404).json({
            error: "ไม่พบงานที่ต้องการลบ"
        });
    }

    const deletedJob = jobs[index];
    jobs.splice(index, 1);

    res.json({
        message: "ลบงานสำเร็จ",
        job: deletedJob
    });
});

app.get(
    '/api/admin/check',
    authenticateToken,
    requireRole('admin'),
    (req, res) => {
        return res.json({
            message: 'Admin access granted',
            user: req.user
        });
    }
);

// สมัครสมาชิก(Register)
app.post('/api/auth/register', async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body || {};

        //ตรวจสอบชนิดข้อมูล
        if (
            typeof name !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            typeof role !== 'string'
        ) {
            return res.status(400).json({
                error: 'กรุณากรอกชื่อ อีเมล และรหัสผ่านให้ถูกต้อง'
            });
        }

        const allowedRoles = ['freelancer', 'client'];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                error: 'ประเภทบัญชีไม่ถูกต้อง'
            });
        }

        //ทำความสะอาดข้อมูล
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        //ตรวจสอบชื่อ (ตามขนาด Schema VARCHAR(100))
        if (cleanName.length < 1 || cleanName.length > 100) {
            return res.status(400).json({
                error: 'ชื่อต้องมีความยาว 1–100 ตัวอักษร'
            });
        }

        //ตรวจสอบอีเมล (ตามขนาด Schema VARCHAR(255))
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (
            cleanEmail.length > 255 ||
            !emailPattern.test(cleanEmail)
        ) {
            return res.status(400).json({
                error: 'รูปแบบอีเมลไม่ถูกต้อง'
            });
        }

        //ตรวจสอบรหัสผ่าน (ขั้นต่ำ 8 ตัวอักษร)
        if (password.length < 8) {
            return res.status(400).json({
                error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
            });
        }

        // bcrypt รองรับรหัสผ่านได้สูงสุด 72 ไบต์
        if (Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({
                error: 'รหัสผ่านยาวเกินขีดจำกัดที่ระบบรองรับ'
            });
        }

        //Hash รหัสผ่านก่อนบันทึก (12 rounds ตามมาตรฐานความปลอดภัย OWASP)
        const passwordHash = await bcrypt.hash(password, 12);

        //บันทึกลง PostgreSQL ด้วย Parameterized Query เพื่อป้องกัน SQL Injection
        const result = await pool.query(
            `INSERT INTO users(name, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email, role, created_at`,
            [cleanName, cleanEmail, passwordHash, role]
        );

        //ส่งกลับเฉพาะข้อมูลที่เปิดเผยได้ (ไม่เปิดเผย password_hash)
        return res.status(201).json({
            message: 'สมัครสมาชิกสำเร็จ',
            user: result.rows[0]
        });

    } catch (error) {
        // PostgreSQL error code 23505 = unique constraint violation (อีเมลซ้ำ)
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'อีเมลนี้ถูกใช้แล้ว'
            });
        }

        // ส่งข้อผิดพลาดอื่นไปยัง Error Handler รวม
        return next(error);
    }
});

// ตรวจสอบ Token
async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null;
    
    if (!token) {
        return res.status(401).json({
            error: 'กรุณา Login เพื่อเข้าสู่ระบบ'
        });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        console.error('JWT_SECRET is not set in .env file');
        return res.status(500).json({
            error: 'Server configuration error'
        });
    }

    try {
        const payload = jwt.verify(token, secret, {
            algorithms: ['HS256'],
            issuer: 'job_board',
            audience: 'job_board_frontend'
        });

        if (
            !payload ||
            typeof payload.sub !== 'string' ||
            !/^[1-9]\d*$/.test(payload.sub) 
        ) {
            return res.status(401).json({
                error: 'Token ไม่ถูกต้อง'
            });
        }

        const result = await pool.query(
            `SELECT id, name, email, role
             FROM users
             WHERE id = $1`,
            [payload.sub]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'ไม่พบบัญชีผู้ใช้'
            });
        }

        const user = result.rows[0];

        if (!['user', 'admin', 'client', 'freelancer', 'employer'].includes(user.role)) {
            return res.status(403).json({
                error: 'ไม่ได้รับอนุญาตให้เข้าถึง'
            });
        }

        req.userId = String(user.id);
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        next();
    } catch (error) {
        if (
            error.name === 'TokenExpiredError' ||
            error.name === 'JsonWebTokenError' ||
            error.name === 'NotBeforeError' 
        ) {
            return res.status(401).json({
                error: 'Token ไม่ถูกต้องหรือหมดอายุ'
            });
        }
        console.error('Authentication error:', error);
        return res.status(500).json({
            error: 'เกิดข้อผิดพลาดในการตรวจสอบผู้ใช้'
        });
    }
}
    
function requireRole(...allowedRoles){
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'กรุณาเข้าสู่ระบบ'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
            });
        }

        next();
    }
}


// POST /api/auth/login
app.post('/api/auth/login', async (req, res, next) => {
    try {
        const { email, password } = req.body || {};

        //ตรวจสอบข้อมูลที่รับเข้ามา
        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                error: 'กรุณากรอกอีเมลและรหัสผ่าน'
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        if (
            cleanEmail.length > 255 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            return res.status(401).json({
                error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        //ค้นหาผู้ใช้ใน PostgreSQL
        const result = await pool.query(
            `SELECT id, name, email, password_hash, role
             FROM users
             WHERE email = $1`,
            [cleanEmail]
        );

        const user = result.rows[0];

        //ตรวจสอบรหัสผ่านด้วย bcrypt
        // ใช้ข้อความผิดพลาดเดียวกัน ไม่เปิดเผยว่ามีอีเมลนี้หรือไม่
        if (
            !user ||
            !(await bcrypt.compare(password, user.password_hash))
        ) {
            return res.status(401).json({
                error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        //ตรวจสอบว่ามี JWT_SECRET ใน .env
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            return next(
                new Error('JWT_SECRET is not configured')
            );
        }

        //สร้าง JWT
        const token = jwt.sign(
            { role: user.role},
            process.env.JWT_SECRET,
            {
                subject: String(user.id),
                expiresIn: '1h',
                issuer: 'job_board',
                audience: 'job_board_frontend',
                algorithm: 'HS256'
            }
        );

        //ส่ง Token และข้อมูลผู้ใช้ที่เปิดเผยได้
        return res.status(200).json({
            message: 'เข้าสู่ระบบสำเร็จ',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        return next(error);
    }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, role, created_at
             FROM users
             WHERE id = $1`,
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'ไม่พบบัญชีผู้ใช้'
            });
        }

        return res.status(200).json({
            user: result.rows[0]
        });
    } catch (error) {
        return next(error);
    }
});

app.use('/api', (req, res) => {
    return res.status(404).json({
        error: 'ไม่พบ API endpoint ที่ร้องขอ'
    });
});

// จัดการข้อผิดพลาดทั่วไป
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    if(err instanceof SyntaxError && "body" in err) {
        return res.status(400).json({
            error: "ข้อมูล JSON ไม่ถูกต้อง"
        });
    }

    console.error(err);

    res.status(500).json({
        error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์"
    });
});

// เริ่มต้นเซิร์ฟเวอร์
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
    
