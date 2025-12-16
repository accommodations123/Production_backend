import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Event from "./Event.js";
import User from "./User.js";

const EventReview = sequelize.define("EventReview", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  event_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  // ✅ store name directly here
  reviewer_name: {
    type: DataTypes.STRING,
    allowNull: false
  },

  rating: {
    type: DataTypes.INTEGER, // 1–5
    allowNull: false
  },

  comment: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: "event_reviews",
  timestamps: true,
  underscored: true
});

EventReview.belongsTo(Event, { foreignKey: "event_id" });
Event.hasMany(EventReview, { foreignKey: "event_id" });

EventReview.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(EventReview, { foreignKey: "user_id" });

export default EventReview;
