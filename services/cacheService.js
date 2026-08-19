import Redis from "ioredis";

class LRUMap extends Map {
  constructor(maxSize = 2000) {
    super();
    this.maxSize = maxSize;
  }

  set(key, value) {
    if (this.has(key)) {
      this.delete(key);
    } else if (this.size >= this.maxSize) {
      const oldestKey = this.keys().next().value;
      if (oldestKey !== undefined) {
        this.delete(oldestKey);
      }
    }
    return super.set(key, value);
  }

  get(key) {
    if (!this.has(key)) return undefined;
    const val = super.get(key);
    this.delete(key);
    super.set(key, val);
    return val;
  }
}

const cache = new LRUMap(2000);
let redisClient = null;
let isRedisConnected = false;
export const getRedisClient = () => redisClient;
export const getRedisConnected = () => isRedisConnected;

if (process.env.USE_REDIS === "true") {
  const host = process.env.REDIS_HOST || "127.0.0.1";
  const port = parseInt(process.env.REDIS_PORT, 10) || 6379;
  
  console.log(`🔌 Initializing Redis client on ${host}:${port}...`);
  
  try {
    redisClient = new Redis({
      host,
      port,
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (isRedisConnected && times > 3) {
          console.warn("⚠️ Redis connection lost. Falling back to in-memory cache.");
          isRedisConnected = false;
        }
        // Keep reconnecting forever with exponential backoff capped at 3 seconds
        return Math.min(times * 150, 3000);
      }
    });

    redisClient.on("connect", () => {
      isRedisConnected = true;
      console.log("✅ Redis connected successfully. Centralized caching active.");
    });

    redisClient.on("error", (err) => {
      if (isRedisConnected) {
        console.warn("⚠️ Redis client error. Falling back to in-memory cache:", err.message);
        isRedisConnected = false;
      }
    });
  } catch (err) {
    console.error("❌ Failed to initialize Redis client:", err.message);
  }
}

function clone(val) {
  if (val === undefined || val === null) return val;
  try {
    return structuredClone(val);
  } catch (err) {
    return JSON.parse(JSON.stringify(val));
  }
}

export const setCache = async (key, value, ttl = 60) => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), "EX", ttl);
      return;
    } catch (err) {
      console.warn("Redis setCache error, falling back to local memory:", err.message);
    }
  }

  // Bypass local in-memory cache for user and host profiles to prevent multi-instance stale cache
  if (key.startsWith("user:") || key.startsWith("host:")) {
    return;
  }

  const expiresAt = Date.now() + (ttl * 1000);
  cache.set(key, {
    value: clone(value),
    expiresAt
  });
};

export const getCache = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.warn("Redis getCache error, falling back to local memory:", err.message);
    }
  }

  // Bypass local in-memory cache for user and host profiles to prevent multi-instance stale cache
  if (key.startsWith("user:") || key.startsWith("host:")) {
    return null;
  }

  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return clone(entry.value);
};

export const deleteCache = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (err) {
      console.warn("Redis deleteCache error, falling back to local memory:", err.message);
    }
  }
  cache.delete(key);
};

export const deleteCacheByPrefix = async (prefix) => {
  if (isRedisConnected && redisClient) {
    try {
      let cursor = "0";
      do {
        const res = await redisClient.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
        cursor = res[0];
        const keys = res[1];
        if (keys && keys.length > 0) {
          await redisClient.del(keys);
        }
      } while (cursor !== "0");
      return;
    } catch (err) {
      console.warn("Redis deleteCacheByPrefix error, falling back to local memory:", err.message);
    }
  }

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};
