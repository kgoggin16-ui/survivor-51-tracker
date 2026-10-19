# Survivor 51 Tribe Tracker

Spoiler-safe fan site showing tribes, alliances and castaways for each episode of Survivor 51.
Plain HTML, CSS and JavaScript. No build step.

## Files

- `index.html`, `style.css`, `app.js`: the site itself. Leave these alone for weekly updates.
- `data.json`: everything about the season. **This is the only file that changes each week.**
- `assets/photos/`: one headshot per castaway, named by their key (e.g. `kilby.jpg`).
- `assets/fonts/`: Survivant by Tepid Monkey Fonts, with its ReadMe (keep both unaltered; required by the font's terms).
- `netlify.toml`: tells Netlify to serve the folder as-is and never cache `data.json`.

## Weekly update (data.json)

1. Add one object to `episodes`:
   `n` (number), `title`, `aired` (e.g. "Oct 21"), `tribes` (lineup at the END of the episode, by tribe key),
   `out` (who left, in order: `{ "id", "how", "tribe" }`, where `tribe` is the tribe they left from).
2. Add an entry to `alliances` keyed by the episode number (as a string). Each group is
   `{ "name", "kind": "Alliance" | "Trio" | "Pair" | "Voting bloc", "members": [keys], "note" }`.
   Spoiler rule: only what was shown on screen by the end of that episode. Never edit earlier episodes with later reveals.
   Members who left in an earlier episode are hidden automatically; those who left that episode are greyed out.
3. New tribe or merge: add it to `tribes` with `name`, `color` (ring color) and `text` (label color, at least 4.5:1 contrast on #0B0B0C).

Commit the change and Netlify republishes the site within about a minute.

## Run locally

`data.json` is loaded with `fetch`, so open the site through a local server rather than double-clicking the file:

```
python3 -m http.server 8000
```

then visit http://localhost:8000.

Unofficial fan site, not affiliated with CBS. Cast photos by Robert Voets/CBS.
