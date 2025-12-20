import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Event from "./Events.models.js";
import User from "./User.js";

const EventReview = sequelize.define(
  "EventReview",
  {
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

    // Snapshot of reviewer name at the time of review
    reviewer_name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },

    comment: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    // For future moderation / admin control
    status: {
      type: DataTypes.ENUM("active", "hidden", "reported"),
      defaultValue: "active"
    }
  },
  {
    tableName: "event_reviews",
    timestamps: true,
    underscored: true,

   indexes: [
  {
    unique: true,
    fields: ["event_id", "user_id"]
  },
  {
    fields: ["event_id", "status"]
  },
  {
    fields: ["status"]
  },
  {
    fields: ["created_at"]
  }
]

  }
);

/* =========================
   Associations
========================= */

EventReview.belongsTo(Event, {
  foreignKey: "event_id",
  onDelete: "CASCADE"
});

Event.hasMany(EventReview, {
  foreignKey: "event_id"
});

EventReview.belongsTo(User, {
  foreignKey: "user_id",
  onDelete: "CASCADE"
});

User.hasMany(EventReview, {
  foreignKey: "user_id"
});

export default EventReview;
