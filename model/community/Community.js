import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import User from "../User.js";

const Community = sequelize.define(
  "Community",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    /* USER WHO CREATED THE COMMUNITY */
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },

    slug: {
      type: DataTypes.STRING(180),
      allowNull: false,
      unique: true
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    avatar_image: {
      type: DataTypes.STRING,
      allowNull: true
    },

    cover_image: {
      type: DataTypes.STRING,
      allowNull: true
    },

    /* VISIBILITY & JOIN RULES */
    visibility: {
      type: DataTypes.ENUM("public", "private", "hidden"),
      defaultValue: "public"
    },

    join_policy: {
      type: DataTypes.ENUM("open", "request", "invite"),
      defaultValue: "open"
    },

    /* LOCATION (USED FOR NEARBY EVENT SUGGESTIONS) */
    country: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    /* OPTIONAL – FUTURE PROOF FOR RADIUS SEARCH */
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    },

    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true
    },

    /* TOPICS (FOR SIMPLE RECOMMENDATIONS) */
    topics: {
      type: DataTypes.JSON,
      defaultValue: []
      // ["telugu", "developers", "students"]
    },

    /* MEMBERS (COMPRESSED USER REFERENCES) */
    members: {
      type: DataTypes.JSON,
      defaultValue: []
      /*
        [
          { "user_id": 1, "role": "owner" },
          { "user_id": 5, "role": "admin" },
          { "user_id": 18, "role": "member" }
        ]
      */
    },

    members_count: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },

    posts_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    /* EVENTS ARE NOT OWNED – ONLY SUGGESTED */
    events_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    status: {
      type: DataTypes.ENUM("pending","active", "suspended", "deleted"),
      defaultValue: "pending"
    }
  },
  {
    tableName: "communities",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["country", "city"] },
      { fields: ["country", "state"] },
      { fields: ["visibility"] },
      { fields: ["status"] },
      { unique: true, fields: ["slug"] }
    ]
  }
);

/* USER ↔ COMMUNITY RELATION */
Community.belongsTo(User, {
  foreignKey: "created_by",
  as: "creator"
});

User.hasMany(Community, {
  foreignKey: "created_by",
  as: "createdCommunities"
});

export default Community;
