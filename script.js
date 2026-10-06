const jobs = [
  {
    id: 1,
    title: "Frontend Developer",
    category: "Web Development",
    budget: 15000,
    location: "Remote",
  },
  {
    id: 2,
    title: "UI Designer",
    category: "Design",
    budget: 8000,
    location: "Remote",
  },
  {
    id: 3,
    title: "Backend Developer",
    category: "Web Development",
    budget: 20000,
    location: "Bangkok",
  },
  {
    id: 4,
    title: "IT",
    category: "IT omg",
    budget: 30000,
    location: "Bangkok",
  },
  {
    id: 5,
    title: "cs",
    category: "เรียน",
    budget: 6000,
    location: "หนองคาย",
  },
  {
    id: 6,
    title: "dev",
    category: "java",
    budget: 6500,
    location: "หนองคาย",
  },
  {
    id: 7,
    title: "ops",
    category: "c#",
    budget: 40000,
    location: "อุดร",
  },
  {
    id: 8,
    title: "devops",
    category: "python",
    budget: 40000,
    location: "ภูเก็ต",
  },
];
//ดึง Element จาก HTML มาเตรียมไว้ใช้งาน
const Search = document.getElementById("search-input");
const jobList = document.getElementById("job-list");
const categorys = document.getElementById("categories");

//ดักจับเหตุการณ์เมื่อผู้ใช้พิมพ์ค้นหา
Search.addEventListener("input", () => {
  const searchText = Search.value.toLowerCase(); // อ่านค่าที่ผู้ใช้พิมพ์ปัจจุบัน
  // ค้นหางานที่ชื่อ หรือ หมวดหมู่มีคำค้นหาซ่อนอยู่
  const searchresult = jobs.filter(
    (item) =>
      item.title.toLowerCase().includes(searchText) ||
      item.category.toLowerCase().includes(searchText),
  );

  // แปลงข้อมูลงานที่หาเจอ ให้กลายเป็นโครงสร้าง HTML (Card)
  const jobCards = searchresult.map((job) => {
    return `
            <div>
                <h2>${job.title}</h2>
                <p>Category: ${job.category}</p>
                <p>Budget: ${job.budget} บาท</p>
                <p>Location: ${job.location}</p>
            </div>
        `;
  });
  // รวม Card ทั้งหมดเข้าด้วยกัน แล้วพ่นออกไปแสดงผลบนหน้าเว็บ
  jobList.innerHTML = jobCards.join("");
});

// ดักจับการเปลี่ยนตัวเลือกใน Dropdown (Select)
categorys.addEventListener("change", () => {
  const categoryText = categorys.value.toLowerCase();
  if (categoryText === "all") {
    const jobCards = jobs.map((job) => {
      return `
        <div>
            <h2>${job.title}</h2>
            <p>Category: ${job.category}</p>
            <p>Budget: ${job.budget} บาท</p>
            <p>Location: ${job.location}</p>
        </div>
    `;
    });
    jobList.innerHTML = jobCards.join("");
  } else {
    const Categ = jobs.filter(
      (item) => item.category.toLowerCase() === categoryText,
    );
    const categoryCards = Categ.map((job) => {
      return `
            <div>
                <h2>${job.title}</h2>
                <p>Category: ${job.category}</p>
                <p>Budget: ${job.budget} บาท</p>
                <p>Location: ${job.location}</p>
            </div>
        `;
    });

    jobList.innerHTML = categoryCards.join("");
  }
});

const Budget_Filter = document.getElementById("budgetfilter");
let qom = [];
Budget_Filter.addEventListener("change", () => {
  const Budgets = Budget_Filter.value;
  if (Budgets === "All") {
    qom = jobs;
  } else if (Budgets === "under10k") {
    qom = jobs.filter((item) => item.budget < 10000);
  } else if (Budgets === "10to20k") {
    qom = jobs.filter((item) => item.budget >= 10000 && item.budget <= 20000);
  } else if (Budgets === "over20k") {
    qom = jobs.filter((item) => item.budget > 20000);
  }
  const Budgetcards = qom.map((job) => {
    return (
      <div>
        {" "}
        <h2>${job.title}</h2> <p>Category: ${job.category}</p>{" "}
        <p>Budget: ${job.budget} บาท</p> <p>Location: ${job.location}</p>{" "}
      </div>
    );
  });
  jobList.innerHTML = Budgetcards.join("");
});
