// Panther Quiz Mobile - 100% Sync with Totem script.js
// Standalone version (no server required)

const INITIAL_STOCK = {
    'ChapÃ©u': 50,
    'BonÃ©': 70,
    'Squeeze': 150,
    'Chaveiro Trena': 150,
    'Caneta': 150
};

const questionsBank = [
    {
        q: "Qual Ã© a principal funÃ§Ã£o de um lubrificante Panther no motor?",
        answers: ["Aumentar o tamanho do motor", "Reduzir o atrito entre as peÃ§as", "Colorir o motor", "Substituir o combustÃ­vel"],
        correct: 1
    },
    {
        q: "A Panther Lubrificantes desenvolve produtos para quais tipos de aplicaÃ§Ã£o?",
        answers: ["Apenas carros de passeio", "Apenas motos", "Linha automotiva, motos, pesados e agrÃ­cola", "Apenas mÃ¡quinas agrÃ­colas"],
        correct: 2
    },
    {
        q: "Os lubrificantes Panther sÃ£o desenvolvidos para ajudar a:",
        answers: ["Reduzir o desgaste do motor", "Proteger os componentes internos", "Melhorar o desempenho dos equipamentos", "Todas as alternativas"],
        correct: 3
    },
    {
        q: "Para equipamentos agrÃ­colas como tratores e colheitadeiras, Ã© importante usar lubrificantes que:",
        answers: ["Tenham qualidade e especificaÃ§Ã£o correta", "Sejam apenas mais baratos", "Qualquer tipo de Ã³leo serve", "NÃ£o precisam ser trocados"],
        correct: 0
    },
    {
        q: "Utilizar um lubrificante de qualidade, como os da Panther, ajuda a:",
        answers: ["Aumentar a vida Ãºtil do equipamento", "Reduzir manutenÃ§Ã£o inesperada", "Melhorar a eficiÃªncia da mÃ¡quina", "Todas as alternativas"],
        correct: 3
    },
    {
        q: "O que indica a viscosidade de um Ã³leo lubrificante?",
        options: ["A cor do Ã³leo", "A espessura ou fluidez do Ã³leo", "O cheiro do Ã³leo", "O tamanho da embalagem"],
        correct: 1
    },
    {
        q: "Qual tipo de motor Ã© mais comum em tratores agrÃ­colas?",
        answers: ["Motor elÃ©trico", "Motor diesel", "Motor a gÃ¡s", "Motor hÃ­brido"],
        correct: 1
    },
    {
        q: "Lubrificantes Panther podem ser usados em:",
        answers: ["Motores", "Sistemas hidrÃ¡ulicos", "TransmissÃµes", "Todas as alternativas"],
        correct: 3
    },
    {
        q: "Em operaÃ§Ãµes agrÃ­colas intensas, o lubrificante precisa:",
        answers: ["Ser trocado quando escurece", "Ter especificaÃ§Ã£o correta", "Durar para sempre", "Ser qualquer tipo"],
        correct: 1
    },
    {
        q: "Durante a colheita, parar uma mÃ¡quina por problema mecÃ¢nico pode:",
        answers: ["NÃ£o causar impacto", "Atrasar toda a operaÃ§Ã£o", "NÃ£o fazer diferenÃ§a", "Melhorar a produÃ§Ã£o"],
        correct: 1
    }
];

// State
let participants = JSON.parse(localStorage.getItem('m_participants') || '[]');
let prizeStock = JSON.parse(localStorage.getItem('m_prizeStock')) || {...INITIAL_STOCK};
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let timer = null;
let timeLeft = 20;
let selectedPrize = null;
let wheelAngle = 0;
let currentUser = { name: '', phone: '' };

// Navigation
function showScreen(id) {
    console.log("Showing screen:", id);
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${id}`);
    if (target) {
        target.classList.add('active');
        if (id === 'home') resetApp();
    }
}

function goToRegister() {
    showScreen('register');
}

function startQuiz() {
    showScreen('quiz');
    // Random 7 questions like the totem
    currentQuestions = [...questionsBank].sort(() => 0.5 - Math.random()).slice(0, 7);
    currentQuestionIndex = 0;
    score = 0;
    loadQuestion();
}

function loadQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        showResults();
        return;
    }

    const q = currentQuestions[currentQuestionIndex];
    document.getElementById('question-text').textContent = q.q;
    document.getElementById('question-count').textContent = `Pergunta ${currentQuestionIndex + 1} de ${currentQuestions.length}`;
    
    // Progress
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    document.getElementById('quiz-progress').style.width = progress + '%';

    const answersGrid = document.getElementById('answers-grid');
    answersGrid.innerHTML = '';

    const options = q.answers || q.options; // Compatibility
    options.forEach((ans, i) => {
        const btn = document.createElement('button');
        btn.className = 'btn-answer';
        btn.innerHTML = `<span class="opt-letter">${String.fromCharCode(65 + i)}</span> <span class="opt-text">${ans}</span>`;
        btn.onclick = () => selectAnswer(i);
        answersGrid.appendChild(btn);
    });

    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timeLeft = 20;
    document.getElementById('timer-val').textContent = timeLeft;
    
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-val').textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            selectAnswer(-1); // Timeout
        }
    }, 1000);
}

function selectAnswer(idx) {
    clearInterval(timer);
    const q = currentQuestions[currentQuestionIndex];
    const btns = document.querySelectorAll('.answer-btn');
    
    if (idx === q.correct) {
        score++;
        if (btns[idx]) btns[idx].classList.add('correct');
        if (window.navigator.vibrate) window.navigator.vibrate(20);
    } else {
        if (btns[idx]) btns[idx].classList.add('wrong');
        if (btns[q.correct]) btns[q.correct].classList.add('correct');
        if (window.navigator.vibrate) window.navigator.vibrate([50, 50]);
    }

    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestion();
    }, 1200);
}

function showResults() {
    showScreen('results');
    document.getElementById('final-score').textContent = score;
    
    if (score >= 5) {
        document.getElementById('results-win').classList.remove('hidden');
        document.getElementById('results-lose').classList.add('hidden');
    } else {
        document.getElementById('results-win').classList.add('hidden');
        document.getElementById('results-lose').classList.remove('hidden');
    }
}

// Roulette
function initRoulette() {
    showScreen('roulette');
    selectedPrize = getRandomPrize();
    console.log("Selected prize:", selectedPrize);
    const canvas = document.getElementById('wheel-canvas');
    if (canvas) drawWheel(canvas);
}

function drawWheel(canvas) {
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 10;
    
    const prizes = ['ChapÃ©u', 'Squeeze', 'Chaveiro Trena', 'Caneta', 'BonÃ©', 'Squeeze', 'Chaveiro Trena', 'Caneta'];
    const colors = ['#FF4500', '#111111', '#FF4500', '#111111', '#FF4500', '#111111', '#FF4500', '#111111'];

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
        ctx.font = "bold 20px Outfit";
        ctx.textAlign = "right";
        ctx.fillText(prize, radius - 40, 10);
        ctx.restore();
    });
}

function getRandomPrize() {
    // Check presentation mode
    const forceSelect = document.getElementById('force-prize-select');
    if (forceSelect && forceSelect.value !== "") {
        return forceSelect.value;
    }

    const available = Object.entries(prizeStock).filter(([_, qty]) => qty > 0);
    const total = available.reduce((acc, [_, qty]) => acc + qty, 0);
    if (total === 0) return "Squeeze"; // Fallback

    let random = Math.random() * total;
    for (const [name, qty] of available) {
        if (random < qty) return name;
        random -= qty;
    }
    return available[0][0];
}

function spinWheel() {
    const btn = document.getElementById('spin-btn');
    btn.disabled = true;

    const prizes = ['ChapÃ©u', 'Squeeze', 'Chaveiro Trena', 'Caneta', 'BonÃ©', 'Squeeze', 'Chaveiro Trena', 'Caneta'];
    const prizeIdx = prizes.indexOf(selectedPrize);
    
    const spins = 5;
    const deg = spins * 360 + (360 - (prizeIdx * 45) - 22.5);
    wheelAngle += deg;

    const wheel = document.getElementById('wheel-canvas');
    wheel.style.transition = 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)';
    wheel.style.transform = `rotate(${wheelAngle}deg)`;

    setTimeout(() => {
        finishGiveaway();
    }, 4500);
}

function finishGiveaway() {
    showScreen('ticket');
    document.getElementById('ticket-prize-name').textContent = selectedPrize;
    const code = `PAN-${Math.floor(1000 + Math.random() * 9000)}`;
    document.getElementById('rescue-code').textContent = code;

    // Save
    const lead = {
        ...currentUser,
        score,
        prize: selectedPrize,
        code,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
    };
    participants.push(lead);
    localStorage.setItem('m_participants', JSON.stringify(participants));
    
    // Update stock
    prizeStock[selectedPrize]--;
    localStorage.setItem('m_prizeStock', JSON.stringify(prizeStock));
    
    startAutoReset(30);
}

function startAutoReset(sec) {
    let count = sec;
    document.getElementById('m-reset-sec').textContent = count;
    const itv = setInterval(() => {
        count--;
        document.getElementById('m-reset-sec').textContent = count;
        if (count <= 0) {
            clearInterval(itv);
            showScreen('home');
        }
    }, 1000);
    window.mResetItv = itv;
}

function resetApp() {
    if (window.mResetItv) clearInterval(window.mResetItv);
    clearInterval(timer);
    currentUser = { name: '', phone: '' };
    const btn = document.getElementById('spin-btn');
    if (btn) btn.disabled = false;
    const wheel = document.getElementById('wheel-canvas');
    if (wheel) {
        wheel.style.transition = 'none';
        wheel.style.transform = `rotate(${wheelAngle % 360}deg)`;
    }
}

// Form logic
function registerParticipant() {
    const name = document.getElementById('input-name').value.trim();
    const phone = document.getElementById('input-phone').value.trim();
    const lgpd = document.getElementById('m-input-lgpd').checked;

    if (name.length < 3 || phone.length < 10 || !lgpd) {
        alert("Preencha todos os dados e aceite a LGPD.");
        return;
    }

    currentUser = { name, phone };
    startQuiz();
}

// Admin (Simplified)
function resetStock() {
    prizeStock = {...INITIAL_STOCK};
    localStorage.setItem('m_prizeStock', JSON.stringify(prizeStock));
    alert("Estoque resetado!");
}

window.onload = () => {
    console.log("Panther Mobile Sync Loaded");
};
