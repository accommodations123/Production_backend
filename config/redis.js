// import Redis from "ioredis";

// let redisInstance = null;

// // ✅ named export (for `import { redis }`)
// export const redis = {
//   get client() {
//     return redisInstance;
//   }
// };

// // ✅ default export (for `import redis`)
// export default redis.client;

// export const initRedis = () => {
//   if (redisInstance) return redisInstance;

//   const host = process.env.REDIS_HOST;
//   const port = process.env.REDIS_PORT;

//   if (!host || !port) {
//     throw new Error("REDIS_HOST or REDIS_PORT missing");
//   }

//   redisInstance = new Redis({
//     host,
//     port: Number(port),
//     maxRetriesPerRequest: null,
//     enableReadyCheck: true
//   });

//   redisInstance.on("connect", () => {
//     console.log(`✅ Redis connected (${host}:${port})`);
//   });

//   redisInstance.on("error", (err) => {
//     console.error("❌ Redis error:", err.message);
//   });

//   return redisInstance;
// };
