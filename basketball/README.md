# Hoops Challenge

Updated to Arcade v3: flick-speed input, changing wind and a shared Netlify leaderboard.
See [Arcade v3 documentation](../arcade/README.md) for current hosting and verification.
The original layout and field reference notes below are retained for context.

HTML/CSS/JavaScript game for the existing site hosting. Practice works without a server; shared scores use the Netlify function.

Each team hub links to the matching theme:
- `/basketball/?team=vols`
- `/basketball/?team=gators`
- `/basketball/?team=tide`

The game defaults to Tennessee if the team parameter is absent or unknown. Personal bests are stored separately for each team on the current device. If browser storage is unavailable, play still works and the page explains that the best score is temporary.

## Local preview

From the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/rockytop/` and follow **Play Vols Hoops**, or open a game URL directly. Keep the preview local until the user approves publishing.

## Physics checks

With Node.js 22 or newer:

```sh
node --experimental-default-type=module tests/hoops.mjs
```

Checks cover made and missed shots, rim bounces, all ten shooting positions, consistent scoring across simulation steps, streak bonuses, net transit time, and scoring only after the ball clears the net.

Browser checks: drag upward from the ball; take shots with the keyboard controls; complete ten shots; replay; reload to verify the best score; follow each team's game link and return link; inspect a narrow phone-sized viewport. A resized desktop browser is not a substitute for final testing on a physical phone.
