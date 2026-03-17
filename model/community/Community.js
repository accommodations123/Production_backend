import dynamoose from "../../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   Community Model — DynamoDB (Dynamoose)
   ===================================================================== */

const communitySchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    created_by: {
      type: String,
      required: true,
      index: {
        name: "created_by-index",
        type: "global"
      }
    },
    name: {
      type: String,
      required: true
    },
    slug: {
      type: String,
      required: true,
      index: {
        name: "slug-index",
        type: "global"
      }
    },
    description: { type: String },
    avatar_image: { type: String },
    cover_image: { type: String },
    visibility: {
      type: String,
      default: "public",
      enum: ["public", "private", "hidden"]
    },
    join_policy: {
      type: String,
      default: "open",
      enum: ["open", "request", "invite"]
    },
    country: {
      type: String,
      required: true,
      index: {
        name: "country-index",
        type: "global",
        rangeKey: "created_at"
      }
    },
    state: { type: String },
    city: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    topics: {
      type: Array,
      schema: [String],
      default: []
    },
    members_count: {
      type: Number,
      default: 1
    },
    posts_count: {
      type: Number,
      default: 0
    },
    events_count: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "active", "suspended", "deleted"],
      index: {
        name: "status-index",
        type: "global",
        rangeKey: "created_at"
      }
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

const Community = dynamoose.model("Community", communitySchema);

export default Community;
