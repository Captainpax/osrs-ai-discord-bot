import axios from 'axios';
import { OLD_WISE_MAN_URL } from './loadedVariables.mjs';

const api = axios.create({
  baseURL: OLD_WISE_MAN_URL,
  timeout: 10000
});

export async function ensureProfileAndToken(discordId, username) {
  const { data } = await api.post('/profile/ensure', { discordId, username });
  return data; // { profile, token, created }
}

export async function linkOsrsName(token, osrsName, uuid) {
  const { data } = await api.post(
    '/profile/link',
    uuid ? { uuid, osrsName } : { osrsName },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function unlinkOsrsName(token, uuid) {
  const { data } = await api.post(
    '/profile/unlink',
    uuid ? { uuid } : {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function getStats(identifier, skill) {
  if (skill) {
    const { data } = await api.get(`/osrs/stats/${encodeURIComponent(identifier)}/skill/${encodeURIComponent(skill)}`);
    return data;
  }
  const { data } = await api.get(`/osrs/stats/${encodeURIComponent(identifier)}`);
  return data;
}

export async function priceLookup(item) {
  const { data } = await api.get(`/osrs/pricelookup/${encodeURIComponent(item)}`);
  return data; // { item, price, updatedAt, cached }
}

export default {
  ensureProfileAndToken,
  linkOsrsName,
  unlinkOsrsName,
  getStats,
  priceLookup
};
