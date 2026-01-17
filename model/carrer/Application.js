import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import Job from "../carrer/Job.js";
import User from "../User.js";

const Application = sequelize.define(
  "Application",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    job_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: false
    },

    phone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },

    linkedin_url: {
      type: DataTypes.STRING,
      allowNull: true
    },

    portfolio_url: {
      type: DataTypes.STRING,
      allowNull: true
    },

    resume_url: {
      type: DataTypes.STRING,
      allowNull: false
    },

    experience: {
      type: DataTypes.JSON,
      defaultValue: []
    },

    availability_date: {
      type: DataTypes.DATE,
      allowNull: true
    },

    /* ===== STATUS TRACKING ===== */
    status: {
      type: DataTypes.ENUM(
        "submitted",
        "viewed",
        "shortlisted",
        "interview",
        "offer",
        "rejected",
        "withdrawn"
      ),
      defaultValue: "submitted"
    },

    status_updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },

    /* ===== VIEW TRACKING ===== */
    last_viewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    viewed_by_admin: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: "applications",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["job_id"] },
      { fields: ["status"] },
      { fields: ["email"] },
      { fields: ["last_viewed_at"] }
    ]
  }
);


/* RELATIONS */
Application.belongsTo(Job, {
  foreignKey: "job_id",
  as: "job"
});

Job.hasMany(Application, {
  foreignKey: "job_id",
  as: "applications"
});

Application.belongsTo(User, {
  foreignKey: "user_id",
  as: "user"
});

export default Application;
