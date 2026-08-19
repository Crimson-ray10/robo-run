// Test exact screenshot grid with column 9 corridor:

const SCREENSHOT_GRID = [
    // 012345678901
    "S...########", // 0
    "###.###.....", // 1
    "###.###.###.", // 2
    "###.###.###.", // 3
    "#...........", // 4
    "#.#####....B", // 5: B is the blue mark on (11,5)
    "#.######..##", // 6: x=8,9 are empty, x=10,11 are bricks
    "#.######..##", // 7: x=8,9 are empty, x=10,11 are bricks
    "#..######.##", // 8: x=1,2 are empty, x=9 is empty, x=10,11 are bricks
    "#..######.##", // 9: x=1,2 are empty, x=9 is empty, x=10,11 are bricks
    "#..##...####", // 10: x=1,2 are empty, x=5,6,7 are empty, x=8..11 are bricks
    "#....#.....F"  // 11: x=1..4 are empty, (5,11) is brick, x=6..11 are empty to flag
];

const obstacles = [];
for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
        const ch = SCREENSHOT_GRID[y][x];
        if (ch === '#' || ch === 'B') {
            obstacles.push([x, y]);
        }
    }
}

console.log('Total obstacles:', obstacles.length);
console.log('Includes [11, 5]:', obstacles.some(o => o[0] === 11 && o[1] === 5));

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
