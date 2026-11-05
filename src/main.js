import { RubiksCubeElement } from '@houstonp/rubiks-cube/view';

RubiksCubeElement.register();

const mainApp = document.getElementById('main-app');
const learnPage = document.getElementById('learn-page');
const detailPage = document.getElementById('detail-page');
const navHome = document.getElementById('nav-home');
const navLearn = document.getElementById('nav-learn');

navHome.addEventListener('click', () => {
    mainApp.style.display = 'flex'; learnPage.style.display = 'none'; detailPage.style.display = 'none';
    navHome.classList.add('active'); navLearn.classList.remove('active');
});

navLearn.addEventListener('click', () => {
    mainApp.style.display = 'none'; learnPage.style.display = 'flex'; detailPage.style.display = 'none';
    navLearn.classList.add('active'); navHome.classList.remove('active');
    renderAlgoGrid();
});

const algorithmsDB = [
    { id: 'oll-1', type: 'OLL', name: 'OLL 1 Punto', setup: "R U2 R2 F R F' U2 R' F R F'", alg: "R U2 R2 F R F' U2 R' F R F'", status: 'learned' },
    { id: 'oll-2', type: 'OLL', name: 'OLL 2 Punto', setup: "r U r' U2 r U2 R' U2 R U' r'", alg: "r U r' U2 r U2 R' U2 R U' r'", status: 'learning' },
    { id: 'oll-3', type: 'OLL', name: 'OLL 3 Punto', setup: "r' R2 U R' U r U2 r' U R' M'", alg: "r' R2 U R' U r U2 r' U R' M'", status: 'unstarted' },
    { id: 'oll-4', type: 'OLL', name: 'OLL 4 Punto', setup: "r U2 R' U' R U' r'", alg: "r U2 R' U' R U' r'", status: 'unstarted' }
];

let currentAlgo = null;
let learnCube = null;

function renderAlgoGrid() {
    const grid = document.getElementById('algo-grid'); grid.innerHTML = '';
    algorithmsDB.forEach(algo => {
        const card = document.createElement('div'); card.className = 'algo-card';
        card.innerHTML = `
            <div class="algo-img-placeholder">Cubo 3D</div>
            <h3>${algo.name}</h3>
            <small style="color: ${algo.status === 'learned' ? '#10b981' : algo.status === 'learning' ? '#f59e0b' : '#94a3b8'}">
                ${algo.status === 'learned' ? '✅ Aprendido' : algo.status === 'learning' ? '⏳ Aprendiendo' : '⚪ Sin empezar'}
            </small>`;
        card.addEventListener('click', () => openDetail(algo));
        grid.appendChild(card);
    });
}

function openDetail(algo) {
    currentAlgo = algo; learnPage.style.display = 'none'; detailPage.style.display = 'flex';
    document.getElementById('detail-title').textContent = algo.name;
    document.getElementById('algo-string').textContent = algo.alg;
    document.querySelectorAll('.btn-status').forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('data-status') === algo.status) btn.classList.add('active');
    });
    if (!learnCube) learnCube = document.getElementById('learn-cube');
    setTimeout(async () => {
        await learnCube.reset(); await applyMovesToCube(learnCube, algo.setup);
    }, 100);
}

document.getElementById('back-to-learn').addEventListener('click', () => {
    detailPage.style.display = 'none'; learnPage.style.display = 'flex'; renderAlgoGrid();
});

document.getElementById('btn-play').addEventListener('click', async () => {
    if (!learnCube || !currentAlgo) return;
    await learnCube.reset(); await applyMovesToCube(learnCube, currentAlgo.setup);
    await new Promise(r => setTimeout(r, 500)); await applyMovesToCube(learnCube, currentAlgo.alg);
});

document.getElementById('btn-reset-algo').addEventListener('click', async () => {
    if (!learnCube || !currentAlgo) return;
    await learnCube.reset(); await applyMovesToCube(learnCube, currentAlgo.setup);
});

document.querySelectorAll('.btn-status').forEach(btn => {
    btn.addEventListener('click', () => {
        if (!currentAlgo) return;
        currentAlgo.status = btn.getAttribute('data-status');
        document.querySelectorAll('.btn-status').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

async function applyMovesToCube(cubeElement, movesString) {
    for (const move of movesString.split(' ')) { if (move.trim() !== '') await cubeElement.move(move); }
}

// --- TIMER ---
const appContainer = document.getElementById('app-container');
const cube = document.getElementById('cube');
const cubeArea = document.getElementById('cube-area');
const timerEl = document.getElementById('timer');
const timerContainer = document.getElementById('timer-container');
const statusEl = document.getElementById('status');
const penaltyMenu = document.getElementById('penalty-menu');
const moveCountEl = document.getElementById('move-count');
const moveCounterCont = document.getElementById('move-counter');
const virtualControls = document.getElementById('virtual-controls');
const tabVirtual = document.getElementById('tab-virtual');
const tabPhysical = document.getElementById('tab-physical');
const btnNewScramble = document.getElementById('new-scramble');
const btnRepeatScramble = document.getElementById('repeat-scramble');
const btnExportCsv = document.getElementById('export-csv');
const btnClearHistory = document.getElementById('clear-history');
const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');
const ao5El = document.getElementById('ao5');
const ao12El = document.getElementById('ao12');
const historyListEl = document.getElementById('history-list');

let currentMode = 'virtual'; let state = 'IDLE'; let inspectionInterval = null;
let inspectionTimeLeft = 15.0; let solveInterval = null; let solveTime = 0;
let moveCount = 0; let currentScramble = '';
let history = JSON.parse(localStorage.getItem('rubikHistory')) || [];
let lastRecordIndex = -1; let holdTimer = null; let isHolding = false;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playClickSound(freq = 800) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.05);
}

speedSlider.addEventListener('input', (e) => {
    cube.setAttribute('animation-speed-ms', e.target.value);
    speedValue.textContent = (e.target.value / 1000).toFixed(1) + 's';
});

function cambiarModo(modo) {
    currentMode = modo; cubeArea.classList.remove('hidden');
    if (modo === 'virtual') {
        tabVirtual.classList.add('active'); tabPhysical.classList.remove('active');
        cube.style.display = 'block'; virtualControls.style.display = 'block'; moveCounterCont.style.display = 'none';
        appContainer.classList.remove('physical-active');
    } else {
        tabPhysical.classList.add('active'); tabVirtual.classList.remove('active');
        cube.style.display = 'block'; virtualControls.style.display = 'none'; moveCounterCont.style.display = 'none';
        appContainer.classList.add('physical-active');
    }
    resetState();
}
tabVirtual.addEventListener('click', () => cambiarModo('virtual'));
tabPhysical.addEventListener('click', () => cambiarModo('physical'));

function generateScramble(length = 15) {
    const faces = ['R', 'L', 'U', 'D', 'F', 'B']; const modifiers = ['', "'", '2'];
    let scramble = []; let lastFace = '';
    for (let i = 0; i < length; i++) {
        let face; do { face = faces[Math.floor(Math.random() * faces.length)]; } while (face === lastFace); 
        lastFace = face; scramble.push(face + modifiers[Math.floor(Math.random() * modifiers.length)]);
    }
    return scramble.join(' ');
}

async function applyScramble(moves) {
    for (const move of moves.split(' ')) { if (move.trim() !== '') await cube.move(move); }
}

btnNewScramble.addEventListener('click', async () => {
    cubeArea.classList.remove('hidden'); await cube.reset();
    currentScramble = generateScramble(15); statusEl.textContent = `Scramble: ${currentScramble}`;
    resetState(); btnRepeatScramble.disabled = false; state = 'IS_SCRAMBLING';
    await applyScramble(currentScramble);
    if (state === 'IS_SCRAMBLING' && currentMode === 'physical') {
        cubeArea.classList.add('hidden'); iniciarInspeccion();
    } else if (state === 'IS_SCRAMBLING') { state = 'IDLE'; }
});

btnRepeatScramble.addEventListener('click', async () => {
    if (!currentScramble) return; cubeArea.classList.remove('hidden'); await cube.reset();
    statusEl.textContent = `Scramble: ${currentScramble}`; resetState(); state = 'IS_SCRAMBLING';
    await applyScramble(currentScramble);
    if (state === 'IS_SCRAMBLING' && currentMode === 'physical') {
        cubeArea.classList.add('hidden'); iniciarInspeccion();
    } else if (state === 'IS_SCRAMBLING') { state = 'IDLE'; }
});

cubeArea.addEventListener('click', () => {
    if (state === 'IS_SCRAMBLING' && currentMode === 'physical') {
        state = 'IDLE'; cubeArea.classList.add('hidden'); iniciarInspeccion();
    }
});

async function hacerMovimiento(move) {
    if (currentMode !== 'virtual' || state === 'INSPECTING' || state === 'READY') return;
    playClickSound(600);
    if (state === 'SOLVING') { moveCount++; moveCountEl.textContent = moveCount; }
    await cube.move(move);
}

document.querySelectorAll('.move-btn').forEach(btn => {
    btn.addEventListener('click', () => hacerMovimiento(btn.getAttribute('data-move')));
});

document.addEventListener('keydown', (e) => {
    if (currentMode === 'virtual' && state !== 'INSPECTING' && state !== 'READY') {
        const key = e.key.toUpperCase();
        if (['U', 'D', 'L', 'R', 'F', 'B'].includes(key)) hacerMovimiento(e.shiftKey ? key + "'" : key);
    }
});

timerContainer.addEventListener('pointerdown', (e) => {
    e.preventDefault(); if (penaltyMenu.classList.contains('show')) return;
    isHolding = false;
    if (state === 'IDLE' || state === 'FINISHED') {
        holdTimer = setTimeout(() => { isHolding = true; if (state === 'FINISHED') { penaltyMenu.classList.add('show'); playClickSound(400); } }, 500);
    }
    if (state === 'INSPECTING' || state === 'IDLE') {
        if (state === 'INSPECTING') { state = 'READY'; timerContainer.classList.add('ready'); }
    }
});

timerContainer.addEventListener('pointerup', (e) => {
    e.preventDefault(); clearTimeout(holdTimer);
    if (isHolding) { isHolding = false; return; }
    if (state === 'READY') { timerContainer.classList.remove('ready'); iniciarCronometro(); } 
    else if (state === 'IDLE' || state === 'FINISHED') { iniciarInspeccion(); } 
    else if (state === 'SOLVING') { detenerCronometro(false); }
});

timerContainer.addEventListener('pointerleave', () => {
    if (state === 'READY') { state = 'INSPECTING'; timerContainer.classList.remove('ready'); }
    clearTimeout(holdTimer); isHolding = false;
});

function iniciarInspeccion() {
    if (state === 'SOLVING') return; resetState(); state = 'INSPECTING'; inspectionTimeLeft = 15.0;
    timerEl.textContent = `${inspectionTimeLeft.toFixed(1)}s`; timerEl.style.color = "#fbbf24";
    statusEl.textContent = "Inspección... (Mantén presionado para arrancar)";
    inspectionInterval = setInterval(() => {
        inspectionTimeLeft -= 0.1;
        if (inspectionTimeLeft <= 0) {
            clearInterval(inspectionInterval); timerEl.textContent = "+2"; timerEl.style.color = "#ef4444"; statusEl.textContent = "¡Excedido! (+2s)";
        } else { timerEl.textContent = `${inspectionTimeLeft.toFixed(1)}s`; }
    }, 100);
}

function iniciarCronometro() {
    state = 'SOLVING'; clearInterval(inspectionInterval); solveTime = 0; moveCount = 0; moveCountEl.textContent = moveCount;
    timerContainer.classList.add('solving'); statusEl.textContent = "¡Resolviendo!"; timerEl.textContent = "0.00s"; timerEl.style.color = "#10b981";
    if (currentMode === 'virtual') moveCounterCont.style.display = 'block';
    solveInterval = setInterval(() => { solveTime += 0.01; timerEl.textContent = `${solveTime.toFixed(2)}s`; }, 10);
}

function detenerCronometro(isAutoDetected = false) {
    if (state !== 'SOLVING') return; state = 'FINISHED'; clearInterval(solveInterval); timerContainer.classList.remove('solving'); timerEl.style.color = "#fbbf24";
    let finalTime = solveTime;
    if (timerEl.textContent === "+2" || inspectionTimeLeft <= 0) {
        finalTime += 2; statusEl.textContent = `Tiempo: ${finalTime.toFixed(2)}s (+2 penalización)`;
    } else if (isAutoDetected) { statusEl.textContent = `🎉 ¡Cruz resuelta en ${finalTime.toFixed(2)}s!`; } 
    else { statusEl.textContent = `¡Tiempo: ${finalTime.toFixed(2)}s!`; }
    timerEl.textContent = `${finalTime.toFixed(2)}s`;
    guardarEnHistorial(finalTime, currentMode === 'virtual' ? moveCount : '-', 'OK');
}

function resetState() {
    clearInterval(inspectionInterval); clearInterval(solveInterval);
    state = 'IDLE'; solveTime = 0; inspectionTimeLeft = 15.0;
    timerEl.textContent = `15.0s`; timerEl.style.color = "#fbbf24";
    timerContainer.classList.remove('ready', 'solving'); moveCounterCont.style.display = 'none'; penaltyMenu.classList.remove('show');
}

document.querySelectorAll('.penalty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); const penalty = btn.getAttribute('data-penalty'); aplicarPenalizacion(penalty); penaltyMenu.classList.remove('show');
    });
});

function aplicarPenalizacion(tipo) {
    if (lastRecordIndex < 0) return; let record = history[lastRecordIndex]; let timeText = `${record.baseTime.toFixed(2)}s`;
    if (tipo === 'DNF') { record.time = 9999; record.penalty = 'DNF'; timeText = "DNF"; } 
    else if (tipo === '+2') { record.time = record.baseTime + 2; record.penalty = '+2'; timeText = `${record.time.toFixed(2)}s (+2)`; } 
    else { record.time = record.baseTime; record.penalty = 'OK'; timeText = `${record.time.toFixed(2)}s`; }
    timerEl.textContent = timeText; localStorage.setItem('rubikHistory', JSON.stringify(history)); actualizarHistorialUI();
}

function guardarEnHistorial(time, moves, penalty) {
    const record = { baseTime: time, time: time, moves, penalty, date: new Date().toLocaleDateString() };
    history.push(record); lastRecordIndex = history.length - 1; localStorage.setItem('rubikHistory', JSON.stringify(history)); actualizarHistorialUI();
}

function actualizarHistorialUI() {
    historyListEl.innerHTML = ''; const recent = history.slice(-15).reverse();
    recent.forEach((r, i) => {
        const realIndex = history.length - 1 - i; const li = document.createElement('li');
        let t = r.time === 9999 ? 'DNF' : r.time.toFixed(2) + 's'; if (r.penalty === '+2') t += " (+2)";
        li.innerHTML = `<span>${t} <small style="color:#64748b">(${r.moves} movs)</small></span><button class="delete-btn" data-index="${realIndex}" title="Eliminar tiempo">✕</button>`;
        historyListEl.appendChild(li);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index')); eliminarTiempo(index);
        });
    });
    ao5El.textContent = calcularPromedio(5); ao12El.textContent = calcularPromedio(12);
}

function eliminarTiempo(index) {
    history.splice(index, 1); localStorage.setItem('rubikHistory', JSON.stringify(history)); actualizarHistorialUI();
}

btnClearHistory.addEventListener('click', () => {
    if(confirm('¿Estás seguro de que quieres borrar todo el historial?')) {
        history = []; localStorage.removeItem('rubikHistory'); actualizarHistorialUI();
    }
});

function calcularPromedio(n) {
    if (history.length < n) return '-'; const subset = history.slice(-n).map(r => r.time);
    subset.sort((a, b) => a - b); if (subset[subset.length - 1] === 9999 && subset[subset.length - 2] === 9999) return 'DNF';
    const validTimes = subset.slice(1, n - 1); const sum = validTimes.reduce((a, b) => a + b, 0); return (sum / validTimes.length).toFixed(2) + 's';
}

btnExportCsv.addEventListener('click', () => {
    if (history.length === 0) return alert("No hay tiempos.");
    let csvContent = "data:text/csv;charset=utf-8,Fecha,Tiempo(s),Penalizacion,Movimientos\n";
    history.forEach(row => {
        let t = row.time === 9999 ? 'DNF' : row.time.toFixed(2); csvContent += `${row.date},${t},${row.penalty},${row.moves}\n`;
    });
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", "tiempos_cubo.csv"); link.click();
});

cube.addEventListener('state', (event) => {
    if (state !== 'SOLVING' || currentMode !== 'virtual') return;
    try {
        const stateString = event.detail.state;
        const isWhiteFaceSolved = stateString.slice(0, 9) === 'UUUUUUUUU';
        const areEdgesAligned = 
            stateString[1] === 'U' && stateString[10] === 'R' && stateString[3] === 'U' && stateString[19] === 'F' &&
            stateString[5] === 'U' && stateString[37] === 'L' && stateString[7] === 'U' && stateString[46] === 'B';
        if (isWhiteFaceSolved && areEdgesAligned) { detenerCronometro(true); }
    } catch (e) {}
});

resetState();
actualizarHistorialUI();
