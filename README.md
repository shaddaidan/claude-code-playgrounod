# NEURONS NOT INCLUDED

```
  ░░░░░▓▓▓▓▓▓▓░░░░░░
  ░░▓▓▓▓▓▓▓▓▓▓▓▓░░░░
  ░▓▓▓▓▓░░░▓▓▓▓▓▓░░░
  ▓▓▓▓░▓▓▓▓░▓▓▓▓▓▓░░
  ▓▓▓▓░░░░░░░▓▓▓▓▓▓░
  ░▓▓▓▓░▓▓▓░░▓▓▓▓▓░░
  ░░▓▓▓▓▓░░░▓▓▓▓▓░░░
  ░░░░▓▓▓▓▓▓▓▓▓▓░░░░
  ░░░░░░░▓▓▓▓░░░░░░░
  ░░░░░░░░▓▓░░░░░░░░
```

### *(spoiler: you don't)*

**Live demo:** https://shaddaidan.github.io/claude-code-playgrounod/

---

## What Is This

A pixel-art Simon Says memory game that will make you question whether your neurons ever showed up for work in the first place.

A 3x3 grid of glowing colored tiles flashes a sequence at you. You click them back in the same order. Simple? Sure. Humbling? Absolutely. Each successful round adds another tile. Every 5 rounds the game speeds up and your brain starts filing complaints with HR.

---

## How To Play

- Watch the grid flash a sequence of colored tiles
- Wait for the entire sequence to finish — patience is required
- Click the tiles **in the exact same order** you saw them
- Nail it: the sequence grows by one tile, you get points, you feel briefly competent
- Miss it: you lose a life, the sequence replays, and the tiles judge you in silence

---

## Scoring

| Thing | Points |
|---|---|
| Correct sequence | sequence length x 10 |
| Combo multiplier | starts 1x, +0.5 every 3 wins (max 4x) |
| Wrong answer | multiplier resets. sorry. |

---

## The Science Bit (It's Real)

This game trains **working memory** — the mental sticky note your **prefrontal cortex** uses to hold information while you act on it. Researchers consistently link stronger working memory to better focus, reasoning, learning speed, and resistance to distraction.

By holding an increasingly long tile sequence in your head while suppressing the urge to just guess, you're exercising the exact neural machinery that lets you stay focused when it matters. So technically this is productivity.

---

## Difficulty Scaling

- **Flash duration** starts at 600ms per tile
- Drops by 60ms every level (floor: 250ms)
- Sequence grows by 1 tile every round — by level 2 you're recalling 6+ tiles at faster speed
- Combo multiplier rewards consistency; one mistake and it resets

---

## Humor Philosophy

The game knows it's being mean to you. It leans into it. Error messages are honest. Level-up banners are concerned. The game over screen provides an official medical diagnosis. None of this is medical advice.

---

## Tech Stack

- **HTML** — four screens, zero iframes
- **CSS** — Press Start 2P font, CRT scanlines, pixel tile glow effects
- **Vanilla JavaScript** — no frameworks, no dependencies, no excuses
- **Web Audio API** — procedurally generated 8-bit tones for tile flashes and feedback

No build step. Open `index.html` and it works.

---

## Running Locally

```bash
git clone https://github.com/shaddaidan/claude-code-playgrounod.git
cd claude-code-playgrounod
open index.html
```

That's it. There is no `npm install`. There is no webpack. There is only the grid.

---

> yes the repo name has a typo. it stays.
