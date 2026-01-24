import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./User.js";

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    title: {
      type: DataTypes.STRING,
      allowNull: false
    },

    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    type: {
      type: DataTypes.STRING,
      allowNull: false
    },

    entity_type: {
      type: DataTypes.STRING,
      defaultValue: "event"
    },

    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },

    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  {
    tableName: "notifications",
    timestamps: true,
    underscored: true
  }
);

// Association
Notification.belongsTo(User, { foreignKey: "user_id", onDelete: "CASCADE" });
User.hasMany(Notification, { foreignKey: "user_id" });

export default Notification;
