import dynamoose from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   Admin Model — DynamoDB (Dynamoose)
   ===================================================================== */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

const adminSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      index: {
        name: "email-index",
        type: "global"
      }
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      default: "admin",
      enum: ["super_admin", "admin", "recruiter"]
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "suspended", "deactivated"]
    },
    failed_login_attempts: {
      type: Number,
      default: 0
    },
    locked_until: { type: String },
    last_login_at: { type: String },
    password_changed_at: { type: String },
    deleted_at: { type: String }   // soft delete
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

const Admin = dynamoose.model("Admin", adminSchema);

/* =====================================================================
   Helper Functions (replacing instance methods)
   ===================================================================== */

export function isLocked(admin) {
  if (!admin.locked_until) return false;
  return new Date(admin.locked_until) > new Date();
}

export async function incrementFailedAttempts(admin) {
  const attempts = (admin.failed_login_attempts || 0) + 1;
  const updates = { failed_login_attempts: attempts };

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
    updates.locked_until = lockUntil.toISOString();
  }

  await Admin.update({ id: admin.id }, updates);
  return attempts;
}

export async function resetFailedAttempts(admin) {
  if (admin.failed_login_attempts > 0 || admin.locked_until) {
    await Admin.update({ id: admin.id }, {
      failed_login_attempts: 0,
      locked_until: null
    });
  }
}

export async function recordLogin(admin) {
  await Admin.update({ id: admin.id }, { last_login_at: new Date().toISOString() });
}

export default Admin;
