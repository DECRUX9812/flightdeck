# SPEC — Flightdeck launch ("The tab you never open")

GOAL:    A developer watching thinks "wait, that's a real app running in console.log" and sends it on.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps, 36.0 s (1080 frames).
TIME:    140 BPM → beat 0.4286 s (12.86 frames), bar 1.7143 s (51.43 frames). 21 bars = 36.0 s.
         Cuts land on bars; the mark lands on a bar downbeat.

LOOK:    ground #0a0a0a, radial lift to #171a20 at (50%, -10%), no grain, no vignette on footage.
         ink #ededed · muted #a1a1aa · hairline #262b33 · accent #0070f3 (rationed: the command line,
         one highlighted word, the cursor). The product keeps its own colours inside the window.
         Type: JetBrains Mono everywhere — display 104 px / 800 / -3% tracking, captions 40 px / 400 /
         0 tracking, labels 22 px / 500 / +8% tracking. One typeface, three sizes.
         Medium: the real product, captured from the console, inside its own window chrome (radius 14,
         1 px #262b33, shadow 0 40px 120px rgba(0,0,0,.55)).
         Window scale: 78% width (hook), 100% (proof), 58% (payoff), 30% (end card, behind the mark).

OBJECTS: the console window (real output, 120 x 36 cells); the wordmark (the app's own ASCII mark,
         gradient #ff4d8d → #c472fb → #3291ff); a block cursor (13 x 26 cells, accent).

MOTION:  enter power4.out 0.5 s · camera power2.inOut 0.7 s · exit power3.in 0.3 s · whip 0.25 s.
         Captions arrive by word-blur 0.13 s each, 0.07 s stagger, no translate; they hold still.
         The window's camera is the only thing that moves while a caption is up.

SHOTS:
  0.00– 3.43  live UI full-bleed → pull back to 78% window (0.4–1.5 s). Caption f30 "The console / is
              already open." (two lines, lands 1.0 s, holds to 3.2 s). Whoosh with the pull-back.
  3.43– 6.86  window holds dead still. Caption "Your dashboards aren't." at 3.9 s. A 12% push at 6.4 s
              starts the dive (motion carries into the cut).
  6.86–10.29  dive: window scales 1 → 2.6 around the wordmark, blur 0 → 14 px, then cut to type.
              FLIGHTDECK mark (30% width) at 7.3 s + "mission control for production" at 7.9 s.
              Low impact on the mark.
 10.29–15.43  fleet full-bleed, camera drifts down 6% and across 3%, punch 8% at the end.
              Caption "Twelve services, one table." at 11.0 s. Whoosh in.
 15.43–20.57  whip cut to incidents full-bleed, camera drifts up 4%. Caption "The timeline writes
              itself." at 16.1 s. Whoosh.
 20.57–25.71  zoom to the palette, full-bleed, holds. Caption "⌘K to anything." at 21.2 s.
              Key ticks under the reveal, one tick per visible row.
 25.71–29.14  pull back to 58% window, caption "Everything. One console." at 26.2 s, window holds.
 29.14–32.57  claim on the ground: "Mission control / for production." two lines, 104 px, accent on
              "production". Everything else leaves the frame.
 32.57–36.00  end card: mark 30% wipes in, "open source · MIT" and "$ npm run dev" type on, cursor
              blinks, hold 2.0 s. Riser into it, impact on the mark.

BANNED:  glow, particles, purple-blue gradient grounds, glass cards, three-card rows, KPI grids,
         corner labels, a docked logo, everything fading and sliding up, titles drifting after landing,
         a camera move standing in for the product acting.

QA:      f0 (real UI, no black), f100 (window resolved, caption up), f215 (mark, no old frame left),
         f320 (fleet readable, caption legible), f480 (incidents), f630 (palette), f790 (pull-back),
         f900 (claim, no product on screen), f1040 (end card, CTA readable).
