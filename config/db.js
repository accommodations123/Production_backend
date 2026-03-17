import dotenv from "dotenv";
dotenv.config();

import dynamoose from "dynamoose";

/* =====================================================================
   DynamoDB Configuration (Production-Ready)
   - Uses AWS credentials from environment variables
   - Supports local DynamoDB for development
   - Configures table defaults (on-demand billing)
   ===================================================================== */

const isProd = process.env.NODE_ENV === "production";

// ── Local DynamoDB (Development) ─────────────────────────────────────
if (!isProd && process.env.DYNAMODB_LOCAL === "true") {
  dynamoose.aws.ddb.local(process.env.DYNAMODB_LOCAL_ENDPOINT || "http://localhost:8000");
  console.log("📝 Using local DynamoDB");
} else {
  // ── AWS DynamoDB (Production) ────────────────────────────────────
  const ddb = new dynamoose.aws.ddb.DynamoDB({
    region: process.env.AWS_REGION || "us-east-2",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  dynamoose.aws.ddb.set(ddb);
}

// ── Table Defaults ───────────────────────────────────────────────────
dynamoose.Table.defaults.set({
  create: true,        // Auto-create tables if they don't exist
  waitForActive: true, // Wait for table to be ACTIVE before using
  update: true,        // Auto-update table schema (indexes, etc.)
  throughput: "ON_DEMAND",  // Pay-per-request (no capacity planning)
  prefix: process.env.DYNAMODB_TABLE_PREFIX || "nkl_",  // Table name prefix
});

// ── Health Check Helper ──────────────────────────────────────────────
export async function checkDynamoDBConnection() {
  try {
    const ddb = dynamoose.aws.ddb();
    await ddb.listTables({ Limit: 1 });
    return true;
  } catch (err) {
    console.error("❌ DynamoDB connection check failed:", err.message);
    return false;
  }
}

export default dynamoose;
