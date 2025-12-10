import redis from "../config/redis.js";

export const getCache = async key => {
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
};

export const setCache = async (key, data, ttl = 60) => {
  await redis.set(key, JSON.stringify(data), { EX: ttl });
};

export const deleteCache = async key => {
  await redis.del(key);
};
