// Quiz Panther - Event Totem (Offline-First)

// Prize Stock Configuration
const INITIAL_STOCK = {
    'Chapéu': 50,
    'Boné': 70,
    'Squeeze': 150,
    'Chaveiro Trena': 150,
    'Caneta': 150
};

// State Management
let stats = {
    players: parseInt(localStorage.getItem('agriPlayers') || '0', 10),
    prizes: parseInt(localStorage.getItem('agriPrizes') || '0', 10)
};

let prizeStock = JSON.parse(localStorage.getItem('agriStock'));
if (!prizeStock || Object.keys(prizeStock).length === 0 || Object.values(prizeStock).reduce((a, b) => a + b, 0) === 0) {
    prizeStock = { ...INITIAL_STOCK };
}

function saveStock() {
    localStorage.setItem('agriStock', JSON.stringify(prizeStock));

    // Sincroniza estoque com o servidor
    const apiHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '' : 'http://localhost:8000';
    fetch(apiHost + '/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prizeStock)
    }).catch(e => debugLog('Erro ao salvar estoque no servidor: ' + e.message, 'warn'));
}

/** Carrega estoque do servidor explicitamente */
async function loadStockFromServer() {
    try {
        const apiHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '' : 'http://localhost:8000';
        const res = await fetch(apiHost + '/stock');
        const serverStock = await res.json();

        if (serverStock && Object.keys(serverStock).length > 0) {
            prizeStock = serverStock;
            localStorage.setItem('agriStock', JSON.stringify(prizeStock));
            debugLog('Estoque carregado do servidor com sucesso.');
            checkGlobalStock();
        }
    } catch (e) {
        debugLog('Usando estoque local (Servidor offline ou inicial).', 'info');
    }
}

let participants = JSON.parse(localStorage.getItem('agriParticipants') || '[]');
/** Salva localmente e sincroniza com o servidor */
function saveAndSync() {
    try {
        localStorage.setItem('agriParticipants', JSON.stringify(participants));

        if (window.location.protocol === 'file:') {
            console.error('❌ ERRO: O sistema está rodando via arquivo local (file://). O salvamento em disco NÃO funcionará. Use http://localhost:8000');
            return;
        }

        syncLeadsToServer();
    } catch (e) {
        console.error('❌ Erro no saveAndSync:', e);
    }
}

let currentSessionId = null;
const TOTAL_QUESTIONS = 7;
const WIN_SCORE = 5;

// Timers
let inactivityTimer = null;
let questionTimer = null;
let autoResetTimer = null;
let timeLeft = 20;

// Global State Variables
let playerName = '';
let playerPhone = '';
let isLocked = false;
let qIndex = 0;
let score = 0;
let currentQs = [];
let shuffledAnswers = [];
let wheelAngle = 0;
let wheelSpun = false;
let wonPrizeName = '';
let adminClicks = [];

// Admin State
let adminPinBuffer = '';
const ADMIN_PIN = '1234';


// ============================================================
// CSV Export - 100% Offline via Browser Download
// ============================================================

/** Helper: Robust Shuffle (Fisher-Yates) */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
function exportCSV() {
    const headers = ['ID', 'Nome', 'Telefone', 'Data', 'Hora', 'Pontuacao', 'Premio', 'Codigo'];
    const rows = participants.map(p => [
        p.id || '',
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.phone || '').replace(/"/g, '""')}"`,
        p.date || '',
        p.time || '',
        p.score != null ? p.score : '',
        `"${(p.prize || '').replace(/"/g, '""')}"`,
        p.code || ''
    ].join(';'));

    const csvContent = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    const link = document.createElement('a');
    link.href = url;
    link.download = `panther_leads_${ts}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════
//  PERSISTÊNCIA ROBUSTA — Auto-dump para server.py
//  Salva: nome, WhatsApp, acertos, prêmio, data e hora
//  Estratégia: dump de TODOS os leads a cada 30s
//              + imediatamente ao completar um lead
// ═══════════════════════════════════════════════════════

// Global Error Logger for Totem Debug
function debugLog(msg, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${msg}`);
    const logBox = document.getElementById('admin-debug-log');
    if (logBox) {
        const line = document.createElement('div');
        line.className = `debug-line ${type}`;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logBox.prepend(line);
    }
}

window.onerror = function (msg, url, lineNo, columnNo, error) {
    debugLog(`${msg} (${lineNo}:${columnNo})`, 'error');
    return false;
};

window.onunhandledrejection = function (event) {
    debugLog(`Promise Rejection: ${event.reason}`, 'error');
};

// CONFIGURAÇÃO SUPABASE (BANCO ONLINE)
const SUPABASE_URL = 'https://cqdsupishhkpbwfwpgju.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_AAAtL9JH-CLn7QSaTpTaig_QoUOOuQB'; 
// SUPABASE_SECRET foi removido para segurança do repositório

let _syncTimer = null;

/** Sincroniza um único lead com o Supabase (Nuvem) */
async function syncToSupabase(lead) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;

    try {
        // Usamos UPSERT (se o ID já existe, atualiza. Se não, cria)
        const response = await fetch(`${SUPABASE_URL}/rest/v1/leads?on_conflict=id`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
                id: lead.id, // ID local do totem
                name: lead.name,
                phone: lead.phone,
                score: lead.score,
                prize: lead.prize,
                code: lead.code,
                created_at: lead.created_at || new Date().toISOString()
            })
        });

        if (response.ok) {
            debugLog(`Nuvem: Lead de ${lead.name} sincronizado.`, 'info');
        } else {
            const errText = await response.text();
            debugLog(`Erro Nuvem: ${response.status} - ${errText}`, 'error');
            console.error('Supabase Error:', errText);
        }
    } catch (e) {
        debugLog('Erro na sincronização em nuvem (Sem internet?).', 'warn');
    }
}

/** Envia todos os leads do localStorage para o servidor local */
function syncLeadsToServer(onComplete) {
    if (!participants || participants.length === 0) {
        if (onComplete) onComplete(false);
        return;
    }

    const payload = participants.map(p => ({
        id: p.id || '',
        name: p.name || '',
        phone: p.phone || '',
        date: p.date || '',
        time: p.time || '',
        score: p.score != null ? p.score : '',
        prize: p.prize || '',
        code: p.code || ''
    }));

    // Usamos URL absoluta para garantir, mas com fallback para localhost
    const apiHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '' : 'http://localhost:8000';

    fetch(apiHost + '/dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(r => r.json())
        .then(data => {
            updateServerStatus(true);
            debugLog(`Sync OK: ${data.saved} leads salvos.`);
            if (onComplete) onComplete(true);
        })
        .catch(err => {
            updateServerStatus(false);
            debugLog(`Erro de Sync: ${err.message}`, 'error');
            if (onComplete) onComplete(false);
        });
}

function updateServerStatus(online) {
    const statusEl = document.getElementById('server-status');
    if (!statusEl) return;

    const textEl = statusEl.querySelector('.status-text');
    if (online) {
        statusEl.classList.add('online');
        if (textEl) textEl.textContent = 'Servidor Online';
    } else {
        statusEl.classList.remove('online');
        if (textEl) textEl.textContent = 'Erro de Sincronização';
    }
}

/** Inicia auto-sync periódico a cada 20 segundos */
function startAutoSync() {
    if (_syncTimer) clearInterval(_syncTimer);
    
    // Tenta sincronizar a cada 20 segundos
    _syncTimer = setInterval(() => {
        if (navigator.onLine) {
            syncLeadsToServer();
        } else {
            updateServerStatus(false);
            debugLog('Totem Offline: Aguardando conexão para sincronizar...', 'info');
        }
    }, 20000);
    
    // Sincroniza imediatamente ao iniciar
    syncLeadsToServer();
}

/** Salva imediatamente (wrapper para compatibilidade) */
function saveToServer() {
    saveAndSync();
}

const questionsBank = [
    {
        q: "Qual é a principal função de um lubrificante Panther no motor?",
        answers: ["Aumentar o tamanho do motor", "Reduzir o atrito entre as peças", "Colorir o motor", "Substituir o combustível"],
        correct: 1
    },
    {
        q: "A Panther Lubrificantes desenvolve produtos para quais tipos de aplicação?",
        answers: ["Apenas carros de passeio", "Apenas motos", "Linha automotiva, motos, pesados e agrícola", "Apenas máquinas agrícolas"],
        correct: 2
    },
    {
        q: "Os lubrificantes Panther são desenvolvidos para ajudar a:",
        answers: ["Reduzir o desgaste do motor", "Proteger os componentes internos", "Melhorar o desempenho dos equipamentos", "Todas as alternativas"],
        correct: 3
    },
    {
        q: "Para equipamentos agrícolas como tratores e colheitadeiras, é importante usar lubrificantes que:",
        answers: ["Tenham qualidade e especificação correta", "Sejam apenas mais baratos", "Qualquer tipo de óleo serve", "Não precisam ser trocados"],
        correct: 0
    },
    {
        q: "Utilizar um lubrificante de qualidade, como os da Panther, ajuda a:",
        answers: ["Aumentar a vida útil do equipamento", "Reduzir manutenção inesperada", "Melhorar a eficiência da máquina", "Todas as alternativas"],
        correct: 3
    },
    {
        q: "O que indica a viscosidade de um óleo lubrificante?",
        answers: ["A cor do óleo", "A espessura ou fluidez do óleo", "O cheiro do óleo", "O tamanho da embalagem"],
        correct: 1
    },
    {
        q: "Qual tipo de motor é mais comum em tratores agrícolas?",
        answers: ["Motor elétrico", "Motor diesel", "Motor a gás", "Motor híbrido"],
        correct: 1
    },
    {
        q: "Lubrificantes Panther podem ser usados em:",
        answers: ["Motores", "Sistemas hidráulicos", "Transmissões", "Todas as alternativas"],
        correct: 3
    },
    {
        q: "Em operações agrícolas intensas, o lubrificante precisa:",
        answers: ["Ser trocado quando escurece", "Ter especificação correta", "Durar para sempre", "Ser qualquer tipo"],
        correct: 1
    },
    {
        q: "Durante a colheita, parar uma máquina por problema mecânico pode:",
        answers: ["Não causar impacto", "Atrasar toda a operação", "Não fazer diferença", "Melhorar a produção"],
        correct: 1
    }
];

// Smart Algorithm: Probability based on stock
function getRandomPrize() {
    // 🧪 MODO APRESENTAÇÃO/VENDAS: Intercepta a roleta para forçar um prêmio específico
    const forceSelect = document.getElementById('force-prize-select');
    if (forceSelect && forceSelect.value !== "") {
        const forcedName = forceSelect.value;
        if (prizeStock[forcedName] > 0) {
            return forcedName;
        } else {
            console.warn(`[Modo Apresentação] Tentou forçar '${forcedName}', mas o estoque é zero! Executando sorteio normal.`);
        }
    }

    const availablePrizes = Object.entries(prizeStock).filter(([name, count]) => count > 0);
    const totalAvailable = availablePrizes.reduce((sum, [_, count]) => sum + count, 0);

    if (totalAvailable === 0) return null;

    let random = Math.random() * totalAvailable;
    let cursor = 0;

    for (const [name, count] of availablePrizes) {
        cursor += count;
        if (random <= cursor) {
            return name;
        }
    }
    return availablePrizes[0][0];
}

function checkGlobalStock() {
    const total = Object.values(prizeStock).reduce((a, b) => a + b, 0);
    const homeBtn = document.querySelector('#screen-home .btn-jumbo');
    const soldOutMsg = document.getElementById('sold-out-banner');

    if (total === 0) {
        if (homeBtn) homeBtn.classList.add('hidden');
        if (soldOutMsg) soldOutMsg.classList.remove('hidden');
        return false;
    } else {
        if (homeBtn) homeBtn.classList.remove('hidden');
        if (soldOutMsg) soldOutMsg.classList.add('hidden');
        return true;
    }
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
    const element = document.getElementById('screen-' + id) || document.getElementById(id);
    if (element) {
        element.classList.add('active');
    }
}

function testRoulette() {
    playerName = "Visitante (Teste)";
    score = 7;
    showRoulette();
}

function goToRegister() {
    showScreen('register');
}

function submitRegister() {
    const nameEl = document.getElementById('input-name');
    const phoneEl = document.getElementById('input-phone');
    const lgpdEl = document.getElementById('input-lgpd');
    const errEl = document.getElementById('form-error');

    playerName = nameEl.value.trim();
    playerPhone = phoneEl.value.trim();

    // Stricter Validation
    const nameParts = playerName.split(/\s+/).filter(part => part.length > 1);
    const rawPhone = playerPhone.replace(/\D/g, "");

    if (nameParts.length < 2) {
        errEl.textContent = "Por favor, insira seu nome e sobrenome.";
        errEl.classList.remove('hide');
        return;
    }

    if (rawPhone.length < 10) {
        errEl.textContent = "Por favor, insira um WhatsApp válido.";
        errEl.classList.remove('hide');
        return;
    }

    if (!lgpdEl.checked) {
        errEl.textContent = "Você precisa aceitar os termos para participar.";
        errEl.classList.remove('hide');
        return;
    }

    errEl.classList.add('hide');
    startQuiz();
}

document.getElementById('input-phone').addEventListener('input', function (e) {
    let v = this.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);

    // Explicitly handle empty state to ensure it's cleared "completely"
    if (!v || v.length === 0) {
        if (this.value !== "") this.value = "";
        return;
    }

    let formatted = "(" + v.slice(0, 2);
    if (v.length > 2) {
        formatted += ") " + v.slice(2, 6);
        if (v.length > 6) {
            if (v.length > 10) {
                // Mobile style: (11) 99999-9999
                formatted = "(" + v.slice(0, 2) + ") " + v.slice(2, 7) + "-" + v.slice(7);
            } else {
                // Standard style: (11) 9999-9999
                formatted += "-" + v.slice(6);
            }
        }
    }

    // Only update if changed to avoid breaking deletion/cursor flow
    if (this.value !== formatted) {
        this.value = formatted;
    }
});

function startQuiz() {
    if (!checkGlobalStock()) {
        alert("Ops! Todos os brindes acabaram. Modo de demonstração encerrado.");
        window.location.reload();
        return;
    }

    resetInactivityTimer();
    score = 0;
    qIndex = 0;

    // Shuffle and pick 7 random questions from the bank
    // We create a fresh copy and shuffle twice to ensure high randomness
    const shuffledBank = shuffleArray([...questionsBank]);
    currentQs = shuffleArray(shuffledBank).slice(0, TOTAL_QUESTIONS);
    
    console.log("Quiz Iniciado - Questões Embaralhadas:", currentQs.map(q => q.q.substring(0, 15) + "..."));

    stats.players += 1;
    localStorage.setItem('agriPlayers', String(stats.players));

    const now = new Date();
    currentSessionId = Date.now();
    participants.push({
        id: currentSessionId,
        name: playerName,
        phone: playerPhone,
        date: now.toLocaleDateString('pt-BR'),
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        score: null,
        prize: '-',
        code: '-'
    });
    saveAndSync();

    showScreen('quiz');
    loadQuestion();
}

function testRoulette() {
    currentSessionId = Date.now();
    playerName = "TESTE ROLETA";
    playerPhone = "11999999999";
    stats.players += 1;
    localStorage.setItem('agriPlayers', String(stats.players));
    participants.push({
        id: currentSessionId,
        name: playerName,
        phone: playerPhone,
        date: new Date().toLocaleDateString('pt-BR'),
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        score: null,
        prize: '-',
        code: '-'
    });
    saveAndSync();
    showRoulette();
}

function loadQuestion() {
    isLocked = false;
    clearInterval(questionTimer);
    timeLeft = 20;
    updateTimerDisplay();

    const question = currentQs[qIndex];
    const pct = (qIndex / TOTAL_QUESTIONS) * 100;

    document.getElementById('progress-bar').style.width = pct + '%';
    document.getElementById('question-counter').textContent = `${qIndex + 1} / ${TOTAL_QUESTIONS}`;
    document.getElementById('question-text').textContent = question.q;

    // Randomize answers (A, B, C, D) using Fisher-Yates
    let options = question.answers.map((text, index) => ({
        text,
        isCorrect: index === question.correct
    }));
    options = shuffleArray(options);
    shuffledAnswers = options;

    document.querySelectorAll('.btn-answer').forEach((button, i) => {
        button.textContent = options[i].text;
        button.style.pointerEvents = 'auto'; // Re-enable pointer events
        
        // Remember if this button had 'btn' class originally (mobile has it, totem doesn't)
        const hasBtnClass = button.dataset.hasBtnClass === 'true' || button.classList.contains('btn');
        
        // Reset all classes - preserve original base classes only
        if (hasBtnClass) {
            button.className = 'btn btn-answer';
            button.dataset.hasBtnClass = 'true';
        } else {
            button.className = 'btn-answer';
        }
        
        // Inline style reset - critical for ghost highlight on totem
        button.style.cssText = '';
        
        button.disabled = false;
        
        // Remove browser-level focus highlight/persistence
        // 100% Force blur and clear active states
        if (button.blur) button.blur();
        button.classList.remove('selected');
    });

    questionTimer = setInterval(() => {
        timeLeft -= 1;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(questionTimer);
            handleTimeout();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('quiz-timer');
    if (timerEl) {
        timerEl.textContent = timeLeft + 's';
        if (timeLeft <= 5) timerEl.classList.add('low-time');
        else timerEl.classList.remove('low-time');
    }
}

function handleTimeout() {
    isLocked = true;
    document.querySelectorAll('.btn-answer').forEach(btn => btn.disabled = true);
    // Mark as wrong, move to next
    setTimeout(() => {
        nextQuestion();
    }, 300); /* AGORA MUITO MAIS RÁPIDO */
}

function selectAnswer(index) {
    if (isLocked) return;
    isLocked = true;
    clearInterval(questionTimer);

    const chosen = shuffledAnswers[index];
    const btn = document.getElementById('ans-' + index);
    btn.classList.add('selected');
    
    // Explicitly blur the selected button to prevent sticky states
    if (btn.blur) btn.blur();

    // Disable all options to prevent multiple clicks
    document.querySelectorAll('.btn-answer').forEach(btn => {
        btn.disabled = true;
        btn.style.pointerEvents = 'none'; // Prevent any further interaction
    });

    if (chosen.isCorrect) {
        score += 1;
    }

    setTimeout(() => {
        nextQuestion();
    }, 400); /* AGORA MUITO MAIS RÁPIDO */
}

function nextQuestion() {
    qIndex += 1;
    const pct = (qIndex / TOTAL_QUESTIONS) * 100;
    document.getElementById('progress-bar').style.width = pct + '%';

    if (qIndex < TOTAL_QUESTIONS) {
        loadQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    clearInterval(questionTimer);
    const record = participants.find((item) => item.id === currentSessionId);
    if (record) {
        record.score = score;
        saveAndSync();
    }

    if (score >= WIN_SCORE) {
        document.getElementById('win-score').textContent = score;
        document.getElementById('win-name').textContent = playerName.split(' ')[0];
        showScreen('win');
    } else {
        document.getElementById('lose-score').textContent = score;
        showScreen('lose');
    }

    // Tenta sincronizar com a nuvem imediatamente após os resultados
    if (record) syncToSupabase(record);
}

function showInstagram() {
    showScreen('instagram');
}

function showRoulette() {
    try {
        wheelSpun = false;
        const canvas = document.getElementById('wheel-canvas');
        if (!canvas) throw new Error("Canvas da roleta não encontrado");
        
        canvas.style.transition = 'none';
        canvas.style.transform = 'rotate(0deg)';
        wheelAngle = 0;

        document.getElementById('btn-spin').classList.remove('hidden');
        document.getElementById('spin-status').innerHTML = '&nbsp;';

        const firstName = playerName ? playerName.split(' ')[0] : 'Visitante';
        document.getElementById('roulette-player-name').textContent = `Boa sorte, ${firstName}!`;

        drawWheel(canvas);
        showScreen('roulette');
        debugLog('Roleta carregada com sucesso.');
    } catch (e) {
        debugLog('Erro ao carregar roleta: ' + e.message, 'error');
        alert('Erro ao carregar a roleta. Recarregando...');
        window.location.reload();
    }
}

function drawWheel(canvas) {
    const ctx = canvas.getContext('2d');
    const cw = canvas.width;
    const ch = canvas.height;
    const cx = cw / 2;
    const cy = ch / 2;
    const radius = cx - 30;

    const UI_PRIZES = [
        'Chapéu', 'Squeeze', 'Chaveiro Trena', 'Caneta',
        'Boné', 'Squeeze', 'Chaveiro Trena', 'Caneta'
    ];
    const EMOJI = {
        'Chapéu': '🪖',
        'Squeeze': '💧',
        'Chaveiro Trena': '🔑',
        'Caneta': '✏️',
        'Boné': '🧢',
    };
    // Vibrant segment palette (alternating 8 distinct colours)
    const COLORS = [
        ['#FF4500', '#C93918'],  // 0: Laranja Panther
        ['#0a0a0a', '#000000'],  // 1: Preto Profundo
        ['#FF4500', '#C93918'],  // 2: Laranja Panther
        ['#0a0a0a', '#000000'],  // 3: Preto Profundo
        ['#FF4500', '#C93918'],  // 4: Laranja Panther
        ['#0a0a0a', '#000000'],  // 5: Preto Profundo
        ['#FF4500', '#C93918'],  // 6: Laranja Panther
        ['#0a0a0a', '#000000'],  // 7: Preto Profundo
    ];

    const total = UI_PRIZES.length;
    const arc = (2 * Math.PI) / total;

    ctx.clearRect(0, 0, cw, ch);

    // --- Background shadow disc ---
    ctx.save();
    ctx.shadowColor = 'rgba(255,69,0,0.4)';
    ctx.shadowBlur = 60;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
    ctx.fillStyle = '#050505';
    ctx.fill();
    ctx.restore();

    // --- Segments ---
    UI_PRIZES.forEach((prize, i) => {
        const startAngle = i * arc - Math.PI / 2;
        const endAngle = startAngle + arc;
        const midAngle = startAngle + arc / 2;

        const [c1, c2] = COLORS[i];

        // Radial gradient per segment
        const gx1 = cx + Math.cos(midAngle) * radius * 0.15;
        const gy1 = cy + Math.sin(midAngle) * radius * 0.15;
        const gx2 = cx + Math.cos(midAngle) * radius * 0.95;
        const gy2 = cy + Math.sin(midAngle) * radius * 0.95;
        const grad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
        grad.addColorStop(0, c1);
        grad.addColorStop(0.6, c2);
        grad.addColorStop(1, '#1a0000');

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Subtle highlight arc near outer edge
        const hlGrad = ctx.createLinearGradient(
            cx + Math.cos(midAngle - arc * 0.35) * radius * 0.85,
            cy + Math.sin(midAngle - arc * 0.35) * radius * 0.85,
            cx + Math.cos(midAngle + arc * 0.35) * radius * 0.85,
            cy + Math.sin(midAngle + arc * 0.35) * radius * 0.85
        );
        hlGrad.addColorStop(0, 'rgba(255,255,255,0)');
        hlGrad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
        hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius - 2, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = hlGrad;
        ctx.fill();
    });

    // --- Divider lines ---
    UI_PRIZES.forEach((_, i) => {
        const angle = i * arc - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 3;
        ctx.stroke();
    });

    // --- Labels: centered text only (no emoji) ---
    UI_PRIZES.forEach((prize, i) => {
        const startAngle = i * arc - Math.PI / 2;
        const midAngle = startAngle + arc / 2;

        // Text position at 60% of radius from center
        const textR = radius * 0.62;

        ctx.save();
        ctx.translate(cx + Math.cos(midAngle) * textR, cy + Math.sin(midAngle) * textR);
        ctx.rotate(midAngle + Math.PI / 2); // rotate to follow segment direction
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Prize name — two lines if needed
        const words = prize.toUpperCase().split(' ');
        const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
        const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');

        ctx.font = '900 34px Outfit, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 12;

        if (line2) {
            ctx.fillText(line1, 0, -20);
            ctx.fillText(line2, 0, 20);
        } else {
            ctx.fillText(line1, 0, 0);
        }

        ctx.restore();
    });

    // --- Metallic border ring ---
    const metalGrad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    metalGrad.addColorStop(0, '#BF360C');
    metalGrad.addColorStop(0.25, '#FF6D00');
    metalGrad.addColorStop(0.5, '#FFD180');
    metalGrad.addColorStop(0.75, '#FF6D00');
    metalGrad.addColorStop(1, '#BF360C');

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = metalGrad;
    ctx.lineWidth = 18;
    ctx.stroke();

    // Inner bright highlight of border
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 9, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 3;
    ctx.stroke();
}

function spinWheel() {
    if (wheelSpun) return;

    // Pause inactivity timer during spin
    clearInterval(inactivityTimer);

    wheelSpun = true;
    document.getElementById('btn-spin').classList.add('hidden');
    document.getElementById('spin-status').innerHTML = '&nbsp;';

    // Get Prize from Smart Algorithm
    const wonPrize = getRandomPrize();
    if (!wonPrize) {
        alert("Ops! Todos os brindes acabaram.");
        resetApp();
        return;
    }

    // 8 Segments as requested: 1x Hat, 1x Cap, 2x Squeeze, 2x Keychain, 2x Pen
    const UI_PRIZES = [
        'Chapéu', 'Squeeze', 'Chaveiro Trena', 'Caneta',
        'Boné', 'Squeeze', 'Chaveiro Trena', 'Caneta'
    ];

    // Find all indices where this prize appears and pick one
    const possibleIndices = UI_PRIZES.map((p, i) => p === wonPrize ? i : -1).filter(i => i !== -1);
    const winIdx = possibleIndices[Math.floor(Math.random() * possibleIndices.length)];

    const total = UI_PRIZES.length;
    const sliceDeg = 360 / total;
    const targetAngle = -(winIdx * sliceDeg + sliceDeg / 2);
    const totalRotation = wheelAngle + (360 * 8) + targetAngle - (wheelAngle % 360);

    const canvas = document.getElementById('wheel-canvas');
    // Adiciona efeito longo de suspenses (slow-motion) girando rápido no início e quase parando no final
    canvas.style.transition = 'transform 7s cubic-bezier(0.1, 0.0, 0.1, 1)';
    canvas.style.transform = `rotate(${totalRotation}deg)`;
    wheelAngle = totalRotation;

    setTimeout(() => {
        try {
            wonPrizeName = wonPrize;
            // Subtract from stock
            if (prizeStock[wonPrize] > 0) {
                prizeStock[wonPrize] -= 1;
                saveStock();
            } else {
                debugLog('Tentativa de ganhar prêmio sem estoque: ' + wonPrize, 'warn');
            }

            // Salva e vai direto para a tela de código
            stats.prizes += 1;
            localStorage.setItem('agriPrizes', String(stats.prizes));

            const record = participants.find((item) => item.id === currentSessionId);
            if (record) {
                record.prize = wonPrizeName;
            }
            
            debugLog('Prêmio ganho: ' + wonPrizeName);
            showCode();
        } catch (e) {
            debugLog('Erro ao processar fim do giro: ' + e.message, 'error');
            alert('Ops! Ocorreu um erro ao processar seu prêmio. Por favor, avise um atendente.');
            resetApp();
        }
    }, 7500);
}



function launchConfetti() {
    const duration = 3 * 1000;
    const end = Date.now() + duration;
    window.stopConfetti = false;

    // First big burst
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FF4500', '#FFD700', '#FFFFFF', '#000000']
        });

        // Side cannons loop
        (function frame() {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#FF4500', '#FFD700']
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#FF4500', '#FFD700']
            });

            if (Date.now() < end && !window.stopConfetti) {
                requestAnimationFrame(frame);
            }
        }());

        // Hard stop: Clear everything after exactly 3s
        setTimeout(() => {
            if (!window.stopConfetti) confetti.reset();
        }, duration);
    }
}

function showCode() {
    const code = wonPrizeName.toUpperCase();
    document.getElementById('rescue-code').textContent = code;

    // Ensure the ticket screen also has the prize name ready for mobile
    const ticketPrize = document.getElementById('code-prize-name');
    if (ticketPrize) ticketPrize.textContent = wonPrizeName;

    // Show confetti when code/prize is shown
    launchConfetti();

    const record = participants.find((item) => item.id === currentSessionId);
    if (record) {
        record.prize = wonPrizeName; // ensure it's set
        record.code = code;
        saveAndSync();
        
        // ENVIA O PRÊMIO FINAL PARA A NUVEM
        syncToSupabase(record);
    }

    showScreen('code');
    startAutoReset();
}

function startAutoReset() {
    if (autoResetTimer) clearInterval(autoResetTimer);
    let seconds = 20;
    document.getElementById('timer-sec').textContent = seconds;
    autoResetTimer = setInterval(() => {
        seconds -= 1;
        document.getElementById('timer-sec').textContent = seconds;
        if (seconds <= 0) {
            clearInterval(autoResetTimer);
            resetApp();
        }
    }, 1000);
}

function resetApp(force = false) {
    debugLog('App resetado (force: ' + force + ')');
    clearInterval(questionTimer);
    clearInterval(inactivityTimer);
    if (autoResetTimer) clearInterval(autoResetTimer);
    
    // Reset global game state to prevent carry-over bugs
    qIndex = 0;
    score = 0;
    isLocked = false;
    wheelAngle = 0;
    wheelSpun = false;
    wonPrizeName = '';
    currentSessionId = null;

    // Parada forçada imediata do loop de confete
    window.stopConfetti = true;
    if (typeof confetti === 'function') {
        confetti.reset();
        // Remove the canvas element forcefully if it persists
        const canvas = document.querySelector('canvas[style*="z-index: 100"]');
        if (canvas) canvas.remove();
    }

    document.getElementById('input-name').value = '';
    document.getElementById('input-phone').value = '';
    const lgpd = document.getElementById('input-lgpd');
    if (lgpd) lgpd.checked = false;

    showScreen('home');
    checkGlobalStock();

    // Start home inactivity monitor
    resetInactivityTimer();
}

// Inactivity Management
function resetInactivityTimer() {
    clearInterval(inactivityTimer);
    inactivityTimer = setInterval(() => {
        console.log("Resetting due to inactivity...");
        resetApp();
    }, 60000); // 60 seconds
}

// Global listeners for touch/click/input to reset inactivity timer
['mousedown', 'touchstart', 'keydown', 'input'].forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer, true);
});

// Initialize
loadStockFromServer();
startAutoSync();
checkGlobalStock();

// Admin Stock Controls
function openAdmin() {
    console.log("📂 Abrindo Painel Admin...");
    // alert("Ativando Painel Admin..."); // Debug alert
    
    const panel = document.getElementById('admin-panel');
    if (!panel) {
        console.error("❌ Erro: Elemento 'admin-panel' não encontrado.");
        return;
    }

    // Brute-force visibility for mobile safari
    panel.style.display = 'flex';
    panel.style.opacity = '1';
    panel.style.visibility = 'visible';
    panel.style.zIndex = '10000';

    const playersEl = document.getElementById('stat-players');
    const prizesEl = document.getElementById('stat-prizes');
    
    if (playersEl) playersEl.textContent = stats.players;
    if (prizesEl) prizesEl.textContent = stats.prizes;

    // Atualiza o resumo de brindes distribuídos (Novo)
    updatePrizeSummary();

    // Show current stock in admin
    const adminContent = panel.querySelector('.admin-content');
    if (adminContent) {
        adminContent.style.opacity = '1';
        adminContent.style.visibility = 'visible';
        adminContent.style.zIndex = '10010';
        adminContent.style.display = 'flex';

        let stockInfo = document.getElementById('admin-stock-info');
        if (!stockInfo) {
            stockInfo = document.createElement('div');
            stockInfo.id = 'admin-stock-info';
            stockInfo.className = 'admin-stock-list';
            
            const btnExport = adminContent.querySelector('.btn-export');
            if (btnExport && btnExport.parentNode) {
                btnExport.parentNode.insertBefore(stockInfo, btnExport);
            } else {
                adminContent.appendChild(stockInfo);
            }
        }

        if (prizeStock) {
            stockInfo.innerHTML = Object.entries(prizeStock).map(([name, count]) => `
                <div class="stock-item-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; background: rgba(255,255,255,0.05); padding: 10px 15px; border-radius: 10px;">
                    <span style="font-size: 16px; font-weight: 600;">${name}</span>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="number" value="${count}" class="stock-manual-input" data-prize="${name}" style="width: 100px; background: #000; color: #fff; border: 1px solid #444; padding: 12px; border-radius: 8px; text-align: center; font-size: 18px;" inputmode="numeric">
                    </div>
                </div>
            `).join('');

            // Atachar teclado aos novos inputs dinâmicos
            setTimeout(() => {
                const newInputs = stockInfo.querySelectorAll('.stock-manual-input');
                newInputs.forEach(input => {
                    const openKb = (e) => {
                        activeInput = e.target;
                        openKeyboard();
                    };
                    input.addEventListener('mousedown', openKb);
                    input.addEventListener('focus', openKb);
                    input.addEventListener('click', openKb);
                });
            }, 100);
        }
    }

    // Log admin access
    logAdminAction('LOGIN', 'Acesso ao painel administrativo');
    
    panel.classList.remove('hide');
    panel.classList.add('active');
    
    // Fallback force show
    setTimeout(() => {
        panel.style.display = 'flex';
        panel.style.opacity = '1';
        panel.style.visibility = 'visible';
    }, 100);

    console.log("✅ Painel Admin ativado.");
}

function resetStock() {
    if (!confirm('Deseja resetar o estoque para os valores iniciais?')) return;
    prizeStock = { ...INITIAL_STOCK };
    saveStock();
    alert('Estoque resetado com sucesso!');
    openAdmin();
}

/** Relatório de Brindes Distribuídos (Novo) */
function togglePrizeSummary() {
    const content = document.getElementById('prize-summary-content');
    const icon = document.getElementById('prize-summary-icon');
    if (!content) return;

    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    if (icon) {
        icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    }
}

function updatePrizeSummary() {
    const listEl = document.getElementById('prize-distribution-list');
    if (!listEl) return;

    // Contar prêmios dos participantes do dia
    const counts = {};
    // Inicializa com zero para os brindes conhecidos
    Object.keys(INITIAL_STOCK).forEach(p => counts[p] = 0);

    participants.forEach(p => {
        if (p.prize && counts[p.prize] !== undefined) {
            counts[p.prize]++;
        } else if (p.prize) {
            counts[p.prize] = (counts[p.prize] || 0) + 1;
        }
    });

    const icons = {
        'Chapéu': '🪖',
        'Squeeze': '💧',
        'Chaveiro Trena': '🔑',
        'Caneta': '✏️',
        'Boné': '🧢'
    };

    listEl.innerHTML = Object.entries(counts)
        .sort((a, b) => b[1] - a[1]) // Mostrar mais vitoriosos primeiro
        .map(([name, count]) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 30px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); border-radius: 15px;">
                <span style="font-size: 28px; font-weight: 700; color: #ccc;">
                    <span style="font-size: 32px; margin-right: 15px;">${icons[name] || '🎁'}</span>
                    ${name}
                </span>
                <span style="font-size: 36px; font-weight: 900; color: var(--orange);">${count}</span>
            </div>
        `).join('');
}

function resetStats() {
    if (!confirm('Zerar todos os dados de participantes e estatisticas?')) return;
    stats = { players: 0, prizes: 0 };
    participants = [];
    localStorage.setItem('agriPlayers', '0');
    localStorage.setItem('agriPrizes', '0');
    saveAndSync();
    openAdmin();
}

function closeAdmin() {
    const panel = document.getElementById('admin-panel');
    panel.classList.remove('active');
    panel.classList.add('hide');
    adminPinBuffer = '';
}

function simulateSoldOut() {
    if (!confirm('Deseja simular o esgotamento total de brindes agora?')) return;
    Object.keys(prizeStock).forEach(k => prizeStock[k] = 0);
    checkGlobalStock();
    openAdmin(); // Refresh instead of close
    debugLog('Simulação de Brindes Esgotados ativada por Admin.');
}

function switchAdminTab(tabId, btn) {
    debugLog(`Admin: Trocando para aba ${tabId}`);
    logAdminAction('TAB_CHANGE', `Navegou para aba: ${tabId}`);
    
    // Esconder todos os conteúdos e remover classe active dos botões
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    // Mostrar conteúdo da aba selecionada
    const targetTab = document.getElementById('tab-' + tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    } else {
        console.error(`Aba tab-${tabId} não encontrada.`);
    }
    
    // Ativar o botão clicado
    if (btn) {
        btn.classList.add('active');
    }
}

function finalizeDay() {
    if (!confirm('Deseja FINALIZAR O DIA? Isso irá:\n1. Sincronizar dados pendentes\n2. Baixar arquivos de leads e logs\n3. Resetar o estoque e contadores para amanhã')) return;

    debugLog('Iniciando finalização do dia...');
    
    // 1. Sincronizar uma última vez antes de limpar
    syncLeadsToServer(async (success) => {
        if (!success) {
            if (!confirm('Falha ao sincronizar com o servidor local. Deseja continuar mesmo assim (DADOS PODEM SER PERDIDOS)?')) return;
        }

        const totalP = stats.players;
        const totalW = stats.prizes;
        
        logAdminAction('DAY_END', `Finalização de dia: ${totalP} jogadores, ${totalW} prêmios entregues.`);

        // 2. Backup de Dados (Método Robusto via Blob)
        const serverUrl = 'http://localhost:8000';
        
        // Backup de Leads (Usando o array atual do navegador)
        try {
            exportCSV(); // Função nativa que já usa Blob e é robusta
        } catch (e) {
            debugLog('Erro ao exportar CSV local: ' + e.message, 'error');
        }
        
        // Backup de Logs (Buscando do servidor e convertendo em Blob)
        setTimeout(async () => {
            try {
                const logRes = await fetch(`${serverUrl}/logs.txt`);
                if (logRes.ok) {
                    const logBlob = await logRes.blob();
                    const logUrl = URL.createObjectURL(logBlob);
                    const logLink = document.createElement('a');
                    logLink.href = logUrl;
                    logLink.download = `panther_logs_${new Date().getTime()}.txt`;
                    document.body.appendChild(logLink);
                    logLink.click();
                    document.body.removeChild(logLink);
                    URL.revokeObjectURL(logUrl);
                }
            } catch (e) {
                console.warn('Não foi possível baixar logs.txt do servidor.');
            }
        }, 1000);

        // 3. Aguardar backup antes de limpar a memória
        setTimeout(() => {
            // Resetar Estoque
            prizeStock = { ...INITIAL_STOCK };
            saveStock();

            // Zerar Jogadores e Stats
            stats = { players: 0, prizes: 0 };
            participants = [];
            localStorage.setItem('agriPlayers', '0');
            localStorage.setItem('agriPrizes', '0');
            localStorage.setItem('agriParticipants', '[]');
            
            saveAndSync();
            
            debugLog('Dia finalizado com sucesso. Dados resetados após backup.');
            alert('Dia finalizado com sucesso!\nBackup de Leads e Logs disparado.\nSistema pronto para amanhã.');
            openAdmin(); // Atualiza UI
        }, 3000);
    });
}

/** Encerra o Chrome via Servidor (Botão de Pânico para Totem sem Teclado) */
function terminateTotem() {
    if (!confirm('DESEJA ENCERRAR O APLICATIVO?\n\nO Chrome será fechado. Use o ícone na área de trabalho para reabrir.')) return;
    
    debugLog('Comando de encerramento enviado ao servidor...');
    const apiHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? '' : 'http://localhost:8000';
        
    fetch(apiHost + '/exit', { method: 'POST' })
        .then(() => {
            console.log('Encerramento em curso...');
        })
        .catch(err => {
            debugLog('Erro ao solicitar encerramento: ' + err.message, 'error');
            // Tenta fechar via JS como fallback
            window.close();
        });
}

/** Alterna entre tela cheia e normal via código (Útil para Totem sem teclado F11) */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            alert(`Erro ao tentar entrar em tela cheia: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function saveGeneralStock() {
    const inputs = document.querySelectorAll('.stock-manual-input');
    let changes = [];
    
    inputs.forEach(input => {
        const name = input.dataset.prize;
        const newAmount = parseInt(input.value, 10) || 0;
        if (prizeStock[name] !== newAmount) {
            changes.push(`${name}: ${prizeStock[name]} -> ${newAmount}`);
            prizeStock[name] = newAmount;
        }
    });

    if (changes.length === 0) {
        alert("Nenhuma alteração detectada no estoque.");
        return;
    }

    saveStock(); // Salva local e sincroniza com backend
    debugLog(`Estoque Geral Atualizado: ${changes.join(' | ')}`);
    logAdminAction('STOCK_UPDATE', changes.join(' | '));
    alert("Estoque Geral atualizado e sincronizado com sucesso!");
    openAdmin(); // Refresh UI
}

function syncParticipantToGoogleSheets() { /* offline-only build */ }

function showAdminPin() {
    // Senha removida a pedido do usuário para agilizar na feira
    openAdmin();
}

function closeAdminPin() {
    const modal = document.getElementById('screen-admin-pin');
    if (modal) {
        modal.classList.add('hide');
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function checkAdminPin() {
    // Mantido apenas por compatibilidade, mas agora abre direto
    openAdmin();
}

//  SUPABASE LOGGING SYSTEM
//  Tabela: admin_logs
//  Colunas: action (text), details (text), created_at (timestamp), totem_id (text)
// ═══════════════════════════════════════════════════════

async function logAdminAction(action, details) {
    const logEntry = {
        action: action,
        details: String(details), // Garante que seja string
        created_at: new Date().toISOString(),
        totem_id: 'TOTEM-AGRISHOW-01'
    };

    // 1. Log Visual (Admin Panel)
    debugLog(`[ADMIN LOG] ${action}: ${details}`);

    // 2. Log Local (server.py)
    try {
        fetch('http://localhost:8000/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logEntry)
        }).catch(e => console.warn('Servidor local offline para logs'));
    } catch (e) {}

    // 3. Enviar para o Supabase (se configurado)
    if (SUPABASE_URL && SUPABASE_KEY) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/admin_logs`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(logEntry)
            });

            if (!response.ok) {
                const errText = await response.text();
                console.warn('Supabase Log Error:', errText);
                debugLog(`Falha no Log Online (Erro ${response.status}). Verifique se a tabela 'admin_logs' existe.`, 'warn');
            }
        } catch (err) {
            console.error('Erro ao enviar log para Supabase:', err);
        }
    }
}

// ==========================================
// 🧪 MODO APRESENTAÇÃO (VENDAS)
// ==========================================
function demoAutoRegister() {
    closeAdmin();
    showScreen('register');
    setTimeout(() => {
        document.getElementById('input-name').value = 'João Apresentação';
        document.getElementById('input-phone').value = '11999999999';
        const lgpd = document.getElementById('input-lgpd');
        if (lgpd) lgpd.checked = true;
        // Não clica automático para deixar o apresentador explicar a tela e clicar em COMEÇAR
    }, 300);
}

function demoJumpToRoulette() {
    closeAdmin();
    // Simular que passou no quiz com sucesso
    playerName = "Visitante VIP";
    score = 7;
    currentSessionId = 'demo-' + Date.now();
    participants.push({
        id: currentSessionId,
        name: playerName,
        phone: '00000000000',
        score: score,
        prize: null,
        code: null,
        timestamp: new Date().toISOString()
    });

    clearInterval(questionTimer);
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    // Preparar UI da Roleta
    document.getElementById('btn-spin').classList.remove('hidden');
    document.getElementById('spin-status').innerHTML = '&nbsp;';

    const firstName = playerName.split(' ')[0];
    document.getElementById('roulette-player-name').textContent = `Boa sorte, ${firstName}!`;

    const canvas = document.getElementById('wheel-canvas');
    if (canvas) drawWheel(canvas);

    showScreen('roulette');
}

function demoJumpToResult() {
    closeAdmin();
    // Simular que passou no quiz com sucesso e está na tela de resultado
    playerName = "Visitante VIP";
    score = 7;
    currentSessionId = 'demo-' + Date.now();
    participants.push({
        id: currentSessionId,
        name: playerName,
        phone: '00000000000',
        score: score,
        prize: null,
        code: null,
        timestamp: new Date().toISOString()
    });

    clearInterval(questionTimer);
    document.getElementById('win-score').textContent = score;
    document.getElementById('win-name').textContent = playerName.split(' ')[0];
    showScreen('win');
}


// ═══════════════════════════════════════════════════════
//  EXIT CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════

function openExitConfirm() {
    // Pausa o cronômetro do quiz se estiver ativo
    if (questionTimer) {
        clearInterval(questionTimer);
    }
    const modal = document.getElementById('screen-exit-confirm');
    if (modal) {
        modal.classList.remove('hide');
        modal.classList.add('active');
        modal.style.display = 'flex'; // Garante visibilidade
    }
}

function closeExitConfirm() {
    const modal = document.getElementById('screen-exit-confirm');
    if (modal) {
        modal.classList.add('hide');
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    
    // Resume o cronômetro do quiz se estivermos na tela de quiz
    const quizScreen = document.getElementById('screen-quiz');
    if (quizScreen && quizScreen.classList.contains('active') && !isLocked) {
        // Reinicia o intervalo (timeLeft já contém o tempo restante)
        questionTimer = setInterval(() => {
            timeLeft -= 1;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(questionTimer);
                handleTimeout();
            }
        }, 1000);
    }
}

function confirmExit() {
    const modal = document.getElementById('screen-exit-confirm');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hide');
        modal.classList.remove('active');
    }
    resetApp();
}

// Initialization
window.onload = () => {
    checkGlobalStock();
    resetInactivityTimer();
    startAutoSync(); 
    initKeyboard(); // Inicializa o teclado virtual

    // ───────────────────────────────────────────────
    // Admin Trigger: 5 toques no canto superior esquerdo
    // Per spec: "5 toques no canto superior esquerdo da tela + senha numérica"
    // ───────────────────────────────────────────────
    const adminZone = document.getElementById('admin-zone');
    if (adminZone) {
        const handleAdminTap = () => {
            const now = Date.now();
            adminClicks.push(now);
            adminClicks = adminClicks.filter(t => now - t < 3000); // 3s window
            if (adminClicks.length >= 5) {
                adminClicks = [];
                showAdminPin();
            }
        };
        adminZone.addEventListener('click', handleAdminTap);
        adminZone.addEventListener('touchstart', (e) => { e.preventDefault(); handleAdminTap(); }, { passive: false });
    }
};

// ==========================================
// VIRTUAL KEYBOARD LOGIC
// ==========================================
let activeInput = null;

function initKeyboard() {
    const inputs = document.querySelectorAll('.input-field, .field-input, .stock-manual-input');
    inputs.forEach(input => {
        // Usamos mousedown para capturar o toque antes do foco nativo
        input.addEventListener('mousedown', (e) => {
            activeInput = e.target;
            openKeyboard();
        });
        
        // Garante que o clique/foco também funcione
        input.addEventListener('focus', (e) => {
            activeInput = e.target;
            openKeyboard();
        });
    });
}

function openKeyboard() {
    const kb = document.getElementById('virtual-keyboard');
    const grid = document.getElementById('keyboard-keys');
    
    if (!kb || !grid || !activeInput) return;

    // Adiciona classe ao body para subir o conteúdo
    document.body.classList.add('keyboard-open');

    // Determina o layout (numérico ou texto)
    const isNumeric = activeInput.id.includes('phone') || 
                      activeInput.type === 'tel' || 
                      activeInput.type === 'number' || 
                      activeInput.classList.contains('stock-manual-input');
    
    grid.innerHTML = '';
    grid.className = isNumeric ? 'keyboard-grid numeric' : 'keyboard-grid';

    const layout = isNumeric 
        ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫']
        : [
            'Q','W','E','R','T','Y','U','I','O','P',
            'A','S','D','F','G','H','J','K','L','Ç',
            'Z','X','C','V','B','N','M',',','.','⌫',
            'Espaço'
        ];

    layout.forEach(key => {
        if (key === '') {
            const spacer = document.createElement('div');
            spacer.className = 'kb-spacer';
            grid.appendChild(spacer);
            return;
        }

        const btn = document.createElement('button');
        btn.className = 'kb-key';
        
        if (key === 'Espaço') btn.classList.add('space');
        if (key === '⌫') btn.classList.add('backspace');
        if (key === 'Limpar') btn.classList.add('special');
        
        btn.innerText = key;
        btn.onclick = () => handleKeyPress(key);
        grid.appendChild(btn);
    });

    kb.classList.remove('hide');
    kb.classList.add('active');
}

function handleKeyPress(key) {
    if (!activeInput) return;

    if (key === '⌫') {
        activeInput.value = activeInput.value.slice(0, -1);
    } else if (key === 'Limpar') {
        activeInput.value = '';
    } else if (key === 'Espaço') {
        activeInput.value += ' ';
    } else {
        activeInput.value += key;
    }
    
    // Dispara evento de input para que outras lógicas do site (validação) funcionem
    activeInput.dispatchEvent(new Event('input'));
}

function closeKeyboard() {
    const kb = document.getElementById('virtual-keyboard');
    if (kb) {
        kb.classList.add('hide');
        kb.classList.remove('active');
    }
    // Remove a classe do body para a tela voltar ao normal
    document.body.classList.remove('keyboard-open');
    activeInput = null;
}
