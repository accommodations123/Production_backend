import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const AuditLog = sequelize.define("AuditLog", {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },

  action: {
    type: DataTypes.STRING(64),
    allowNull: false
  },

  severity: {
    type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"),
    allowNull: false,
    defaultValue: "LOW"
  },

  actor_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true
  },

  actor_role: {
    type: DataTypes.STRING(32),
    allowNull: true
  },

  target_type: {
    type: DataTypes.STRING(64),
    allowNull: true
  },

  target_id: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true
  },

  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },

  user_agent: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: "audit_logs",
  timestamps: true
});


export default AuditLog;
