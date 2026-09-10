import { getStore } from '@netlify/blobs';
import { createHandler } from '../lib/leaderboard.mjs';
export default createHandler(() => getStore({ name: 'arcade-leaderboard', consistency: 'strong' }));
export const config = {
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] }
};
