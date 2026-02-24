/**
 * Seed script to create the first Super Admin.
 *
 * Usage:
 *   node scripts/seedSuperAdmin.js
 *
 * Environment variables (optional — falls back to defaults for local dev):
 *   SUPER_ADMIN_EMAIL    — super admin email
 *   SUPER_ADMIN_PASSWORD — super admin password (min 12 chars, mixed case, number, special char)
 *
 * After seeding, the super admin can log in and create
 * other admin/recruiter accounts via the POST /admin/register API.
 */
import dotenv from "dotenv";
dotenv.config();

import Admin from "../model/Admin.js";
import bcrypt from "bcryptjs";
import sequelize from "../config/db.js";

/* =====================================================================
   Configuration
   ===================================================================== */

const BCRYPT_ROUNDS = 12;
const SCRIPT_TIMEOUT_MS = 30_000;              // 30s guard against hanging

const SUPER_ADMIN = {
    name: "Super Admin",
    email: process.env.SUPER_ADMIN_EMAIL || "superadmin@nextkinlife.com",
    password: process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@123",
    role: "super_admin"
};

/* =====================================================================
   Password Validation
   ===================================================================== */

function validatePassword(password) {
    const errors = [];

    if (password.length < 12)
        errors.push("Password must be at least 12 characters");
    if (!/[A-Z]/.test(password))
        errors.push("Password must contain at least one uppercase letter");
    if (!/[a-z]/.test(password))
        errors.push("Password must contain at least one lowercase letter");
    if (!/[0-9]/.test(password))
        errors.push("Password must contain at least one number");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
        errors.push("Password must contain at least one special character");

    return errors;
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/* =====================================================================
   Main
   ===================================================================== */

// Timeout guard — prevent script from hanging indefinitely
const timeout = setTimeout(() => {
    console.error("❌ Script timed out after 30 seconds");
    process.exit(1);
}, SCRIPT_TIMEOUT_MS);

(async () => {
    try {
        // ── Validate inputs ─────────────────────────────────────────────
        if (!validateEmail(SUPER_ADMIN.email)) {
            console.error(`❌ Invalid email format: ${SUPER_ADMIN.email}`);
            process.exit(1);
        }

        const passwordErrors = validatePassword(SUPER_ADMIN.password);
        if (passwordErrors.length > 0) {
            console.error("❌ Password does not meet requirements:");
            passwordErrors.forEach((e) => console.error(`   • ${e}`));
            console.error("\n   Tip: Set SUPER_ADMIN_PASSWORD env variable with a strong password.");
            process.exit(1);
        }

        // ── Connect to DB ───────────────────────────────────────────────
        await sequelize.authenticate();
        console.log("✅ DB connected");

        // Sync the Admin table (alter: true adds new columns if needed)
        await Admin.sync({ alter: true });
        console.log("✅ Admin table synced");

        // ── Check if already exists ─────────────────────────────────────
        // Use unscoped() to bypass defaultScope which excludes password
        const exists = await Admin.unscoped().findOne({
            where: { email: SUPER_ADMIN.email }
        });

        if (exists) {
            console.log(`⚠️  Admin with email ${exists.email} already exists (role: ${exists.role})`);

            // Upgrade to super_admin if needed
            if (exists.role !== "super_admin") {
                await exists.update({ role: "super_admin", status: "active" });
                console.log("✅ Updated existing admin to super_admin role");
            }

            // Ensure status is active
            if (exists.status !== "active") {
                await exists.update({ status: "active" });
                console.log("✅ Reactivated super admin account");
            }

            clearTimeout(timeout);
            await sequelize.close();
            process.exit(0);
        }

        // ── Create Super Admin ──────────────────────────────────────────
        const hashedPass = await bcrypt.hash(SUPER_ADMIN.password, BCRYPT_ROUNDS);

        const admin = await Admin.unscoped().create({
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
        await sequelize.close();
        process.exit(0);

    } catch (err) {
        console.error("❌ Failed to seed super admin:", err.message || err);

        // Show more details in development
        if (process.env.NODE_ENV !== "production") {
            console.error(err);
        }

        clearTimeout(timeout);
        try { await sequelize.close(); } catch { /* ignore close errors */ }
        process.exit(1);
    }
})();
