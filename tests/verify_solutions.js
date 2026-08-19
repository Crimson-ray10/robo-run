const fs = require('fs');
const path = require('path');
const vm = require('vm');

const interpreterCode = fs.readFileSync(path.join(__dirname, '../game/static/game/js/interpreter.js'), 'utf8');
vm.runInThisContext(interpreterCode);

const LEVELS = {
    1: {
        id: 1,
        name: "Easy",
        grid_width: 6,
        grid_height: 6,
        time_limit: 120,
        start: { x: 0, y: 0, dir: "right" },
        finish: { x: 5, y: 5 },
        obstacles: [[1, 3], [4, 1], [0, 4], [5, 1]],
        allowed_blocks: ["move", "turnLeft", "turnRight"],
        next_level: 2,
    },
    2: {
        id: 2,
        name: "Medium",
        grid_width: 8,
        grid_height: 8,
        time_limit: 180,
        start: { x: 0, y: 0, dir: "right" },
        finish: { x: 7, y: 7 },
        obstacles: [
            [1, 1], [2, 4], [5, 2], [0, 5], [6, 1], [2, 6],
            [4, 1], [6, 3]
        ],
        allowed_blocks: ["move", "turnLeft", "turnRight", "repeat"],
        next_level: 3,
    },
    3: {
        id: 3,
        name: "Hard",
        grid_width: 10,
        grid_height: 10,
        time_limit: 180,
        start: { x: 0, y: 0, dir: "right" },
        finish: { x: 9, y: 9 },
        obstacles: [
            [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9],
            [5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
            [1, 1], [2, 1], [3, 1], [5, 1],
            [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
            [3, 3], [9, 3],
            [3, 4], [4, 4], [7, 4], [9, 4],
            [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [9, 5],
            [9, 6],
            [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7],
            [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8]
        ],
        allowed_blocks: ["move", "turnLeft", "turnRight", "repeat"],
        next_level: 4,
    },
    4: {
        id: 4,
        name: "Expert",
        grid_width: 12,
        grid_height: 12,
        time_limit: 180,
        start: { x: 0, y: 0, dir: "right" },
        finish: { x: 11, y: 11 },
        obstacles: [
            [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [0, 11],
            [5, 9], [5, 11],
            [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0],
            [1, 1], [2, 1], [4, 1], [5, 1], [6, 1],
            [1, 2], [2, 2], [4, 2], [5, 2], [6, 2], [8, 2], [9, 2], [10, 2],
            [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [8, 3], [9, 3], [10, 3],
            [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [8, 5], [9, 5], [10, 5],
            [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6],
            [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8],
            [2, 9], [3, 9], [4, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9],
            [2, 10], [3, 10], [7, 10], [8, 10], [9, 10], [10, 10], [11, 10]
        ],
        allowed_blocks: ["move", "turnLeft", "turnRight", "repeat"],
        next_level: null,
    },
};

function countBlocks(program) {
    let count = 0;
    for (const b of program) {
        count++;
        if (b.children) count += countBlocks(b.children);
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
    return { passed, last, x: sim.x, y: sim.y, steps: stepCount, blockCount: countBlocks(program) };
}

// Level 1 Solution
const prog1 = [
    { type: 'move' }, { type: 'move' }, { type: 'move' },
    { type: 'turnRight' },
    { type: 'move' }, { type: 'move' }, { type: 'move' }, { type: 'move' }, { type: 'move' },
    { type: 'turnLeft' },
    { type: 'move' }, { type: 'move' }
];

// Level 2 Solution
const prog2 = [
    { type: 'repeat', count: 7, children: [{ type: 'move' }] },
    { type: 'turnRight' },
    { type: 'repeat', count: 7, children: [{ type: 'move' }] }
];

// Level 3 Solution (20 blocks!)
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

// Level 4 Solution (36 blocks!)
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
    { type: 'repeat', count: 10, children: [{ type: 'move' }] },
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

console.log('--- RUNNING ALL 4 LEVEL VERIFICATION TESTS ---');

const res1 = testLevel(LEVELS[1], prog1);
console.log(`Level 1 (Easy, 2m):   ${res1.passed ? 'PASSED ✅' : 'FAILED ❌'} (${res1.steps} actions, landed at (${res1.x}, ${res1.y}))`);

const res2 = testLevel(LEVELS[2], prog2);
console.log(`Level 2 (Medium, 3m): ${res2.passed ? 'PASSED ✅' : 'FAILED ❌'} (${res2.steps} actions, landed at (${res2.x}, ${res2.y}))`);

const res3 = testLevel(LEVELS[3], prog3);
console.log(`Level 3 (Hard, 3m):   ${res3.passed ? 'PASSED ✅' : 'FAILED ❌'} (${res3.steps} actions, ${res3.blockCount} blocks [>12 required!], landed at (${res3.x}, ${res3.y}))`);

const res4 = testLevel(LEVELS[4], prog4);
console.log(`Level 4 (Expert, 3m): ${res4.passed ? 'PASSED ✅' : 'FAILED ❌'} (${res4.steps} actions, ${res4.blockCount} blocks [Master Gauntlet!], landed at (${res4.x}, ${res4.y}))`);

// Naive test (straight move should fail on 2, 3, 4)
const naive2 = testLevel(LEVELS[2], [{ type: 'repeat', count: 9, children: [{ type: 'move' }] }]);
const naive3 = testLevel(LEVELS[3], [{ type: 'repeat', count: 9, children: [{ type: 'move' }] }]);
const naive4 = testLevel(LEVELS[4], [{ type: 'repeat', count: 12, children: [{ type: 'move' }] }]);

console.log(`\nNaive straight-move check:`);
console.log(`Level 2 naive failed safely: ${!naive2.passed ? 'YES ✅' : 'NO ❌'}`);
console.log(`Level 3 naive hit obstacle:  ${naive3.last.kind === 'move' && !naive3.last.ok ? 'YES ✅' : 'NO ❌'}`);
console.log(`Level 4 naive hit obstacle:  ${naive4.last.kind === 'move' && !naive4.last.ok ? 'YES ✅' : 'NO ❌'}`);

if (res1.passed && res2.passed && res3.passed && res4.passed && res3.blockCount > 12 && res4.blockCount > res3.blockCount) {
    console.log('\n🎉 ALL 4 LEVELS VERIFIED AND CERTIFIED SUCCESSFULLY!');
    process.exit(0);
} else {
    console.error('\n❌ VERIFICATION FAILED');
    process.exit(1);
}
