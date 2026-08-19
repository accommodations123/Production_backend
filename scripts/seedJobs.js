import dotenv from "dotenv";
dotenv.config();

import Admin from "../model/Admin.js";
import Job from "../model/carrer/Job.js";
import bcrypt from "bcryptjs";
import { checkDynamoDBConnection } from "../config/db.js";

const BCRYPT_ROUNDS = 12;

const SAMPLE_JOBS = [
  {
    title: "Frontend Developer (React)",
    company: "NextKinLife LLC",
    department: "Engineering",
    location: "Chicago, IL",
    work_style: "remote",
    employment_type: "Full Time",
    position_type: "Full Time",
    experience_level: "junior",
    salary_range: "$80,000 - $100,000",
    pay_min: 80000,
    pay_max: 100000,
    pay_type: "salary",
    description: "We are looking for a Junior Frontend Developer with React and Tailwind CSS experience to join our core team.",
    requirements: ["1-3 years React experience", "Proficient in JavaScript/TypeScript", "Experience with Redux/RTK Query"],
    responsibilities: ["Build interactive components", "Collaborate with designers", "Integrate REST & GraphQL APIs"],
    preferred_skills: ["Tailwind CSS", "Next.js", "Vite"],
    recruiter_name: "Vinod Kumar",
    recruiter_email: "careers@nextkinlife.com",
    status: "active"
  },
  {
    title: "Senior Backend Engineer (Node.js & DynamoDB)",
    company: "NextKinLife LLC",
    department: "Engineering",
    location: "New York, NY",
    work_style: "hybrid",
    employment_type: "Full Time",
    position_type: "Full Time",
    experience_level: "senior",
    salary_range: "$130,000 - $160,000",
    pay_min: 130000,
    pay_max: 160000,
    pay_type: "salary",
    description: "Looking for a seasoned backend engineer to design scalable microservices and manage our DynamoDB instances.",
    requirements: ["5+ years Node.js experience", "Expertise in AWS & DynamoDB", "Strong knowledge of system design"],
    responsibilities: ["Design APIs", "Database optimization", "Mentor junior backend developers"],
    preferred_skills: ["Dynamoose", "Express.js", "Redis"],
    recruiter_name: "Vinod Kumar",
    recruiter_email: "careers@nextkinlife.com",
    status: "active"
  },
  {
    title: "Product Design Intern",
    company: "NextKinLife LLC",
    department: "Design",
    location: "San Francisco, CA",
    work_style: "onsite",
    employment_type: "Contract",
    position_type: "Contract",
    experience_level: "junior",
    salary_range: "$35 - $45 / hour",
    pay_min: 35,
    pay_max: 45,
    pay_type: "hourly",
    description: "Join us as a Product Design intern and help shape the future of accommodations and communities.",
    requirements: ["Pursuing degree in HCI/Design or equivalent portfolio", "Proficient in Figma", "Good communication skills"],
    responsibilities: ["Create wireframes and mockups", "Participate in user research", "Design UI/UX assets"],
    preferred_skills: ["Figma", "Prototyping", "Adobe Suite"],
    recruiter_name: "Vinod Kumar",
    recruiter_email: "careers@nextkinlife.com",
    status: "active"
  }
];

async function seed() {
  try {
    // 1. Connect to DB
    await checkDynamoDBConnection();
    console.log("✅ DynamoDB connected");

    // 2. Find or create a super admin to assign jobs to
    let admin = (await Admin.scan().exec())[0];
    if (!admin) {
      console.log("No admin found. Creating a default super admin...");
      const hashedPass = await bcrypt.hash("SuperAdmin@123", BCRYPT_ROUNDS);
      admin = await Admin.create({
        name: "Super Admin",
        email: "superadmin@nextkinlife.com",
        password: hashedPass,
        role: "super_admin",
        status: "active"
      });
      console.log(`✅ Default Super Admin created with ID: ${admin.id}`);
    } else {
      console.log(`Using existing admin: ${admin.email} (ID: ${admin.id})`);
    }

    // 3. Insert sample jobs
    let seededCount = 0;
    for (const jobData of SAMPLE_JOBS) {
      // Check if job with this title and company already exists
      const existingJobs = await Job.scan("title").eq(jobData.title).exec();
      const match = existingJobs.find(j => j.company === jobData.company);
      
      if (match) {
        console.log(`⚠️ Job "${jobData.title}" at "${jobData.company}" already exists.`);
        continue;
      }

      await Job.create({
        ...jobData,
        created_by: admin.id
      });
      console.log(`✅ Seeded job: ${jobData.title}`);
      seededCount++;
    }

    console.log(`\n🎉 Seeding complete! Seeded ${seededCount} new jobs.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seed();
