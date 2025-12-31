import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";

const CommunityPost = sequelize.define(
  "CommunityPost",
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

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    media_urls: {
      type: DataTypes.JSON,
      defaultValue: []
      // ["image.jpg", "video.mp4"]
    },

    media_type: {
      type: DataTypes.ENUM("text", "image", "video", "mixed"),
      defaultValue: "text"
    },

    likes_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    comments_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    status: {
      type: DataTypes.ENUM("active", "hidden", "deleted"),
      defaultValue: "active"
    }
  },
  {
    tableName: "community_posts",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["community_id", "created_at"] },
      { fields: ["user_id"] }
    ]
  }
);

export default CommunityPost;
