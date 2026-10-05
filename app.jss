
// app.js

// 1. Estado de la Aplicación
let state = {
    streak: 0,
    record: 0,
    totalMinutes: 0,
    protectors: 0,
    lastStudyDate: null,
    activeSession: null // Guarda { topic, startTime }
};

let timerInterval = null;

// 2. Inicialización y Carga de Datos
function loadState() {
    const saved = localStorage.getItem('crust_state');
    if (saved) {
        state = JSON.parse(saved);
    }
    checkStreakLogic();
    updateUI();
    
    // Si la página se recarga durante una sesión activa
    if (state.activeSession) {
        resumeSession();
    }
}

function saveState() {
    localStorage.setItem('crust_state', JSON.stringify(state));
}

// Lógica de Rachas (Protección y reseteos)
function checkStreakLogic() {
    if (!state.lastStudyDate) return;
    
    const today = new Date().setHours(0, 0, 0, 0);
    const last = new Date(state.lastStudyDate).setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
        if (state.protectors > 0) {
            state.protectors--;
            state.lastStudyDate = new Date(today - 86400000).toISOString();
            saveState();
        } else {
            state.streak = 0;
            saveState();
        }
    }
}

// 3. UI y Navegación
function updateUI() {
    document.getElementById('ui-streak').textContent = state.streak;
    document.getElementById('ui-record').textContent = state.record;
    document.getElementById('ui-hours').textContent = (state.totalMinutes / 60).toFixed(1);
    document.getElementById('ui-protectors').textContent = state.protectors;
}

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    const targetScreen = document.getElementById(screenId);
    targetScreen.classList.remove('hidden');
    targetScreen.classList.add('active');
}

// 4. Lógica de la Ruleta
document.getElementById('btn-start').addEventListener('click', () => {
    switchScreen('screen-roulette');
    const display = document.getElementById('roulette-display');
    const categoryDisplay = document.getElementById('roulette-category');
    
    let counter = 0;
    let selectedTopic = null;

    const interval = setInterval(() => {
        selectedTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
        display.textContent = selectedTopic.name;
        categoryDisplay.textContent = selectedTopic.category;
        counter++;
        
        if (counter > 20) {
            clearInterval(interval);
            setTimeout(() => {
                startSession(selectedTopic);
            }, 500);
        }
    }, 80);
});

// 5. Lógica de la Sesión y Temporizador
function startSession(topic) {
    state.activeSession = {
        topic: topic,
        startTime: Date.now()
    };
    saveState();
    setupSessionUI(topic);
}

function resumeSession() {
    setupSessionUI(state.activeSession.topic);
}

function setupSessionUI(topic) {
    switchScreen('screen-session');
    document.getElementById('session-category').textContent = topic.category;
    document.getElementById('session-topic').textContent = topic.name;
    
    document.getElementById('btn-complete').classList.add('hidden');
    document.getElementById('btn-abandon').classList.remove('hidden');
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
}

function updateTimer() {
    if (!state.activeSession) return;
    
    const elapsedMs = Date.now() - state.activeSession.startTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    
    document.getElementById('timer-display').textContent = 
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    if (mins >= CONFIG.minimumStudyMinutes) {
        document.getElementById('btn-complete').classList.remove('hidden');
        document.getElementById('btn-abandon').classList.add('hidden');
    }
}

// 6. Acciones: Completar o Abandonar
document.getElementById('btn-abandon').addEventListener('click', () => {
    if (confirm('Si abandonas ahora, la sesión fallará y no se guardará el tiempo. ¿Seguro?')) {
        clearInterval(timerInterval);
        state.activeSession = null;
        state.streak = 0; 
        saveState();
        switchScreen('screen-main');
        updateUI();
    }
});

document.getElementById('btn-complete').addEventListener('click', () => {
    clearInterval(timerInterval);
    
    state.streak++;
    if (state.streak > state.record) state.record = state.streak;
    
    const elapsedMs = Date.now() - state.activeSession.startTime;
    const elapsedMins = Math.floor(elapsedMs / 60000);
    
    state.totalMinutes += elapsedMins;
    state.lastStudyDate = new Date().toISOString();
    
    const totalHours = state.totalMinutes / 60;
    const earnedProtectors = Math.floor(totalHours / CONFIG.protectorHoursRequired);
    if (earnedProtectors > state.protectors && state.protectors < CONFIG.maxProtectors) {
        state.protectors = Math.min(earnedProtectors, CONFIG.maxProtectors);
    }

    state.activeSession = null;
    saveState();
    
    alert('¡Excelente! Has cumplido tu misión de hoy.');
    switchScreen('screen-main');
    updateUI();
});

// Inicialización de la app
window.onload = loadState;
