import Cache from './models/Cache.mjs';

/**
 * @description Returns cached data if present and fresh; otherwise returns null.
 * @param {string} key
 * @param {number} maxAgeMs
 * @returns {Promise<{data: any, updatedAt: Date} | null>}
 */
export async function getCache(key, maxAgeMs) {
  const entry = await Cache.findOne({ key });
  if (!entry) return null;
  const age = Date.now() - new Date(entry.updatedAt).getTime();
  if (age <= maxAgeMs) {
    return { data: entry.data, updatedAt: entry.updatedAt };
  }
  return null;
}

/**
 * @description Upserts cache data for a key. Does not cache if data is null or undefined.
 * @param {string} key
 * @param {any} data
 * @returns {Promise<{data: any, updatedAt: Date} | null>}
 */
export async function setCache(key, data) {
  if (data === null || data === undefined) {
    return null;
  }

  const updated = await Cache.findOneAndUpdate(
    { key },
    { data, updatedAt: new Date() },
    { upsert: true, new: true }
  );
  return { data: updated.data, updatedAt: updated.updatedAt };
}

/**
 * @description Deletes a cache entry by key.
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function deleteCache(key) {
  const result = await Cache.deleteOne({ key });
  return result.deletedCount > 0;
}

/**
 * @description Helper to either get cached data or fetch and cache it.
 * @param {string} key
 * @param {number} maxAgeMs
 * @param {() => Promise<any>} fetcher
 * @param {object} [options]
 * @param {(data: any) => boolean} [options.shouldCache] - Optional predicate to decide if result should be cached.
 * @returns {Promise<{data:any, updatedAt: Date, cached: boolean}>}
 */
export async function getCachedOrFetch(key, maxAgeMs, fetcher, options = {}) {
  const cached = await getCache(key, maxAgeMs);
  if (cached) return { ...cached, cached: true };

  const data = await fetcher();
  
  // Decide whether to cache based on options or simple truthiness
  const shouldCache = options.shouldCache ? options.shouldCache(data) : (data !== null && data !== undefined);

  if (shouldCache) {
    const stored = await setCache(key, data);
    return { ...stored, cached: false };
  }

  return { data, updatedAt: new Date(), cached: false };
}
