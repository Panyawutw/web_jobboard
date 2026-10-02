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
    },
    {
        id: 4,
        title: "IT",
        category: "IT omg",
        budget: 30000,
        location: "Bangkok"
    },
    {
        id: 5,
        title: "cs",
        category: "เรียน",
        budget: 6000,
        location: "หนองคาย"
    },
    {
        id: 6,
        title: "dev",
        category: "java",
        budget: 6500,
        location: "หนองคาย"
    },
    {
        id: 7,
        title: "ops",
        category: "c#",
        budget: 40000,
        location: "อุดร"
    },
    {
        id: 8,
        title: "devops",
        category: "python",
        budget: 40000,
        location: "ภูเก็ต"
    }


];

const jobList = document.getElementById("job-list");
let Search = "pyth";
const searchresult = jobs.filter(item => item.title.includes(Search) || item.category.includes(Search));

const jobCards = searchresult.map(job => {
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

