/**
 * Seed script to create the first Super Admin.
 * Run once:  node scripts/seedSuperAdmin.js
 *
 * After this, the super admin can log in and create
 * other admin/recruiter accounts via the /register API.
 */
import dotenv from "dotenv";
dotenv.config();

import Admin from "../model/Admin.js";
import bcrypt from "bcryptjs";
import sequelize from "../config/db.js";

const SUPER_ADMIN = {
    name: "Super Admin",
    email: "superadmin@nextkinlife.com",   // ← change this
    password: "SuperAdmin@123",             // ← change this
    role: "super_admin"
};

(async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ DB connected");

        // Sync the Admin table (alter to add ENUM if needed)
        await Admin.sync({ alter: true });

        const exists = await Admin.findOne({ where: { email: SUPER_ADMIN.email } });
        if (exists) {
            console.log(`⚠️  Super Admin already exists: ${exists.email} (role: ${exists.role})`);

            // Update role to super_admin if it's not already
            if (exists.role !== "super_admin") {
                await exists.update({ role: "super_admin" });
                console.log("✅ Updated existing admin to super_admin");
            }

            process.exit(0);
        }

        const hashedPass = await bcrypt.hash(SUPER_ADMIN.password, 10);

        const admin = await Admin.create({
            ...SUPER_ADMIN,
            password: hashedPass
        });

        console.log("✅ Super Admin created successfully!");
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role:  ${admin.role}`);
        console.log("\n⚠️  Change the password after first login!");

        process.exit(0);
    } catch (err) {
        console.error("❌ Failed to seed super admin:", err);
        process.exit(1);
    }
})();
