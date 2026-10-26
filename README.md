
# FreelanceHub — ระบบประกาศงานและสมัครงานออนไลน์

ระบบเว็บประกาศงาน (Job Board) สำหรับนายจ้างและผู้สมัครงาน พัฒนาด้วย **Node.js + Express + PostgreSQL + EJS**

---

## สิ่งที่ระบบทำได้

- **ผู้สมัครงาน (Jobseeker)** — ค้นหางาน, ดูรายละเอียด, สมัครงาน, ติดตามสถานะใบสมัคร
- **บริษัท (Company)** — ลงประกาศตำแหน่งงาน, ดูใบสมัคร, จัดการงานของตัวเอง
- **เจ้าหน้าที่ (Staff / Moderator)** — ตรวจสอบและอนุมัติประกาศงาน
- **ผู้ดูแลระบบ (Admin)** — จัดการผู้ใช้ทั้งหมด, กำหนดสิทธิ์ (ACL), ดู Audit Log

---

## Tech Stack

| ส่วน | เทคโนโลยี |
|---|---|
| Backend | Node.js, Express.js 5 |
| ฐานข้อมูล | PostgreSQL (ผ่าน `pg`) |
| Template | EJS (Embedded JavaScript) |
| CSS | Bootstrap 5 + Custom CSS |
| Authentication | Session (`express-session`) + JWT |
| อัปโหลดไฟล์ | Multer |
| ความปลอดภัย | bcrypt, express-rate-limit |

---

## โครงสร้างโฟลเดอร์

```
web_jobboard/
├── server.js               ← จุดเริ่มต้นของ server
├── .env                    ← ค่า config (ไม่ควร commit ขึ้น git)
├── .env.example            ← ตัวอย่างค่า .env
├── database.sql            ← SQL สร้างตารางทั้งหมด
│
├── public/                 ← ไฟล์ static (CSS, JS, รูปภาพ)
│   ├── css/
│   └── images/
│
└── src/
    ├── config/             ← เชื่อมต่อฐานข้อมูล, ตั้งค่าต่างๆ
    ├── controllers/        ← logic การทำงานของแต่ละหน้า
    ├── middlewares/        ← ตรวจสอบสิทธิ์, rate limit, upload
    ├── models/             ← query ฐานข้อมูล (accountModel, jobModel)
    ├── routes/             ← กำหนด URL path ทั้งหมด
    ├── services/           ← business logic (email, auth)
    └── views/              ← หน้า HTML (EJS templates)
        ├── admin/          ← หน้าสำหรับ Admin
        ├── app/            ← หน้าสำหรับ User ทั่วไป
        ├── company/        ← หน้าสำหรับ Company
        ├── moderator/      ← หน้าสำหรับ Moderator
        ├── pages/          ← หน้าทั่วไป (หน้าหลัก, login, register)
        ├── seeker/         ← หน้าสำหรับ Jobseeker
        └── partials/       ← ส่วนที่ใช้ร่วมกัน (navbar, header, footer)
```

---

## วิธีติดตั้งและรัน

### 1. Clone โปรเจกต์

```bash
git clone https://github.com/Panyawutw/web_jobboard.git
cd web_jobboard
```

### 2. ติดตั้ง packages

```bash
npm install
```

### 3. สร้างไฟล์ `.env`

คัดลอกจาก `.env.example` แล้วแก้ค่าให้ตรงกับเครื่องของคุณ:

```bash
cp .env.example .env
```

ตัวอย่างค่าที่ต้องแก้ใน `.env`:

```env
PORT=3000
SESSION_SECRET=เปลี่ยนเป็นรหัสลับของคุณ

# เชื่อมต่อ PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=รหัสผ่าน_postgres_ของคุณ
DB_NAME=job_board_db
```

### 4. สร้างฐานข้อมูล PostgreSQL

เปิด pgAdmin หรือ psql แล้วสร้าง database ชื่อ `job_board_db` จากนั้นรัน:

```bash
psql -U postgres -d job_board_db -f database.sql
```

หรือรันผ่าน Node.js:

```bash
node src/config/initDb.js
```

### 5. เริ่ม Server

```bash
# โหมดพัฒนา (แนะนำ: reload อัตโนมัติเมื่อแก้โค้ด)
npm run dev

# โหมดปกติ
npm start
```

เปิดเบราว์เซอร์ไปที่ **http://localhost:3000**

| Role | URL |
|---|---|
| Guest / Public | http://localhost:3000 |
| Job Seeker | http://localhost:3000/seeker |
| Company | http://localhost:3000/company |
| Moderator | http://localhost:3000/moderator |
| Admin | http://localhost:3000/admin |

---

## บัญชีทดสอบ


| Role | Email | รหัสผ่าน | สิทธิ์ที่ได้ |
|---|---|---|---|
| Admin | `admin@jobboard.com` | `FreelanceHub-Demo!2026#` | จัดการทุกอย่างในระบบ |
| Staff (Moderator) | `staff@jobboard.com` | `FreelanceHub-Demo!2026#` | ตรวจสอบและอนุมัติงาน |
| Company | `company@jobboard.com` | `FreelanceHub-Demo!2026#` | ลงประกาศงาน |
| Jobseeker | `seeker@jobboard.com` | `FreelanceHub-Demo!2026#` | สมัครงาน |

---

## URL หลักของระบบ

| URL | ใช้สำหรับ |
|---|---|
| `/` | หน้าหลัก — ค้นหาและดูรายการงาน |
| `/jobs/:id` | รายละเอียดงาน |
| `/register` | สมัครสมาชิก (เลือก Jobseeker หรือ Company) |
| `/login` | เข้าสู่ระบบ |
| `/company/jobs` | บริษัท — ดูและจัดการงานของตัวเอง |
| `/company/post-job` | บริษัท — ลงประกาศงานใหม่ |
| `/seeker/dashboard` | Jobseeker — ดูใบสมัครของตัวเอง |
| `/moderator/jobs` | Staff — ตรวจสอบงานที่รออนุมัติ |
| `/admin/dashboard` | Admin — ภาพรวมระบบ |
| `/admin/users` | Admin — จัดการผู้ใช้ทั้งหมด |

---

## คำสั่งที่ใช้บ่อย

```bash
npm run dev    # เริ่ม server แบบ auto-reload (ใช้ระหว่างพัฒนา)
npm start      # เริ่ม server ปกติ
npm test       # รัน test
```

