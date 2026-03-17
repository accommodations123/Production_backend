/**
 * Seed script to create the first Super Admin.
 *
 * Usage:
 *   node scripts/seedSuperAdmin.js
 *
 * Environment variables (optional — falls back to defaults for local dev):
 *   SUPER_ADMIN_EMAIL    — super admin email
 *   SUPER_ADMIN_PASSWORD — super admin password (min 12 chars, mixed case, number, special char)
 */
import dotenv from "dotenv";
dotenv.config();

import Admin from "../model/Admin.js";
import bcrypt from "bcryptjs";
import { checkDynamoDBConnection } from "../config/db.js";

const BCRYPT_ROUNDS = 12;
const SCRIPT_TIMEOUT_MS = 30_000;

const SUPER_ADMIN = {
    name: "Super Admin",
    email: process.env.SUPER_ADMIN_EMAIL || "superadmin@nextkinlife.com",
    password: process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@123",
    role: "super_admin"
};

function validatePassword(password) {
    const errors = [];
    if (password.length < 12) errors.push("Password must be at least 12 characters");
    if (!/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("Password must contain at least one lowercase letter");
    if (!/[0-9]/.test(password)) errors.push("Password must contain at least one number");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push("Password must contain at least one special character");
    return errors;
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const timeout = setTimeout(() => {
    console.error("❌ Script timed out after 30 seconds");
    process.exit(1);
}, SCRIPT_TIMEOUT_MS);

(async () => {
    try {
        if (!validateEmail(SUPER_ADMIN.email)) {
            console.error(`❌ Invalid email format: ${SUPER_ADMIN.email}`);
            process.exit(1);
        }

        const passwordErrors = validatePassword(SUPER_ADMIN.password);
        if (passwordErrors.length > 0) {
            console.error("❌ Password does not meet requirements:");
            passwordErrors.forEach((e) => console.error(`   • ${e}`));
            process.exit(1);
        }

        // Connect to DynamoDB
        await checkDynamoDBConnection();
        console.log("✅ DynamoDB connected");

        // DynamoDB tables are auto-created by Dynamoose — no sync needed
        console.log("✅ Admin table ready (auto-created by Dynamoose)");

        // Check if already exists via email GSI
        const existingAdmins = await Admin.query("email").eq(SUPER_ADMIN.email).exec();
        const exists = existingAdmins[0];

        if (exists) {
            console.log(`⚠️  Admin with email ${exists.email} already exists (role: ${exists.role})`);

            if (exists.role !== "super_admin") {
                await Admin.update({ id: exists.id }, { role: "super_admin", status: "active" });
                console.log("✅ Updated existing admin to super_admin role");
            }

            if (exists.status !== "active") {
                await Admin.update({ id: exists.id }, { status: "active" });
                console.log("✅ Reactivated super admin account");
            }

            clearTimeout(timeout);
            process.exit(0);
        }

        // Create Super Admin
        const hashedPass = await bcrypt.hash(SUPER_ADMIN.password, BCRYPT_ROUNDS);
        const admin = await Admin.create({
            name: SUPER_ADMIN.name,
            email: SUPER_ADMIN.email,
            password: hashedPass,
            role: "super_admin",
            status: "active"
        });

        console.log("\n✅ Super Admin created successfully!");
        console.log(`   Email : ${admin.email}`);
        console.log(`   Role  : ${admin.role}`);
        console.log(`   ID    : ${admin.id}`);
        console.log("\n⚠️  IMPORTANT: Change the password after first login!");
        console.log("⚠️  IMPORTANT: Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD env vars in production!\n");

        clearTimeout(timeout);
        process.exit(0);

    } catch (err) {
        console.error("❌ Failed to seed super admin:", err.message || err);
        if (process.env.NODE_ENV !== "production") console.error(err);
        clearTimeout(timeout);
        process.exit(1);
    }
})();
