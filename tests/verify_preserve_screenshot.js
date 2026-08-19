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

// Exact screenshot obstacles + [11, 5] (the blue mark):
const SCREENSHOT_GRID = [
    // 012345678901
    "S...########", // 0: robot at (0,0), row 0 barrier at x=4..11
    "###.###.....", // 1: col 0..2, col 4..6 are bricks; col 3, col 7..11 are open
    "###.###.###.", // 2: col 0..2, 4..6, 8..10 are bricks; col 3, 7, 11 are open
    "###.###.###.", // 3: col 0..2, 4..6, 8..10 are bricks; col 3, 7, 11 are open
    "#...........", // 4: col 0 is brick; col 1..11 are open
    "#.#####....#", // 5: col 0 is brick, 2..6 are bricks, [11,5] is the obstacle from the blue mark!
    "#.######..##", // 6: col 0, 2..7, 10..11 are bricks; col 1, 8..9 are open
    "#.######..##", // 7: col 0, 2..7, 10..11 are bricks; col 1, 8..9 are open
    "#..######.##", // 8: col 0, 3..8, 10..11 are bricks; col 1..2, 9 are open
    "#..######.##", // 9: col 0, 3..8, 10..11 are bricks; col 1..2, 9 are open
    "#..##...#.##", // 10: col 0, 3..4, 8, 10..11 are bricks; col 1..2, 5..7, 9 are open
    "#....#.....F"  // 11: col 0, 5 are bricks; col 1..4, 6..10 are open, flag at (11,11)
];

const obstacles = [];
for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
        if (SCREENSHOT_GRID[y][x] === '#') {
            obstacles.push([x, y]);
        }
    }
}

console.log('Total obstacles in Level 4:', obstacles.length);
console.log('Includes [11, 5] (blue mark):', obstacles.some(o => o[0] === 11 && o[1] === 5));
console.log('Includes [5, 11]:', obstacles.some(o => o[0] === 5 && o[1] === 11));

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

// Solution path:
// 1. (0,0) -> (3,0) right [3 moves]
// 2. Turn right -> (3,0) -> (3,4) down [4 moves]
// 3. Turn left -> (3,4) -> (7,4) right [4 moves]
// 4. Turn left -> (7,4) -> (7,1) up [3 moves]
// 5. Turn right -> (7,1) -> (11,1) right [4 moves]
// 6. Turn right -> (11,1) -> (11,4) down [3 moves] (stops at row 4 right before [11,5] obstacle!)
// 7. Turn right -> (11,4) -> (9,4) left [2 moves]
// 8. Turn left -> (9,4) -> (9,11) down [7 moves] (travels smoothly down column 9!)
// 9. Turn left -> (9,11) -> (11,11) right [2 moves] (FINISH!)

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
    { type: 'repeat', count: 7, children: [{ type: 'move' }] },
    { type: 'turnLeft' },
    { type: 'repeat', count: 2, children: [{ type: 'move' }] }
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
    console.log('🎉 LEVEL 4 FULLY CERTIFIED & PASSED WITH ALL SCREENSHOT OBSTACLES INTACT!');
} else {
    console.error('❌ Failed:', last4);
    process.exit(1);
}
