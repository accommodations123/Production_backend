// model/community/CommunityMember.js
import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import Host from "../Host.js";          // ✅ IMPORT
import User from "../User.js";          // ✅ IMPORT (for nested include)

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

/* =====================================================
   ASSOCIATIONS (RUNTIME ONLY — NO DB CHANGE)
===================================================== */

// CommunityMember → Host (JOIN VIA user_id)
CommunityMember.belongsTo(Host, {
  foreignKey: "user_id",
  targetKey: "user_id"
});

// Host → CommunityMember (inverse, REQUIRED for eager loading)
Host.hasMany(CommunityMember, {
  foreignKey: "user_id",
  sourceKey: "user_id"
});

// Host → User (already correct, but ensure it exists once)
Host.belongsTo(User, { foreignKey: "user_id" });
User.hasOne(Host, { foreignKey: "user_id" });

export default CommunityMember;
