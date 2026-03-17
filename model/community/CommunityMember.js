import dynamoose from "../../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   CommunityMember Model — DynamoDB (Dynamoose)
   ===================================================================== */

const communityMemberSchema = new dynamoose.Schema({
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
      rangeKey: "user_id"
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
  role: {
    type: String,
    default: "member",
    enum: ["owner", "admin", "member"]
  },
  is_host: {
    type: Boolean,
    default: false
  }
});

const CommunityMember = dynamoose.model("CommunityMember", communityMemberSchema);

export default CommunityMember;
