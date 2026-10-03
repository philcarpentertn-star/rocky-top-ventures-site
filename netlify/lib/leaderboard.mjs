import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { rulesVersion, TEAMS } from '../../arcade/challenge.js';
import { replay } from '../../arcade/replay.js';
const validGame = game => ['basketball', 'football'].includes(game);
const validId = value => typeof value === 'string' && /^[0-9a-f-]{36}$/.test(value);
const response = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const sign = (payload, secret) => createHmac('sha256', secret).update(payload).digest('base64url');
export function readToken(token, secret, now) {
  if (typeof token !== 'string' || token.length > 2048) throw new Error('Start a new round.');
  const [payload, signature, extra] = token.split('.');
  const expected = sign(payload || '', secret);
  if (extra || !signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Start a new round.');
  const round = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (round.version !== rulesVersion(round.game) || round.expires < now || round.started > now || !validGame(round.game) || !TEAMS.includes(round.team)) throw new Error('This round expired. Play again to post a score.');
  return round;
}
async function signingKey(store) {
  let secret = await store.get('signing-key');
  if (!secret) {
    await store.set('signing-key', randomBytes(32).toString('hex'), { onlyIfNew: true });
    secret = await store.get('signing-key');
  }
  if (!secret) throw new Error('Leaderboard is temporarily unavailable.');
  return secret;
}
const rank = (a, b) => b.score - a.score || b.longest - a.longest || a.created - b.created || a.id.localeCompare(b.id);
const publicRows = rows => rows.map(({ name, team, score, made, longest }) => ({ name, team, score, made, longest }));
export function createHandler(getStore, clock = Date.now) {
  return async request => {
    const url = new URL(request.url);
    if (!['GET', 'POST'].includes(request.method)) return response({ error: 'Method not allowed.' }, 405);
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return response({ error: 'Use the game on this website.' }, 403);
    try {
      const store = getStore();
      if (request.method === 'GET') {
        const game = url.searchParams.get('game');
        if (!validGame(game)) return response({ error: 'Unknown game.' }, 400);
        const rows = await store.get(`v${rulesVersion(game)}/${game}`, { type: 'json' }) || [];
        return response({ rows: publicRows(rows) });
      }
      if (!request.headers.get('content-type')?.includes('application/json')) return response({ error: 'Expected JSON.' }, 415);
      // Bound input even when the sender omits Content-Length.
      const reader = request.body?.getReader();
      if (!reader) return response({ error: 'Missing request.' }, 400);
      const chunks = []; let bytes = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 131072) { await reader.cancel(); return response({ error: 'Request too large.' }, 413); }
        chunks.push(Buffer.from(value));
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { return response({ error: 'Invalid request.' }, 400); }
      if (!body || typeof body !== 'object') return response({ error: 'Invalid request.' }, 400);
      const now = clock();
      if (body.action === 'start') {
        if (!validGame(body.game) || !TEAMS.includes(body.team) || !validId(body.player)) return response({ error: 'Unknown game or player.' }, 400);
        const secret = await signingKey(store);
        const round = { id: randomUUID(), player: body.player, game: body.game, team: body.team, seed: randomBytes(4).readUInt32LE(), version: rulesVersion(body.game), started: now, expires: now + 3600000 };
        const payload = Buffer.from(JSON.stringify(round)).toString('base64url');
        return response({ token: `${payload}.${sign(payload, secret)}`, seed: round.seed });
      }
      if (body.action !== 'submit') return response({ error: 'Unknown action.' }, 400);
      const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
      if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{1,15}$/.test(name)) return response({ error: 'Use a nickname with 2–16 letters, numbers, spaces, hyphens or underscores.' }, 400);
      let round, result;
      try {
        round = readToken(body.token, await signingKey(store), now);
        result = replay(round.game, round.seed, body.attempts);
        if (now - round.started + 1000 < result.duration * 1000) throw new Error('Finish playing the round before posting.');
      } catch (error) { return response({ error: error.message }, 400); }
      const entry = { id: round.id, player: round.player, name, team: round.team, score: result.score, made: result.made, longest: result.longest, created: now };
      const key = `v${rulesVersion(round.game)}/${round.game}`;
      // Conditional writes preserve both scores when two fans finish together.
      for (let retry = 0; retry < 8; retry++) {
        const current = await store.getWithMetadata(key, { type: 'json' });
        const rows = current?.data || [];
        const previous = rows.find(row => row.player === entry.player);
        if (previous && (previous.id === entry.id || rank(previous, entry) <= 0)) return response({ rows: publicRows(rows), score: result.score, ranked: true });
        const next = rows.filter(row => row.player !== entry.player).concat(entry).sort(rank).slice(0, 20);
        if (!next.some(row => row.id === entry.id)) return response({ rows: publicRows(rows), score: result.score, ranked: false });
        const written = await store.setJSON(key, next, current ? { onlyIfMatch: current.etag } : { onlyIfNew: true });
        if (written.modified) return response({ rows: publicRows(next), score: result.score, ranked: true });
      }
      return response({ error: 'Lots of fans are posting. Please try again.' }, 503);
    } catch {
      return response({ error: 'Leaderboard is temporarily unavailable. Your game still works; try again shortly.' }, 503);
    }
  };
}
