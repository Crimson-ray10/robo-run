# CONTEXT.md — Robot Runner technical brief

This document contains the complete technical specification, architectural design decisions, aesthetic design guidelines, and level verification details for Robot Runner.

## 1. Overview & Aesthetics

A Django-served, block-based programming puzzle game featuring a **Neubrutalist + Hand-Drawn Fusion** aesthetic:
- **Neubrutalist Foundations**: Thick `#0B2A19` borders (`3px`), solid hard offset shadows (`6px` offset, 0-blur), flat saturated color blocks, chunky typography (`Archivo Black`, `Fredoka`), and tactile button press mechanics.
- **Hand-Drawn Accent Layer**: Sketchy robot mascot illustration SVG, wobbly marker double-underlines, tilted sticker badges (`-3deg`), padlock doodles, and doodle confetti.
- **Color Palette**:
  - Calm surfaces: `--turquoise: #1FAFA0`, `--forest: #14432A`, `--forest-deep: #0B2A19`, `--sky: #BFE8EA`, `--sky-pale: #E4F6F2`, `--cream: #FBF3E3`.
  - Pop accents: `--coral: #FF6B4A`, `--sun: #FFC94A`, `--grape: #6C5CE7`, `--bad-nb: #E8483A`.

| Level | Name | Blocks unlocked | Grid | Timer | Teaches |
|---|---|---|---|---|---|
| 1 | Easy | Move, Turn Left, Turn Right | 6×6 | 2:00 | Sequencing & Directional Navigation |
| 2 | Medium | + Repeat | 8×8 | 3:00 | Loops & Repetition Optimization |
| 3 | Hard | All unlocked | 10×10 | 3:00 | **The Grand Labyrinth** (col 0 sealed, 2x1 obstacle, >12 blocks required) |
| 4 | Expert | All unlocked | 12×12 | 3:00 | **The Master Gauntlet** (86 walls, col 0 sealed, (5,9) & (5,11) obstacles, 36-block solution) |

Progress (unlocked levels, completion status, stars earned, best times) is stored in browser `localStorage`.

## 2. Game rules

- **Main Timer**: Per-level countdown (2:00 for Level 1, 3:00 for Levels 2, 3 & 4) configured via `time_limit` in `game/levels.py`.
- **Collision Recovery**: If the robot attempts to enter an obstacle cell or outside grid bounds:
  - It triggers a collision hit (`{kind: 'move', ok: false}`).
  - The robot resets to the start dock.
  - The main timer pauses and a **1:00 recovery window** begins.
  - If the player presses Run before the recovery timer runs out, recovery is dismissed and the main timer resumes.
- **Completion & Rating**:
  - Reaching the flag cell lands `{kind: 'finish'}`.
  - Unlocks the next level and saves completion, best time, and star rating:
    - ⭐⭐⭐ 3 Stars: ≥ 50% time left
    - ⭐⭐☆ 2 Stars: ≥ 20% time left
    - ⭐☆☆ 1 Star: Completed
- **Execution Controls**:
  - Speed selector: `1x` (350ms), `2x` (175ms), `4x` (80ms).
  - Step button: Executes single atomic action per click.
  - Stop button: Halts execution immediately and resets robot.

## 3. The Block Data Model

Program blocks are plain JS objects:
```js
[
  { type: 'move', id: 1 },
  { type: 'turnRight', id: 2 },
  { type: 'repeat', id: 3, count: 5, children: [ { type: 'move', id: 4 } ] }
]
```

## 4. The Interpreter (`interpreter.js`)

`runProgram(program, sim)` is a generator yielding atomic actions:
- `{kind:'move', ok:true, blockId}` — advanced one cell
- `{kind:'move', ok:false, blockId}` — blocked; execution stops (collision)
- `{kind:'turnLeft'|'turnRight', blockId}` — rotated in place
- `{kind:'finish', blockId}` — landed on flag cell
- `{kind:'done'}` — program exhausted without reaching flag
- `{kind:'limit'}` — safety valve (>1000 atomic actions)

## 5. Verified Level Solutions

### Level 1 (Easy) — 6×6, 2:00 Timer
- Start: `(0, 0)` facing `'right'`. Finish: `(5, 5)`.
- Obstacles: `[[1, 3], [4, 1], [0, 4], [5, 1]]`.
- Program (12 actions):
  `move` ×3, `turnRight`, `move` ×5, `turnLeft`, `move` ×2.

### Level 2 (Medium) — 8×8, 3:00 Timer
- Start: `(0, 0)` facing `'right'`. Finish: `(7, 7)`.
- Obstacles: `[[1, 1], [2, 4], [5, 2], [0, 5], [6, 1], [2, 6], [4, 1], [6, 3]]`.
- Program (3 blocks, 16 actions):
  `repeat 7 { move }`, `turnRight`, `repeat 7 { move }`.

### Level 3 (Hard) — 10×10, 3:00 Timer — The Grand Labyrinth
- Start: `(0, 0)` facing `'right'`. Finish: `(9, 9)`.
- 49 Dense Obstacle walls including full column 0 wall and wall at `(2, 1)`.
- Program (20 blocks, 39 actions).

### Level 4 (Expert) — 12×12, 3:00 Timer — The Master Gauntlet
- Start: `(0, 0)` facing `'right'`. Finish: `(11, 11)`.
- 86 Obstacle walls, including the entire first column (y=1..11) and obstacles at `(5, 9)` and `(5, 11)`.
- Program (36 blocks, 63 actions):
  - `repeat 3 { move }`
  - `turnRight`
  - `repeat 4 { move }`
  - `turnLeft`
  - `repeat 4 { move }`
  - `turnLeft`
  - `repeat 3 { move }`
  - `turnRight`
  - `repeat 4 { move }`
  - `turnRight`
  - `repeat 6 { move }`
  - `turnRight`
  - `repeat 10 { move }`
  - `turnLeft`
  - `repeat 4 { move }`
  - `turnLeft`
  - `repeat 3 { move }`
  - `turnLeft`
  - `move`
  - `turnRight`
  - `repeat 2 { move }`
  - `turnRight`
  - `move`
  - `turnLeft`
  - `repeat 5 { move }`
