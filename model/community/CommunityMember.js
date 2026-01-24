// model/community/CommunityMember.js
import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";

const CommunityMember = sequelize.define(
  "CommunityMember",
  {
    id: {
      type: DataTypes.BIGINT,
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
    role: {
      type: DataTypes.ENUM("owner", "admin", "member"),
      defaultValue: "member"
    },
     is_host: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    tableName: "community_members",
    timestamps: false,
    indexes: [
      { unique: true, fields: ["community_id", "user_id"] },
      { fields: ["community_id"] },
     { fields: ["community_id", "is_host"] }
    ]
  }
);

export default CommunityMember;
