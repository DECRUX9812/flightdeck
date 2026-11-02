# REVIEW — Flightdeck launch (32.6 s)

## What it is
A product-led launch film for an open-source app that renders in `console.log`.
Spec: `SPEC.md`. Storyline: A, "The tab you never open" (`STORYLINES.md`).
Output: 1920×1080, 30 fps, 32.6 s, H.264 + AAC, −16.8 LUFS integrated, −1.5 dBTP.

## Frame pass (checked on the rendered file, not the timeline)

| t | Frame | Verdict |
| --- | --- | --- |
| 0.2 | full-bleed console UI, already alive | works: frame 0 is the product, never black |
| 1.0 | pull back, window chrome resolves | works, 1.05 s power2.inOut |
| 2.0 | window at 0.78 on the ground + caption | fixed: the caption used to sit on the window's footer; now single-line at bottom 38 px |
| 4.6 | second caption | works |
| 5.9–6.4 | dive into the wordmark, blur 0→9 px | works; cut lands on the fastest frame |
| 6.45 | clean wordmark on the ground | works: the old window is killed at 6.34, no bleed-through |
| 9.0 | fleet, full-bleed | works, caption legible over the scrim |
| 16.4 | incidents | works |
| 19.3–20.3 | ⌘K palette | the app freezes while the modal traps focus, so the shot holds; a 5% push keeps it alive |
| 23.5 | window back at 0.58 + caption | works |
| 25.5 | claim, type-only | works |
| 31.0 | end card, command typed, cursor blinking | works |

## What is honest
- Every product frame is the app's own `console.log` output, captured from the running app and
  replayed frame for frame. No mocked UI, no invented numbers.
- The wordmark is the app's own ASCII mark, gradient sampled from the product's Geist palette.
- The only staged things are camera, typography and pacing.

## Known weak spots
- The palette beat is 1.7 s of a mostly frozen frame; it earns its place as a feature beat, not as motion.
- The claim ("Production control, in the tab you already have.") is the one line that is copy rather than product.
- Music is `score.wav` from the person's own library, not a licensed catalog track. If this is published,
  swap in a licensed bed — the cut is built on 140 BPM / 1.714 s bars, so any 140 BPM track drops in.
- No voiceover by design; the film is built to autoplay muted.

## Next, if it gets another pass
1. Capture the palette with the app repainting (the renderer pauses on modal focus) so the typing is live.
2. Replace the static claim with the fleet table's error-budget bar draining to 0 and recovering — a real
   number earning the line.
3. A 9:16 cut: same three proof beats, captions set larger, hook at 0.0 s.

## Sound
Measured with `hyperframes audio`, not heard: music present from 0.42 s, peak at 27.88 s (the impact under
the end card), no silence, no clipping, −16.8 LUFS / −1.5 dBTP. Key ticks sit at 19.35–19.89 (palette) and
28.02–28.74 (the command typing).
