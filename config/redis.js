import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const client = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
});

client.on("error", err => {
  console.log("Redis error", err);
});

await client.connect();

export default client;
