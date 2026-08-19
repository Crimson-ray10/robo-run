(function () {
    function formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    function renderLevelCards() {
        document.querySelectorAll('.level-card').forEach((card) => {
            const levelId = parseInt(card.dataset.levelId, 10);
            const requires = parseInt(card.dataset.requires, 10);

            // Check unlock status
            if (levelId > 1) {
                const prevDone = localStorage.getItem(`rg_level${requires}_complete`) === 'true';
                if (!prevDone) {
                    card.classList.add('locked');
                } else {
                    card.classList.remove('locked');
                }
            } else {
                card.classList.remove('locked');
            }

            // Check complete status
            const done = localStorage.getItem(`rg_level${levelId}_complete`) === 'true';
            if (done) {
                card.classList.add('complete');
            } else {
                card.classList.remove('complete');
            }

            // Render stars
            const stars = parseInt(localStorage.getItem(`rg_level${levelId}_stars`) || '0', 10);
            const starsEl = document.getElementById(`stars-lvl-${levelId}`);
            if (starsEl) {
                if (stars > 0) {
                    starsEl.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
                } else {
                    starsEl.textContent = '';
                }
            }

            // Render best time
            const bestTime = localStorage.getItem(`rg_level${levelId}_best_time`);
            const bestEl = document.getElementById(`best-lvl-${levelId}`);
            if (bestEl) {
                if (bestTime !== null && done) {
                    bestEl.textContent = `⏱ Best: ${formatTime(parseInt(bestTime, 10))}`;
                } else {
                    bestEl.textContent = '';
                }
            }
        });
    }

    renderLevelCards();

    // Reset Progress button
    const resetBtn = document.getElementById('reset-progress-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all level completion progress and stars?')) {
                for (let i = 1; i <= 10; i++) {
                    localStorage.removeItem(`rg_level${i}_complete`);
                    localStorage.removeItem(`rg_level${i}_stars`);
                    localStorage.removeItem(`rg_level${i}_best_time`);
                }
                renderLevelCards();
            }
        });
    }
})();
