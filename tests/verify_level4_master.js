const fs = require('fs');
const path = require('path');

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
            if (steps > 1000) {
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

// -------------------------------------------------------------
// DESIGN LEVEL 4: THE MASTER GAUNTLET (12x12)
// -------------------------------------------------------------

// Leg trace:
// (0,0) -> (3,0) right [3 moves]
// (3,0) -> (3,4) down [4 moves]
// (3,4) -> (7,4) right [4 moves]
// (7,4) -> (7,1) up [3 moves]
// (7,1) -> (11,1) right [4 moves]
// (11,1) -> (11,7) down [6 moves]
// (11,7) -> (5,7) left [6 moves]
// (5,7) -> (5,9) down [2 moves]
// (5,9) -> (1,9) left [4 moves]
// (1,9) -> (1,11) down [2 moves]
// (1,11) -> (11,11) right [10 moves]

// Collect path cells to ensure walls never collide with path:
const pathCells = new Set();
function addLine(x1, y1, x2, y2) {
    const dx = Math.sign(x2 - x1);
    const dy = Math.sign(y2 - y1);
    let curX = x1, curY = y1;
    pathCells.add(`${curX},${curY}`);
    while (curX !== x2 || curY !== y2) {
        curX += dx;
        curY += dy;
        pathCells.add(`${curX},${curY}`);
    }
}

addLine(0, 0, 3, 0);
addLine(3, 0, 3, 4);
addLine(3, 4, 7, 4);
addLine(7, 4, 7, 1);
addLine(7, 1, 11, 1);
addLine(11, 1, 11, 7);
addLine(11, 7, 5, 7);
addLine(5, 7, 5, 9);
addLine(5, 9, 1, 9);
addLine(1, 9, 1, 11);
addLine(1, 11, 11, 11);

console.log('Path cells total:', pathCells.size);

// Define obstacles that block shortcuts and frame the corridors
const raw_obstacles = [
    // Blocking row 0 past x=3
    [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0],
    // Blocking left/right of (3,0)->(3,4) corridor
    [1, 1], [2, 1], [4, 1], [5, 1], [6, 1],
    [1, 2], [2, 2], [4, 2], [5, 2], [6, 2], [8, 2], [9, 2], [10, 2],
    [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [8, 3], [9, 3], [10, 3],
    // Blocking below (3,4)->(7,4) corridor
    [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5],
    // Blocking below row 5 / around row 6
    [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6],
    // Blocking right and above (5,7)->(11,7) corridor
    [11, 0],
    // Blocking below (5,7) corridor
    [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8], [3, 8], [4, 8],
    // Blocking around (1,9)->(5,9)
    [0, 8], [0, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9],
    // Blocking around (1,11)->(11,11) corridor
    [0, 10], [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10], [11, 10],
    [0, 11]
];

// Remove any duplicates or accidental path intersections
const obstacles = [];
const seenObs = new Set();
for (const [x, y] of raw_obstacles) {
    const k = `${x},${y}`;
    if (!seenObs.has(k) && !pathCells.has(k) && x >= 0 && x < 12 && y >= 0 && y < 12) {
        seenObs.add(k);
        obstacles.push([x, y]);
    }
}

console.log('Total verified obstacles for Level 4:', obstacles.length);

const level4 = {
    id: 4,
    name: 'Expert',
    subtitle: 'The Master Gauntlet',
    grid_width: 12,
    grid_height: 12,
    time_limit: 180,
    start: { x: 0, y: 0, dir: 'right' },
    finish: { x: 11, y: 11 },
    obstacles: obstacles,
    allowed_blocks: ['move', 'turnLeft', 'turnRight', 'repeat'],
    next_level: null,
};

const prog4 = [
    { type: 'repeat', count: 3, children: [{ type: 'move' }] },
    { type: 'turnRight' },
    { type: 'repeat', count: 4, children: [{ type: 'move' }] },
    { type: 'turnLeft' },
    { type: 'repeat', count: 4, children: [{ type: 'move' }] },
    { type: 'turnLeft' },
    { type: 'repeat', count: 3, children: [{ type: 'move' }] },
    { type: 'turnRight' },
    { type: 'repeat', count: 4, children: [{ type: 'move' }] },
    { type: 'turnRight' },
    { type: 'repeat', count: 6, children: [{ type: 'move' }] },
    { type: 'turnRight' },
    { type: 'repeat', count: 6, children: [{ type: 'move' }] },
    { type: 'turnLeft' },
    { type: 'repeat', count: 2, children: [{ type: 'move' }] },
    { type: 'turnRight' },
    { type: 'repeat', count: 4, children: [{ type: 'move' }] },
    { type: 'turnLeft' },
    { type: 'repeat', count: 2, children: [{ type: 'move' }] },
    { type: 'turnLeft' },
    { type: 'repeat', count: 10, children: [{ type: 'move' }] }
];

const sim = new RobotSim(level4);
const gen = runProgram(prog4, sim);
let last;
let steps = 0;
for (const a of gen) {
    steps++;
    last = a;
    if (a.kind === 'finish' || (a.kind === 'move' && !a.ok)) break;
}

console.log('Result:', {
    passed: last && last.kind === 'finish',
    x: sim.x,
    y: sim.y,
    steps,
    totalBlocks: countTotalBlocks(prog4)
});
