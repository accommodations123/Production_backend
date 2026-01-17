import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import Application from "../carrer/Application.js";
import User from "../User.js";

const ApplicationStatusHistory = sequelize.define(
  "ApplicationStatusHistory",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    application_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    /* ===== STATUS TRANSITION ===== */
    from_status: {
      type: DataTypes.STRING(30),
      allowNull: false
    },

    to_status: {
      type: DataTypes.STRING(30),
      allowNull: false
    },

    /* ===== ACTOR (ROLE-AGNOSTIC) ===== */
    acted_by_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    acted_by_role: {
      type: DataTypes.ENUM(
        "admin",
        "recruiter",
        "interviewer",
        "system",
        "user"
      ),
      allowNull: false,
      defaultValue: "admin"
    },

    /* ===== OPTIONAL INTERNAL NOTES ===== */
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: "application_status_history",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["application_id"] },
      { fields: ["to_status"] },
      { fields: ["acted_by_role"] }
    ]
  }
);

/* ================= RELATIONS ================= */

// One application → many status history entries
Application.hasMany(ApplicationStatusHistory, {
  foreignKey: "application_id",
  as: "status_history"
});

ApplicationStatusHistory.belongsTo(Application, {
  foreignKey: "application_id",
  as: "application"
});

// Actor reference (works for admin, recruiter, interviewer, user)
ApplicationStatusHistory.belongsTo(User, {
  foreignKey: "acted_by_id",
  as: "actor"
});

export default ApplicationStatusHistory;
