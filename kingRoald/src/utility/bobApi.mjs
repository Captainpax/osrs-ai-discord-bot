import axios from 'axios';
import { BOB_URL } from './loadedVariables.mjs';

const api = axios.create({
  baseURL: BOB_URL,
  timeout: 10000
});

/**
 * @description Tells Bob to push the leaderboard.
 * @returns {Promise<object>}
 */
export async function pushLeaderboard() {
  const { data } = await api.post('/admin/push-leaderboard');
  return data;
}

export default {
  pushLeaderboard
};
