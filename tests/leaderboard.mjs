import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createHandler } from '../netlify/lib/leaderboard.mjs';
import { rulesVersion } from '../arcade/challenge.js';
import { solve } from './arcade.mjs';
assert.equal(rulesVersion('basketball'), 6);
assert.equal(rulesVersion('football'), 3);
const values = new Map(); let revision = 0, now = Date.now();
const store = {
  async get(key, options) { const value = values.get(key)?.data; return value == null ? null : options?.type === 'json' ? structuredClone(value) : value; },
  async getWithMetadata(key) { return values.has(key) ? structuredClone(values.get(key)) : null; },
  async set(key, data, options) { return this.setJSON(key, data, options); },
  async setJSON(key, data, options) {
    const current = values.get(key);
    if (options?.onlyIfNew && current || options?.onlyIfMatch && current?.etag !== options.onlyIfMatch) return { modified: false };
    values.set(key, { data: structuredClone(data), etag: String(++revision) }); return { modified: true };
  }
};
const handler = createHandler(() => store, () => now);
const call = (body, suffix = '') => handler(new Request(`https://example.com/.netlify/functions/leaderboard${suffix}`, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' }, body: JSON.stringify(body) }));
const start = async (player = randomUUID(), game = 'basketball') => (await call({ action: 'start', game, team: 'texas', player })).json();
assert.equal((await call(undefined, '?game=bogus')).status, 400);
assert.deepEqual((await (await call(undefined, '?game=basketball')).json()).rows, []);
const player = randomUUID(); const round = await start(player);
const submission = { action: 'submit', token: round.token, attempts: solve('basketball', round.seed), name: 'Texas Fan', score: 999999 };
assert.equal((await call(submission)).status, 400, 'Too-fast rounds are rejected');
now += 120000;
assert.equal((await call({ ...submission, token: round.token.slice(0, -4) + 'fake' })).status, 400);
assert.equal((await call({ ...submission, attempts: [{ time: 60, shooter: 0 }] })).status, 400);
assert.equal((await call({ ...submission, name: '<script>' })).status, 400);
const expectedScore = submission.attempts.length * 3 - 2;
let posted = await (await call(submission)).json();
assert.equal(posted.score, expectedScore, 'Server ignores the supplied score and replays inputs');
assert.equal(posted.rows.length, 1); assert.equal(posted.rows[0].team, 'texas');
assert(!('player' in posted.rows[0])); assert(!('id' in posted.rows[0]));
assert.equal((await (await call(submission)).json()).rows.length, 1, 'Retry is idempotent');
const lesser = await start(player); now += 120000;
await call({ ...submission, token: lesser.token, attempts: [] });
assert.equal((await (await call(undefined, '?game=basketball')).json()).rows[0].score, expectedScore);
const rounds = await Promise.all(Array.from({ length: 5 }, () => start())); now += 120000;
const results = await Promise.all(rounds.map((round, i) => call({ ...submission, token: round.token, attempts: solve('basketball', round.seed), name: `Fan ${i}` })));
assert(results.every(result => result.status === 200));
assert.equal((await (await call(undefined, '?game=basketball')).json()).rows.length, 6, 'Concurrent updates retain every score');
const foot = await start(randomUUID(), 'football'); now += 120000;
posted = await (await call({ ...submission, token: foot.token, attempts: solve('football', foot.seed) })).json();
assert.equal(posted.score, 15); assert.equal(posted.rows[0].longest, 60);
assert.equal((await (await call(undefined, '?game=basketball')).json()).rows.length, 6, 'Game boards are separate');
now += 3600001;
assert.equal((await call(submission)).status, 400, 'Expired tokens are rejected');
assert.equal((await handler(new Request('https://example.com/api', { method: 'POST', headers: { Origin: 'https://evil.example' } }))).status, 403);
const unavailable = createHandler(() => { throw new Error('offline'); });
assert.equal((await unavailable(new Request('https://example.com/?game=basketball'))).status, 503);
console.log('Passed: persisted shared scores, replay verification, retries, concurrent writers, game separation, invalid/expired rounds, and outages.');
