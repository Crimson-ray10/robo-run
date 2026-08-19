/* blocks.js
 * Block Editor for Robot Runner:
 * - Available block types: Move, Turn Left, Turn Right, Repeat.
 * - Drag-and-Drop + In-Slot "+ Add Block ▾" menu + Click-to-Target slot selection.
 * - Micro-actions: Move Up (▲), Move Down (▼), Duplicate (⧉), Delete (✕).
 * - Real-time execution highlighting.
 */

const BLOCK_DEFS = {
    move:       { label: 'Move Forward', color: 'block-move', hasCount: false, container: false },
    turnLeft:   { label: 'Turn Left',    color: 'block-turnLeft', hasCount: false, container: false },
    turnRight:  { label: 'Turn Right',   color: 'block-turnRight', hasCount: false, container: false },
    repeat:     { label: 'Repeat',       color: 'block-repeat', hasCount: true, container: true },
};

let _blockIdCounter = 1;
function nextBlockId() { return _blockIdCounter++; }

// Shared global drag state
window._activeDrag = null;

class BlockEditor {
    /**
     * @param {HTMLElement} paletteEl
     * @param {HTMLElement} workspaceEl
     * @param {string[]} allowedTypes - block types available on the palette
     */
    constructor(paletteEl, workspaceEl, allowedTypes) {
        this.paletteEl = paletteEl;
        this.workspaceEl = workspaceEl;
        this.allowedTypes = allowedTypes.filter(t => BLOCK_DEFS[t]);
        this.program = []; // top-level array of blocks
        this.activeTargetArray = this.program; // Target slot for palette click-to-add

        this._buildPalette();
        this._renderWorkspace();
    }

    _buildPalette() {
        this.paletteEl.innerHTML = '';
        this.allowedTypes.forEach((type) => {
            const def = BLOCK_DEFS[type];
            if (!def) return;
            const el = document.createElement('div');
            el.className = `block ${def.color} palette-block`;
            el.innerHTML = `<span class="glyph">${this._blockGlyph(type)}</span> <span class="lbl">${def.label}</span>`;
            el.draggable = true;
            el.title = 'Drag into workspace/loop, or click to add';

            // HTML5 Drag
            el.addEventListener('dragstart', (e) => {
                window._activeDrag = {
                    isNew: true,
                    type: type,
                    block: null,
                    sourceArray: null,
                };
                if (e.dataTransfer) {
                    e.dataTransfer.setData('text/plain', type);
                    e.dataTransfer.effectAllowed = 'copy';
                }
                el.classList.add('is-dragging');
                if (window.soundManager) window.soundManager.play('click');
            });

            el.addEventListener('dragend', () => {
                el.classList.remove('is-dragging');
                window._activeDrag = null;
                this._clearAllDragOver();
            });

            // Click to add to the currently active target slot
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const newBlock = this._makeBlock(type);
                const target = this.activeTargetArray || this.program;
                target.push(newBlock);
                this._renderWorkspace();
                if (window.soundManager) window.soundManager.play('snap');
                if (window.onProgramChanged) window.onProgramChanged();
            });

            this.paletteEl.appendChild(el);
        });
    }

    _blockGlyph(type) {
        return { move: '⬆', turnLeft: '↺', turnRight: '↻', repeat: '🔁' }[type] || '';
    }

    _makeBlock(type) {
        const def = BLOCK_DEFS[type];
        const block = { type, id: nextBlockId() };
        if (def.hasCount) block.count = 3;
        if (def.container) block.children = [];
        return block;
    }

    _cloneBlock(block) {
        const copy = { type: block.type, id: nextBlockId() };
        if (block.count !== undefined) copy.count = block.count;
        if (block.children) copy.children = block.children.map((c) => this._cloneBlock(c));
        return copy;
    }

    _findContainer(list, id) {
        for (let i = 0; i < list.length; i++) {
            const b = list[i];
            if (b.id === id) return { list, index: i, block: b };
            if (b.children) {
                const found = this._findContainer(b.children, id);
                if (found) return found;
            }
        }
        return null;
    }

    _removeBlockById(id) {
        const found = this._findContainer(this.program, id);
        if (found) found.list.splice(found.index, 1);
    }

    _containsBlock(arr, targetArray) {
        if (arr === targetArray) return true;
        for (const b of arr) {
            if (b.children && this._containsBlock(b.children, targetArray)) return true;
        }
        return false;
    }

    _clearAllDragOver() {
        this.workspaceEl.querySelectorAll('.drag-over, .drop-active').forEach((el) => {
            el.classList.remove('drag-over', 'drop-active');
        });
    }

    _executeDrop(targetArray, insertIndex = null) {
        const dragData = window._activeDrag;
        if (!dragData) return;

        if (dragData.isNew) {
            const newBlock = this._makeBlock(dragData.type);
            if (insertIndex === null || insertIndex >= targetArray.length) {
                targetArray.push(newBlock);
            } else {
                targetArray.splice(insertIndex, 0, newBlock);
            }
            if (window.soundManager) window.soundManager.play('snap');
        } else if (dragData.block) {
            const movedBlock = dragData.block;
            // Prevent cyclic drop
            if (movedBlock.children && this._containsBlock(movedBlock.children, targetArray)) return;
            if (targetArray === movedBlock.children) return;

            this._removeBlockById(movedBlock.id);
            if (insertIndex === null || insertIndex >= targetArray.length) {
                targetArray.push(movedBlock);
            } else {
                targetArray.splice(insertIndex, 0, movedBlock);
            }
            if (window.soundManager) window.soundManager.play('snap');
        }

        window._activeDrag = null;
        this.activeTargetArray = targetArray;
        this._renderWorkspace();
        if (window.onProgramChanged) window.onProgramChanged();
    }

    _attachDropZone(el, targetArray, insertIndex = null) {
        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = window._activeDrag && window._activeDrag.isNew ? 'copy' : 'move';
            }
            el.classList.add('drag-over');
        });

        el.addEventListener('dragleave', (e) => {
            if (!el.contains(e.relatedTarget)) {
                el.classList.remove('drag-over');
            }
        });

        el.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            el.classList.remove('drag-over');
            this._executeDrop(targetArray, insertIndex);
        });
    }

    _renderWorkspace() {
        this.workspaceEl.innerHTML = '';

        // Workspace background drop target
        this._attachDropZone(this.workspaceEl, this.program, null);

        this.workspaceEl.addEventListener('click', (e) => {
            if (e.target === this.workspaceEl || e.target.classList.contains('workspace-empty')) {
                this.activeTargetArray = this.program;
                this._updateActiveSlotVisuals();
            }
        });

        this._renderList(this.program, this.workspaceEl, this.program);

        if (this.program.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'workspace-empty';
            empty.innerHTML = `
                <span>📥</span>
                <p>Drag blocks here or click from palette to build your program</p>
            `;
            this.workspaceEl.appendChild(empty);
        }

        this._updateActiveSlotVisuals();
    }

    _updateActiveSlotVisuals() {
        this.workspaceEl.querySelectorAll('.slot, .workspace').forEach((s) => {
            s.classList.remove('slot-focused');
        });
        if (this.activeTargetArray && this.activeTargetArray._domSlot) {
            this.activeTargetArray._domSlot.classList.add('slot-focused');
        }
    }

    _renderList(list, container, parentArray) {
        list.forEach((block, idx) => {
            const dropBarBefore = document.createElement('div');
            dropBarBefore.className = 'drop-bar';
            this._attachDropZone(dropBarBefore, list, idx);
            container.appendChild(dropBarBefore);

            const blockEl = this._renderBlock(block, list, idx);
            container.appendChild(blockEl);
        });

        if (list.length > 0) {
            const dropBarAfter = document.createElement('div');
            dropBarAfter.className = 'drop-bar';
            this._attachDropZone(dropBarAfter, list, list.length);
            container.appendChild(dropBarAfter);
        }
    }

    _renderBlock(block, parentArray, index) {
        const def = BLOCK_DEFS[block.type];
        const wrap = document.createElement('div');
        wrap.className = 'wblock';
        wrap.dataset.blockId = block.id;

        // Block Header / Handle
        const row = document.createElement('div');
        row.className = 'wblock-row';
        row.draggable = true;
        row.title = 'Drag to move block';

        row.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            window._activeDrag = {
                isNew: false,
                type: block.type,
                block: block,
                sourceArray: parentArray,
            };
            if (e.dataTransfer) {
                e.dataTransfer.setData('text/plain', String(block.id));
                e.dataTransfer.effectAllowed = 'move';
            }
            wrap.classList.add('is-dragging');
            if (window.soundManager) window.soundManager.play('click');
        });

        row.addEventListener('dragend', () => {
            wrap.classList.remove('is-dragging');
            window._activeDrag = null;
            this._clearAllDragOver();
        });

        const swatch = document.createElement('span');
        swatch.className = 'swatch ' + def.color;
        row.appendChild(swatch);

        const glyphSpan = document.createElement('span');
        glyphSpan.className = 'glyph';
        glyphSpan.textContent = this._blockGlyph(block.type);
        row.appendChild(glyphSpan);

        const label = document.createElement('span');
        label.className = 'wblock-label';
        label.textContent = def.label;
        row.appendChild(label);

        // Count Input for Repeat
        if (def.hasCount) {
            const countWrap = document.createElement('div');
            countWrap.className = 'count-wrap';
            countWrap.addEventListener('click', (e) => e.stopPropagation());

            const times = document.createElement('span');
            times.textContent = '×';
            times.className = 'times-sym';
            countWrap.appendChild(times);

            const input = document.createElement('input');
            input.type = 'number';
            input.min = '1';
            input.max = '99';
            input.value = block.count || 3;
            input.title = 'Number of repetitions (1-99)';
            input.addEventListener('change', () => {
                let v = parseInt(input.value, 10);
                if (isNaN(v) || v < 1) v = 1;
                if (v > 99) v = 99;
                block.count = v;
                input.value = v;
                if (window.onProgramChanged) window.onProgramChanged();
            });
            input.addEventListener('input', () => {
                let v = parseInt(input.value, 10);
                if (!isNaN(v) && v >= 1) {
                    block.count = Math.min(99, v);
                    if (window.onProgramChanged) window.onProgramChanged();
                }
            });
            countWrap.appendChild(input);
            row.appendChild(countWrap);
        }

        // Action Toolbar (Move Up, Move Down, Duplicate, Delete)
        const actions = document.createElement('div');
        actions.className = 'wblock-actions';

        if (index > 0) {
            const upBtn = document.createElement('button');
            upBtn.className = 'icon-btn';
            upBtn.innerHTML = '▲';
            upBtn.title = 'Move up';
            upBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const temp = parentArray[index - 1];
                parentArray[index - 1] = parentArray[index];
                parentArray[index] = temp;
                this._renderWorkspace();
                if (window.soundManager) window.soundManager.play('click');
                if (window.onProgramChanged) window.onProgramChanged();
            });
            actions.appendChild(upBtn);
        }

        if (index < parentArray.length - 1) {
            const downBtn = document.createElement('button');
            downBtn.className = 'icon-btn';
            downBtn.innerHTML = '▼';
            downBtn.title = 'Move down';
            downBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const temp = parentArray[index + 1];
                parentArray[index + 1] = parentArray[index];
                parentArray[index] = temp;
                this._renderWorkspace();
                if (window.soundManager) window.soundManager.play('click');
                if (window.onProgramChanged) window.onProgramChanged();
            });
            actions.appendChild(downBtn);
        }

        const dupBtn = document.createElement('button');
        dupBtn.className = 'icon-btn dup-btn';
        dupBtn.innerHTML = '⧉';
        dupBtn.title = 'Duplicate block';
        dupBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const copy = this._cloneBlock(block);
            parentArray.splice(index + 1, 0, copy);
            this._renderWorkspace();
            if (window.soundManager) window.soundManager.play('snap');
            if (window.onProgramChanged) window.onProgramChanged();
        });
        actions.appendChild(dupBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn del-btn';
        delBtn.innerHTML = '✕';
        delBtn.title = 'Remove block';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            parentArray.splice(index, 1);
            this._renderWorkspace();
            if (window.soundManager) window.soundManager.play('click');
            if (window.onProgramChanged) window.onProgramChanged();
        });
        actions.appendChild(delBtn);

        row.appendChild(actions);
        wrap.appendChild(row);

        // Render Repeat Container Slot
        if (def.container) {
            const slotHeader = document.createElement('div');
            slotHeader.className = 'slot-header';
            slotHeader.innerHTML = '<span class="slot-label">do loop:</span>';

            const addMenu = this._createQuickAddMenu(block.children);
            slotHeader.appendChild(addMenu);
            wrap.appendChild(slotHeader);

            const slot = document.createElement('div');
            slot.className = 'slot';
            block.children._domSlot = slot;

            this._attachDropZone(slot, block.children, null);

            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                this.activeTargetArray = block.children;
                this._updateActiveSlotVisuals();
            });

            this._renderList(block.children, slot, block.children);

            if (block.children.length === 0) {
                const emptySlot = document.createElement('div');
                emptySlot.className = 'slot-empty';
                emptySlot.textContent = 'drop blocks here or click slot to add';
                slot.appendChild(emptySlot);
            }
            wrap.appendChild(slot);
        }

        return wrap;
    }

    _createQuickAddMenu(targetArray) {
        const wrap = document.createElement('div');
        wrap.className = 'slot-quick-add';

        const addBtn = document.createElement('button');
        addBtn.className = 'slot-add-btn';
        addBtn.innerHTML = '+ Add Block ▾';
        addBtn.title = 'Add block directly into this loop';

        const menu = document.createElement('div');
        menu.className = 'quick-add-menu hidden';

        this.allowedTypes.forEach((type) => {
            const def = BLOCK_DEFS[type];
            if (!def) return;
            const item = document.createElement('button');
            item.className = `quick-add-item ${def.color}`;
            item.innerHTML = `<span>${this._blockGlyph(type)}</span> ${def.label}`;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.add('hidden');
                targetArray.push(this._makeBlock(type));
                this.activeTargetArray = targetArray;
                this._renderWorkspace();
                if (window.soundManager) window.soundManager.play('snap');
                if (window.onProgramChanged) window.onProgramChanged();
            });
            menu.appendChild(item);
        });

        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.quick-add-menu').forEach((m) => {
                if (m !== menu) m.classList.add('hidden');
            });
            menu.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
            menu.classList.add('hidden');
        });

        wrap.appendChild(addBtn);
        wrap.appendChild(menu);
        return wrap;
    }

    highlightBlock(blockId) {
        this.clearHighlight();
        if (!blockId) return;
        const el = this.workspaceEl.querySelector(`[data-block-id="${blockId}"]`);
        if (el) {
            el.classList.add('executing-block');
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    clearHighlight() {
        const active = this.workspaceEl.querySelectorAll('.executing-block');
        active.forEach((el) => el.classList.remove('executing-block'));
    }

    getProgram() {
        return this.program;
    }

    clear() {
        this.program = [];
        this.activeTargetArray = this.program;
        this._renderWorkspace();
    }
}
