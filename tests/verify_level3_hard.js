const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock RobotSim & runProgram for verification
const DIRS = ['right', 'down', 'left', 'up'];
const DIR_VECTOR = {
    right: [1, 0],
    down: [0, 1],
    left: [-1, 0],
    up: [0, -1],
};

function turn(dir, way) {
    const i = DIRS.indexOf(dir);
    if (way === 'right') return DIRS[(i + 1) % 4];
    return DIRS[(i + 3) % 4];
}

class RobotSim {
    constructor(level) {
        this.level = level;
        this.reset();
    }
    reset() {
        this.x = this.level.start.x;
        this.y = this.level.start.y;
        this.dir = this.level.start.dir;
    }
    aheadCell() {
        const [dx, dy] = DIR_VECTOR[this.dir];
        return { x: this.x + dx, y: this.y + dy };
    }
    isBlocked(cell) {
        if (cell.x < 0 || cell.y < 0 || cell.x >= this.level.grid_width || cell.y >= this.level.grid_height) {
            return true;
        }
        return this.level.obstacles.some((o) => o[0] === cell.x && o[1] === cell.y);
    }
    isFinish(cell) {
        return cell.x === this.level.finish.x && cell.y === this.level.finish.y;
    }
}

function* runProgram(program, sim) {
    let steps = 0;
    function* execList(list) {
        for (const block of list) {
            steps++;
            if (steps > 600) {
                yield { kind: 'limit' };
                return true;
            }
            const stop = yield* execBlock(block);
            if (stop) return true;
        }
        return false;
    }
    function* execBlock(block) {
        if (block.type === 'move') {
            const target = sim.aheadCell();
            if (sim.isBlocked(target)) {
                yield { kind: 'move', ok: false, blockId: block.id };
                return true;
            }
            sim.x = target.x;
            sim.y = target.y;
            if (sim.isFinish(target)) {
                yield { kind: 'move', ok: true, blockId: block.id };
                yield { kind: 'finish', blockId: block.id };
                return true;
            }
            yield { kind: 'move', ok: true, blockId: block.id };
            return false;
        }
        if (block.type === 'turnLeft') {
            sim.dir = turn(sim.dir, 'left');
            yield { kind: 'turnLeft', blockId: block.id };
            return false;
        }
        if (block.type === 'turnRight') {
            sim.dir = turn(sim.dir, 'right');
            yield { kind: 'turnRight', blockId: block.id };
            return false;
        }
        if (block.type === 'repeat') {
            for (let i = 0; i < (block.count || 1); i++) {
                const stop = yield* execList(block.children || []);
                if (stop) return true;
            }
            return false;
        }
        return false;
    }
    const stopped = yield* execList(program);
    if (!stopped) yield { kind: 'done' };
}

function countTotalBlocks(program) {
    let count = 0;
    for (const b of program) {
        count++;
        if (b.children) count += countTotalBlocks(b.children);
    }
    return count;
}

function testLevel(level, program) {
    const sim = new RobotSim(level);
    const gen = runProgram(program, sim);
    let last;
    let stepCount = 0;
    for (const action of gen) {
        stepCount++;
        last = action;
        if (action.kind === 'finish') break;
        if (action.kind === 'move' && !action.ok) break;
    }
    const passed = last && last.kind === 'finish' && sim.isFinish({ x: sim.x, y: sim.y });
    return { passed, last, x: sim.x, y: sim.y, steps: stepCount, blockCount: countTotalBlocks(program) };
}

// -------------------------------------------------------------
// DESIGNING LEVEL 3: THE GRAND LABYRINTH (10x10)
// Must have dense obstacles, many turns, requiring >12 blocks!
// -------------------------------------------------------------

// Path trace from (0,0) facing right to (9,9):
// 1. Move right from (0,0) to (4,0). Obstacles at (5,0), (6,0)... (repeat 4 move) [2 blocks]
// 2. Turn right (facing down) [1 block]
// 3. Move down from (4,0) to (4,3). Obstacles at (4,4), (4,5)... (repeat 3 move) [2 blocks]
// 4. Turn left (facing right) [1 block]
// 5. Move right from (4,3) to (8,3). Obstacles at (9,3)... (repeat 4 move) [2 blocks]
// 6. Turn right (facing down) [1 block]
// 7. Move down from (8,3) to (8,6). Obstacles at (8,7)... (repeat 3 move) [2 blocks]
// 8. Turn right (facing left) [1 block]
// 9. Move left from (8,6) to (1,6). Obstacles at (0,6)... (repeat 7 move) [2 blocks]
// 10. Turn left (facing down) [1 block]
// 11. Move down from (1,6) to (1,9). (repeat 3 move) [2 blocks]
// 12. Turn left (facing right) [1 block]
// 13. Move right from (1,9) to (9,9) [Finish!]. (repeat 8 move) [2 blocks]
//
// Total blocks: 2 + 1 + 2 + 1 + 2 + 1 + 2 + 1 + 2 + 1 + 2 + 1 + 2 = 20 blocks! (> 12 blocks!)

// Walls around the path corridors:
const level3_obstacles = [
    // Blocking row 0 past x=4
    [5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
    // Blocking above and below row 0 corridor
    [1, 1], [2, 1], [3, 1],
    // Blocking past (4,3) downwards
    [4, 4], [4, 5], [3, 3], [3, 4], [3, 5], [5, 1], [5, 2],
    // Blocking past (8,3) to the right
    [9, 2], [9, 3], [9, 4], [6, 2], [7, 2], [8, 2],
    // Blocking past (8,6) downwards
    [8, 7], [8, 8], [9, 5], [9, 6], [7, 4], [7, 5],
    // Blocking above row 6 corridor
    [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [0, 5],
    // Blocking below row 6 corridor except at x=1
    [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [0, 6], [0, 7],
    // Blocking column 1 corridor sides on rows 7..9
    [0, 8], [0, 9], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8]
];

const level3_candidate = {
    id: 3,
    name: 'Hard',
    subtitle: 'The Labyrinth of Obstacles',
    grid_width: 10,
    grid_height: 10,
    time_limit: 180,
    start: { x: 0, y: 0, dir: 'right' },
    finish: { x: 9, y: 9 },
    obstacles: level3_obstacles,
    allowed_blocks: ['move', 'turnLeft', 'turnRight', 'repeat'],
    hint: "Navigate the intricate labyrinth: snake through the narrow corridors using sequences of repeats and precision turns to reach the flag!",
    next_level: null,
};

const prog3 = [
    { type: 'repeat', count: 4, children: [{ type: 'move' }] },
    { type: 'turnRight' },
    { type: 'repeat', count: 3, children: [{ type: 'move' }] },
    { type: 'turnLeft' },
    { type: 'repeat', count: 4, children: [{ type: 'move' }] },
    { type: 'turnRight' },
    { type: 'repeat', count: 3, children: [{ type: 'move' }] },
    { type: 'turnRight' },
    { type: 'repeat', count: 7, children: [{ type: 'move' }] },
    { type: 'turnLeft' },
    { type: 'repeat', count: 3, children: [{ type: 'move' }] },
    { type: 'turnLeft' },
    { type: 'repeat', count: 8, children: [{ type: 'move' }] }
];

console.log('Testing Level 3 Candidate with 20 blocks...');
const res3 = testLevel(level3_candidate, prog3);
console.log('Result:', res3);
console.log('Total blocks used in solution:', res3.blockCount);
