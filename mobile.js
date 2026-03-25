// Panther Quiz Mobile - Standalone Demo Logic
const INITIAL_STOCK = {
    'Chapéu': 10,
    'Boné': 15,
    'Squeeze': 30,
    'Chaveiro Trena': 50,
    'Caneta': 100
};

const QUIZ_QUESTIONS = [
    {
        q: "Qual destes lubrificantes é ideal para motores diesel pesados?",
        options: ["Triton 15W40", "Gear 80W90", "Hydra 68", "Moto 4T"],
        correct: 0
    },
    {
        q: "Qual a função principal do lubrificante no motor?",
        options: ["Apenas limpar", "Reduzir atrito e calor", "Aumentar o consumo", "Mudar a cor do motor"],
        correct: 1
    },
    {
        q: "A Panther Lubrificantes é uma marca focada em...",
        options: ["Apenas carros", "Apenas motos", "Alta performance industrial e automotiva", "Alimentos"],
        correct: 2
    },
    {
        q: "O que significa a sigla SAE em um óleo?",
        options: ["Sociedade de Engenheiros Automotivos", "Sistema de Ar Especial", "Saída de Ar Esquerda", "Sempre Altamente Eficiente"],
        correct: 0
    },
    {
        q: "Qual produto Panther é indicado para transmissões agrícolas?",
        options: ["Tractor Multi", "Moto Special", "Chain Lube", "Dot 4"],
        correct: 0
    },
    {
        q: "Com que frequência deve-se checar o nível do óleo?",
        options: ["Uma vez por ano", "Nunca", "Regularmente (semanal/quinzenal)", "Apenas se o carro parar"],
        correct: 2
    },
    {
        q: "A viscosidade do óleo (ex: 5W30) refere-se a...",
        options: ["À cor do óleo", "À resistência ao escoamento", "Ao preço", "Ao tamanho da embalagem"],
        correct: 1
    }
];

// State
let m_playerName = "";
let m_score = 0;
let m_currentIdx = 0;
let m_timeLeft = 20;
let m_timer = null;
let m_wonPrize = "";
let m_wheelAngle = 0;
let m_stock = JSON.parse(localStorage.getItem('m_agriStock')) || {...INITIAL_STOCK};

// Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
        
        if (screenId === 'quiz') startQuiz();
        if (screenId === 'roulette') initWheel();
    }
}

// Registration
function submitRegister() {
    const name = document.getElementById('m-input-name').value.trim();
    const phone = document.getElementById('m-input-phone').value.trim();
    const lgpd = document.getElementById('m-input-lgpd').checked;
    const err = document.getElementById('m-form-error');

    if (!name || name.length < 3) {
        showError("Por favor, insira seu nome completo.");
        return;
    }
    if (!phone || phone.length < 10) {
        showError("Insira um WhatsApp válido.");
        return;
    }
    if (!lgpd) {
        showError("Você precisa aceitar os termos da LGPD.");
        return;
    }

    m_playerName = name;
    err.classList.add('hidden');
    
    // Save lead locally
    const leads = JSON.parse(localStorage.getItem('m_leads') || '[]');
    leads.push({name, phone, date: new Date().toISOString()});
    localStorage.setItem('m_leads', JSON.stringify(leads));

    showScreen('quiz');
}

function showError(msg) {
    const err = document.getElementById('m-form-error');
    err.textContent = msg;
    err.classList.remove('hidden');
    if (window.navigator.vibrate) window.navigator.vibrate(50);
}

// Quiz Logic
function startQuiz() {
    m_score = 0;
    m_currentIdx = 0;
    loadQuestion();
}

function loadQuestion() {
    if (m_currentIdx >= QUIZ_QUESTIONS.length) {
        finishQuiz();
        return;
    }

    const qData = QUIZ_QUESTIONS[m_currentIdx];
    document.getElementById('m-question-text').textContent = qData.q;
    document.getElementById('m-question-counter').textContent = `${m_currentIdx + 1} / ${QUIZ_QUESTIONS.length}`;
    document.getElementById('m-progress-bar').style.width = `${((m_currentIdx + 1) / QUIZ_QUESTIONS.length) * 100}%`;

    const container = document.getElementById('m-answers');
    container.innerHTML = '';
    
    qData.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'btn-m-answer';
        btn.textContent = opt;
        btn.onclick = () => selectAnswer(i);
        container.appendChild(btn);
    });

    startTimer();
}

function startTimer() {
    clearInterval(m_timer);
    m_timeLeft = 20;
    document.getElementById('m-quiz-timer').textContent = `${m_timeLeft}s`;
    
    m_timer = setInterval(() => {
        m_timeLeft -= 1;
        document.getElementById('m-quiz-timer').textContent = `${m_timeLeft}s`;
        if (m_timeLeft <= 0) {
            clearInterval(m_timer);
            selectAnswer(-1); // Timeout
        }
    }, 1000);
}

function selectAnswer(idx) {
    clearInterval(m_timer);
    const qData = QUIZ_QUESTIONS[m_currentIdx];
    const btns = document.querySelectorAll('.btn-m-answer');
    
    if (idx === qData.correct) {
        m_score += 1;
        if (btns[idx]) btns[idx].classList.add('correct');
        if (window.navigator.vibrate) window.navigator.vibrate(20);
    } else {
        if (btns[idx]) btns[idx].classList.add('wrong');
        if (btns[qData.correct]) btns[qData.correct].classList.add('correct');
        if (window.navigator.vibrate) window.navigator.vibrate([50, 50]);
    }

    setTimeout(() => {
        m_currentIdx += 1;
        loadQuestion();
    }, 1200);
}

function finishQuiz() {
    document.getElementById('m-result-text').textContent = `Você acertou ${m_score} de ${QUIZ_QUESTIONS.length} perguntas!`;
    
    const winActions = document.getElementById('m-win-actions');
    const loseActions = document.getElementById('m-lose-actions');
    const title = document.getElementById('m-result-title');
    const emoji = document.getElementById('m-result-emoji');

    if (m_score >= 5) {
        title.textContent = "PARABÉNS!";
        emoji.textContent = "🏆";
        winActions.classList.remove('hidden');
        loseActions.classList.add('hidden');
    } else {
        title.textContent = "POR POUCO!";
        emoji.textContent = "⚠️";
        winActions.classList.add('hidden');
        loseActions.classList.remove('hidden');
    }
    showScreen('results');
}

// Roulette Logic
function initWheel() {
    const canvas = document.getElementById('m-wheel-canvas');
    if (!canvas) return;
    drawWheel(canvas);
}

function drawWheel(canvas) {
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 10;
    
    const prizes = ['Chapéu', 'Squeeze', 'Chaveiro', 'Caneta', 'Boné', 'Squeeze', 'Chaveiro', 'Caneta'];
    const colors = ['#E84011', '#1e1e20', '#E84011', '#1e1e20', '#E84011', '#1e1e20', '#E84011', '#1e1e20'];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    prizes.forEach((prize, i) => {
        const angle = (2 * Math.PI) / prizes.length;
        ctx.beginPath();
        ctx.fillStyle = colors[i];
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, i * angle, (i + 1) * angle);
        ctx.fill();
        ctx.save();
        
        ctx.translate(centerX, centerY);
        ctx.rotate(i * angle + angle / 2);
        ctx.fillStyle = "white";
        ctx.font = "bold 24px Outfit";
        ctx.textAlign = "right";
        ctx.fillText(prize, radius - 30, 10);
        ctx.restore();
    });
}

function spinWheel() {
    const btn = document.getElementById('m-btn-spin');
    btn.disabled = true;
    
    // Choose prize (Mock probability)
    const availablePrizes = Object.keys(m_stock).filter(k => m_stock[k] > 0);
    m_wonPrize = availablePrizes[Math.floor(Math.random() * availablePrizes.length)] || "Caneta";
    
    const prizes = ['Chapéu', 'Squeeze', 'Chaveiro', 'Caneta', 'Boné', 'Squeeze', 'Chaveiro', 'Caneta'];
    const targetIdx = prizes.indexOf(m_wonPrize);
    
    const extraSpins = 5;
    const rotation = (extraSpins * 360) + (360 - (targetIdx * 45) - 22.5);
    m_wheelAngle += rotation;

    const canvas = document.getElementById('m-wheel-canvas');
    canvas.style.transition = 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)';
    canvas.style.transform = `rotate(${m_wheelAngle}deg)`;

    setTimeout(() => {
        document.getElementById('m-btn-spin').classList.add('hidden');
        document.getElementById('m-spin-status').classList.add('hidden');
        document.getElementById('m-prize-name').textContent = m_wonPrize;
        document.getElementById('m-prize-reveal').classList.remove('hidden');
        
        // Update local stock
        m_stock[m_wonPrize] -= 1;
        localStorage.setItem('m_agriStock', JSON.stringify(m_stock));
        
        if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
    }, 4500);
}

// Final Screen
function showCode() {
    const code = `PANTHER-${Math.floor(1000 + Math.random() * 9000)}`;
    document.getElementById('m-rescue-code').textContent = code;
    document.getElementById('m-code-prize').textContent = m_wonPrize;
    showScreen('code');
    startResetCountdown();
}

function startResetCountdown() {
    let sec = 20;
    const timerEl = document.getElementById('m-reset-sec');
    const resetInterval = setInterval(() => {
        sec -= 1;
        timerEl.textContent = sec;
        if (sec <= 0) {
            clearInterval(resetInterval);
            resetApp();
        }
    }, 1000);

    // Stop if user resets manually
    window.lastResetInterval = resetInterval;
}

function resetApp() {
    if (window.lastResetInterval) clearInterval(window.lastResetInterval);
    clearInterval(m_timer);
    
    // Reset Form
    document.getElementById('m-input-name').value = '';
    document.getElementById('m-input-phone').value = '';
    document.getElementById('m-input-lgpd').checked = false;
    
    // Reset Visibility
    document.getElementById('m-btn-spin').disabled = false;
    document.getElementById('m-btn-spin').classList.remove('hidden');
    document.getElementById('m-spin-status').classList.remove('hidden');
    document.getElementById('m-prize-reveal').classList.add('hidden');
    
    showScreen('home');
}

// Initial
window.onload = () => {
    // Check if we need orientation lock or similar
    console.log("Panther Mobile Loaded");
};
