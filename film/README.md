# The launch film (source)

The 33-second film in [`../docs/`](../docs) is a HyperFrames project. This folder is the source it
was built from — compositions, the capture tools, the spec and the review.

```
index.html              root composition: 5 scene hosts + music/SFX, 32.571 s
compositions/
  01-open.html          hook → pull back → dive into the wordmark → reveal
  02-fleet.html         full-bleed fleet table
  03-incidents.html     whip cut, incident timeline
  04-command.html       ⌘K palette
  05-end.html           payoff → claim → end card
tools/
  capture-frames.cjs    records the app's real console frames (JSON) from a running dev server
  render-frames.cjs     paints those frames to PNG and encodes a 1080p clip
  record.cjs            earlier CDP screencast prototype (unused in the final cut)
assets/footage/         the four clips cut from the app's own output
SPEC.md                 the director's brief: numbers, shots, banned defaults
STORYLINES.md           three storylines; A was picked
REVIEW.md               frame-by-frame review of the render
```

## How the footage was made

Nothing on screen is a mockup. The app logs one `console.log` per changed frame, so:

1. `capture-frames.cjs` opens the running app with `?tick=90` (demo mode) and records the exact
   `%c` payloads with timestamps.
2. `render-frames.cjs` paints those payloads into a 120×36 character grid at 1920×1080 and encodes
   them with `ffmpeg`, honouring the real frame timestamps.
3. The compositions cut camera moves around that footage.

## Re-rendering

```bash
npm i -g hyperframes          # or use npx hyperframes
hyperframes preview           # http://127.0.0.1:3002
hyperframes check
hyperframes render --output renders/video.mp4 --quality high
```

Two things are not in this repo:

- **Music**: `index.html` expects `assets/bgm/score.wav`, a 140 BPM bed. The cut is built on
  140 BPM (bar = 1.714 s), so any 140 BPM track drops in; drop yours at that path.
- **SFX**: `assets/sfx/*.mp3` — free sounds from the `media-use` pack (`whoosh-short`, `key-press`,
  `impact-bass-1`).

Everything else re-renders bit-for-bit from what is here.
