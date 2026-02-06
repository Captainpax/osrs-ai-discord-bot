import axios from 'axios';
import logger from '../utility/logger.mjs';
import { getCachedOrFetch } from '../storage/mongo/cache.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;
const BASE_URL = 'https://prices.runescape.wiki/api/v1/osrs';

/**
 * @description Fetch and cache the full item mapping (id<->name).
 */
async function getMapping() {
  const key = 'osrs:mapping:v1';
  const result = await getCachedOrFetch(key, DAY_MS, async () => {
    const { data } = await axios.get(`${BASE_URL}/mapping`, {
      headers: { 'User-Agent': 'oldWiseMan/1.0 (discord bot project)'}
    });
    return data; // array of { id, name, ... }
  });
  return result; // { data, updatedAt, cached }
}

/**
 * @description Resolve item name to mapping entry using simple heuristics.
 * @param {Array} mapping
 * @param {string} query
 */
function resolveItem(mapping, query) {
  const q = String(query).trim().toLowerCase();
  let exact = mapping.find(m => m.name?.toLowerCase() === q);
  if (exact) return exact;
  return mapping.find(m => m.name?.toLowerCase().includes(q));
}

/**
 * @description Fetch latest price for a given item id.
 */
async function getLatestPriceById(id) {
  const key = `osrs:price:id:${id}`;
  const result = await getCachedOrFetch(key, DAY_MS, async () => {
    const { data } = await axios.get(`${BASE_URL}/latest`, {
      headers: { 'User-Agent': 'oldWiseMan/1.0 (discord bot project)' },
      params: { id }
    });
    return data; // { data: { [id]: { high, highTime, low, lowTime } } }
  });
  return result;
}

/**
 * @description Public API: lookup price by item name. Returns { item, price, updatedAt, cached }.
 */
export async function priceLookupByName(query) {
  const mappingRes = await getMapping();
  const mapping = mappingRes.data || [];
  const item = resolveItem(mapping, query);
  if (!item) {
    return { notFound: true, query, message: `Item not found for query "${query}".` };
  }
  const priceRes = await getLatestPriceById(item.id);
  const priceObj = priceRes.data?.data?.[item.id] || null;
  return {
    item: { id: item.id, name: item.name },
    price: priceObj,
    updatedAt: priceRes.updatedAt,
    cached: priceRes.cached
  };
}

export default { priceLookupByName };
