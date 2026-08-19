const fs = require('fs');
const path = require('path');
const vm = require('vm');

class MockElement {
    constructor(tagName = 'div') {
        this.tagName = tagName.toUpperCase();
        this._className = '';
        this.children = [];
        this.parentNode = null;
        this.dataset = {};
        this._listeners = {};
        this.style = {};
        this._innerHTML = '';
        this.textContent = '';
        this.classList = {
            _classes: new Set(),
            add: (...cls) => {
                cls.forEach(c => this.classList._classes.add(c));
                this._className = Array.from(this.classList._classes).join(' ');
            },
            remove: (...cls) => {
                cls.forEach(c => this.classList._classes.delete(c));
                this._className = Array.from(this.classList._classes).join(' ');
            },
            toggle: (c, force) => {
                if (force === undefined) {
                    if (this.classList._classes.has(c)) this.classList._classes.delete(c);
                    else this.classList._classes.add(c);
                } else if (force) {
                    this.classList._classes.add(c);
                } else {
                    this.classList._classes.delete(c);
                }
                this._className = Array.from(this.classList._classes).join(' ');
            },
            contains: (c) => this.classList._classes.has(c),
        };
    }

    get className() {
        return this._className;
    }

    set className(val) {
        this._className = val || '';
        this.classList._classes = new Set(this._className.split(/\s+/).filter(Boolean));
    }

    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    insertBefore(newNode, refNode) {
        const idx = this.children.indexOf(refNode);
        if (idx > -1) {
            newNode.parentNode = this;
            this.children.splice(idx, 0, newNode);
        } else {
            this.appendChild(newNode);
        }
        return newNode;
    }

    removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx > -1) {
            child.parentNode = null;
            this.children.splice(idx, 1);
        }
        return child;
    }

    addEventListener(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
    }

    dispatchEvent(event) {
        event.target = this;
        if (this._listeners[event.type]) {
            for (const cb of this._listeners[event.type]) {
                cb(event);
                if (event._stopped) break;
            }
        }
        if (!event._stopped && this.parentNode) {
            this.parentNode.dispatchEvent(event);
        }
    }

    contains(el) {
        let cur = el;
        while (cur) {
            if (cur === this) return true;
            cur = cur.parentNode;
        }
        return false;
    }

    querySelector(sel) {
        for (const child of this.children) {
            if (sel.startsWith('[data-block-id="')) {
                const id = sel.match(/\d+/)[0];
                if (child.dataset && String(child.dataset.blockId) === String(id)) return child;
            }
            if (sel.startsWith('.') && child.classList.contains(sel.slice(1))) return child;
            const res = child.querySelector(sel);
            if (res) return res;
        }
        return null;
    }

    querySelectorAll(sel) {
        const results = [];
        for (const child of this.children) {
            if (sel.startsWith('.') && child.classList.contains(sel.slice(1))) results.push(child);
            results.push(...child.querySelectorAll(sel));
        }
        return results;
    }

    getBoundingClientRect() {
        return { top: 0, left: 0, width: 200, height: 40 };
    }

    get innerHTML() {
        return this._innerHTML;
    }

    set innerHTML(val) {
        this._innerHTML = val;
        this.children = [];
    }
}

const mockDocument = {
    createElement: (tag) => new MockElement(tag),
    addEventListener: () => {},
    querySelectorAll: () => [],
};

const mockWindow = {
    soundManager: { play: () => {} },
    onProgramChanged: () => {},
};

global.document = mockDocument;
global.window = mockWindow;

const blocksCode = fs.readFileSync(path.join(__dirname, '../game/static/game/js/blocks.js'), 'utf8');
vm.runInThisContext(blocksCode);

console.log('--- TESTING DRAG AND DROP FUNCTIONALITY (REPEAT & SEQUENCING) ---');

const paletteEl = new MockElement('div');
const workspaceEl = new MockElement('div');
const allowed = ['move', 'turnLeft', 'turnRight', 'repeat'];

const editor = new BlockEditor(paletteEl, workspaceEl, allowed);

function createMockDragEvent(type, data = {}) {
    return {
        type,
        _stopped: false,
        preventDefault: () => {},
        stopPropagation: function() { this._stopped = true; },
        dataTransfer: {
            setData: () => {},
            getData: () => '',
            dropEffect: 'none',
            effectAllowed: 'none',
        },
        clientX: 50,
        clientY: 25,
        ...data,
    };
}

// 1. Drag repeat from palette to workspace
console.log('1. Dragging "repeat" block to workspace...');
const repeatPaletteBtn = paletteEl.children.find(c => c.innerHTML.includes('Repeat'));
repeatPaletteBtn.dispatchEvent(createMockDragEvent('dragstart'));
workspaceEl.dispatchEvent(createMockDragEvent('drop'));

console.log('Program length:', editor.program.length, 'Type:', editor.program[0]?.type);
if (editor.program.length === 1 && editor.program[0].type === 'repeat') {
    console.log('✅ PASS: Repeat block created in workspace');
} else {
    console.error('❌ FAIL: Repeat block not created in workspace');
    process.exit(1);
}

// 2. Drag move from palette directly into repeat's slot
console.log('\n2. Dragging "move" block from palette into repeat children slot...');
const movePaletteBtn = paletteEl.children.find(c => c.innerHTML.includes('Move'));
movePaletteBtn.dispatchEvent(createMockDragEvent('dragstart'));

const repeatWBlock = workspaceEl.children.find(c => c.classList.contains('wblock'));
const repeatSlot = repeatWBlock.children.find(c => c.classList.contains('slot'));

repeatSlot.dispatchEvent(createMockDragEvent('dragover'));
repeatSlot.dispatchEvent(createMockDragEvent('drop'));

console.log('Repeat children count:', editor.program[0].children.length);
if (editor.program[0].children.length === 1 && editor.program[0].children[0].type === 'move') {
    console.log('✅ PASS: Move block successfully placed inside Repeat slot');
} else {
    console.error('❌ FAIL: Move block was not placed inside Repeat slot');
    process.exit(1);
}

// 3. Test nested Repeat loop (Repeat inside Repeat)
console.log('\n3. Dragging another "repeat" loop inside the outer repeat slot...');
repeatPaletteBtn.dispatchEvent(createMockDragEvent('dragstart'));

const updatedRepeatWBlock = workspaceEl.children.find(c => c.classList.contains('wblock'));
const updatedRepeatSlot = updatedRepeatWBlock.children.find(c => c.classList.contains('slot'));
updatedRepeatSlot.dispatchEvent(createMockDragEvent('drop'));

console.log('Outer repeat children types:', editor.program[0].children.map(c => c.type));
if (editor.program[0].children.length === 2 && editor.program[0].children[1].type === 'repeat') {
    console.log('✅ PASS: Nested Repeat loop successfully placed inside outer Repeat slot');
} else {
    console.error('❌ FAIL: Nested Repeat loop not placed properly');
    process.exit(1);
}

// 4. Test adding turnRight inside the nested Repeat loop
console.log('\n4. Adding "turnRight" inside the nested Repeat slot...');
const nestedRepeatBlock = editor.program[0].children[1];
const nestedRepeatWBlock = workspaceEl.querySelector(`[data-block-id="${nestedRepeatBlock.id}"]`);
const nestedRepeatSlot = nestedRepeatWBlock.querySelector('.slot');

const turnRightPaletteBtn = paletteEl.children.find(c => c.innerHTML.includes('Turn Right'));
turnRightPaletteBtn.dispatchEvent(createMockDragEvent('dragstart'));
nestedRepeatSlot.dispatchEvent(createMockDragEvent('drop'));

console.log('Nested repeat children:', nestedRepeatBlock.children.map(c => c.type));
if (nestedRepeatBlock.children.length === 1 && nestedRepeatBlock.children[0].type === 'turnRight') {
    console.log('✅ PASS: turnRight placed inside nested Repeat loop!');
} else {
    console.error('❌ FAIL: turnRight not placed inside nested Repeat');
    process.exit(1);
}

console.log('\n🎉 ALL DRAG AND DROP TESTS PASSED SUCCESSFULLY!');
