import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";

const AnalyticsEvent = sequelize.define(
  "AnalyticsEvent",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },

    event_type: {
      type: DataTypes.STRING(64),
      allowNull: false
    },

    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },

    host_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },

    property_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },

    event_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },

    country: {
      type: DataTypes.STRING(64),
      allowNull: true
    },

    state: {
      type: DataTypes.STRING(64),
      allowNull: true
    },

    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: "analytics_events",
    timestamps: false,
    underscored: true
  }
);

export default AnalyticsEvent;
