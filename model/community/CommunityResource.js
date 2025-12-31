import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";

const CommunityResource = sequelize.define(
  "CommunityResource",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    community_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    added_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    resource_type: {
      type: DataTypes.ENUM("link", "file", "contact"),
      allowNull: false
    },

    resource_value: {
      type: DataTypes.TEXT,
      allowNull: false
      /*
        link → URL
        file → CDN URL
        contact → JSON string
      */
    },

    status: {
      type: DataTypes.ENUM("active", "hidden", "deleted"),
      defaultValue: "active"
    }
  },
  {
    tableName: "community_resources",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["community_id"] },
      { fields: ["resource_type"] }
    ]
  }
);

export default CommunityResource;
