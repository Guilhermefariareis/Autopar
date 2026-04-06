/**
 * Panther Quiz - Mobile Specific Logic
 * Overrides Totem's circular wheel with a modern Vertical Reel (Slot Machine)
 */

// Override drawWheel to do nothing or setup the reel
window.drawWheel = function (canvas) {
    console.log("Mobile: Setting up Reel instead of Drawing Wheel");
    setupReel();
};

// Override showRoulette to avoid canvas errors
window.showRoulette = function () {
    window.wheelSpun = false;

    // In mobile.html there is no canvas, so we just setup the reel UI
    const container = document.getElementById('reel-container');
    if (container) {
        container.style.transition = 'none';
        container.style.transform = 'translateY(0)';
        setupReel();
    }

    document.getElementById('prize-reveal').classList.add('hidden');
    document.getElementById('prize-popup').classList.add('hidden');
    document.getElementById('btn-spin').classList.remove('hidden');
    document.getElementById('spin-status').innerHTML = '&nbsp;';
    document.getElementById('confetti-container').innerHTML = '';

    const firstName = playerName ? playerName.split(' ')[0] : 'Visitante';
    document.getElementById('roulette-player-name').textContent = `Boa sorte, ${firstName}!`;

    showScreen('roulette');
};

function setupReel() {
    const container = document.getElementById('reel-container');
    if (!container) return;

    container.innerHTML = '';
    const initialPrize = { name: 'BOA SORTE!', icon: '🎁' };
    container.appendChild(createReelItem(initialPrize.name, initialPrize.icon));
}

function createReelItem(name, icon) {
    const item = document.createElement('div');
    item.className = 'reel-item';
    item.innerHTML = `
        <div class="reel-item-inner">
            <span class="reel-item-icon">${icon || ''}</span>
            <span class="reel-item-name">${name.toUpperCase()}</span>
        </div>
    `;
    return item;
}

// Override spinWheel
window.spinWheel = function () {
    if (window.wheelSpun) return;

    // Pause inactivity timer (from script.js)
    if (typeof inactivityTimer !== 'undefined') clearInterval(inactivityTimer);

    window.wheelSpun = true;
    document.getElementById('btn-spin').classList.add('hidden');
    document.getElementById('spin-status').innerHTML = 'SORTEANDO...';

    // Add visual excitement
    const viewport = document.querySelector('.reel-viewport');
    viewport.classList.add('spinning-glow');

    // Get winner from base logic
    const wonPrize = window.getRandomPrize();
    if (!wonPrize) {
        alert("Ops! Todos os brindes acabaram.");
        window.resetApp();
        return;
    }

    const UI_PRIZES = [
        { name: 'Chapéu', icon: '' },
        { name: 'Boné', icon: '' },
        { name: 'Squeeze', icon: '' },
        { name: 'Chaveiro Trena', icon: '' },
        { name: 'Caneta', icon: '' }
    ];

    const EMOJIS = {
        'Chapéu': '',
        'Boné': '',
        'Squeeze': '',
        'Chaveiro Trena': '',
        'Caneta': ''
    };

    const container = document.getElementById('reel-container');
    container.style.transition = 'none';
    container.style.transform = 'translateY(0)';
    container.innerHTML = '';

    // Build a long reel for the "blur" effect
    const itemCount = 40; // Total items to scroll through
    const reelItems = [];

    // Fill with random noise
    for (let i = 0; i < itemCount - 1; i++) {
        const randomP = UI_PRIZES[Math.floor(Math.random() * UI_PRIZES.length)];
        reelItems.push(randomP);
    }

    // Set the last one as the actual winner
    // We use a safe check to avoid fallback emojis like 🎁
    const finalIcon = (EMOJIS[wonPrize] !== undefined) ? EMOJIS[wonPrize] : "";
    reelItems.push({ name: wonPrize, icon: finalIcon });

    reelItems.forEach(p => {
        container.appendChild(createReelItem(p.name, p.icon));
    });

    // Force reflow
    container.offsetHeight;

    // Trigger animation
    const itemHeight = 100; // Matches CSS
    const totalScroll = (itemCount - 1) * itemHeight;

    container.style.transition = 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)';
    container.style.transform = `translateY(-${totalScroll}px)`;

    // Handle Reveal
    setTimeout(() => {
        wonPrizeName = wonPrize; // Update global

        // Update stock and logs (from script.js)
        if (typeof prizeStock !== 'undefined' && prizeStock[wonPrize] !== undefined) {
            prizeStock[wonPrize] -= 1;
            if (typeof saveStock === 'function') saveStock();
        }

        document.getElementById('prize-name-display').textContent = wonPrizeName;
        document.getElementById('prize-popup-name').textContent = wonPrizeName;

        // Safety: ensure the ticket screen also has the prize name ready
        const ticketPrize = document.getElementById('code-prize-name');
        if (ticketPrize) ticketPrize.textContent = wonPrizeName;

        document.getElementById('prize-reveal').classList.remove('hidden');
        document.getElementById('prize-popup').classList.remove('hidden');

        if (typeof launchConfetti === 'function') launchConfetti();

        if (typeof stats !== 'undefined') {
            stats.prizes += 1;
            localStorage.setItem('agriPrizes', String(stats.prizes));
        }

        // Update record (from script.js)
        if (typeof participants !== 'undefined' && typeof currentSessionId !== 'undefined') {
            const record = participants.find((item) => item.id === currentSessionId);
            if (record) {
                record.prize = window.wonPrizeName;
                if (typeof saveAndSync === 'function') saveAndSync();
            }
        }

        document.getElementById('spin-status').innerHTML = 'PARABÉNS! 🎊';
        viewport.classList.remove('spinning-glow');

        // Resume inactivity reset
        if (typeof startAutoReset === 'function') startAutoReset();
    }, 4100);
};

// Celebration delay before resetting to home
window.celebrarEFinalizar = function () {
    // Close the popup, keep the roulette screen with confetti
    document.getElementById('prize-popup').classList.add('hidden');
    document.getElementById('prize-reveal').classList.remove('hidden');

    // Launch extra confetti burst
    if (typeof launchConfetti === 'function') {
        launchConfetti();
        setTimeout(() => launchConfetti(), 1500);
        setTimeout(() => launchConfetti(), 3000);
    }

    // Show countdown
    const countdownEl = document.getElementById('celebrate-countdown');
    const secEl = document.getElementById('celebrate-sec');
    const DURATION = 8;

    if (countdownEl && secEl) {
        countdownEl.classList.remove('hidden');
        secEl.textContent = DURATION;

        let remaining = DURATION;
        const tick = setInterval(() => {
            remaining -= 1;
            secEl.textContent = remaining;
            if (remaining <= 0) {
                clearInterval(tick);
                window.resetApp(true);
            }
        }, 1000);
    } else {
        // Fallback if elements not found
        setTimeout(() => window.resetApp(true), 8000);
    }
};

// Hook into window load to init the reel if we are already on the screen (rare)
window.addEventListener('load', () => {
    if (document.getElementById('screen-roulette').classList.contains('active')) {
        setupReel();
    }
});
