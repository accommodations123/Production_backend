import dynamoose from "../../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   CommunityPost Model — DynamoDB (Dynamoose)
   ===================================================================== */

const communityPostSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    community_id: {
      type: String,
      required: true,
      index: {
        name: "community_id-index",
        type: "global",
        rangeKey: "created_at"
      }
    },
    user_id: {
      type: String,
      required: true,
      index: {
        name: "user_id-index",
        type: "global"
      }
    },
    content: { type: String },
    media_urls: {
      type: Array,
      schema: [String],
      default: []
    },
    media_type: {
      type: String,
      default: "text",
      enum: ["text", "image", "video", "mixed"]
    },
    likes_count: {
      type: Number,
      default: 0
    },
    comments_count: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "hidden", "deleted"]
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

const CommunityPost = dynamoose.model("CommunityPost", communityPostSchema);

export default CommunityPost;
