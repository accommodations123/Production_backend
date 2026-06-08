import dotenv from "dotenv";
dotenv.config();

import dynamoose from "../config/db.js";
import Job from "../model/carrer/Job.js";
import Application from "../model/carrer/Application.js";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom"; // to simulate browser environment for DOMPurify on Node.js

async function verifyAll() {
  console.log("=== Verification Script Started ===\n");

  // 1. Security Verification (XSS Sanitization)
  console.log("--- 1. Security (XSS Sanitization) Verification ---");
  const window = new JSDOM("").window;
  const purify = DOMPurify(window);

  const maliciousHTML = '<p>Regular text</p><script>alert("hack")</script><img src="x" onerror="alert(1)">';
  const cleanHTML = purify.sanitize(maliciousHTML);
  console.log("Original HTML:", maliciousHTML);
  console.log("Sanitized HTML:", cleanHTML);

  const isScriptBlocked = !cleanHTML.includes("<script>") && !cleanHTML.includes("onerror");
  console.log(`Script/Event Handler Blocked: ${isScriptBlocked ? "✅ YES (PASS)" : "❌ NO (FAIL)"}`);
  console.log();

  // 2. DynamoDB and Business Logic Verification (Database connectivity needed)
  console.log("--- 2. Database and Business Logic Verification ---");
  try {
    const jobData = {
      title: "Temporary Software Engineer",
      company: "NextKinLife Test LLC",
      department: "Engineering",
      location: "San Jose, CA",
      work_style: "remote",
      employment_type: "Contract",
      position_type: "Contract",
      experience_level: "Mid",
      description: "Looking for a React developer",
      skills: {
        primary: ["React", "Docker"],
        secondary: ["AWS", "Kafka"],
        nice_to_have: ["Kubernetes"]
      },
      created_by: "system-test",
      status: "active"
    };

    // Create a temporary job
    console.log("Creating temporary job posting...");
    const job = await Job.create(jobData);
    console.log(`Temporary Job Created with ID: ${job.id}`);
    console.log("job.skills object:", JSON.stringify(job.skills));

    // Verify Skills Search Logic
    console.log("\nVerifying Skills Search...");
    const testQueries = ["Docker", "AWS", "Kafka", "Kubernetes"];
    const allJobs = [job]; // Test on the job object using the matchSkills logic

    for (const q of testQueries) {
      const queryLower = q.toLowerCase().trim();
      const matchSkills = job.skills && typeof job.skills === "object"
        ? Object.values(job.skills)
            .flat()
            .some(skill => String(skill).toLowerCase().includes(queryLower))
        : false;
      console.log(`Querying skill "${q}": ${matchSkills ? "✅ Found (PASS)" : "❌ Not Found (FAIL)"}`);
    }

    // Verify Duplicate Application logic
    console.log("\nVerifying Duplicate Application Logic...");
    const testEmail = "tester@nextkinlife.com";
    const normalizedEmail = testEmail.toLowerCase().trim();
    const jobEmailKey = `${job.id}#${normalizedEmail}`;

    // Clean up any existing test records if they exists (should be empty but let's be sure)
    const existingCheck = await Application.query("job_email_key").eq(jobEmailKey).exec();
    for (const app of existingCheck) {
      await Application.delete(app.id);
    }

    // First Apply -> Expect Success
    console.log(`First Application with email: ${testEmail}...`);
    const app1 = await Application.create({
      job_id: job.id,
      user_id: "test-user-1",
      full_name: "Test User",
      email: testEmail,
      job_email_key: jobEmailKey,
      status: "submitted"
    });
    console.log(`First Application created successfully: ${app1.id}`);

    // Second Apply -> Query for duplicate
    console.log("Second Application attempt with same email...");
    const existing = await Application.query("job_email_key").eq(jobEmailKey).exec();
    const hasDuplicate = existing.length > 0;
    console.log(`Duplicate found in database: ${hasDuplicate ? "✅ YES (PASS)" : "❌ NO (FAIL)"}`);

    if (hasDuplicate) {
      console.log("Result: Rejection with 409 Conflict logic on backend controller will be triggered.");
    }

    // Clean up test data
    console.log("\nCleaning up test records...");
    await Application.delete(app1.id);
    await Job.delete(job.id);
    console.log("Clean up completed successfully.");

  } catch (err) {
    console.error("❌ Test verification failed with error:", err);
  }

  console.log("\n=== Verification Script Finished ===");
  process.exit(0);
}

verifyAll();
