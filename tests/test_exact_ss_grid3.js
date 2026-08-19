// Let's test the complete path through the screenshot grid:

const SCREENSHOT_GRID_CLEAN = [
    // 012345678901
    "S...########", // 0
    "###.###.....", // 1
    "###.###.###.", // 2
    "###.###.###.", // 3
    "#...........", // 4: x=1..11 are open
    "#.#####....B", // 5: B is the blue marked block on (11,5)
    "#.######.##.", // 6: x=0, 2..7, 9..10 are bricks; x=1, 8, 11 are open
    "#.######.##.", // 7: x=0, 2..7, 9..10 are bricks; x=1, 8, 11 are open
    "#..######.##", // 8: x=0, 3..8, 10..11 are bricks; x=1, 2, 9 are open
    "#..######.##", // 9: x=0, 3..8, 10..11 are bricks; x=1, 2, 9 are open
    "#..##...####", // 10: x=0, 3..4, 8..11 are bricks; x=1..2, 5..7 are open
    "#....#.....F"  // 11: x=0, 5 are bricks; x=1..4, 6..10 are open, 11 is Finish!
];

const obstacles = [];
for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
        const ch = SCREENSHOT_GRID_CLEAN[y][x];
        if (ch === '#' || ch === 'B') {
            obstacles.push([x, y]);
        }
    }
}

console.log('Obstacles count in clean screenshot grid:', obstacles.length);
console.log('Includes blue marked cell [11, 5]:', obstacles.some(o => o[0] === 11 && o[1] === 5));

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
    console.log('\n🎉 EXACT PATH FOUND TO FLAG! Total steps:', foundPath.length - 1);
    console.log(foundPath.map(p => `(${p.x},${p.y})`).join(' -> '));
} else {
    console.error('\n❌ NO PATH');
}
