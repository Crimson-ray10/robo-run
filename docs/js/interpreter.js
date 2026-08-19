/* interpreter.js
 * Executes a block program against a grid.
 * Implemented as a generator so the caller can animate one atomic action at a time.
 */

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
    return DIRS[(i + 3) % 4]; // left
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
            return true; // out of bounds
        }
        return this.level.obstacles.some((o) => o[0] === cell.x && o[1] === cell.y);
    }

    isFinish(cell) {
        return cell.x === this.level.finish.x && cell.y === this.level.finish.y;
    }
}

const MAX_STEPS = 600; // safety valve against runaway loops

/**
 * Generator that yields one action at a time:
 *   {kind: 'move', ok: true, blockId}          -> robot advanced
 *   {kind: 'move', ok: false, blockId}         -> robot hit obstacle/wall
 *   {kind: 'turnLeft'|'turnRight', blockId}    -> robot rotated
 *   {kind: 'finish', blockId}                  -> robot reached the flag
 *   {kind: 'done'}                             -> program finished executing with no win
 *   {kind: 'limit'}                            -> safety valve triggered
 */
function* runProgram(program, sim) {
    let steps = 0;
    function* execList(list) {
        for (const block of list) {
            steps++;
            if (steps > MAX_STEPS) {
                yield { kind: 'limit' };
                return true; // signal stop
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
                return true; // stop execution on hit
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
    if (!stopped) {
        yield { kind: 'done' };
    }
}
