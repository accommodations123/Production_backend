import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/* =====================================================================
   Admin Model — Production-Ready
   - Account lockout after repeated failed login attempts
   - Status management (active / suspended / deactivated)
   - Last-login and password-change tracking
   - Default scope hides password; use `.scope("withPassword")` when needed
   - Paranoid mode (soft deletes)
   ===================================================================== */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

const Admin = sequelize.define(
  "Admin",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: {
          args: [2, 100],
          msg: "Name must be between 2 and 100 characters"
        }
      }
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: "Must be a valid email address" }
      }
    },

    password: {
      type: DataTypes.STRING(255),             // bcrypt output can be up to 60 chars, 255 for future-proofing
      allowNull: false
    },

    role: {
      type: DataTypes.ENUM("super_admin", "admin", "recruiter"),
      allowNull: false,
      defaultValue: "admin",
      validate: {
        isIn: {
          args: [["super_admin", "admin", "recruiter"]],
          msg: "Invalid role"
        }
      }
    },

    status: {
      type: DataTypes.ENUM("active", "suspended", "deactivated"),
      allowNull: false,
      defaultValue: "active"
    },

    // ── Security: Brute-force protection ────────────────────────────
    failed_login_attempts: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },

    locked_until: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },

    // ── Tracking ────────────────────────────────────────────────────
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },

    password_changed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    }
  },
  {
    tableName: "admins",
    timestamps: true,
    underscored: true,
    paranoid: true,                             // soft deletes via deleted_at

    // ── Scopes ──────────────────────────────────────────────────────
    defaultScope: {
      attributes: { exclude: ["password"] }     // never leak password by default
    },
    scopes: {
      withPassword: {
        attributes: { include: ["password"] }   // opt-in for login flow
      },
      active: {
        where: { status: "active" }
      }
    }
  }
);

/* =====================================================================
   Instance Methods
   ===================================================================== */

/**
 * Check if the account is currently locked out.
 */
Admin.prototype.isLocked = function () {
  if (!this.locked_until) return false;
  return new Date(this.locked_until) > new Date();
};

/**
 * Increment failed attempts. Auto-lock after MAX_FAILED_ATTEMPTS.
 */
Admin.prototype.incrementFailedAttempts = async function () {
  const attempts = this.failed_login_attempts + 1;
  const updates = { failed_login_attempts: attempts };

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
    updates.locked_until = lockUntil;
  }

  await this.update(updates);
  return attempts;
};

/**
 * Reset failed attempt counter (call on successful login).
 */
Admin.prototype.resetFailedAttempts = async function () {
  if (this.failed_login_attempts > 0 || this.locked_until) {
    await this.update({
      failed_login_attempts: 0,
      locked_until: null
    });
  }
};

/**
 * Record a successful login timestamp.
 */
Admin.prototype.recordLogin = async function () {
  await this.update({ last_login_at: new Date() });
};

export default Admin;
