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
// DESIGN LEVEL 4 ROUTE AROUND (11, 5):
// -------------------------------------------------------------
// From (0,0) facing right:
// (0,0) -> (3,0) right [3 moves]
// Turn right -> (3,0) -> (3,4) down [4 moves]
// Turn left -> (3,4) -> (7,4) right [4 moves]
// Turn left -> (7,4) -> (7,1) up [3 moves]
// Turn right -> (7,1) -> (9,1) right [2 moves]
// Turn right -> (9,1) -> (9,4) down [3 moves] (inside corridor at col 9!)
// Turn left -> (9,4) -> (11,4) right [2 moves] (entering col 11 above the (11,5) obstacle!)
// Wait, from (9,4) we can go down to (9,7), bypassing column 11 entirely!
// Let's trace going down at column 9:
// (7,1) -> (10,1) right [3 moves] -> Turn right -> (10,1) -> (10,3) down [2 moves]
// OR:
// At (7,1):
// Move right to (11,1) [4 moves]
// Turn right -> (11,1) -> (11,3) down [2 moves] (or 11,4)
// If (11,5) is an obstacle:
// Turn left at (11,4)? No, left is outside grid (x=12).
// Turn right at (11,4) -> facing left -> move to (9,4)? If (10,4) is open!
// Let's check:
// (11,1) -> (11,4) down [3 moves]
// Turn right -> (11,4) -> (9,4) left [2 moves] (stepping through (10,4))
// Turn left -> (9,4) -> (9,7) down [3 moves] (stepping around (11,5) on the inside!)
// Turn right -> (9,7) -> (1,7) left [8 moves]
// Turn left -> (1,7) -> (1,11) down [4 moves]
// Turn left -> (1,11) -> (4,11) right [3 moves]
// Turn left -> (4,11) -> (4,10) up [1 move]
// Turn right -> (4,10) -> (6,10) right [2 moves] (stepping over (5,11) and (5,9)!)
// Turn right -> (6,10) -> (6,11) down [1 move]
// Turn left -> (6,11) -> (11,11) right [5 moves] (FINISH!)

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
addLine(11, 1, 11, 4);
addLine(11, 4, 9, 4);
addLine(9, 4, 9, 7);
addLine(9, 7, 1, 7);
addLine(1, 7, 1, 11);
addLine(1, 11, 4, 11);
addLine(4, 11, 4, 10);
addLine(4, 10, 6, 10);
addLine(6, 10, 6, 11);
addLine(6, 11, 11, 11);

console.log('Is (11,5) in path?', pathCells.has('11,5'));
console.log('Is (5,9) in path?', pathCells.has('5,9'));
console.log('Is (5,11) in path?', pathCells.has('5,11'));

// Build obstacles array:
const obstacles = [];
const seen = new Set();
function addObs(x, y) {
    const k = `${x},${y}`;
    if (!seen.has(k) && !pathCells.has(k) && x >= 0 && x < 12 && y >= 0 && y < 12) {
        seen.add(k);
        obstacles.push([x, y]);
    }
}

// 1. First column (x=0) for y=1..11
for (let y = 1; y < 12; y++) {
    addObs(0, y);
}

// 2. Specific requested obstacles: (11,5), (5,9), (5,11)
addObs(11, 5);
addObs(5, 9);
addObs(5, 11);

// 3. Frame corridors
const other_obs = [
    // Blocking row 0 past x=3
    [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0],
    // Blocking sides of (3,0)->(3,4)
    [1, 1], [2, 1], [4, 1], [5, 1], [6, 1],
    [1, 2], [2, 2], [4, 2], [5, 2], [6, 2], [8, 2],
    [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [8, 3],
    // Blocking below (3,4)->(7,4)
    [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [8, 5],
    // Blocking around row 6
    [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [10, 6], [11, 6],
    // Blocking row 8
    [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [10, 8], [11, 8],
    // Blocking row 9
    [2, 9], [3, 9], [4, 9], [6, 9], [7, 9], [8, 9], [10, 9], [11, 9],
    // Blocking row 10 (except path at x=4,5,6)
    [2, 10], [3, 10], [7, 10], [8, 10], [9, 10], [10, 10], [11, 10]
];

for (const [x, y] of other_obs) {
    addObs(x, y);
}

console.log('Total obstacles in Level 4:', obstacles.length);
console.log('Contains [11, 5]:', obstacles.some(o => o[0] === 11 && o[1] === 5));
console.log('Contains [5, 9]:', obstacles.some(o => o[0] === 5 && o[1] === 9));
console.log('Contains [5, 11]:', obstacles.some(o => o[0] === 5 && o[1] === 11));

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
    { type: 'repeat', count: 3, children: [{ type: 'move' }] },
    { type: 'turnRight' },
    { type: 'repeat', count: 2, children: [{ type: 'move' }] },
    { type: 'turnLeft' },
    { type: 'repeat', count: 3, children: [{ type: 'move' }] },
    { type: 'turnRight' },
    { type: 'repeat', count: 8, children: [{ type: 'move' }] },
    { type: 'turnLeft' },
    { type: 'repeat', count: 4, children: [{ type: 'move' }] },
    { type: 'turnLeft' },
    { type: 'repeat', count: 3, children: [{ type: 'move' }] },
    { type: 'turnLeft' },
    { type: 'move' },
    { type: 'turnRight' },
    { type: 'repeat', count: 2, children: [{ type: 'move' }] },
    { type: 'turnRight' },
    { type: 'move' },
    { type: 'turnLeft' },
    { type: 'repeat', count: 5, children: [{ type: 'move' }] }
];

const sim4 = new RobotSim(level4);
const gen4 = runProgram(prog4, sim4);
let last4;
let steps4 = 0;
for (const a of gen4) {
    steps4++;
    last4 = a;
    if (a.kind === 'finish' || (a.kind === 'move' && !a.ok)) break;
}

console.log('Result:', {
    passed: last4 && last4.kind === 'finish',
    x: sim4.x,
    y: sim4.y,
    steps: steps4,
    totalBlocks: countTotalBlocks(prog4)
});

if (last4 && last4.kind === 'finish') {
    console.log('🎉 Level 4 with (11,5) obstacle verified successfully!');
} else {
    console.error('❌ Failed:', last4);
    process.exit(1);
}
