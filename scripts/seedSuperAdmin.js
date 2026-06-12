import dotenv from "dotenv";
dotenv.config();

import Admin from "../model/Admin.js";
import bcrypt from "bcryptjs";

async function seed() {
    console.log("Starting secure Super Admin seeding...");

    const name = process.env.INITIAL_SUPER_NAME;
    const email = process.env.INITIAL_SUPER_EMAIL;
    const password = process.env.INITIAL_SUPER_PASSWORD;

    if (!name || !email || !password) {
        console.error("❌ Seeding failed: INITIAL_SUPER_NAME, INITIAL_SUPER_EMAIL, and INITIAL_SUPER_PASSWORD must be defined in your environment.");
        process.exit(1);
    }

    try {
        // Safe check using GSI index (query instead of scan)
        const existing = await Admin.query("email").eq(email.toLowerCase().trim()).exec();
        if (existing.length > 0) {
            console.log(`ℹ️ An admin with email ${email} already exists. Skipping seeding.`);
            process.exit(0);
        }

        const hashedPass = await bcrypt.hash(password, 12);
        const admin = await Admin.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPass,
            role: "super_admin",
            status: "active"
        });

        console.log(`✅ Super Admin created successfully: ${admin.email} (ID: ${admin.id})`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Fatal error during seeding:", error);
        process.exit(1);
    }
}

seed();
