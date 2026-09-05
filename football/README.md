# Field Goal Challenge

Static five-kick game for the existing site, with separate Tennessee, Alabama and Florida themes. Team links use `?team=vols`, `?team=tide` or `?team=gators`. An absent or invalid team defaults to Tennessee.

Each make scores three points and moves the next attempt ten yards back, starting at 20 yards. A miss repeats the distance. The longest successful kick is saved separately for each team on the device. Browser-storage errors do not prevent play.

## Tennessee reference

The end zone uses four rows and thirty columns of alternating orange-and-white squares. Each square is five feet per side, surrounded on every side by five feet of green turf. These dimensions account for the full 160-by-30-foot end zone. The pattern is projected from field coordinates, so the checks shrink with distance rather than being a flat screen overlay. There is no lettering over Tennessee's checkerboard.

Reference: [Tennessee Athletics — Rocky Top's Picasso Paints His End Zones Masterpiece](https://utsports.com/news/2007/10/12/rocky_top_s_picasso_paints_his_end_zones_masterpiece).

Visual reference inspected: [Neyland checkerboard photograph](https://i.pinimg.com/736x/06/37/df/0637df127d485234cfd4e78366619832--tennessee-volunteers-southern.jpg). The photo is reference-only and is not included in the game. The surrounding stadium is a stylized game setting, not an exact stadium reconstruction.

## Local testing

From the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/football/?team=vols` or follow Field Goal Challenge on a team page.

With Node.js 22 or newer:

```sh
node --experimental-default-type=module tests/field-goal.mjs
```

Physics checks cover makes, short and wide misses, crossbar and upright contact, every kick distance, wind compensation, frame-step stability, distance progression and checkerboard dimensions.

Browser checks cover five-kick rounds, keyboard kicks, swipe input at a phone-sized viewport, replay, persistence after reload, team navigation and horizontal overflow. Physical-phone testing remains a user preview step before publishing.

The game reuses `../basketball/style.css` and has no third-party runtime dependencies. Keep all five files in `football/` together with that shared stylesheet when deploying.
