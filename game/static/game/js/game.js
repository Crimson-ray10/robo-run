/* game.js — Complete Robot Runner engine:
 * - Block editor integration with real-time execution highlighting
 * - Procedural Web Audio API sound synthesizer with mute control
 * - Dynamic level time limit (e.g. 2 min for Level 1, 3 min for others)
 * - Execution speed controls (1x, 2x, 4x, Step) & Stop button
 * - Robust countdown and recovery timer management
 * - Star rating calculation & confetti celebration
 * - Desktop keyboard shortcuts (Space to Run/Stop, Esc to Stop)
 */

(function () {
    let LEVEL;
    const levelScript = document.getElementById('level-data');
    if (levelScript && levelScript.textContent.trim()) {
        LEVEL = JSON.parse(levelScript.textContent);
    } else {
        const params = new URLSearchParams(window.location.search);
        const lvlId = parseInt(params.get('level') || '1', 10);
        LEVEL = (window.LEVELS && window.LEVELS[lvlId]) || (window.LEVELS && window.LEVELS[1]);
        if (LEVEL) {
            // Dynamically populate static DOM elements if present
            document.title = `Level ${LEVEL.id}: ${LEVEL.name} · Robot Runner`;
            const sticker = document.querySelector('.level-title-section .sticker-badge');
            if (sticker) {
                sticker.className = `sticker-badge sticker-${LEVEL.name.toLowerCase()}`;
                sticker.textContent = LEVEL.name;
            }
            const heading = document.querySelector('.play-level-heading');
            if (heading) heading.textContent = `Level ${LEVEL.id}: ${LEVEL.name}`;
            const hintText = document.querySelector('.hint-text');
            if (hintText) hintText.innerHTML = `<strong>Mission Intel:</strong> ${LEVEL.hint}`;
            const gridSub = document.querySelector('.grid-col .col-sub');
            if (gridSub) gridSub.textContent = `${LEVEL.grid_width}×${LEVEL.grid_height} Coords`;
        }
    }
    const playWrap = document.querySelector('.play-wrap');
    const TOTAL_LEVELS = playWrap && playWrap.dataset.totalLevels 
        ? parseInt(playWrap.dataset.totalLevels, 10) 
        : (window.LEVELS ? Object.keys(window.LEVELS).length : 4);

    // Dynamic cell & padding sizing to guarantee entire level fits in viewport without scrolling
    let CELL = 38;
    let GAP = 4;
    let PAD = 8;

    if (LEVEL.grid_height <= 6) {
        CELL = 42;
        GAP = 4;
    } else if (LEVEL.grid_height <= 8) {
        CELL = 36;
        GAP = 4;
    } else if (LEVEL.grid_height <= 10) {
        CELL = 30;
        GAP = 3;
    } else {
        // 12x12
        CELL = 26;
        GAP = 3;
    }

    const SPEED_MAP = {
        '1x': 350,
        '2x': 175,
        '4x': 80,
        'step': 0,
    };
    let currentSpeed = '1x';
    let stepDelay = SPEED_MAP['1x'];

    const MAIN_TIME = LEVEL.time_limit || 180; // 2 min for Level 1, 3 min for others
    const RECOVERY_TIME = 60; // 1 minute

    // ----- Procedural Sound Synthesizer (Web Audio API) -----
    class SoundManager {
        constructor() {
            this.ctx = null;
            this.muted = localStorage.getItem('rg_sound_muted') === 'true';
        }

        _init() {
            if (!this.ctx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.ctx = new AudioContext();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        toggleMute() {
            this.muted = !this.muted;
            localStorage.setItem('rg_sound_muted', this.muted ? 'true' : 'false');
            return this.muted;
        }

        play(type) {
            if (this.muted) return;
            try {
                this._init();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;

                if (type === 'click') {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.04);
                } else if (type === 'snap') {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(320, now);
                    osc.frequency.exponentialRampToValueAtTime(540, now + 0.06);
                    gain.gain.setValueAtTime(0.18, now);
                    gain.gain.linearRampToValueAtTime(0.001, now + 0.06);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.06);
                } else if (type === 'move') {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(220, now);
                    osc.frequency.exponentialRampToValueAtTime(330, now + 0.08);
                    gain.gain.setValueAtTime(0.14, now);
                    gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.08);
                } else if (type === 'turn') {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.exponentialRampToValueAtTime(280, now + 0.07);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.linearRampToValueAtTime(0.001, now + 0.07);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.07);
                } else if (type === 'hit') {
                    // Collision noise + low boom
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(140, now);
                    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.linearRampToValueAtTime(0.001, now + 0.25);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.25);
                } else if (type === 'win') {
                    // Arpeggio fanfare (C5, E5, G5, C6)
                    const notes = [523.25, 659.25, 783.99, 1046.50];
                    notes.forEach((freq, i) => {
                        const noteOsc = this.ctx.createOscillator();
                        const noteGain = this.ctx.createGain();
                        noteOsc.type = 'sine';
                        noteOsc.frequency.setValueAtTime(freq, now + i * 0.1);
                        noteGain.gain.setValueAtTime(0.2, now + i * 0.1);
                        noteGain.gain.linearRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
                        noteOsc.connect(noteGain);
                        noteGain.connect(this.ctx.destination);
                        noteOsc.start(now + i * 0.1);
                        noteOsc.stop(now + i * 0.1 + 0.3);
                    });
                } else if (type === 'fail') {
                    // Descending buzzer
                    const notes = [320, 260, 200];
                    notes.forEach((freq, i) => {
                        const noteOsc = this.ctx.createOscillator();
                        const noteGain = this.ctx.createGain();
                        noteOsc.type = 'sawtooth';
                        noteOsc.frequency.setValueAtTime(freq, now + i * 0.15);
                        noteGain.gain.setValueAtTime(0.18, now + i * 0.15);
                        noteGain.gain.linearRampToValueAtTime(0.001, now + i * 0.15 + 0.2);
                        noteOsc.connect(noteGain);
                        noteGain.connect(this.ctx.destination);
                        noteOsc.start(now + i * 0.15);
                        noteOsc.stop(now + i * 0.15 + 0.2);
                    });
                } else if (type === 'tick') {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, now);
                    gain.gain.setValueAtTime(0.08, now);
                    gain.gain.linearRampToValueAtTime(0.001, now + 0.03);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.03);
                }
            } catch (err) {
                console.warn('Audio play error:', err);
            }
        }
    }

    const soundManager = new SoundManager();
    window.soundManager = soundManager;

    // ----- Hand-Drawn Doodle Confetti Engine -----
    function triggerConfetti() {
        const canvas = document.createElement('canvas');
        canvas.className = 'confetti-canvas';
        document.body.appendChild(canvas);
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');

        const particles = [];
        const colors = ['#1FAFA0', '#FF6B4A', '#FFC94A', '#6C5CE7', '#BFE8EA', '#14432A'];
        const shapes = ['star', 'circle', 'square', 'squiggle'];

        for (let i = 0; i < 110; i++) {
            particles.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 80,
                y: canvas.height / 2 + (Math.random() - 0.5) * 60,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.8) * 18,
                size: Math.random() * 9 + 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                rot: Math.random() * Math.PI * 2,
                vrot: (Math.random() - 0.5) * 0.25,
                life: 1,
            });
        }

        let animFrame;
        function update() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = 0;
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.38; // gravity
                p.vx *= 0.98;
                p.rot += p.vrot;
                p.life -= 0.012;
                if (p.life > 0) {
                    alive++;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rot);
                    ctx.fillStyle = p.color;
                    ctx.strokeStyle = '#0B2A19';
                    ctx.lineWidth = 1.5;
                    ctx.globalAlpha = Math.max(0, p.life);

                    if (p.shape === 'star') {
                        ctx.beginPath();
                        for (let s = 0; s < 5; s++) {
                            ctx.lineTo(Math.cos((18 + s * 72) * Math.PI / 180) * p.size, -Math.sin((18 + s * 72) * Math.PI / 180) * p.size);
                            ctx.lineTo(Math.cos((54 + s * 72) * Math.PI / 180) * (p.size / 2), -Math.sin((54 + s * 72) * Math.PI / 180) * (p.size / 2));
                        }
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    } else if (p.shape === 'circle') {
                        ctx.beginPath();
                        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    } else {
                        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                        ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
                    }
                    ctx.restore();
                }
            }
            if (alive > 0) {
                animFrame = requestAnimationFrame(update);
            } else {
                cancelAnimationFrame(animFrame);
                canvas.remove();
            }
        }
        update();
    }

    // ----- DOM References -----
    const paletteEl = document.getElementById('palette');
    const workspaceEl = document.getElementById('workspace');
    const runBtn = document.getElementById('run-btn');
    const stopBtn = document.getElementById('stop-btn');
    const stepBtn = document.getElementById('step-btn');
    const clearBtn = document.getElementById('clear-btn');
    const statusLine = document.getElementById('status-line');
    const gridStage = document.getElementById('grid-stage');
    const mainTimerEl = document.getElementById('main-timer');
    const mainTimerBox = document.getElementById('main-timer-box');
    const soundToggleBtn = document.getElementById('sound-toggle-btn');

    const hitModal = document.getElementById('hit-modal');
    const subTimerEl = document.getElementById('sub-timer');
    const hitModalClose = document.getElementById('hit-modal-close');

    const winModal = document.getElementById('win-modal');
    const winMessage = document.getElementById('win-message');
    const winStarsEl = document.getElementById('win-stars');
    const winTimeEl = document.getElementById('win-time');
    const nextLevelBtn = document.getElementById('next-level-btn');

    const failModal = document.getElementById('fail-modal');
    const failTitle = document.getElementById('fail-title');
    const failMessage = document.getElementById('fail-message');
    const retryBtn = document.getElementById('retry-btn');

    // Speed buttons
    const speedBtns = document.querySelectorAll('.speed-btn');
    speedBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            speedBtns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            currentSpeed = btn.dataset.speed;
            stepDelay = SPEED_MAP[currentSpeed];
            if (window.soundManager) window.soundManager.play('click');
        });
    });

    // Sound toggle button
    function updateSoundBtn() {
        if (soundToggleBtn) {
            soundToggleBtn.innerHTML = soundManager.muted ? '🔇 Sound Off' : '🔊 Sound On';
            soundToggleBtn.classList.toggle('muted', soundManager.muted);
        }
    }
    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', () => {
            soundManager.toggleMute();
            updateSoundBtn();
        });
        updateSoundBtn();
    }

    // ----- Grid + Robot Rendering -----
    let robotEl;
    function buildGrid() {
        gridStage.innerHTML = '';
        gridStage.style.gridTemplateColumns = `repeat(${LEVEL.grid_width}, ${CELL}px)`;
        gridStage.style.gridTemplateRows = `repeat(${LEVEL.grid_height}, ${CELL}px)`;
        gridStage.style.gap = `${GAP}px`;
        gridStage.style.padding = `${PAD}px`;

        for (let y = 0; y < LEVEL.grid_height; y++) {
            for (let x = 0; x < LEVEL.grid_width; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                if (LEVEL.obstacles.some((o) => o[0] === x && o[1] === y)) {
                    cell.classList.add('obstacle');
                    cell.innerHTML = `
                        <svg viewBox="0 0 32 32" style="width: 78%; height: 78%;" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="4" width="28" height="24" rx="3" fill="#FF6B4A" stroke="#0B2A19" stroke-width="2.5"/>
                            <line x1="2" y1="16" x2="30" y2="16" stroke="#0B2A19" stroke-width="2"/>
                            <line x1="16" y1="4" x2="16" y2="16" stroke="#0B2A19" stroke-width="2"/>
                            <line x1="9" y1="16" x2="9" y2="28" stroke="#0B2A19" stroke-width="2"/>
                            <line x1="23" y1="16" x2="23" y2="28" stroke="#0B2A19" stroke-width="2"/>
                        </svg>
                    `;
                } else if (x === LEVEL.finish.x && y === LEVEL.finish.y) {
                    cell.classList.add('finish');
                    cell.innerHTML = `
                        <svg viewBox="0 0 32 32" class="flag-anim" style="width: 80%; height: 80%;" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <line x1="6" y1="4" x2="6" y2="28" stroke="#0B2A19" stroke-width="3" stroke-linecap="round"/>
                            <path d="M7 6 C14 3 18 10 26 7 L26 18 C18 21 14 14 7 17 Z" fill="#FFC94A" stroke="#0B2A19" stroke-width="2.5"/>
                            <circle cx="6" cy="4" r="2.5" fill="#FF6B4A" stroke="#0B2A19" stroke-width="1.5"/>
                        </svg>
                    `;
                }
                gridStage.appendChild(cell);
            }
        }

        robotEl = document.createElement('div');
        robotEl.className = 'robot';
        robotEl.style.width = `${CELL}px`;
        robotEl.style.height = `${CELL}px`;
        robotEl.innerHTML = `
            <div class="robot-body">
                <svg class="robot-mascot-grid-svg" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="18" y1="2" x2="18" y2="7" stroke="#0B2A19" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="18" cy="3" r="2" fill="#FF6B4A" stroke="#0B2A19" stroke-width="1.5"/>
                    <rect x="5" y="7" width="26" height="23" rx="5" fill="#1FAFA0" stroke="#0B2A19" stroke-width="2.5"/>
                    <rect x="9" y="11" width="18" height="9" rx="3" fill="#FBF3E3" stroke="#0B2A19" stroke-width="2"/>
                    <circle cx="14" cy="15.5" r="2.2" fill="#0B2A19"/>
                    <circle cx="22" cy="15.5" r="2.2" fill="#0B2A19"/>
                    <circle cx="14.8" cy="14.8" r="0.8" fill="#FFFFFF"/>
                    <circle cx="22.8" cy="14.8" r="0.8" fill="#FFFFFF"/>
                    <line x1="12" y1="24" x2="24" y2="24" stroke="#0B2A19" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span class="robot-direction-indicator">▲</span>
            </div>
        `;
        gridStage.appendChild(robotEl);
    }

    const DIR_ROTATION = {
        right: 90,
        down: 180,
        left: 270,
        up: 0,
    };

    function placeRobot(x, y, dir, animate = true) {
        const animDuration = currentSpeed === '4x' ? '0.08s' : currentSpeed === '2x' ? '0.16s' : '0.3s';
        robotEl.style.transition = animate ? `left ${animDuration} ease, top ${animDuration} ease` : 'none';
        robotEl.style.left = `${PAD + x * (CELL + GAP)}px`;
        robotEl.style.top = `${PAD + y * (CELL + GAP)}px`;

        const body = robotEl.querySelector('.robot-body');
        if (body) {
            body.style.transform = `rotate(${DIR_ROTATION[dir]}deg)`;
            body.style.transition = 'transform 0.15s ease';
        }

        // Leave a faint trail on visited cell
        const cell = gridStage.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        if (cell && !cell.classList.contains('obstacle') && !cell.classList.contains('finish')) {
            cell.classList.add('cell-visited');
        }
    }

    function clearGridTrails() {
        const visited = gridStage.querySelectorAll('.cell-visited');
        visited.forEach((c) => c.classList.remove('cell-visited'));
    }

    // ----- Block Editor -----
    const editor = new BlockEditor(paletteEl, workspaceEl, LEVEL.allowed_blocks);
    window.onProgramChanged = function () {
        if (!running) {
            statusLine.textContent = 'Program updated. Press Run to test!';
        }
    };

    // ----- Simulation State -----
    const sim = new RobotSim(LEVEL);
    let running = false;
    let activeGen = null;
    let stepTimerHandle = null;

    function resetRobotVisual(animate = false) {
        sim.reset();
        clearGridTrails();
        placeRobot(sim.x, sim.y, sim.dir, animate);
    }

    // ----- Timers -----
    let mainSecondsLeft = MAIN_TIME;
    let mainTimerHandle = null;
    let subSecondsLeft = RECOVERY_TIME;
    let subTimerHandle = null;
    let inRecovery = false;

    function formatTime(s) {
        const m = Math.floor(Math.max(0, s) / 60);
        const sec = Math.max(0, s) % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    function updateMainTimerDisplay() {
        mainTimerEl.textContent = formatTime(mainSecondsLeft);
        const isLow = mainSecondsLeft <= 20;
        mainTimerEl.classList.toggle('low', isLow);
        mainTimerBox.classList.toggle('danger-pulse', isLow && mainSecondsLeft > 0);
        if (isLow && mainSecondsLeft > 0 && mainSecondsLeft <= 10) {
            soundManager.play('tick');
        }
    }

    function startMainTimer() {
        stopMainTimer();
        mainTimerHandle = setInterval(() => {
            mainSecondsLeft--;
            updateMainTimerDisplay();
            if (mainSecondsLeft <= 0) {
                stopMainTimer();
                onLevelFailed("Time's up!", "You ran out of time to complete the level. Press Retry to try again!");
            }
        }, 1000);
    }

    function stopMainTimer() {
        if (mainTimerHandle) clearInterval(mainTimerHandle);
        mainTimerHandle = null;
    }

    function startRecoveryTimer() {
        inRecovery = true;
        subSecondsLeft = RECOVERY_TIME;
        subTimerEl.textContent = formatTime(subSecondsLeft);
        stopMainTimer();
        subTimerHandle = setInterval(() => {
            subSecondsLeft--;
            subTimerEl.textContent = formatTime(subSecondsLeft);
            if (subSecondsLeft <= 10 && subSecondsLeft > 0) {
                soundManager.play('tick');
            }
            if (subSecondsLeft <= 0) {
                clearInterval(subTimerHandle);
                subTimerHandle = null;
                hideModal(hitModal);
                onLevelFailed('Out of time!', "You didn't fix the code in time after hitting an obstacle.");
            }
        }, 1000);
    }

    function stopRecoveryTimer() {
        inRecovery = false;
        if (subTimerHandle) clearInterval(subTimerHandle);
        subTimerHandle = null;
    }

    // ----- Modals -----
    function showModal(el) { el.classList.remove('hidden'); }
    function hideModal(el) { el.classList.add('hidden'); }

    hitModalClose.addEventListener('click', () => {
        hideModal(hitModal);
        soundManager.play('click');
    });

    retryBtn.addEventListener('click', () => {
        hideModal(failModal);
        soundManager.play('click');
        restartLevel();
    });

    // ----- Level Outcome Handling -----
    function onLevelFailed(title, message) {
        running = false;
        stopExecution();
        stopMainTimer();
        stopRecoveryTimer();
        soundManager.play('fail');

        failTitle.textContent = '⏱ ' + title;
        failMessage.textContent = message;
        showModal(failModal);
    }

    function calculateStars(remainingSeconds) {
        const ratio = remainingSeconds / MAIN_TIME;
        if (ratio >= 0.50) return 3;
        if (ratio >= 0.20) return 2;
        return 1;
    }

    function onLevelWon() {
        running = false;
        stopExecution();
        stopMainTimer();
        stopRecoveryTimer();
        soundManager.play('win');
        triggerConfetti();

        const timeSpent = MAIN_TIME - mainSecondsLeft;
        const stars = calculateStars(mainSecondsLeft);

        // Save progress & stars to localStorage
        localStorage.setItem(`rg_level${LEVEL.id}_complete`, 'true');
        const prevBest = parseInt(localStorage.getItem(`rg_level${LEVEL.id}_stars`) || '0', 10);
        if (stars > prevBest) {
            localStorage.setItem(`rg_level${LEVEL.id}_stars`, stars.toString());
        }
        const prevTime = parseInt(localStorage.getItem(`rg_level${LEVEL.id}_best_time`) || '9999', 10);
        if (timeSpent < prevTime) {
            localStorage.setItem(`rg_level${LEVEL.id}_best_time`, timeSpent.toString());
        }

        // Render win modal stats
        const starIcons = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
        if (winStarsEl) winStarsEl.textContent = starIcons;
        if (winTimeEl) winTimeEl.textContent = `Completed in ${formatTime(timeSpent)} (${formatTime(mainSecondsLeft)} left)`;

        if (LEVEL.next_level) {
            winMessage.textContent = `Brilliant solution! Level ${LEVEL.next_level} is now unlocked.`;
            nextLevelBtn.style.display = 'inline-block';
            if (levelScript && levelScript.textContent.trim()) {
                nextLevelBtn.href = `/level/${LEVEL.next_level}/`;
            } else {
                nextLevelBtn.href = `play.html?level=${LEVEL.next_level}`;
            }
            nextLevelBtn.textContent = 'Next Level →';
        } else {
            winMessage.textContent = "🏆 Incredible! You have conquered every single level in Robot Runner!";
            nextLevelBtn.style.display = 'none';
        }
        showModal(winModal);
    }

    function restartLevel() {
        stopExecution();
        mainSecondsLeft = MAIN_TIME;
        updateMainTimerDisplay();
        resetRobotVisual(false);
        editor.clearHighlight();
        setStatus('Build your program, then press Run.');
        startMainTimer();
    }

    // ----- Program Execution Engine -----
    function setStatus(text) { statusLine.textContent = text; }

    function setUIRunningState(isRunning) {
        running = isRunning;
        runBtn.disabled = isRunning;
        clearBtn.disabled = isRunning;
        if (stopBtn) stopBtn.disabled = !isRunning;
        if (stepBtn) stepBtn.disabled = isRunning && currentSpeed !== 'step';
    }

    function stopExecution() {
        if (stepTimerHandle) clearTimeout(stepTimerHandle);
        stepTimerHandle = null;
        activeGen = null;
        editor.clearHighlight();
        setUIRunningState(false);
    }

    function startRun(isSingleStep = false) {
        if (running && !isSingleStep) return;
        const program = editor.getProgram();
        if (program.length === 0) {
            setStatus('Add some blocks to your program first!');
            soundManager.play('click');
            return;
        }

        if (inRecovery) {
            stopRecoveryTimer();
            hideModal(hitModal);
            startMainTimer();
        }

        if (!activeGen) {
            sim.reset();
            clearGridTrails();
            placeRobot(sim.x, sim.y, sim.dir, false);
            activeGen = runProgram(program, sim);
        }

        setUIRunningState(true);
        setStatus('Executing program…');
        soundManager.play('click');

        if (isSingleStep) {
            stepThrough(activeGen, true);
        } else {
            stepThrough(activeGen, false);
        }
    }

    function stepThrough(gen, singleStepMode = false) {
        if (!running) return;

        const result = gen.next();
        if (result.done) {
            stopExecution();
            return;
        }

        const action = result.value;

        // Highlight active block
        if (action.blockId) {
            editor.highlightBlock(action.blockId);
        }

        if (action.kind === 'move' && action.ok) {
            soundManager.play('move');
            placeRobot(sim.x, sim.y, sim.dir, true);
            if (!singleStepMode) {
                stepTimerHandle = setTimeout(() => stepThrough(gen), stepDelay);
            } else {
                setUIRunningState(false);
            }
        } else if (action.kind === 'move' && !action.ok) {
            soundManager.play('hit');
            robotEl.classList.add('robot-shake');
            setStatus('💥 Hit an obstacle or boundary wall!');
            setTimeout(() => {
                robotEl.classList.remove('robot-shake');
                resetRobotVisual(true);
                stopExecution();
                startRecoveryTimer();
                showModal(hitModal);
            }, 300);
        } else if (action.kind === 'turnLeft' || action.kind === 'turnRight') {
            soundManager.play('turn');
            placeRobot(sim.x, sim.y, sim.dir, true);
            if (!singleStepMode) {
                stepTimerHandle = setTimeout(() => stepThrough(gen), stepDelay);
            } else {
                setUIRunningState(false);
            }
        } else if (action.kind === 'finish') {
            setStatus('🏁 Reached the flag!');
            setTimeout(() => onLevelWon(), 200);
        } else if (action.kind === 'done') {
            stopExecution();
            setStatus("Program finished but didn't reach the flag — adjust your code!");
            if (!mainTimerHandle && !inRecovery) {
                startMainTimer();
            }
        } else if (action.kind === 'limit') {
            stopExecution();
            setStatus('Program ran for too many steps — check your loops!');
            if (!mainTimerHandle && !inRecovery) {
                startMainTimer();
            }
        }
    }

    // Button event listeners
    runBtn.addEventListener('click', () => {
        activeGen = null;
        startRun(false);
    });

    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            stopExecution();
            resetRobotVisual(false);
            setStatus('Execution stopped.');
            soundManager.play('click');
            if (!mainTimerHandle && !inRecovery) {
                startMainTimer();
            }
        });
    }

    if (stepBtn) {
        stepBtn.addEventListener('click', () => {
            if (!activeGen) {
                const program = editor.getProgram();
                if (program.length === 0) {
                    setStatus('Add some blocks to step through!');
                    return;
                }
                sim.reset();
                clearGridTrails();
                placeRobot(sim.x, sim.y, sim.dir, false);
                activeGen = runProgram(program, sim);
            }
            running = true;
            stepThrough(activeGen, true);
        });
    }

    clearBtn.addEventListener('click', () => {
        if (running) return;
        editor.clear();
        resetRobotVisual(false);
        activeGen = null;
        setStatus('Workspace cleared.');
        soundManager.play('click');
    });

    // Desktop Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;

        if (e.code === 'Space') {
            e.preventDefault();
            if (running) {
                if (stopBtn) stopBtn.click();
            } else {
                runBtn.click();
            }
        } else if (e.code === 'Escape') {
            if (running && stopBtn) {
                stopBtn.click();
            }
        } else if (e.key === '1') {
            document.querySelector('.speed-btn[data-speed="1x"]')?.click();
        } else if (e.key === '2') {
            document.querySelector('.speed-btn[data-speed="2x"]')?.click();
        } else if (e.key === '4') {
            document.querySelector('.speed-btn[data-speed="4x"]')?.click();
        }
    });

    // ----- Initialize Game -----
    buildGrid();
    resetRobotVisual(false);
    updateMainTimerDisplay();
    startMainTimer();
})();
