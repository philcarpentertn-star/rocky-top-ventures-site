# Arcade v3: flicks, wind and shared scores

Both games keep their team themes and keyboard controls. Flick direction controls aim;
length and elapsed time control power. The server issues a random seed for each round.
Wind strength follows the same progression for everybody; direction varies. Basketball uses a fixed camera and shooting spots along the three-point arc.
Football alternates left hash, right hash and center starting positions, with the
viewpoint aligned to the kicker. Both renderers and score replay use the same spots. Wind stays
fixed during a shot, then changes for the next attempt. Hoops has ten attempts; football
has five attempts with the existing 20–60-yard progression. Old personal-best storage
keys are intentionally separate from v3.

## Netlify deployment

The existing Netlify site builds with `npm run build`, publishes `dist/`, and bundles
`netlify/functions/leaderboard.mjs`. Install dependencies with `pnpm install`; the lockfile
is checked in. No account migration, database provisioning or manually configured secret
is needed: `@netlify/blobs` receives site credentials automatically in deployed Functions.
The site-wide, strongly consistent `arcade-leaderboard` store survives deployments.
Production and deploy previews on the same site share this store, so do not post synthetic
test scores there. Local testing uses a separate development store.

The server generates its signing key once with an atomic create. It verifies signed,
one-hour round tokens, input limits, full round length and minimum simulation time, then
replays inputs with the same physics code as the browser. It ignores client-provided scores.
Each game's top 20 is bounded, stored separately, and updated using conditional writes to
avoid losing concurrent submissions. Equal scores prefer the longest kick, then earlier
submission. A browser player ID retains only that player's best posted round; nickname
changes do not make a second entry. Clearing device storage creates a new player identity.
Public responses contain only nickname, team, score, makes and longest kick.

This is a casual leaderboard, not a prize or identity-verified competition. Replay checks
reject fabricated score numbers but cannot prove human input or prevent automated play.
Netlify's function rate limit is 60 requests per minute per IP/domain. Nicknames are 2–16
restricted characters, rendered with textContent. To remove an abusive entry, edit the
appropriate `v3/basketball` or `v3/football` blob in Netlify's Data & Storage > Blobs UI.
Keep signing-key private; rotating it expires in-progress rounds.

## Checks and local preview

`pnpm test` checks physics, solvability in both wind directions, flick handling, server
replay, malformed/expired tokens, score isolation, idempotency and concurrent submissions.
`pnpm build` prepares the deployable static files without publishing backend source.

A plain static server supports practice play; shared-score requests fail gracefully.
Use `node scripts/preview.mjs` for a full local preview with a separate file-backed score
store in `.netlify/arcade-preview.json`. Local preview scores never reach the public board.
The production storage adapter must still be verified after a Netlify deployment.

References:
- https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- https://docs.netlify.com/build/functions/api/
