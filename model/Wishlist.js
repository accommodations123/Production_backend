import dynamoose from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   Wishlist Model — DynamoDB (Dynamoose)
   ===================================================================== */

const wishlistSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    user_id: {
      type: String,
      required: true,
      index: {
        name: "user_id-index",
        type: "global",
        rangeKey: "created_at"
      }
    },
    item_id: {
      type: String,
      required: true
    },
    item_type: {
      type: String,
      required: true,
      enum: ["property", "event", "buysell", "community", "trip"]
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

const Wishlist = dynamoose.model("Wishlist", wishlistSchema);

export default Wishlist;
