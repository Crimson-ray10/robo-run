"""
Level definitions for the Robot Runner block-coding game.

Grid coordinate system: (x, y) with x = column (0 is left), y = row (0 is top).
Facing directions: 'right', 'down', 'left', 'up'.

Available blocks across levels:
  - Level 1 (Easy):   move, turnLeft, turnRight (Basic sequencing, 2-minute timer)
  - Level 2 (Medium): + repeat                  (Loops, 3-minute timer)
  - Level 3 (Hard):   Grand Labyrinth with obstacle wall in first column and 2x1 (>12 blocks needed, 3-minute timer)
  - Level 4 (Expert): Master Gauntlet: 12x12 maze with first column obstacles and obstacles at 5x9 and 5x11!
"""

LEVELS = {
    1: {
        "id": 1,
        "name": "Easy",
        "subtitle": "Learn to move and turn",
        "grid_width": 6,
        "grid_height": 6,
        "time_limit": 120,  # 2 minutes
        "start": {"x": 0, "y": 0, "dir": "right"},
        "finish": {"x": 5, "y": 5},
        "obstacles": [[1, 3], [4, 1], [0, 4], [5, 1]],
        "allowed_blocks": ["move", "turnLeft", "turnRight"],
        "hint": "Move across, turn, then move down to reach the flag. "
                "You have a 2-minute timer for this introductory mission.",
        "next_level": 2,
    },
    2: {
        "id": 2,
        "name": "Medium",
        "subtitle": "Use loops to repeat moves",
        "grid_width": 8,
        "grid_height": 8,
        "time_limit": 180,  # 3 minutes
        "start": {"x": 0, "y": 0, "dir": "right"},
        "finish": {"x": 7, "y": 7},
        "obstacles": [
            [1, 1], [2, 4], [5, 2], [0, 5], [6, 1], [2, 6],
            [4, 1], [6, 3]
        ],
        "allowed_blocks": ["move", "turnLeft", "turnRight", "repeat"],
        "hint": "The path has long straight stretches — use a Repeat block "
                "instead of stacking many Move blocks. Try moving along the perimeter.",
        "next_level": 3,
    },
    3: {
        "id": 3,
        "name": "Hard",
        "subtitle": "The Grand Labyrinth",
        "grid_width": 10,
        "grid_height": 10,
        "time_limit": 180,  # 3 minutes
        "start": {"x": 0, "y": 0, "dir": "right"},
        "finish": {"x": 9, "y": 9},
        "obstacles": [
            # First column (x=0) obstacles for y=1..9
            [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9],
            # Row 0 barrier
            [5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
            # Row 1 barriers (including obstacle wall at 2x1)
            [1, 1], [2, 1], [3, 1], [5, 1],
            # Row 2 barriers
            [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
            # Row 3 barriers
            [3, 3], [9, 3],
            # Row 4 barriers
            [3, 4], [4, 4], [7, 4], [9, 4],
            # Row 5 barriers
            [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [9, 5],
            # Row 6 barriers
            [9, 6],
            # Row 7 barriers
            [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7],
            # Row 8 barriers
            [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8]
        ],
        "allowed_blocks": ["move", "turnLeft", "turnRight", "repeat"],
        "hint": "An intricate labyrinth with obstacles along the first column and at (2,1)! "
                "Construct a complex multi-loop sequence (over 12 blocks needed) to navigate through.",
        "next_level": 4,
    },
    4: {
        "id": 4,
        "name": "Expert",
        "subtitle": "The Master Gauntlet",
        "grid_width": 12,
        "grid_height": 12,
        "time_limit": 180,  # 3 minutes
        "start": {"x": 0, "y": 0, "dir": "right"},
        "finish": {"x": 11, "y": 11},
        "obstacles": [
            # First Column (x=0) Obstacle Wall (y=1 to 11)
            [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [0, 11],
            # Obstacles on 5x9 and 5x11 blocks
            [5, 9], [5, 11],
            # Row 0 barrier
            [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0],
            # Row 1 barriers
            [1, 1], [2, 1], [4, 1], [5, 1], [6, 1],
            # Row 2 barriers
            [1, 2], [2, 2], [4, 2], [5, 2], [6, 2], [8, 2], [9, 2], [10, 2],
            # Row 3 barriers
            [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [8, 3], [9, 3], [10, 3],
            # Row 5 barriers
            [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [8, 5], [9, 5], [10, 5],
            # Row 6 barriers
            [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6],
            # Row 8 barriers
            [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8],
            # Row 9 barriers
            [2, 9], [3, 9], [4, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9],
            # Row 10 barriers
            [2, 10], [3, 10], [7, 10], [8, 10], [9, 10], [10, 10], [11, 10]
        ],
        "allowed_blocks": ["move", "turnLeft", "turnRight", "repeat"],
        "hint": "The Master Gauntlet! The first column is sealed, and obstacle walls guard cells (5,9) and (5,11). "
                "Structure your multi-loop bypass algorithm with extreme precision to reach the flag!",
        "next_level": None,
    },
}


def get_level(level_id):
    return LEVELS.get(level_id)
