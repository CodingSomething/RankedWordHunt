# Visual direction

The redesign is intentionally less sharp and less "product dashboard"-like.

## What changed

- Warm cream canvas instead of gray-beige.
- Coral is the primary interactive color; muted teal and butter yellow are supporting colors.
- Rounded, tactile letter tiles with small imperfections/offsets rather than perfectly flat square controls.
- Softer cards with quiet shadows instead of strong black rules around every section.
- Less all-caps microcopy and fewer badge-like UI elements.
- Login/register pages now include a simple physical WORD tile rack rather than a generic split-screen marketing panel.
- The game board is the visual center of the match and uses a muted teal tray with warm ivory tiles.
- Leaderboard and lobby keep clear information hierarchy but feel more like a game surface than an analytics dashboard.

## Palette

- Canvas: `#F7F0E6`
- Surface: `#FFFAF3`
- Ink: `#293237`
- Coral: `#D96950`
- Muted teal: `#557F73`
- Butter: `#E9BD59`

These are all CSS variables in `apps/web/src/styles/globals.css`, so changing the feel later should mostly be a palette-level edit instead of a component rewrite.
