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
// DESIGN LEVEL 4 PATH (With obstacles in col 0 for y=1..11 and obstacle at (5,9)):
// -------------------------------------------------------------

// Path:
// 1. (0,0) -> (3,0) right [3 moves]
// 2. Turn right -> (3,0) -> (3,4) down [4 moves]
// 3. Turn left -> (3,4) -> (7,4) right [4 moves]
// 4. Turn left -> (7,4) -> (7,1) up [3 moves]
// 5. Turn right -> (7,1) -> (11,1) right [4 moves]
// 6. Turn right -> (11,1) -> (11,7) down [6 moves]
// 7. Turn right -> (11,7) -> (5,7) left [6 moves]
// 8. Turn left -> (5,7) -> (5,8) down [1 move] (avoiding (5,9) which is an obstacle!)
// 9. Turn right -> (5,8) -> (1,8) left [4 moves]
// 10. Turn left -> (1,8) -> (1,11) down [3 moves] (col 1 since col 0 is all obstacles!)
// 11. Turn left -> (1,11) -> (11,11) right [10 moves] (FINISH!)

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
addLine(5, 7, 5, 8);
addLine(5, 8, 1, 8);
addLine(1, 8, 1, 11);
addLine(1, 11, 11, 11);

// Verify obstacle at (5,9) and all col 0 for y=1..11 are NOT in path:
console.log('Is (5,9) in path?', pathCells.has('5,9'));
for (let y = 1; y < 12; y++) {
    if (pathCells.has(`0,${y}`)) {
        console.error(`Error: (0,${y}) is in path!`);
    }
}

// Build obstacles array:
const obstacles = [];
const seenObs = new Set();
function addObs(x, y) {
    const k = `${x},${y}`;
    if (!seenObs.has(k) && !pathCells.has(k) && x >= 0 && x < 12 && y >= 0 && y < 12) {
        seenObs.add(k);
        obstacles.push([x, y]);
    }
}

// 1. First column (x=0) obstacles for y=1..11
for (let y = 1; y < 12; y++) {
    addObs(0, y);
}

// 2. Obstacle at 5x9
addObs(5, 9);

// 3. Frame the corridors and block shortcuts
const other_obstacles = [
    // Blocking row 0 past x=3
    [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0],
    // Blocking sides of (3,0)->(3,4)
    [1, 1], [2, 1], [4, 1], [5, 1], [6, 1],
    [1, 2], [2, 2], [4, 2], [5, 2], [6, 2], [8, 2], [9, 2], [10, 2],
    [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [8, 3], [9, 3], [10, 3],
    // Blocking below (3,4)->(7,4)
    [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [8, 5], [9, 5], [10, 5],
    // Blocking row 6
    [1, 6], [2, 6], [3, 6], [4, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6],
    // Blocking below (5,7)->(11,7)
    [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8], [4, 7],
    // Blocking around row 9
    [2, 9], [3, 9], [4, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9],
    // Blocking row 10 to frame the bottom corridor (1,11)->(11,11)
    [2, 10], [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10], [11, 10]
];

for (const [x, y] of other_obstacles) {
    addObs(x, y);
}

console.log('Total Level 4 obstacles:', obstacles.length);
console.log('Contains [5, 9]:', obstacles.some(o => o[0] === 5 && o[1] === 9));
console.log('First column obstacles count:', obstacles.filter(o => o[0] === 0).length);

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
    { type: 'move' },
    { type: 'turnRight' },
    { type: 'repeat', count: 4, children: [{ type: 'move' }] },
    { type: 'turnLeft' },
    { type: 'repeat', count: 3, children: [{ type: 'move' }] },
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

if (last && last.kind === 'finish') {
    console.log('✅ Level 4 test passed with flying colors!');
} else {
    console.error('❌ Level 4 test failed:', last);
    process.exit(1);
}
