import dynamoose from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   BuySellListing Model — DynamoDB (Dynamoose)
   ===================================================================== */

const buySellListingSchema = new dynamoose.Schema(
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
    title: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    subcategory: { type: String },
    price: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
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
    street_address: { type: String },
    city: { type: String },
    zip_code: { type: String },
    state: { type: String },
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    images: {
      type: Array,
      schema: [String],
      default: []
    },
    status: {
      type: String,
      default: "pending",
      enum: ["draft", "pending", "active", "sold", "hidden", "blocked"],
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

const BuySellListing = dynamoose.model("BuySellListing", buySellListingSchema);

export default BuySellListing;
