/**
 * WARNING: This in-memory TTL cache is a single-instance stopgap.
 * If the backend is ever horizontally scaled (e.g., across multiple instances/containers),
 * this local cache must be replaced with a centralized solution like Redis.
 * Specifically, `deleteCacheByPrefix` must trigger invalidation cluster-wide to prevent
 * stale data across instances.
 */

const cache = new Map();

function clone(val) {
  if (val === undefined || val === null) return val;
  try {
    return structuredClone(val);
  } catch (err) {
    return JSON.parse(JSON.stringify(val));
  }
}

export const setCache = async (key, value, ttl = 60) => {
  const expiresAt = Date.now() + (ttl * 1000);
  cache.set(key, {
    value: clone(value),
    expiresAt
  });
};

export const getCache = async (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return clone(entry.value);
};

export const deleteCache = async (key) => {
  cache.delete(key);
};

export const deleteCacheByPrefix = async (prefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};
