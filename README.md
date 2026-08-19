# Robot Runner 🤖

A block-based coding puzzle game built with Django, featuring a **Neubrutalist + Hand-Drawn Fusion** aesthetic. Players snap together chunky code blocks (Move Forward, Turn Left, Turn Right, Repeat) to guide a sketchy robot mascot across obstacle mazes to the flag before the clock runs out.



## Levels & Gameplay

- **Level 1 (Easy)**: 6×6 Grid — 2-Minute Timer. Master foundational sequencing (`move`, `turnLeft`, `turnRight`).
- **Level 2 (Medium)**: 8×8 Grid — 3-Minute Timer. Introduce loop optimization (`repeat`).
- **Level 3 (Hard)**: 10×10 Grid — 3-Minute Timer. **The Grand Labyrinth**: 49 obstacle walls with the entire first column sealed and a blocking wall at (2,1), requiring a 20-block algorithm (>12 blocks required).
- **Level 4 (Expert)**: 12×12 Grid — 3-Minute Timer. **The Master Gauntlet**: An enormous 86-wall maze with the entire first column sealed by obstacle walls, obstacles guarding (5,9) and (5,11), 10 turns, and 11 distinct corridors requiring a 36-block master algorithm!

## Features

- **Block Coding Palette**:
  - `Move Forward`, `Turn Left`, `Turn Right`, `Repeat (1–99×)`.
  - **Drag-and-Drop** with glowing drop zones and insertion bars.
  - **In-Slot "+ Add Block ▾" Quick Menu** inside any container loop.
  - **Click-to-Target Selection**: Click any loop slot to make it active, then click palette blocks to add directly.
  - **Micro-Controls**: Reorder up/down (`▲`/`▼`), Duplicate (`⧉`), and Delete (`✕`).
- **Execution & Animation**:
  - Real-time active block highlighting during execution.
  - Variable speed controls (`1x`, `2x`, `4x`) and step-by-step debugging (`Step`).
  - Emergency `Stop` button and keyboard shortcut (<kbd>Space</kbd> / <kbd>Esc</kbd>).
- **Procedural Sound & Visuals**:
  - Web Audio synthesizer: move, turn, obstacle hit, win fanfare, countdown ticks, and mute toggle.
  - Hand-drawn doodle confetti celebration on victory.
  - Star ratings (⭐⭐⭐) and best completion time saved to `localStorage`.
- **Desktop Keyboard Shortcuts**:
  - <kbd>Space</kbd>: Run / Stop execution
  - <kbd>Esc</kbd>: Halt robot
  - <kbd>1</kbd> / <kbd>2</kbd> / <kbd>4</kbd>: Switch animation speed

