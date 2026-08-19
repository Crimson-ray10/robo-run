const fs = require('fs');
const path = require('path');

// Reconstruct exact screenshot grid
// S = Start, F = Finish, # = Obstacle in screenshot, B = Blue mark in screenshot, . = Empty

const SCREENSHOT_GRID = [
    // 012345678901
    "S...########", // 0
    "###.###.....", // 1
    "###.###.###.", // 2
    "###.###.###.", // 3
    "#.......###.", // 4
    "#.#####....B", // 5  (B is the blue marked block at (11,5))
    "#.######.##.", // 6
    "#.######.##.", // 7
    "#..######.##", // 8
    "#..######.##", // 9
    "#..##...####", // 10
    "#....#.....F"  // 11
];

// Extract obstacle positions from SCREENSHOT_GRID, treating B as obstacle
const obstacles = [];
for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
        const ch = SCREENSHOT_GRID[y][x];
        if (ch === '#' || ch === 'B') {
            obstacles.push([x, y]);
        }
    }
}

console.log('Total obstacles extracted directly from screenshot:', obstacles.length);
console.log('Includes blue marked cell [11, 5]:', obstacles.some(o => o[0] === 11 && o[1] === 5));
console.log('Includes [5, 11]:', obstacles.some(o => o[0] === 5 && o[1] === 11));

// Now let's trace the path from S (0,0) to F (11,11):
// Let's use BFS to find the shortest/cleanest valid path through the screenshot grid:
const DIRS = [
    { name: 'right', dx: 1, dy: 0 },
    { name: 'down', dx: 0, dy: 1 },
    { name: 'left', dx: -1, dy: 0 },
    { name: 'up', dx: 0, dy: -1 }
];

function isBlocked(x, y) {
    if (x < 0 || y < 0 || x >= 12 || y >= 12) return true;
    return obstacles.some(o => o[0] === x && o[1] === y);
}

// Print the grid with obstacles
console.log('\n--- GRID VISUALIZATION ---');
for (let y = 0; y < 12; y++) {
    let row = '';
    for (let x = 0; x < 12; x++) {
        if (x === 0 && y === 0) row += '🤖 ';
        else if (x === 11 && y === 11) row += '🏁 ';
        else if (x === 11 && y === 5) row += '🟦 '; // The new obstacle on blue mark
        else if (isBlocked(x, y)) row += '🧱 ';
        else row += '·· ';
    }
    console.log(`${y.toString().padStart(2, ' ')}: ${row}`);
}

// BFS to find all paths from (0,0) to (11,11):
const queue = [{ x: 0, y: 0, path: [{ x: 0, y: 0 }] }];
const visited = new Set(['0,0']);
let foundPath = null;

while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === 11 && cur.y === 11) {
        foundPath = cur.path;
        break;
    }
    for (const d of DIRS) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        const key = `${nx},${ny}`;
        if (!isBlocked(nx, ny) && !visited.has(key)) {
            visited.add(key);
            queue.push({ x: nx, y: ny, path: [...cur.path, { x: nx, y: ny }] });
        }
    }
}

if (foundPath) {
    console.log('\n✅ VALID PATH FOUND TO (11,11)! Total step length:', foundPath.length - 1);
    console.log('Path coordinates:', foundPath.map(p => `(${p.x},${p.y})`).join(' -> '));
} else {
    console.error('\n❌ NO PATH FOUND!');
}
