  

// State
let currentChild = null;
let currentLevelIndex = 0;
let currentSublevelIndex = 0;
let currentLevelData = null;
let currentSublevelData = null;
let audioEnabled = true;
let currentScreenName = 'landing';
let navMode = 'kids';

// Pädagogisches Gesamtmodell (entwicklungsorientiert, nicht spiel-basiert)
// Dimensionen: A Hörwahrnehmung, B phonologische Bewusstheit, C Wortschatz, D Semantik, E Grammatik, F Erzählen, G Sprachgedächtnis
// Stufen: 1 Wahrnehmen/Erkennen → 2 Unterscheiden/Zuordnen → 3 Verstehen/Struktur → 4 Transfer/Kontext
const PEDAGOGY = {
    dimensions: {
        A: 'Hörwahrnehmung',
        B: 'Phonologische Bewusstheit',
        C: 'Wortschatz',
        D: 'Semantik',
        E: 'Grammatik',
        F: 'Erzählen',
        G: 'Sprachgedächtnis'
    },
    stages: {
        1: 'Wahrnehmen & Erkennen',
        2: 'Unterscheiden & Zuordnen',
        3: 'Verstehen & Struktur',
        4: 'Transfer & Kontext'
    }
};

const STORAGE_KEYS = {
    settings: 'sprachfoerderung_settings_v1',
    supportProfiles: 'sprachfoerderung_support_profiles_v1'
};

const DEFAULT_SETTINGS = {
    focusMode: true,
    observationMode: false
};

let appSettings = loadSettings();

const DEFAULT_PROFILE_DIM = () => ({
    stage: 1,
    stableStreak: 0,
    lastOutcomes: [],
    avgResponseMs: null,
    totalMs: 0,
    repetitions: 0
});

let supportProfile = null;
let gameMetrics = {};
let metadataState = { selectedChildId: null, view: 'select' };

const GAME_METADATA = {
    training: { title: 'Reim-Training', ageRange: '3–7', focusAreas: ['B', 'A'], targetSkill: 'Reime hören, nachsprechen und erkennen' },
    story: { title: 'Wortschatz-Spiel', ageRange: '4–6', focusAreas: ['C', 'A'], targetSkill: 'Wörter hören, erkennen und benennen' },
    memory: { title: 'Auditives Reim-Memory', ageRange: '4–7', focusAreas: ['B', 'G', 'A'], targetSkill: 'Reime hören und merken' },
    sound: { title: 'Töne kennenlernen', ageRange: '3–6', focusAreas: ['A', 'D'], targetSkill: 'Geräusche erkennen und zuordnen' },
    video: { title: 'Erkenne im Video', ageRange: '4–7', focusAreas: ['D', 'A'], targetSkill: 'Aufmerksamkeit und Bedeutungszuordnung' },
    lang_memory: { title: 'Sprachgedächtnis', ageRange: '4–7', focusAreas: ['G', 'C', 'A'], targetSkill: 'Wörter halten und fehlendes Wort erkennen' },
    sentence: { title: 'Satz ergänzen', ageRange: '4–7', focusAreas: ['E', 'D', 'A'], targetSkill: 'Grammatische Intuition (rezeptiv) aufbauen' },
    semantic: { title: 'Was passt dazu?', ageRange: '3–7', focusAreas: ['D', 'C', 'A'], targetSkill: 'Alltagslogik und Bedeutungsbeziehungen' },
    listen: { title: 'Hör genau hin!', ageRange: '3–7', focusAreas: ['A', 'B'], targetSkill: 'Gleich/anders unterscheiden (auditiv)' }
};

let trainingState = { startedAt: 0, retries: 0, recordingStartedAt: 0 };
let storyState = { promptStartedAt: 0, repetitions: 0 };
let storyQuizState = { promptStartedAt: 0, repetitions: 0 };
let memoryState = { firstPickedAt: 0, repetitions: 0, manualLevel: false };
let soundDetailState = { startedAt: 0, repetitions: 0, catKey: '', soundId: '' };
let videoQuizState = { startedAt: 0, toggles: 0, recorded: false };

// UI Elemente
const screens = {
    login: document.getElementById('login-screen'),
    landing: document.getElementById('landing-screen'),
    overview: document.getElementById('overview-screen'),
    training: document.getElementById('training-screen'),
    story: document.getElementById('story-screen'),
    memory: document.getElementById('memory-screen'),
    sound: document.getElementById('sound-screen'),
    sound_detail: document.getElementById('sound-detail-screen'),
    video: document.getElementById('video-screen'),
    lang_memory: document.getElementById('lang-memory-screen'),
    sentence: document.getElementById('sentence-screen'),
    semantic: document.getElementById('semantic-screen'),
    listen: document.getElementById('listen-screen'),
    metadata: document.getElementById('metadata-screen'),
    forum: document.getElementById('forum-screen'),
    videos: document.getElementById('videos-screen')
};

function loadSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.settings);
        if (!raw) return { ...DEFAULT_SETTINGS };
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

function saveSettings(next) {
    appSettings = { ...appSettings, ...next };
    try {
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(appSettings));
    } catch {}
    applyGlobalModeClasses();
}

function applyGlobalModeClasses() {
    document.body.classList.toggle('observation-mode', !!appSettings.observationMode);
    document.body.classList.toggle('focus-mode', !!appSettings.focusMode);
}

function ensureSupportProfileLoaded() {
    if (!currentChild) return;
    supportProfile = loadSupportProfile(currentChild.id);
    gameMetrics = supportProfile.gameMetrics || {};
}

function loadSupportProfile(childId) {
    const fallback = {
        dimensions: Object.fromEntries(Object.keys(PEDAGOGY.dimensions).map(k => [k, DEFAULT_PROFILE_DIM()])),
        gameDifficulty: {},
        gameMetrics: {}
    };
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.supportProfiles);
        const all = raw ? JSON.parse(raw) : {};
        const stored = all && all[childId] ? all[childId] : null;
        if (!stored) return fallback;
        const dims = stored.dimensions || {};
        const mergedDims = Object.fromEntries(Object.keys(PEDAGOGY.dimensions).map(k => [k, { ...DEFAULT_PROFILE_DIM(), ...(dims[k] || {}) }]));
        return {
            dimensions: mergedDims,
            gameDifficulty: stored.gameDifficulty || {},
            gameMetrics: stored.gameMetrics || {}
        };
    } catch {
        return fallback;
    }
}

function saveSupportProfile() {
    if (!currentChild || !supportProfile) return;
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.supportProfiles);
        const all = raw ? JSON.parse(raw) : {};
        all[currentChild.id] = supportProfile;
        localStorage.setItem(STORAGE_KEYS.supportProfiles, JSON.stringify(all));
    } catch {}
}

function resetPedagogicalProfile() {
    if (!currentChild) return;
    supportProfile = {
        dimensions: Object.fromEntries(Object.keys(PEDAGOGY.dimensions).map(k => [k, DEFAULT_PROFILE_DIM()])),
        gameDifficulty: {},
        gameMetrics: {}
    };
    gameMetrics = {};
    saveSupportProfile();
}

function recordPedagogicalOutcome({ gameId, dimension, correct, responseMs, repetitions, errorCluster }) {
    if (!supportProfile) return;
    const d = supportProfile.dimensions[dimension];
    if (!d) return;
    const safeCorrect = !!correct;
    const safeMs = Math.max(0, responseMs || 0);
    d.lastOutcomes.push({ t: Date.now(), ok: safeCorrect, ms: safeMs, rep: Math.max(0, repetitions || 0), gameId });
    if (d.lastOutcomes.length > 20) d.lastOutcomes = d.lastOutcomes.slice(-20);
    const recent = d.lastOutcomes.slice(-10);
    const okRate = recent.length ? recent.filter(x => x.ok).length / recent.length : 0;
    const avgMs = recent.length ? Math.round(recent.reduce((a, x) => a + (x.ms || 0), 0) / recent.length) : null;
    d.avgResponseMs = avgMs;
    d.totalMs = (d.totalMs || 0) + safeMs;
    if (recent.length >= 10 && okRate >= 0.8) {
        d.stableStreak = (d.stableStreak || 0) + 1;
        if (d.stableStreak >= 2 && d.stage < 4) {
            d.stage += 1;
            d.stableStreak = 0;
        }
    } else if (!safeCorrect) {
        d.stableStreak = 0;
    }
    supportProfile.dimensions[dimension] = d;
    const gm = supportProfile.gameMetrics[gameId] || { trials: 0, correct: 0, repeats: 0, avgMs: null, totalMs: 0, errorClusters: {} };
    gm.trials += 1;
    if (safeCorrect) gm.correct += 1;
    gm.repeats += Math.max(0, repetitions || 0);
    gm.totalMs = (gm.totalMs || 0) + safeMs;
    gm.avgMs = gm.trials ? Math.round((gm.totalMs || 0) / gm.trials) : null;
    if (!safeCorrect && errorCluster) {
        const k = String(errorCluster);
        gm.errorClusters[k] = (gm.errorClusters[k] || 0) + 1;
    }
    supportProfile.gameMetrics[gameId] = gm;
    saveSupportProfile();
}

// Globales Feedback: ruhig, fehlerfreundlich, ohne negatives Markieren.
function getFeedbackPhrases() {
    return {
        confirm: 'Genau.',
        confirmAlt: 'Super.',
        repeat: 'Nochmal in Ruhe.',
        model: 'Ich zeige es dir.',
        ready: 'Bereit.',
        next: 'Weiter.'
    };
}

function recordOutcomeForDimensions({ gameId, dimensions, correct, responseMs, repetitions, errorCluster }) {
    const dims = Array.isArray(dimensions) ? dimensions : [dimensions];
    dims.filter(Boolean).forEach(dimension => {
        recordPedagogicalOutcome({ gameId, dimension, correct, responseMs, repetitions, errorCluster });
    });
}

function incrementDimensionRepetitions({ dimensions, amount }) {
    if (!currentChild) return;
    if (!supportProfile) ensureSupportProfileLoaded();
    if (!supportProfile) return;
    const dims = Array.isArray(dimensions) ? dimensions : [dimensions];
    const inc = Math.max(0, parseInt(amount, 10) || 0);
    if (!inc) return;
    dims.filter(Boolean).forEach(dimension => {
        const cur = supportProfile.dimensions[dimension] || DEFAULT_PROFILE_DIM();
        const prev = typeof cur.repetitions === 'number' ? cur.repetitions : 0;
        supportProfile.dimensions[dimension] = { ...cur, repetitions: prev + inc };
    });
    saveSupportProfile();
}

function clamp(n, a, b) {
    return Math.min(b, Math.max(a, n));
}

function nowMs() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, Math.max(0, ms || 0)));
}

function formatDuration(ms) {
    const total = Math.max(0, Math.round(ms || 0));
    const totalMinutes = Math.max(0, Math.round(total / 60000));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
}

function getOrInitGameDifficulty(gameId, defaults) {
    const current = getGameDifficulty(gameId) || {};
    const next = { ...defaults, ...current };
    setGameDifficulty(gameId, next);
    return next;
}

function adaptDifficultyGeneric(gameId, { correct, responseMs, repetitions }) {
    const cur = getGameDifficulty(gameId) || {};
    const streak = clamp((cur.stableStreak || 0) + (correct ? 1 : -2), 0, 6);
    const paceMs = clamp(cur.paceMs ?? 850, 550, 1400);
    const next = { stableStreak: streak };
    if (!correct || (repetitions || 0) > 0) {
        next.paceMs = clamp(paceMs + 120, 550, 1400);
    } else if ((responseMs || 0) > 0 && responseMs < 2400 && streak >= 3) {
        next.paceMs = clamp(paceMs - 80, 550, 1400);
    }
    setGameDifficulty(gameId, next);
    return getGameDifficulty(gameId) || { ...cur, ...next };
}

function getDimensionStage(dim) {
    if (!supportProfile) return 1;
    return supportProfile.dimensions[dim]?.stage || 1;
}

function getGameDifficulty(gameId) {
    if (!supportProfile) return {};
    return supportProfile.gameDifficulty[gameId] || {};
}

function setGameDifficulty(gameId, next) {
    if (!supportProfile) return;
    const prev = supportProfile.gameDifficulty[gameId] || {};
    supportProfile.gameDifficulty[gameId] = { ...prev, ...next };
    saveSupportProfile();
}

function speak(text, opts) {
    if (!audioEnabled) return;
    if (appSettings.observationMode) return;
    try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(String(text || ''));
        utter.lang = 'de-DE';
        const voice = typeof pickKatjaVoice === 'function' ? pickKatjaVoice() : null;
        if (voice) utter.voice = voice;
        utter.rate = typeof opts?.rate === 'number' ? opts.rate : 0.7;
        utter.pitch = typeof opts?.pitch === 'number' ? opts.pitch : 1.05;
        window.speechSynthesis.speak(utter);
    } catch {}
}

let focusActive = false;
let focusTargets = [];

function setFocusActive(active) {
    focusActive = !!active;
    const enabled = focusActive && !!appSettings.focusMode && !appSettings.observationMode;
    document.body.classList.toggle('focus-active', enabled);
    document.body.classList.toggle('focus-has-target', enabled && focusTargets.length > 0);
    const hasCardTarget = enabled && focusTargets.some(el => el?.classList?.contains('word-card'));
    document.body.classList.toggle('focus-has-card-target', hasCardTarget);
}

function setFocusTargets(targetElements) {
    focusTargets.forEach(el => el.classList.remove('focus-target'));
    focusTargets = (targetElements || []).filter(Boolean);
    focusTargets.forEach(el => el.classList.add('focus-target'));
    const enabled = focusActive && !!appSettings.focusMode && !appSettings.observationMode;
    document.body.classList.toggle('focus-has-target', enabled && focusTargets.length > 0);
    const hasCardTarget = enabled && focusTargets.some(el => el?.classList?.contains('word-card'));
    document.body.classList.toggle('focus-has-card-target', hasCardTarget);
}

function speakAsync(text, opts) {
    if (!audioEnabled) return Promise.resolve();
    if (appSettings.observationMode) return Promise.resolve();
    return new Promise(resolve => {
        try {
            if (opts?.cancelBefore !== false) window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(String(text || ''));
            utter.lang = 'de-DE';
            const voice = typeof pickKatjaVoice === 'function' ? pickKatjaVoice() : null;
            if (voice) utter.voice = voice;
            utter.rate = typeof opts?.rate === 'number' ? opts.rate : 0.7;
            utter.pitch = typeof opts?.pitch === 'number' ? opts.pitch : 1.05;
            utter.onend = () => resolve();
            utter.onerror = () => resolve();
            window.speechSynthesis.speak(utter);
        } catch {
            resolve();
        }
    });
}

// Initialisierung
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 App wird initialisiert...');
    
    // Warte auf DataManager
    await waitForDataManager();

    setupImagePlaceholders();
    applyGlobalModeClasses();
    
    // Zeige Landing initial
    showScreen('landing');
    renderChildrenList();
    
    // Setup Event Listeners
    setupEventListeners();
    setupLandingDice();
    
    console.log('✅ App bereit!');
});

function svgPlaceholderDataUrl(label, variant) {
    const safeLabel = String(label || '').slice(0, 30);
    if (variant === 'title') {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="280" viewBox="0 0 1200 280"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe259" offset="0"/><stop stop-color="#ffa751" offset="1"/></linearGradient></defs><rect x="0" y="0" width="1200" height="280" rx="48" fill="url(#g)"/><rect x="16" y="16" width="1168" height="248" rx="40" fill="rgba(255,255,255,0.72)"/><text x="600" y="172" text-anchor="middle" font-family="system-ui,-apple-system,'Segoe UI',Arial,sans-serif" font-size="78" font-weight="800" fill="#1a1a1a">${safeLabel}</text></svg>`;
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" offset="0"/><stop stop-color="#f5f5ff" offset="1"/></linearGradient></defs><rect x="0" y="0" width="260" height="260" rx="44" fill="url(#g)"/><rect x="10" y="10" width="240" height="240" rx="38" fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.08)" stroke-width="4"/><text x="130" y="145" text-anchor="middle" font-family="system-ui,-apple-system,'Segoe UI',Arial,sans-serif" font-size="34" font-weight="800" fill="#1a1a1a">${safeLabel}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function setupImagePlaceholders() {
    const titleImgs = [
        document.getElementById('nav-title-img'),
        document.getElementById('landing-title-img')
    ].filter(Boolean);

    titleImgs.forEach(img => {
        const label = img.dataset.fallback || img.alt || 'Sprachwerkstatt';
        img.onerror = () => {
            img.onerror = null;
            img.src = svgPlaceholderDataUrl(label, 'title');
        };
    });

    document.querySelectorAll('img.dice-face-img').forEach(img => {
        const label = img.dataset.fallback || img.alt || '';
        img.onerror = () => {
            img.onerror = null;
            img.src = svgPlaceholderDataUrl(label, 'dice');
        };
    });
}

// Warte bis DataManager geladen ist
function waitForDataManager() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (dataManager.levelsData && dataManager.usersData) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
        // Fallback Timeout: stelle sicher, dass App nicht hängen bleibt
        setTimeout(() => {
            if (!(dataManager.levelsData && dataManager.usersData)) {
                clearInterval(checkInterval);
                console.warn('⏱️ Timeout beim Warten auf Daten. Starte mit Fallback-Daten weiter.');
                // Stelle minimale Strukturen sicher
                dataManager.levelsData = dataManager.levelsData || { levels: [] };
                dataManager.usersData = dataManager.usersData || { children: [] };
                resolve();
            }
        }, 3000);
    });
}

// Event Listeners
function setupEventListeners() {
    const navBack = document.getElementById('btn-nav-back');
    if (navBack) {
        navBack.addEventListener('click', () => {
            try { window.speechSynthesis.cancel(); } catch {}
            handleNavBack();
        });
    }

    const navAudio = document.getElementById('btn-nav-audio');
    if (navAudio) {
        navAudio.addEventListener('click', () => {
            audioEnabled = !audioEnabled;
            updateNavAudioIcon();
            try { window.speechSynthesis.cancel(); } catch {}
        });
        updateNavAudioIcon();
    }
    
    const resetBtn = document.getElementById('btn-reset-progress');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (!currentChild) return;
            dataManager.resetProgress(currentChild.id);
            resetPedagogicalProfile();
            try { localStorage.removeItem(getSoundProgressStorageKey()); } catch {}
            renderLevelsGrid();
        });
    }

    // Aufnahme-Button
    const btnRecord = document.getElementById('btn-record');
    if (btnRecord) {
        btnRecord.addEventListener('click', () => {
            startRecording();
        });
    }
    const micCircle = document.querySelector('.mic-circle');
    if (micCircle) {
        micCircle.addEventListener('click', () => startRecording());
        micCircle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startRecording();
            }
        });
    }
    const nextSubBtn = document.getElementById('btn-next-sublevel');
    if (nextSubBtn) {
        nextSubBtn.addEventListener('click', () => {
            if (!currentChild || !currentLevelData || !currentSublevelData) return;
            const newlyCompleted = dataManager.completeSublevel(currentChild.id, currentLevelData.id, currentSublevelData.id);
            if (newlyCompleted) incrementDimensionRepetitions({ dimensions: GAME_METADATA.training.focusAreas, amount: 1 });
            if (currentSublevelIndex < currentLevelData.sublevels.length - 1) {
                currentSublevelIndex++;
                renderTrainingScreen();
            } else {
                showScreen('overview');
                renderLevelsGrid();
            }
        });
    }
    const navKinder = document.getElementById('btn-nav-kinder');
    const navOverview = document.getElementById('btn-nav-uebersicht');
    const navForum = document.getElementById('btn-nav-forum');
    if (navKinder) {
        navKinder.addEventListener('click', () => {
            if (navMode === 'experts') {
                showScreen('forum');
                renderForum();
                return;
            }
            showScreen('login');
            renderChildrenList();
        });
    }
    if (navOverview) {
        navOverview.addEventListener('click', () => {
            if (navMode === 'experts') {
                showScreen('videos');
                renderVideos();
                return;
            }
            showScreen('overview');
            renderLevelsGrid();
        });
    }
    if (navForum) {
        navForum.addEventListener('click', () => {
            if (currentScreenName === 'forum' || currentScreenName === 'videos') {
                if (currentChild) {
                    showScreen('overview');
                    renderLevelsGrid();
                } else {
                    showScreen('login');
                    renderChildrenList();
                }
                return;
            }
            showScreen('forum');
            renderForum();
        });
    }
    const landingContinue = document.getElementById('btn-landing-continue');
    if (landingContinue) {
        landingContinue.addEventListener('click', async () => {
            const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
            if (isMobile) {
                const img = document.getElementById('landing-title-img');
                if (img) img.classList.add('landing-logo-bump');
                await sleep(260);
            }
            showScreen('login');
            renderChildrenList();
        });
    }
    const landingExperts = document.getElementById('btn-landing-experts');
    if (landingExperts) {
        landingExperts.addEventListener('click', () => {
            showScreen('forum');
            renderForum();
        });
    }
    // Landing-Würfel Interaktion erneut aktivieren beim Navigieren
    setupLandingDice();

    const addChildBtn = document.getElementById('btn-add-child');
    if (addChildBtn) {
        addChildBtn.addEventListener('click', () => {
            const name = document.getElementById('add-child-name')?.value || '';
            const age = document.getElementById('add-child-age')?.value || '';
            const avatar = document.getElementById('add-child-avatar')?.value || '👤';
            const child = dataManager.addChild({ name, age, avatar });
            if (!child) return;
            const n = document.getElementById('add-child-name');
            const a = document.getElementById('add-child-age');
            if (n) n.value = '';
            if (a) a.value = '';
            renderChildrenList();
        });
    }

    // Feedback-Buttons
    document.getElementById('btn-correct').addEventListener('click', () => {
        handleCorrectAnswer();
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
        handleRetry();
    });

    // Speech Recognition Callbacks
    speechRecognition.onResult = (transcript, confidence) => {
        handleSpeechResult(transcript, confidence);
    };

    speechRecognition.onError = (error) => {
        handleSpeechError(error);
    };
    
    const storyCard = document.getElementById('story-card');
    if (storyCard) {
        storyCard.addEventListener('click', () => { currentVocabLevel = 1; openStoryGame(); });
        storyCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                currentVocabLevel = 1; openStoryGame();
            }
        });
    }
    const storyStartBtn = document.getElementById('btn-story-start');
    if (storyStartBtn) {
        storyStartBtn.addEventListener('click', () => {
            currentVocabLevel = 1;
            openStoryGame();
        });
    }
    const vocab2Card = document.getElementById('vocab2-card');
    const vocab3Card = document.getElementById('vocab3-card');
    const vocab2StartBtn = document.getElementById('btn-vocab2-start');
    const vocab3StartBtn = document.getElementById('btn-vocab3-start');
    if (vocab2Card) {
        vocab2Card.addEventListener('click', () => { currentVocabLevel = 2; openStoryGame(); });
        vocab2Card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); currentVocabLevel = 2; openStoryGame(); }
        });
    }
    if (vocab3Card) {
        vocab3Card.addEventListener('click', () => { currentVocabLevel = 3; openStoryGame(); });
        vocab3Card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); currentVocabLevel = 3; openStoryGame(); }
        });
    }
    if (vocab2StartBtn) vocab2StartBtn.addEventListener('click', () => { currentVocabLevel = 2; openStoryGame(); });
    if (vocab3StartBtn) vocab3StartBtn.addEventListener('click', () => { currentVocabLevel = 3; openStoryGame(); });
    const memory1Card = document.getElementById('memory1-card');
    const memory1StartBtn = document.getElementById('btn-memory1-start');
    if (memory1Card) {
        memory1Card.addEventListener('click', () => openMemoryGame());
        memory1Card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMemoryGame(); } });
    }
    if (memory1StartBtn) memory1StartBtn.addEventListener('click', () => openMemoryGame());
    const soundCard = document.getElementById('sound-card');
    const soundStartBtn = document.getElementById('btn-sound-start');
    if (soundCard) {
        soundCard.addEventListener('click', () => openSoundGame());
        soundCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSoundGame(); } });
    }
    if (soundStartBtn) soundStartBtn.addEventListener('click', () => openSoundGame());
    const videoCard = document.getElementById('video-card');
    const videoStartBtn = document.getElementById('btn-video-start');
    if (videoCard) {
        videoCard.addEventListener('click', () => openVideoGame());
        videoCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVideoGame(); } });
    }
    if (videoStartBtn) videoStartBtn.addEventListener('click', () => openVideoGame());

    const langMemoryCard = document.getElementById('lang-memory-card');
    const langMemoryStartBtn = document.getElementById('btn-lang-memory-start');
    if (langMemoryCard) {
        langMemoryCard.addEventListener('click', () => openLangMemoryGame());
        langMemoryCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLangMemoryGame(); } });
    }
    if (langMemoryStartBtn) langMemoryStartBtn.addEventListener('click', (e) => { e.stopPropagation(); openLangMemoryGame(); });

    const sentenceCard = document.getElementById('sentence-card');
    const sentenceStartBtn = document.getElementById('btn-sentence-start');
    if (sentenceCard) {
        sentenceCard.addEventListener('click', () => openSentenceGame());
        sentenceCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSentenceGame(); } });
    }
    if (sentenceStartBtn) sentenceStartBtn.addEventListener('click', () => openSentenceGame());

    const semanticCard = document.getElementById('semantic-card');
    const semanticStartBtn = document.getElementById('btn-semantic-start');
    if (semanticCard) {
        semanticCard.addEventListener('click', () => openSemanticGame());
        semanticCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSemanticGame(); } });
    }
    if (semanticStartBtn) semanticStartBtn.addEventListener('click', () => openSemanticGame());

    const listenCard = document.getElementById('listen-card');
    const listenStartBtn = document.getElementById('btn-listen-start');
    if (listenCard) {
        listenCard.addEventListener('click', () => openListenGame());
        listenCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openListenGame(); } });
    }
    if (listenStartBtn) listenStartBtn.addEventListener('click', () => openListenGame());
    const endStoryBtn = document.getElementById('btn-end-story');
    if (endStoryBtn) {
        endStoryBtn.addEventListener('click', () => {
            showScreen('overview');
        });
    }
    const endMemoryBtn = document.getElementById('btn-end-memory');
    if (endMemoryBtn) {
        endMemoryBtn.addEventListener('click', () => {
            showScreen('overview');
        });
    }
    const endSoundBtn = document.getElementById('btn-end-sound');
    if (endSoundBtn) {
        endSoundBtn.addEventListener('click', () => {
            showScreen('overview');
        });
    }
    const backSoundDetailBtn = document.getElementById('btn-back-sound-detail');
    if (backSoundDetailBtn) {
        backSoundDetailBtn.addEventListener('click', () => {
            showScreen('sound');
            renderSoundCategories();
        });
    }
    const endVideoBtn = document.getElementById('btn-end-video');
    if (endVideoBtn) {
        endVideoBtn.addEventListener('click', () => {
            showScreen('overview');
        });
    }

    const endLangMemoryBtn = document.getElementById('btn-end-lang-memory');
    if (endLangMemoryBtn) endLangMemoryBtn.addEventListener('click', () => showScreen('overview'));
    const endSentenceBtn = document.getElementById('btn-end-sentence');
    if (endSentenceBtn) endSentenceBtn.addEventListener('click', () => showScreen('overview'));
    const endSemanticBtn = document.getElementById('btn-end-semantic');
    if (endSemanticBtn) endSemanticBtn.addEventListener('click', () => showScreen('overview'));
    const endListenBtn = document.getElementById('btn-end-listen');
    if (endListenBtn) endListenBtn.addEventListener('click', () => showScreen('overview'));
    const endMetadataBtn = document.getElementById('btn-end-metadata');
    if (endMetadataBtn) endMetadataBtn.addEventListener('click', () => { showScreen('forum'); renderForum(); });
    const videoQuizStart = document.getElementById('btn-video-quiz-start');
    if (videoQuizStart) {
        videoQuizStart.addEventListener('click', () => startVideoQuiz());
    }
    const videoNextBtn = document.getElementById('btn-video-next');
    if (videoNextBtn) {
        videoNextBtn.addEventListener('click', () => nextVideoStep());
    }
    const videoPrevBtn = document.getElementById('btn-video-prev');
    if (videoPrevBtn) {
        videoPrevBtn.addEventListener('click', () => prevVideoStep());
    }
    const nextBtn = document.getElementById('btn-next-level');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentVocabLevel < 3) {
                currentVocabLevel += 1;
                doneWords.clear();
                activeTargetWord = null;
                renderStoryGame();
                const srs2 = document.getElementById('story-recognition-status');
                if (srs2) srs2.textContent = 'Neues Level! Tippe ein Bild.';
            } else {
                const srs3 = document.getElementById('story-recognition-status');
                if (srs3) srs3.textContent = 'Alle Levels geschafft! 🎉';
                nextBtn.style.display = 'none';
            }
        });
    }
}

function setNavMode(mode) {
    navMode = mode;
    const navKinder = document.getElementById('btn-nav-kinder');
    const navOverview = document.getElementById('btn-nav-uebersicht');
    if (navKinder) navKinder.textContent = mode === 'experts' ? 'Forum' : 'Kinder';
    if (navOverview) navOverview.textContent = mode === 'experts' ? 'Videos' : 'Spielübersicht';
    updateNavForumButton();
}

function updateNavForumButton() {
    const navForum = document.getElementById('btn-nav-forum');
    if (!navForum) return;
    if (currentScreenName === 'forum' || currentScreenName === 'videos') {
        const label = 'Spielübersicht';
        navForum.textContent = label;
        navForum.className = 'btn btn-success';
        navForum.setAttribute('aria-label', `Zur ${label}`);
        return;
    }
    navForum.textContent = 'Forum';
    navForum.className = 'btn btn-secondary';
    navForum.setAttribute('aria-label', 'Zum Forum');
}

function updateNavAudioIcon() {
    const navAudio = document.getElementById('btn-nav-audio');
    if (!navAudio) return;
    navAudio.textContent = audioEnabled ? '🔊' : '🔇';
    navAudio.setAttribute('aria-label', audioEnabled ? 'Audio an' : 'Audio aus');
}

function handleNavBack() {
    if (currentScreenName === 'landing') return;
    if (currentScreenName === 'login') {
        showScreen('landing');
        return;
    }
    if (currentScreenName === 'overview') {
        showScreen('login');
        renderChildrenList();
        return;
    }
    if (currentScreenName === 'sound_detail') {
        showScreen('sound');
        renderSoundCategories();
        return;
    }
    if (currentScreenName === 'training') {
        showScreen('overview');
        renderLevelsGrid();
        return;
    }
    if (currentScreenName === 'forum') {
        showScreen('landing');
        return;
    }
    if (currentScreenName === 'videos') {
        showScreen('forum');
        renderForum();
        return;
    }
    if (currentScreenName === 'metadata') {
        showScreen('forum');
        renderForum();
        return;
    }
    showScreen('overview');
}

// Screen Navigation
function showScreen(screenName) {
    try { speechRecognition.setKeepAlive(false); } catch {}
    try { speechRecognition.setReadingMode(false); } catch {}
    try { speechRecognition.stop(); } catch {}
    try { window.speechSynthesis.cancel(); } catch {}
    Object.keys(screens).forEach(name => {
        const el = screens[name];
        if (el) el.classList.remove('active');
    });
    if (screens[screenName]) screens[screenName].classList.add('active');
    currentScreenName = screenName;
    document.body.dataset.screen = screenName;
    const nav = document.getElementById('app-nav');
    if (nav) {
        nav.style.display = screenName === 'landing' ? 'none' : 'flex';
    }
    const titlebar = document.getElementById('app-titlebar');
    if (titlebar) {
        titlebar.style.display = screenName === 'landing' ? 'none' : 'flex';
    }
    if (screenName === 'landing') {
        const img = document.getElementById('landing-title-img');
        if (img) img.classList.remove('landing-logo-bump');
    }
    setNavMode(screenName === 'forum' || screenName === 'videos' ? 'experts' : 'kids');
    updateNavForumButton();
    const gameplayScreens = new Set(['training', 'story', 'memory', 'sound', 'sound_detail', 'video', 'lang_memory', 'sentence', 'semantic', 'listen']);
    if (gameplayScreens.has(screenName)) {
        setFocusTargets([]);
        setFocusActive(true);
    } else {
        setFocusTargets([]);
        setFocusActive(false);
    }
}

// Render Kinder-Liste
function renderChildrenList() {
    const container = document.getElementById('children-list');
    const children = dataManager.getChildren();
    
    container.innerHTML = '';
    
    if (!children || children.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'info-box';
        empty.innerHTML = `<p>Keine Kinderdaten gefunden. Bitte aktualisiere die Seite.</p>`;
        container.appendChild(empty);
        return;
    }
    
    children.forEach(child => {
        const card = document.createElement('div');
        card.className = 'child-card';
        const group = String(child.group || '').trim();
        card.innerHTML = `
            <div class="avatar">${child.avatar}</div>
            <h3>${child.name}</h3>
            <p>${child.age} Jahre</p>
            ${group ? `<p>${group}</p>` : ''}
        `;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `Kind ${child.name} auswählen`);
        card.addEventListener('click', () => selectChild(child.id));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectChild(child.id);
            }
        });
        container.appendChild(card);
    });
}

// Kind auswählen
function selectChild(childId) {
    currentChild = dataManager.setCurrentChild(childId);
    ensureSupportProfileLoaded();
    document.getElementById('child-avatar').textContent = currentChild.avatar;
    document.getElementById('child-name').textContent = `${currentChild.name}s Fortschritt`;
    
    showScreen('overview');
    renderProfileCard();
    renderLevelsGrid();
}

const LEVEL_WORDS = {
    1: ['Haus','Laus','Maus','Auto','Seil','Loch','Meer','Fuß','Tisch','Buch','Uhr','Stuhl','Turm','Pferd'],
    2: ['Papa','Mama','Ritter','Schuhe','Hallo','Wolke','Lampe','Koffer','Tasche','Fenster','Spielzeug','Einhorn','Katze','Tatze'],
    3: ['Krawatte','Computer','Weihnachtsmann','Pinguin','Elefant','Bauernhof','Prinzessin','Giraffe','Drache']
};
let currentVocabLevel = 1;
let doneWords = new Set();
let activeTargetWord = null;

function openStoryGame() {
    showScreen('story');
    activeTargetWord = null;
    storyQuizActive = false;
    storyQuizRound = 0;
    currentQuizTarget = '';
    doneWords.clear();
    setFocusTargets([]);
    storyState = { promptStartedAt: 0, repetitions: 0 };
    storyQuizState = { promptStartedAt: 0, repetitions: 0 };
    renderStoryGame();
}

// Reim-Memory
const MEMORY_LEVELS = {
    1: [
        { a: 'hund', b: 'hund' },
        { a: 'katze', b: 'katze' },
        { a: 'pferd', b: 'pferd' }
    ],
    2: [
        { a: 'garten', b: 'garten' },
        { a: 'spielzeug', b: 'spielzeug' },
        { a: 'schlafen', b: 'schlafen' }
    ],
    3: [
        { a: 'trommel', b: 'trommel' },
        { a: 'musik', b: 'musik' },
        { a: 'tanzen', b: 'tanzen' }
    ],
    4: [
        { a: 'bagger', b: 'bagger' },
        { a: 'kran', b: 'kran' },
        { a: 'helm', b: 'helm' }
    ],
    5: [
        { a: 'arzt', b: 'arzt' },
        { a: 'wunde', b: 'wunde' },
        { a: 'pflaster', b: 'pflaster' }
    ],
    6: [
        { a: 'polizei', b: 'polizei' },
        { a: 'dieb', b: 'dieb' },
        { a: 'blaulicht', b: 'blaulicht' }
    ],
    7: [
        { a: 'feuer', b: 'feuer' },
        { a: 'schlauch', b: 'schlauch' },
        { a: 'leiter', b: 'leiter' }
    ],
    8: [
        { a: 'lehrer', b: 'lehrer' },
        { a: 'stift', b: 'stift' },
        { a: 'buch', b: 'buch' }
    ],
    9: [
        { a: 'hose', b: 'hose' },
        { a: 'jacke', b: 'jacke' },
        { a: 'schuhe', b: 'schuhe' }
    ],
    10: [
        { a: 'baum', b: 'baum' },
        { a: 'pilz', b: 'pilz' },
        { a: 'vogel', b: 'vogel' }
    ]
};
let memoryDeck = [];
let memoryFoundPairs = 0;
let memoryFirst = null;
let memorySecond = null;
let memoryLock = false;
let memoryTotalPairs = 0;

function openMemoryGame() {
    showScreen('memory');
    memoryState = { firstPickedAt: 0, repetitions: 0, manualLevel: false };
    getOrInitGameDifficulty('memory', { paceMs: 850, level: 1, stableStreak: 0, manualLevel: false });
    renderMemoryGame();
}

function renderMemoryGame() {
    const resetBtn = document.getElementById('btn-memory-reset');
    if (resetBtn) resetBtn.onclick = () => { memoryState.manualLevel = false; setGameDifficulty('memory', { manualLevel: false }); buildMemoryRound(); };
    const nextLevelBtn = document.getElementById('btn-memory-next-level');
    const levelSelect = document.getElementById('memory-level');
    if (levelSelect) {
        levelSelect.onchange = () => {
            memoryState.manualLevel = true;
            const level = parseInt(levelSelect.value || '1', 10) || 1;
            setGameDifficulty('memory', { manualLevel: true, level });
            buildMemoryRound();
        };
    }
    if (nextLevelBtn) {
        nextLevelBtn.onclick = () => {
            const availableLevels = Object.keys(MEMORY_LEVELS)
                .map(v => parseInt(v, 10))
                .filter(n => Number.isFinite(n))
                .sort((a, b) => a - b);
            const currentLevel = parseInt(levelSelect ? levelSelect.value : '1', 10) || 1;
            const options = availableLevels.length > 1 ? availableLevels.filter(l => l !== currentLevel) : availableLevels;
            const picked = options[Math.floor(Math.random() * options.length)] || currentLevel;
            if (levelSelect) levelSelect.value = String(picked);
            memoryState.manualLevel = true;
            setGameDifficulty('memory', { manualLevel: true, level: picked });
            buildMemoryRound();
        };
    }
    buildMemoryRound();
}

function buildMemoryRound() {
    const grid = document.getElementById('memory-grid');
    if (!grid) return;
    const levelSelect = document.getElementById('memory-level');
    const diff = getGameDifficulty('memory') || {};
    const manual = memoryState.manualLevel || !!diff.manualLevel;
    if (levelSelect && !manual && diff.level) levelSelect.value = String(diff.level);
    const currentLevel = parseInt(levelSelect ? levelSelect.value : '1', 10) || 1;
    if (!diff.level || manual) setGameDifficulty('memory', { level: currentLevel });
    const pairs = MEMORY_LEVELS[currentLevel] || MEMORY_LEVELS[1];
    const totalPairs = pairs.length;
    memoryTotalPairs = totalPairs;
    memoryDeck = [];
    memoryFoundPairs = 0;
    memoryFirst = null;
    memorySecond = null;
    memoryLock = false;
    memoryState.firstPickedAt = 0;
    memoryState.repetitions = 0;
    grid.innerHTML = '';
    pairs.forEach((p, idx) => {
        memoryDeck.push({ word: p.a, pairId: idx });
        memoryDeck.push({ word: p.b, pairId: idx });
    });
    const deck = shuffle(memoryDeck);
    deck.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = 'word-card memory-card';
        card.dataset.word = item.word;
        card.dataset.pair = String(item.pairId);
        card.dataset.idx = String(i);
        const imgPath = `./images/level${currentLevel}/${item.word}.png`;
        card.innerHTML = `
            <div class="memory-card-inner">
                <div class="memory-card-front">
                    <div class="word-image-wrap">
                        <div class="placeholder">?</div>
                    </div>
                </div>
                <div class="memory-card-back">
                    <div class="word-image-wrap">
                        <div class="placeholder">?</div>
                    </div>
                    <div class="word-label visually-hidden">${item.word.charAt(0).toUpperCase() + item.word.slice(1)}</div>
                </div>
            </div>
        `;
        card.addEventListener('click', () => handleMemoryCardClick(card, imgPath, item.word, currentLevel));
        grid.appendChild(card);
    });
    updateMemoryStatus(totalPairs);
    setFocusTargets([]);
}

function handleMemoryCardClick(card, imgPath, word, currentLevel) {
    if (memoryLock || card.classList.contains('found')) return;
    speakWord(word);
    const wrap = card.querySelector('.memory-card-back .word-image-wrap');
    const label = card.querySelector('.memory-card-back .word-label');
    const img = new Image();
    const lw = String(word || '').toLowerCase();
    const candidates = [
        imgPath,
        `./images/story/${lw}.png`
    ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);
    let candidateIndex = 0;
    img.src = candidates[candidateIndex];
    img.alt = word;
    img.onerror = () => {
        if (!wrap) return;
        candidateIndex += 1;
        if (candidateIndex < candidates.length) {
            img.src = candidates[candidateIndex];
            return;
        }
        const idx = parseInt(card.dataset.idx || '0', 10) || 0;
        const difficulty = currentLevel <= 3 ? 'leicht' : currentLevel <= 7 ? 'mittel' : 'schwer';
        img.src = generatePlaceholderPng(idx, difficulty);
    };
    img.onload = () => {
        if (!wrap) return;
        wrap.innerHTML = '';
        wrap.appendChild(img);
        if (label) label.classList.remove('visually-hidden');
    };
    card.classList.add('active');
    if (!memoryFirst) {
        memoryFirst = card;
        memoryState.firstPickedAt = nowMs();
        return;
    }
    if (memoryFirst === card) return;
    memorySecond = card;
    memoryLock = true;
    const isMatch = memoryFirst.dataset.pair === memorySecond.dataset.pair;
    const responseMs = Math.round(nowMs() - (memoryState.firstPickedAt || nowMs()));
    if (isMatch) {
        recordOutcomeForDimensions({ gameId: 'memory', dimensions: ['B', 'G', 'A'], correct: true, responseMs, repetitions: memoryState.repetitions });
        const cur = adaptDifficultyGeneric('memory', { correct: true, responseMs, repetitions: memoryState.repetitions });
        const diff = getGameDifficulty('memory') || {};
        if (!(memoryState.manualLevel || diff.manualLevel) && cur.stableStreak >= 4) {
            const level = parseInt((document.getElementById('memory-level')?.value || '1'), 10) || 1;
            setGameDifficulty('memory', { level: clamp(level + 1, 1, 10) });
        }
        [memoryFirst, memorySecond].forEach(c => {
            c.classList.add('found');
            const badge = document.createElement('div');
            badge.className = 'done-badge';
            badge.textContent = '✓';
            const existing = c.querySelector('.done-badge');
            const backWrap = c.querySelector('.memory-card-back .word-image-wrap');
            if (!existing && backWrap) backWrap.appendChild(badge);
        });
        memoryFoundPairs++;
        updateMemoryStatus(memoryTotalPairs);
        memoryFirst = null;
        memorySecond = null;
        memoryLock = false;
        if (memoryFoundPairs >= memoryTotalPairs) {
            const info = document.getElementById('memory-info');
            if (info) info.textContent = 'Super! Alle Paare gefunden!';
        }
    } else {
        memoryState.repetitions = (memoryState.repetitions || 0) + 1;
        recordOutcomeForDimensions({ gameId: 'memory', dimensions: ['B', 'G', 'A'], correct: false, responseMs, repetitions: memoryState.repetitions, errorCluster: `${memoryFirst.dataset.word}:${memorySecond.dataset.word}` });
        const cur = adaptDifficultyGeneric('memory', { correct: false, responseMs, repetitions: memoryState.repetitions });
        const diff = getGameDifficulty('memory') || {};
        if (!(memoryState.manualLevel || diff.manualLevel) && cur.stableStreak === 0) {
            const level = parseInt((document.getElementById('memory-level')?.value || '1'), 10) || 1;
            setGameDifficulty('memory', { level: clamp(level - 1, 1, 10) });
        }
        setTimeout(() => {
            [memoryFirst, memorySecond].forEach(c => {
                const w = c.querySelector('.memory-card-back .word-image-wrap');
                const l = c.querySelector('.memory-card-back .word-label');
                if (w) w.innerHTML = '<div class="placeholder">?</div>';
                if (l) l.classList.add('visually-hidden');
                c.classList.remove('active');
            });
            memoryFirst = null;
            memorySecond = null;
            memoryLock = false;
        }, 950);
    }
}

function updateMemoryStatus(totalPairs) {
    const box = document.getElementById('memory-status');
    if (box) box.innerHTML = `<p>Gefundene Paare: ${memoryFoundPairs}/${totalPairs}</p>`;
    const pf = document.getElementById('memory-progress-fill');
    if (pf) {
        const pct = totalPairs ? Math.round((memoryFoundPairs / totalPairs) * 100) : 0;
        pf.style.width = `${pct}%`;
    }
}

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function renderStoryGame() {
    const list = document.getElementById('story-word-list');
    list.innerHTML = '';
    setFocusTargets([]);
    const words = LEVEL_WORDS[currentVocabLevel] || [];
    const pool = shuffle(words).slice(0, Math.min(4, words.length || 0));
    pool.forEach((word, idx) => {
        const lw = String(word || '').toLowerCase();
        const card = document.createElement('div');
        card.className = 'word-card';
        card.dataset.word = lw;
        const imgPath = `./images/story/${lw}.png`;
        card.innerHTML = `
            <div class="word-image-wrap">
                <img src="${imgPath}" alt="${word}">
            </div>
            <div class="word-label">${word}</div>
        `;
        const imgEl = card.querySelector('img');
        imgEl.onerror = () => {
            imgEl.src = generatePlaceholderPng(idx, 'leicht');
            imgEl.style.display = 'block';
        };
        card.addEventListener('click', () => {
            speakWord(word);
        });
        list.appendChild(card);
    });
    const srs6 = document.getElementById('story-recognition-status');
    if (srs6) srs6.textContent = 'Tippe auf „Spiel beginnen“ und starte.';
    const si = document.getElementById('story-info');
    if (si) si.textContent = 'Höre das Wort und tippe das passende Bild.';
    const nextBtn = document.getElementById('btn-next-level');
    if (nextBtn) {
        nextBtn.classList.remove('btn-secondary');
        nextBtn.classList.add('btn-success');
        nextBtn.style.display = 'none';
    }
    const quizStart = document.getElementById('btn-story-quiz-start');
    if (quizStart) {
        quizStart.onclick = () => nextStoryQuizStep();
        quizStart.textContent = storyQuizActive ? 'nächste Frage' : 'Spiel beginnen';
        quizStart.disabled = false;
    }
    const quizMic = document.getElementById('btn-story-quiz-mic');
    if (quizMic) {
        quizMic.onclick = () => {
            if (storyQuizActive && currentQuizTarget) {
                speakWord(`Zeig mir ${currentQuizTarget}`);
            }
        };
    }
    const quizBack = document.getElementById('btn-story-quiz-back');
    if (quizBack) {
        quizBack.onclick = () => {
            if (!storyQuizActive) return;
            runStoryQuizStep();
        };
    }
    const quizWrap = document.getElementById('story-quiz-progress-wrap');
    if (quizWrap) quizWrap.style.display = 'none';
    if (quizMic) quizMic.style.display = 'none';
    if (quizBack) quizBack.style.display = 'none';
}

const SOUND_CATEGORIES = {
    tiere: {
        label: 'Tiere',
        items: [
            { id: 'miauen', options: ['hund','katze','kuh','schaf'], correct: 'katze' },
            { id: 'bellen', options: ['hund','katze','kuh','schaf'], correct: 'hund' },
            { id: 'wiehern', options: ['pferd','hund','katze','kuh'], correct: 'pferd' },
            { id: 'quaken', options: ['frosch','ente','kuh','schwein'], correct: 'frosch' },
            { id: 'muht', options: ['kuh','schaf','hund','katze'], correct: 'kuh' },
            { id: 'ia', options: ['esel','hund','katze','schaf'], correct: 'esel' },
            { id: 'schnattern', options: ['ente','vogel','katze','hund'], correct: 'ente' },
            { id: 'brüllt', options: ['löwe','hund','katze','schwein'], correct: 'löwe' },
            { id: 'grunzt', options: ['schwein','kuh','katze','hund'], correct: 'schwein' },
            { id: 'summt', options: ['biene','vogel','ente','schaf'], correct: 'biene' }
        ]
    },
    alltag: {
        label: 'Alltag',
        items: [
            { id: 'wasser', options: ['wasser','telefon','auto','tuer'], correct: 'wasser' },
            { id: 'schluessel', options: ['schluessel','staubsauger','zug','schritte'], correct: 'schluessel' },
            { id: 'staubsauger', options: ['staubsauger','schritte','auto','telefon'], correct: 'staubsauger' },
            { id: 'schritte', options: ['schritte','zug','tuer','wasser'], correct: 'schritte' },
            { id: 'zug', options: ['zug','auto','telefon','tuer'], correct: 'zug' },
            { id: 'auto', options: ['auto','telefon','tuer','wasser'], correct: 'auto' },
            { id: 'telefon', options: ['telefon','auto','tuer','wasser'], correct: 'telefon' },
            { id: 'tuer', options: ['tuer','telefon','auto','wasser'], correct: 'tuer' }
        ]
    },
    musik: {
        label: 'Musik',
        items: [
            { id: 'klatschen', options: ['klatschen','flöte','klavier','trommel'], correct: 'klatschen' },
            { id: 'flöte', options: ['flöte','klavier','schlagzeug','rassel'], correct: 'flöte' },
            { id: 'klavier', options: ['klavier','gitarre','trompete','rassel'], correct: 'klavier' },
            { id: 'gitarre', options: ['gitarre','trompete','schlagzeug','rassel'], correct: 'gitarre' },
            { id: 'trompete', options: ['trompete','gitarre','schlagzeug','rassel'], correct: 'trompete' },
            { id: 'schlagzeug', options: ['schlagzeug','trompete','gitarre','rassel'], correct: 'schlagzeug' },
            { id: 'rassel', options: ['rassel','gitarre','trompete','schlagzeug'], correct: 'rassel' }
        ]
    }
};
let soundCategory = null;
let soundProgress = {};

function getSoundProgressStorageKey() {
    return currentChild?.id ? `sound_progress_${currentChild.id}` : 'sound_progress';
}

function loadSoundProgress() {
    try {
        const raw = localStorage.getItem(getSoundProgressStorageKey()) || '{}';
        soundProgress = JSON.parse(raw);
    } catch {
        soundProgress = {};
    }
    Object.keys(SOUND_CATEGORIES).forEach(k => {
        if (!soundProgress[k]) soundProgress[k] = { done: [] };
    });
}
function saveSoundProgress() {
    localStorage.setItem(getSoundProgressStorageKey(), JSON.stringify(soundProgress));
}
function getSoundCategoryPercent(catKey) {
    const total = SOUND_CATEGORIES[catKey].items.length;
    const done = soundProgress[catKey].done.length;
    return Math.round((done / total) * 100);
}
function updateSoundOverviewProgress() {
    const fill = document.getElementById('sound-overview-progress');
    if (!fill) return;
    const keys = Object.keys(SOUND_CATEGORIES);
    let completedCats = 0;
    keys.forEach(k => {
        if (getSoundCategoryPercent(k) === 100) completedCats++;
    });
    const pct = Math.round((completedCats / keys.length) * 100);
    fill.style.width = `${pct}%`;
}

function openSoundGame() {
    loadSoundProgress();
    showScreen('sound');
    renderSoundCategories();
}
function renderSoundCategories() {
    const grid = document.getElementById('sound-category-grid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.keys(SOUND_CATEGORIES).forEach(key => {
        const cat = SOUND_CATEGORIES[key];
        const card = document.createElement('div');
        card.className = 'level-card';
        card.innerHTML = `
            <div class="level-header">
                <div class="level-icon">🔊</div>
                <div class="difficulty-badge difficulty-leicht">Spiel</div>
            </div>
            <h3>${cat.label}</h3>
            <div class="word-image-wrap" style="height:160px;">
                <img src="./images/sounds/categories/${key}.png" alt="${cat.label}">
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${getSoundCategoryPercent(key)}%"></div></div>
            <button class="btn btn-primary">Öffnen</button>
        `;
        card.addEventListener('click', () => openSoundCategory(key));
        grid.appendChild(card);
    });
    const pf = document.getElementById('sound-progress-fill');
    if (pf) pf.style.width = '0%';
    updateSoundOverviewProgress();
    setFocusTargets([]);
}
function openSoundCategory(catKey) {
    soundCategory = catKey;
    const grid = document.getElementById('sound-category-grid');
    if (!grid) return;
    const cat = SOUND_CATEGORIES[catKey];
    grid.innerHTML = '';
    cat.items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'level-card';
        const done = soundProgress[catKey].done.includes(item.id);
        card.innerHTML = `
            <div class="level-header">
                <div class="level-icon">🎧</div>
                <div class="difficulty-badge ${done ? 'difficulty-leicht' : 'difficulty-mittel'}">${done ? 'fertig' : 'offen'}</div>
            </div>
            <h3>${item.id}</h3>
            <div class="action-buttons sound-action-buttons">
                <button class="btn btn-success sound-btn">🟢 Abspielen</button>
                <button class="btn btn-primary sound-btn">Auswählen</button>
            </div>
        `;
        const playBtn = card.querySelector('.btn.btn-success');
        const selBtn = card.querySelector('.btn.btn-primary');
        playBtn.addEventListener('click', (e) => { e.stopPropagation(); playSoundAudio(catKey, item.id); });
        selBtn.addEventListener('click', (e) => { e.stopPropagation(); openSoundDetail(item); });
        card.addEventListener('click', () => openSoundDetail(item));
        grid.appendChild(card);
    });
    const pf = document.getElementById('sound-progress-fill');
    if (pf) pf.style.width = `${getSoundCategoryPercent(catKey)}%`;
    setFocusTargets([]);
}
function openSoundDetail(item) {
    showScreen('sound_detail');
    soundDetailState = { startedAt: nowMs(), repetitions: 0, catKey: soundCategory, soundId: item.id };
    const title = document.getElementById('sound-detail-title');
    if (title) title.textContent = `${SOUND_CATEGORIES[soundCategory].label} – ${item.id}`;
    const play = document.getElementById('btn-sound-play');
    if (play) {
        play.onclick = () => playSoundAudio(soundCategory, item.id);
    }
    renderSoundDetail(item);
}
function renderSoundDetail(item) {
    const grid = document.getElementById('sound-detail-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const opts = shuffle(item.options);
    opts.forEach((opt, idx) => {
        const card = document.createElement('div');
        card.className = 'word-card';
        const imgPath = `./images/sounds/${soundCategory}/${opt}.png`;
        card.innerHTML = `
            <div class="word-image-wrap">
                <img src="${imgPath}" alt="${opt}">
            </div>
            <div class="word-label">${opt}</div>
        `;
        const imgEl = card.querySelector('img');
        imgEl.onerror = () => {
            imgEl.src = generatePlaceholderPng(idx, 'leicht');
            imgEl.style.display = 'block';
        };
        card.addEventListener('click', () => {
            const correct = opt === item.correct;
            const responseMs = Math.round(nowMs() - (soundDetailState.startedAt || nowMs()));
            const repetitions = soundDetailState.repetitions || 0;
            if (correct) {
                card.classList.add('correct');
                recordOutcomeForDimensions({ gameId: 'sound', dimensions: ['A', 'D'], correct: true, responseMs, repetitions });
                adaptDifficultyGeneric('sound', { correct: true, responseMs, repetitions });
                markSoundCompleted(soundCategory, item.id);
                setTimeout(() => {
                    showScreen('sound');
                    openSoundCategory(soundCategory);
                }, 320);
            } else {
                card.classList.remove('correct');
                card.classList.add('wrong');
                setTimeout(() => {
                    card.classList.remove('wrong');
                }, 600);
                soundDetailState.repetitions = repetitions + 1;
                recordOutcomeForDimensions({ gameId: 'sound', dimensions: ['A', 'D'], correct: false, responseMs, repetitions: repetitions + 1, errorCluster: `${item.id}:${opt}` });
                adaptDifficultyGeneric('sound', { correct: false, responseMs, repetitions: repetitions + 1 });
            }
        });
        grid.appendChild(card);
    });
    setFocusTargets([]);
}
function markSoundCompleted(catKey, soundId) {
    const arr = soundProgress[catKey].done;
    if (!arr.includes(soundId)) arr.push(soundId);
    saveSoundProgress();
}
function playSoundAudio(catKey, soundId) {
    try {
        const path = `./audio/sounds/${catKey}/${soundId}.mp3`;
        if (!audioEnabled) return;
        if (appSettings.observationMode) return;
        const audio = new Audio(path);
        audio.play();
    } catch {}
}

function speakWord(word) {
    speak(word, { rate: 0.7, pitch: 1.05 });
}

function pickKatjaVoice() {
    const voices = window.speechSynthesis.getVoices() || [];
    const preferredNames = [
        /google.*deutsch/i,
        /microsoft.*hedda/i,
        /katja/i,
        /anna/i,
        /vicki/i,
        /sara/i
    ];
    for (const re of preferredNames) {
        const found = voices.find(v => re.test(v.name));
        if (found) return found;
    }
    const deVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('de'));
    return deVoices[0] || voices[0] || null;
}

function highlightStoryWord(word, active) {
    const list = document.getElementById('story-word-list');
    const items = list.querySelectorAll('.word-card');
    items.forEach(el => el.classList.remove('selected'));
    if (!active) return;
    items.forEach(el => {
        if (el.dataset.word === word) el.classList.add('selected');
    });
}

// Wortschatz-Quiz mit 3 Unterleveln („Zeig mir X“)
let storyQuizActive = false;
let storyQuizRound = 0;
let currentQuizTarget = '';
function startStoryQuiz() {
    storyQuizActive = true;
    storyQuizRound = 0;
    runStoryQuizStep();
}
function runStoryQuizStep() {
    const all = LEVEL_WORDS[currentVocabLevel] || [];
    if (!all.length) return;
    if (storyQuizRound >= 5) {
        storyQuizActive = false;
        incrementDimensionRepetitions({ dimensions: GAME_METADATA.story.focusAreas, amount: 1 });
        renderStoryGame();
        const info = document.getElementById('story-info');
        if (info) info.textContent = 'Super! Kleine Quizrunde geschafft.';
        const srs = document.getElementById('story-recognition-status');
        if (srs) srs.textContent = 'Tippe auf „Spiel beginnen“ für eine neue Runde.';
        return;
    }
    const pool = shuffle(all).slice(0, 4);
    currentQuizTarget = pool[0];
    storyQuizState.promptStartedAt = nowMs();
    storyQuizState.repetitions = 0;
    document.getElementById('story-info').textContent = `Zeig mir: ${currentQuizTarget}?`;
    const srs = document.getElementById('story-recognition-status');
    if (srs) srs.textContent = 'Tippe das passende Bild.';
    const progressFill = document.getElementById('story-quiz-progress');
    if (progressFill) progressFill.style.width = `${Math.round((storyQuizRound/5)*100)}%`;
    const quizWrap = document.getElementById('story-quiz-progress-wrap');
    if (quizWrap) quizWrap.style.display = 'block';
    const quizMic = document.getElementById('btn-story-quiz-mic');
    if (quizMic) quizMic.style.display = 'inline-block';
    const quizBack = document.getElementById('btn-story-quiz-back');
    if (quizBack) quizBack.style.display = 'inline-block';
    const list = document.getElementById('story-word-list');
    const info = document.getElementById('story-info');
    setFocusTargets([]);
    renderQuizOptions(currentQuizTarget, pool);
    speakWord(`Zeig mir ${currentQuizTarget}`);
}
function renderQuizOptions(target, options) {
    const list = document.getElementById('story-word-list');
    list.innerHTML = '';
    const opts = shuffle(options);
    opts.forEach((word, idx) => {
        const lw = word.toLowerCase();
        const imgPath = `./images/story/${lw}.png`;
        const card = document.createElement('div');
        card.className = 'word-card';
        card.dataset.word = lw;
        card.innerHTML = `
            <div class="word-image-wrap">
                <img src="${imgPath}" alt="${word}">
            </div>
            <div class="word-label">${word}</div>
        `;
        const imgEl = card.querySelector('img');
        imgEl.onerror = () => {
            imgEl.src = generatePlaceholderPng(idx, 'leicht');
            imgEl.style.display = 'block';
        };
        card.addEventListener('click', () => {
            speakWord(word);
            const correct = word === target;
            const nextBtn = document.getElementById('btn-story-quiz-start');
            const responseMs = Math.round(nowMs() - (storyQuizState.promptStartedAt || nowMs()));
            const repetitions = storyQuizState.repetitions || 0;
            if (correct) {
                card.classList.add('correct');
                const wrap = card.querySelector('.word-image-wrap');
                const badge = document.createElement('div');
                badge.className = 'done-badge';
                badge.textContent = '✓';
                wrap.appendChild(badge);
                if (nextBtn) { nextBtn.disabled = false; nextBtn.textContent = 'nächste Frage'; }
                recordOutcomeForDimensions({ gameId: 'story', dimensions: ['C', 'A'], correct: true, responseMs, repetitions });
                adaptDifficultyGeneric('story', { correct: true, responseMs, repetitions });
            } else {
                card.classList.remove('correct');
                card.classList.add('wrong');
                setTimeout(() => { card.classList.remove('wrong'); }, 400);
                storyQuizState.repetitions = repetitions + 1;
                recordOutcomeForDimensions({ gameId: 'story', dimensions: ['C', 'A'], correct: false, responseMs, repetitions: repetitions + 1, errorCluster: `${target}:${word}` });
                adaptDifficultyGeneric('story', { correct: false, responseMs, repetitions: repetitions + 1 });
            }
        });
        list.appendChild(card);
    });
    const nextBtn = document.getElementById('btn-story-quiz-start');
    if (nextBtn) { nextBtn.disabled = true; nextBtn.textContent = 'nächste Frage'; }
}
function nextStoryQuizStep() {
    if (!storyQuizActive) {
        startStoryQuiz();
        return;
    }
    storyQuizRound++;
    runStoryQuizStep();
}
function prevStoryQuizStep() {
    if (!storyQuizActive) return;
    storyQuizRound = Math.max(0, storyQuizRound - 1);
    runStoryQuizStep();
}

const VIDEO_LEVELS = [
    { src: './video/video1.mp4', options: ['Hund','Apfel','Brot','Regenbogen','Kuh'], correct: ['Apfel','Brot','Regenbogen'] },
    { src: './video/video2.mp4', options: ['Drache','Katze','Wolke','Ritter','Prinzessin'], correct: ['Drache','Ritter','Prinzessin'] },
    { src: './video/video3.mp4', options: ['Elefant','Diamant','Sand','Wasser','Koffer'], correct: ['Elefant','Sand','Wasser'] }
];
let videoIndex = 0;
let videoSelected = new Set();
function openVideoGame() {
    videoIndex = 0;
    videoSelected.clear();
    showScreen('video');
    renderVideoStep();
}
function renderVideoStep() {
    const v = VIDEO_LEVELS[videoIndex];
    const player = document.getElementById('video-player');
    const info = document.getElementById('video-info');
    if (info) info.textContent = 'Klicke auf das Video, schaue es an und starte dann das Quiz';
    const q = document.getElementById('video-question');
    if (q) q.style.display = 'none';
    if (player) {
        player.src = v.src;
        player.load();
    }
    const grid = document.getElementById('video-card-grid');
    if (grid) grid.innerHTML = '';
    const next = document.getElementById('btn-video-next');
    if (next) next.disabled = true;
    const quizStart = document.getElementById('btn-video-quiz-start');
    if (quizStart) quizStart.disabled = false;
    const fill = document.getElementById('video-progress-fill');
    if (fill) {
        const pct = Math.round(((videoIndex + 1) / VIDEO_LEVELS.length) * 100);
        fill.style.width = `${pct}%`;
    }
    setFocusTargets([player, quizStart].filter(Boolean));
}
function startVideoQuiz() {
    const v = VIDEO_LEVELS[videoIndex];
    videoQuizState = { startedAt: nowMs(), toggles: 0, recorded: false };
    const info = document.getElementById('video-info');
    if (info) info.textContent = 'Wähle die richtigen Karten.';
    const q = document.getElementById('video-question');
    if (q) q.style.display = 'block';
    const grid = document.getElementById('video-card-grid');
    if (!grid) return;
    grid.innerHTML = '';
    videoSelected.clear();
    const quizStart = document.getElementById('btn-video-quiz-start');
    if (quizStart) quizStart.disabled = true;
    v.options.forEach((opt, idx) => {
        const lw = opt.toLowerCase();
        const imgPath = `./images/story/${lw}.png`;
        const card = document.createElement('div');
        card.className = 'word-card';
        card.dataset.opt = opt;
        card.dataset.word = lw;
        card.innerHTML = `
            <div class="word-image-wrap">
                <img src="${imgPath}" alt="${opt}">
            </div>
            <div class="word-label">${opt}</div>
        `;
        const img = card.querySelector('img');
        img.onerror = () => {
            img.src = generatePlaceholderPng(idx, 'mittel');
            img.style.display = 'block';
        };
        card.addEventListener('click', () => {
            videoQuizState.toggles = (videoQuizState.toggles || 0) + 1;
            const wasSelected = videoSelected.has(opt);
            if (wasSelected) {
                videoSelected.delete(opt);
                card.classList.remove('selected');
            } else {
                videoSelected.add(opt);
                card.classList.add('selected');
            }
            validateVideoSelection();
        });
        grid.appendChild(card);
    });
    validateVideoSelection();
    const next = document.getElementById('btn-video-next');
    setFocusTargets([grid, next].filter(Boolean));
}
function validateVideoSelection() {
    const v = VIDEO_LEVELS[videoIndex];
    const next = document.getElementById('btn-video-next');
    if (!next) return;
    const selectedSorted = Array.from(videoSelected).sort();
    const correctSorted = v.correct.slice().sort();
    const ok = selectedSorted.length === correctSorted.length && selectedSorted.every((x, i) => x === correctSorted[i]);
    next.disabled = !ok;
    const grid = document.getElementById('video-card-grid');
    if (grid) {
        Array.from(grid.querySelectorAll('.word-card')).forEach(card => {
            const isSelected = videoSelected.has(card.dataset.opt);
            card.classList.toggle('selected', isSelected && !ok);
            card.classList.toggle('correct', isSelected && ok);
        });
    }
    if (ok && !videoQuizState.recorded) {
        videoQuizState.recorded = true;
        const responseMs = Math.round(nowMs() - (videoQuizState.startedAt || nowMs()));
        const repetitions = Math.max(0, (videoQuizState.toggles || 0) - correctSorted.length);
        recordOutcomeForDimensions({ gameId: 'video', dimensions: ['D', 'A'], correct: true, responseMs, repetitions, errorCluster: `toggles:${videoQuizState.toggles || 0}` });
        adaptDifficultyGeneric('video', { correct: true, responseMs, repetitions });
    }
}
function nextVideoStep() {
    if (videoIndex < VIDEO_LEVELS.length - 1) {
        videoIndex++;
        videoSelected.clear();
        renderVideoStep();
    } else {
        showScreen('overview');
    }
}

function prevVideoStep() {
    if (videoIndex > 0) {
        videoIndex--;
        videoSelected.clear();
        renderVideoStep();
    }
}

// Fokus: Ein Lernschritt pro Interaktion. Audio führt, Visuals unterstützen.
// Spiele sind Werkzeuge für gemeinsame Entwicklungsdimensionen (A–G) und Stufen (1–4).
// Fehler sind Lernsignale: Wiederholung + Modellierung + langsameres Tempo, ohne negatives Markieren.

const BASE_WORD_POOL = Array.from(new Set(Object.values(LEVEL_WORDS).flat().map(w => String(w || '').toLowerCase()).filter(Boolean)));

function pickN(arr, n) {
    const a = arr.slice();
    const out = [];
    while (a.length && out.length < n) {
        const i = Math.floor(Math.random() * a.length);
        out.push(a.splice(i, 1)[0]);
    }
    return out;
}

function displayWordFromKey(wordKey) {
    const raw = String(wordKey || '').trim();
    if (!raw) return '';
    return raw
        .split(/[_-]/g)
        .filter(Boolean)
        .map(part => {
            const lower = part
                .toLowerCase()
                .replace(/ae/g, 'ä')
                .replace(/oe/g, 'ö')
                .replace(/ue/g, 'ü');
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(' ');
}

function renderWordCard({ word, label, imageKey, idx, difficulty, onClick, showLabel = true, showMicroLabel = false }) {
    const card = document.createElement('div');
    card.className = 'word-card';
    const key = typeof imageKey === 'string' && imageKey.trim() ? imageKey : word;
    const text = typeof label === 'string' && label.trim() ? label : word;
    const lw = String(key || '').toLowerCase();
    card.dataset.word = lw;
    const imgPath = `./images/story/${lw}.png`;
    const labelHtml = showLabel ? `<div class="word-label">${text}</div>` : '';
    const microLabelHtml = showMicroLabel ? `<div class="micro-label">${text}</div>` : '';
    card.innerHTML = `
        <div class="word-image-wrap">
            <img src="${imgPath}" alt="${text}">
            ${microLabelHtml}
        </div>
        ${labelHtml}
    `;
    const imgEl = card.querySelector('img');
    imgEl.onerror = () => {
        imgEl.src = generatePlaceholderPng(idx || 0, difficulty || 'leicht');
        imgEl.style.display = 'block';
    };
    if (typeof onClick === 'function') card.addEventListener('click', () => onClick(card, lw));
    return card;
}

// Sprachgedächtnis (G): Drei Wörter hören, dann fehlt eins → rezeptiv erinnern.
let langMemoryState = { words: [], missing: '', repetitions: 0, promptStartedAt: 0, locked: false, phase: 'listen' };
let langMemoryLastOpenAt = 0;
const LANG_MEMORY_LEVELS = [
    ['ball', 'fall', 'stall'],
    ['nase', 'hase', 'vase'],
    ['wind', 'rind', 'kind'],
    ['pfand', 'hand', 'sand'],
    ['traum', 'baum', 'zaun'],
    ['mund', 'hund', 'rund'],
    ['heiß', 'kreis', 'eis'],
    ['boot', 'rot', 'brot'],
    ['katze', 'tatze', 'matratze'],
    ['topf', 'kopf', 'zopf'],
    ['haus', 'maus', 'laus'],
    ['schlange', 'zange', 'wange'],
    ['laterne', 'sterne', 'ferne'],
    ['tomaten', 'piraten', 'karten'],
    ['hahn', 'bahn', 'krahn'],
    ['liste', 'piste', 'kiste'],
    ['rolle', 'knolle', 'wolle'],
    ['wiese', 'riese', 'briese'],
    ['fisch', 'wisch', 'tisch'],
    ['sonne', 'tonne', 'nonne'],
    ['kanne', 'pfanne', 'tanne'],
    ['nudel', 'pudel', 'strudel'],
    ['note', 'pfote', 'brote'],
    ['krone', 'melone', 'kanone'],
    ['apfel', 'zipfel', 'gipfel'],
    ['schrift', 'trifft', 'stift'],
    ['ritter', 'gewitter', 'gitter'],
    ['meer', 'leer', 'verkehr'],
    ['lampe', 'pampe', 'rampe'],
    ['flocke', 'socke', 'locke']
];
const LANG_MEMORY_POOL = Array.from(new Set(LANG_MEMORY_LEVELS.flat().map(w => String(w || '').toLowerCase()).filter(Boolean)));

async function openLangMemoryGame() {
    const t = nowMs();
    if (t - langMemoryLastOpenAt < 650) return;
    langMemoryLastOpenAt = t;
    showScreen('lang_memory');
    langMemoryState = { words: [], missing: '', repetitions: 0, promptStartedAt: 0, locked: false, phase: 'listen' };
    getOrInitGameDifficulty('lang_memory', { paceMs: 850, delayMs: 950, level: 1, stableStreak: 0 });
    await startLangMemoryRound(true);
    const replay = document.getElementById('btn-lang-memory-replay');
    if (replay) replay.onclick = async () => replayLangMemoryPrompt();
    const ready = document.getElementById('btn-lang-memory-ready');
    if (ready) ready.onclick = async () => beginLangMemoryQuestion();
}

async function replayLangMemoryPrompt() {
    if (!langMemoryState.words.length) return;
    const diff = getGameDifficulty('lang_memory') || {};
    const replay = document.getElementById('btn-lang-memory-replay');
    const ready = document.getElementById('btn-lang-memory-ready');
    const prevLocked = langMemoryState.locked;
    if (replay) replay.disabled = true;
    if (ready) ready.disabled = true;
    langMemoryState.locked = true;
    if (langMemoryState.phase === 'listen') {
        await speakAsync('Kannst du herausfinden, welches Wort gleich fehlen wird?', { rate: 0.7, pitch: 1.05 });
        await presentLangMemoryWords(langMemoryState.words, diff.paceMs, 'Drück den Daumen, wenn du bereit bist.', false);
        if (ready) ready.disabled = false;
    } else {
        await speakAsync('Welches Wort fehlt nun?', { rate: 0.7, pitch: 1.05 });
    }
    if (replay) replay.disabled = false;
    langMemoryState.locked = prevLocked;
}

function updateLangMemoryProgress(level, maxLevel) {
    const wrap = document.getElementById('lang-memory-progress-wrap');
    const fill = document.getElementById('lang-memory-progress-fill');
    if (!wrap || !fill) return;
    const pct = maxLevel ? clamp((level / maxLevel) * 100, 0, 100) : 0;
    fill.style.width = `${pct}%`;
    wrap.setAttribute('aria-label', `Fortschritt: Level ${level} von ${maxLevel}`);
}

function formatLangMemoryWords(words) {
    return (words || []).map(w => {
        const s = String(w || '');
        if (!s) return s;
        return s.charAt(0).toUpperCase() + s.slice(1);
    });
}

async function startLangMemoryRound(newSet) {
    const difficulty = getGameDifficulty('lang_memory') || {};
    const stage = getDimensionStage('G');
    const maxLevel = LANG_MEMORY_LEVELS.length || 1;
    const level = clamp(parseInt(difficulty.level || '1', 10) || 1, 1, maxLevel);
    const triple = LANG_MEMORY_LEVELS[level - 1] || ['haus', 'maus', 'laus'];
    const words = newSet || !langMemoryState.words.length ? shuffle(triple).slice(0, 3) : langMemoryState.words.slice();
    const missingIdx = Math.floor(Math.random() * words.length);
    const missing = words[missingIdx];
    langMemoryState.words = words;
    langMemoryState.missing = missing;
    langMemoryState.locked = true;
    langMemoryState.phase = 'listen';

    const info = document.getElementById('lang-memory-info');
    if (info) {
        const said = `${formatLangMemoryWords(words).join(', ')}, Drück den Daumen, wenn du bereit bist.`;
        info.textContent = stage >= 3
            ? `Hör gut zu. Danach fehlt ein Bild. (Level ${level}/${maxLevel}) Drück auf 🔊 um zu hören: "${said}"`
            : `Hör gut zu. (Level ${level}/${maxLevel}) Drück auf 🔊 um zu hören: "${said}"`;
    }
    updateLangMemoryProgress(level, maxLevel);
    const stageBox = document.getElementById('lang-memory-stage');
    if (stageBox) stageBox.innerHTML = `<p>👂</p>`;

    const present = document.getElementById('lang-memory-present');
    const options = document.getElementById('lang-memory-options');
    if (present) present.innerHTML = '';
    if (options) options.innerHTML = '';

    if (present) {
        words.forEach((w, idx) => {
            const c = renderWordCard({ word: w, idx, difficulty: 'leicht', showLabel: false });
            present.appendChild(c);
        });
    }

    const ready = document.getElementById('btn-lang-memory-ready');
    const replay = document.getElementById('btn-lang-memory-replay');
    if (ready) ready.disabled = false;
    if (replay) replay.disabled = false;
    langMemoryState.locked = false;
}

async function presentLangMemoryWords(words, paceMs, afterText, cancelFirst = true) {
    const stageBox = document.getElementById('lang-memory-stage');
    if (stageBox) stageBox.innerHTML = `<p>👂</p>`;
    for (let i = 0; i < words.length; i++) {
        setFocusTargets([]);
        await speakAsync(words[i], { rate: 0.7, pitch: 1.05, cancelBefore: cancelFirst ? i === 0 : false });
        await sleep(clamp(paceMs ?? 850, 550, 1400));
    }
    if (afterText) await speakAsync(afterText, { rate: 0.7, pitch: 1.05, cancelBefore: false });
}

async function beginLangMemoryQuestion() {
    if (langMemoryState.phase !== 'listen') return;
    if (langMemoryState.locked) return;

    const stageBox = document.getElementById('lang-memory-stage');
    const present = document.getElementById('lang-memory-present');
    const options = document.getElementById('lang-memory-options');
    if (!stageBox || !present || !options) return;

    langMemoryState.locked = true;
    langMemoryState.phase = 'question';

    const ready = document.getElementById('btn-lang-memory-ready');
    if (ready) ready.disabled = true;

    const words = langMemoryState.words.slice();
    const missing = langMemoryState.missing;

    const difficulty = getGameDifficulty('lang_memory') || {};
    const stage = getDimensionStage('G');
    const maxLevel = LANG_MEMORY_LEVELS.length || 1;
    const level = clamp(parseInt(difficulty.level || '1', 10) || 1, 1, maxLevel);
    const info = document.getElementById('lang-memory-info');
    if (info) {
        const said = `Welches Wort fehlt?`;
        info.textContent = stage >= 3
            ? `Kannst du herausfinden welches Wort fehlt? (Level ${level}/${maxLevel}) Drück auf 🔊 um zu hören: "${said}"`
            : `Kannst du herausfinden welches Wort fehlt? (Level ${level}/${maxLevel}) Drück auf 🔊 um zu hören: "${said}"`;
    }

    stageBox.innerHTML = `<p style="font-weight:800;">❓ Welches Wort fehlt nun?</p>`;
    options.innerHTML = '';

    const cards = Array.from(present.querySelectorAll('.word-card'));
    const missingIdx = words.indexOf(missing);
    if (cards[missingIdx]) {
        const wrap = cards[missingIdx].querySelector('.word-image-wrap');
        if (wrap) wrap.innerHTML = '<div class="placeholder">?</div>';
    }

    const distractorsPool = LANG_MEMORY_POOL.filter(w => !words.includes(w));
    const distractors = pickN(distractorsPool.length ? distractorsPool : LANG_MEMORY_POOL, 2).filter(Boolean);
    const opts = shuffle([missing, ...distractors]).slice(0, 3);

    langMemoryState.locked = false;
    langMemoryState.promptStartedAt = nowMs();

    setFocusTargets([]);

    opts.forEach((w, idx) => {
        const card = renderWordCard({
            word: w,
            idx,
            difficulty: 'leicht',
            showLabel: false,
            onClick: async (el) => {
                if (langMemoryState.locked) return;
                langMemoryState.locked = true;
                setFocusTargets([]);
                await handleLangMemorySelection(w);
            }
        });
        options.appendChild(card);
    });
}

async function handleLangMemorySelection(choice) {
    const p = getFeedbackPhrases();
    const correct = choice === langMemoryState.missing;
    const responseMs = Math.round(nowMs() - (langMemoryState.promptStartedAt || nowMs()));
    const repetitions = langMemoryState.repetitions || 0;

    if (correct) {
        await speakAsync(p.confirm, { rate: 0.7, pitch: 1.05 });
        recordOutcomeForDimensions({ gameId: 'lang_memory', dimensions: ['G', 'C', 'A'], correct: true, responseMs, repetitions });
        const cur = adaptDifficultyGeneric('lang_memory', { correct: true, responseMs, repetitions });
        const nextDelay = clamp((getGameDifficulty('lang_memory')?.delayMs ?? 950) - (cur.stableStreak >= 3 ? 120 : 60), 450, 1500);
        const curLevel = clamp(parseInt(getGameDifficulty('lang_memory')?.level || '1', 10) || 1, 1, LANG_MEMORY_LEVELS.length || 1);
        const nextLevel = clamp(curLevel + (cur.stableStreak >= 2 ? 1 : 0), 1, LANG_MEMORY_LEVELS.length || 1);
        setGameDifficulty('lang_memory', { delayMs: nextDelay, level: nextLevel });
        langMemoryState.repetitions = 0;
        await sleep(350);
        await startLangMemoryRound(true);
        return;
    }

    await speakAsync(p.model, { rate: 0.7, pitch: 1.05 });
    await speakAsync(langMemoryState.missing, { rate: 0.62, pitch: 1.02 });
    recordOutcomeForDimensions({ gameId: 'lang_memory', dimensions: ['G', 'C', 'A'], correct: false, responseMs, repetitions: repetitions + 1, errorCluster: `${langMemoryState.missing}:${choice}` });
    adaptDifficultyGeneric('lang_memory', { correct: false, responseMs, repetitions: repetitions + 1 });
    const nextDelay = clamp((getGameDifficulty('lang_memory')?.delayMs ?? 950) + 140, 450, 1500);
    setGameDifficulty('lang_memory', { delayMs: nextDelay });
    langMemoryState.repetitions = repetitions + 1;
    await sleep(450);
    await startLangMemoryRound(false);
}

// Satz ergänzen (E): rezeptives Entscheiden – Grammatik-Intuition über Plausibilität + Struktur.
const SENTENCE_MAX_LEVEL = 30;
const SENTENCE_ITEMS = [
    { level: 1, fragment: 'Ich esse gern', endings: ['einen Apfel.', 'ein Auto.', 'eine Wolke.'], correct: 0 },
    { level: 2, fragment: 'Am Morgen putze ich', endings: ['meine Zähne.', 'meinen Regen.', 'meinen Stuhl.'], correct: 0 },
    { level: 3, fragment: 'Zum Kindergarten gehe ich', endings: ['zu Fuß.', 'in die Wolke.', 'unter den Tisch.'], correct: 0 },
    { level: 4, fragment: 'Beim Spielen werfe ich', endings: ['den Ball.', 'die Lampe.', 'den Himmel.'], correct: 0 },
    { level: 5, fragment: 'Wenn ich durstig bin, trinke ich', endings: ['Wasser.', 'einen Stein.', 'eine Jacke.'], correct: 0 },
    { level: 6, fragment: 'Abends lese ich', endings: ['ein Buch.', 'einen Fisch.', 'einen Schuh.'], correct: 0 },
    { level: 7, fragment: 'Im Sommer trage ich', endings: ['eine kurze Hose.', 'einen Schneemann.', 'eine Gabel.'], correct: 0 },
    { level: 8, fragment: 'Wenn mir kalt ist, ziehe ich', endings: ['eine Jacke an.', 'eine Banane an.', 'eine Wolke an.'], correct: 0 },
    { level: 9, fragment: 'Auf dem Spielplatz rutsche ich', endings: ['die Rutsche hinunter.', 'den Teller hinunter.', 'das Fenster hinunter.'], correct: 0 },
    { level: 10, fragment: 'Bevor wir essen, waschen wir', endings: ['die Hände.', 'die Wolken.', 'die Schuhe im Bett.'], correct: 0 },
    { level: 11, fragment: 'Wenn es regnet, nehme ich', endings: ['einen Schirm mit.', 'eine Schere mit.', 'einen Keks mit.'], correct: 0 },
    { level: 12, fragment: 'Nach dem Baden trockne ich', endings: ['mich ab.', 'den Himmel ab.', 'den Tisch ab.'], correct: 0 },
    { level: 13, fragment: 'Wenn ich müde bin, gehe ich', endings: ['ins Bett.', 'ins Auto.', 'in den Schrank.'], correct: 0 },
    { level: 14, fragment: 'Zum Geburtstag bekomme ich', endings: ['ein Geschenk.', 'einen Regen.', 'eine Straße.'], correct: 0 },
    { level: 15, fragment: 'In der Kita singe ich', endings: ['ein Lied.', 'einen Löffel.', 'eine Treppe.'], correct: 0 },
    { level: 16, fragment: 'Im Herbst sammle ich', endings: ['bunte Blätter.', 'laute Wolken.', 'kalte Tische.'], correct: 0 },
    { level: 17, fragment: 'Auf dem Fahrrad trage ich', endings: ['einen Helm.', 'einen Kuchen.', 'eine Decke.'], correct: 0 },
    { level: 18, fragment: 'Wenn ich mich freue, lache ich', endings: ['laut.', 'unter dem Bett.', 'in die Tasche.'], correct: 0 },
    { level: 19, fragment: 'Beim Zähneputzen benutze ich', endings: ['Zahnpasta.', 'Sand.', 'Ketchup.'], correct: 0 },
    { level: 20, fragment: 'Beim Basteln klebe ich', endings: ['Papier zusammen.', 'Wasser zusammen.', 'Luft zusammen.'], correct: 0 },
    { level: 21, fragment: 'Wenn ich mich weh tue, klebe ich', endings: ['ein Pflaster drauf.', 'einen Ball drauf.', 'eine Wolke drauf.'], correct: 0 },
    { level: 22, fragment: 'Im Schnee baue ich', endings: ['einen Schneemann.', 'einen Regenschirm.', 'eine Sonne.'], correct: 0 },
    { level: 23, fragment: 'Wenn es dunkel ist, mache ich', endings: ['das Licht an.', 'den Mond an.', 'die Suppe an.'], correct: 0 },
    { level: 24, fragment: 'Beim Frühstück esse ich', endings: ['ein Brot.', 'eine Schraube.', 'einen Stein.'], correct: 0 },
    { level: 25, fragment: 'Wenn ich mein Spielzeug aufräume, lege ich es', endings: ['in die Kiste.', 'in die Wolke.', 'in den Regen.'], correct: 0 },
    { level: 26, fragment: 'Wenn ich jemanden sehe, sage ich', endings: ['Hallo.', 'Wasser.', 'Schrank.'], correct: 0 },
    { level: 27, fragment: 'Im Zoo sehe ich', endings: ['einen Elefanten.', 'einen Löffel.', 'eine Couch.'], correct: 0 },
    { level: 28, fragment: 'Wenn ich Angst habe, brauche ich', endings: ['eine Umarmung.', 'eine Schere.', 'ein Feuer.'], correct: 0 },
    { level: 29, fragment: 'Beim Vorlesen höre ich', endings: ['gut zu.', 'aus dem Fenster.', 'in die Schuhe.'], correct: 0 },
    { level: 30, fragment: 'Wenn ich fertig bin, drücke ich', endings: ['auf Weiter.', 'auf den Regen.', 'auf die Wolke.'], correct: 0 }
];
let sentenceState = { item: null, repetitions: 0, promptStartedAt: 0, locked: false, selectedIndex: null };

function updateSentenceProgress(level, maxLevel) {
    const fill = document.getElementById('sentence-progress-fill');
    const wrap = document.getElementById('sentence-progress-wrap');
    if (!fill || !wrap) return;
    const pct = maxLevel ? clamp((level / maxLevel) * 100, 0, 100) : 0;
    fill.style.width = `${pct}%`;
    wrap.setAttribute('aria-label', `Fortschritt: Unterlevel ${level} von ${maxLevel}`);
}

async function openSentenceGame() {
    showScreen('sentence');
    sentenceState = { item: null, repetitions: 0, promptStartedAt: 0, locked: false, selectedIndex: null };
    getOrInitGameDifficulty('sentence', { paceMs: 850, level: 1, stableStreak: 0 });
    const replay = document.getElementById('btn-sentence-replay');
    if (replay) replay.onclick = async () => replaySentencePrompt();
    const thumbs = document.getElementById('btn-sentence-thumbs-up');
    if (thumbs) thumbs.onclick = async () => { if (!sentenceState.locked) await confirmSentenceSelection(); };
    const next = document.getElementById('btn-sentence-next');
    if (next) next.onclick = async () => {
        sentenceState.locked = true;
        await startSentenceRound(true);
    };
    const diff = getGameDifficulty('sentence') || {};
    updateSentenceProgress(clamp(diff.level || 1, 1, SENTENCE_MAX_LEVEL), SENTENCE_MAX_LEVEL);
    await startSentenceRound(true);
}

async function replaySentencePrompt() {
    if (!sentenceState.item) return;
    const replay = document.getElementById('btn-sentence-replay');
    sentenceState.locked = true;
    if (replay) replay.disabled = true;
    await speakAsync(sentenceState.item.fragment, { rate: 0.7, pitch: 1.05 });
    await speakAsync('Was passt am besten?', { rate: 0.7, pitch: 1.05 });
    sentenceState.promptStartedAt = nowMs();
    if (replay) replay.disabled = false;
    sentenceState.locked = false;
}

async function startSentenceRound(newItem) {
    const diff = getGameDifficulty('sentence') || {};
    const level = clamp(diff.level || 1, 1, SENTENCE_MAX_LEVEL);
    const candidates = SENTENCE_ITEMS.filter(x => x.level <= level);
    const pool = candidates.length ? candidates : SENTENCE_ITEMS;
    const item = newItem || !sentenceState.item ? pool[Math.floor(Math.random() * pool.length)] : sentenceState.item;
    sentenceState.item = item;
    sentenceState.selectedIndex = null;
    sentenceState.locked = true;
    sentenceState.promptStartedAt = 0;

    const info = document.getElementById('sentence-info');
    if (info) info.textContent = `Unterlevel ${level}/${SENTENCE_MAX_LEVEL}. Drück auf 🔊 um zu hören.`;
    updateSentenceProgress(level, SENTENCE_MAX_LEVEL);
    const stageBox = document.getElementById('sentence-stage');
    if (stageBox) stageBox.innerHTML = `<p>👂</p>`;
    const opts = document.getElementById('sentence-options');
    if (!opts) return;
    opts.innerHTML = '';
    const thumbs = document.getElementById('btn-sentence-thumbs-up');
    if (thumbs) thumbs.disabled = true;
    const next = document.getElementById('btn-sentence-next');
    if (next) next.style.display = 'none';

    const endings = item.endings.map((t, i) => ({ text: t, i }));
    const shuffled = shuffle(endings);

    shuffled.forEach((opt, idx) => {
        const card = document.createElement('div');
        card.className = 'word-card';
        card.dataset.choiceIndex = String(opt.i);
        const wrap = document.createElement('div');
        wrap.className = 'word-image-wrap';
        const ph = document.createElement('div');
        ph.className = 'placeholder';
        ph.style.padding = '14px';
        ph.style.textAlign = 'center';
        ph.style.fontSize = '1.2rem';
        ph.style.lineHeight = '1.25';
        ph.textContent = opt.text;
        wrap.appendChild(ph);
        card.appendChild(wrap);
        card.addEventListener('click', async () => {
            if (sentenceState.locked) return;
            sentenceState.locked = true;
            await selectSentenceOption(card, opt.i);
        });
        opts.appendChild(card);
    });
    sentenceState.locked = false;
}

async function selectSentenceOption(cardEl, selectedIndex) {
    const item = sentenceState.item;
    if (!item) return;
    const opts = document.getElementById('sentence-options');
    if (opts) {
        Array.from(opts.querySelectorAll('.word-card')).forEach(el => {
            el.classList.remove('selected', 'wrong', 'correct');
        });
    }
    if (cardEl) cardEl.classList.add('selected');
    sentenceState.selectedIndex = selectedIndex;
    const thumbs = document.getElementById('btn-sentence-thumbs-up');
    if (thumbs) thumbs.disabled = false;
    await speakAsync(`${item.fragment} ${item.endings[selectedIndex]}`, { rate: 0.7, pitch: 1.05 });
    sentenceState.locked = false;
}

async function confirmSentenceSelection() {
    const p = getFeedbackPhrases();
    const item = sentenceState.item;
    if (!item) return;
    const selectedIndex = sentenceState.selectedIndex;
    if (typeof selectedIndex !== 'number') return;
    sentenceState.locked = true;
    const correct = selectedIndex === item.correct;
    const responseMs = Math.round(nowMs() - (sentenceState.promptStartedAt || nowMs()));
    const repetitions = sentenceState.repetitions || 0;
    const opts = document.getElementById('sentence-options');
    const selectedCard = opts
        ? Array.from(opts.querySelectorAll('.word-card')).find(el => parseInt(el.dataset.choiceIndex || '-1', 10) === selectedIndex)
        : null;
    if (selectedCard) selectedCard.classList.remove('selected');
    const thumbs = document.getElementById('btn-sentence-thumbs-up');
    if (thumbs) thumbs.disabled = true;

    if (correct) {
        if (selectedCard) selectedCard.classList.add('correct');
        await speakAsync(p.confirm, { rate: 0.7, pitch: 1.05 });
        await speakAsync(`${item.fragment} ${item.endings[item.correct]}`, { rate: 0.7, pitch: 1.05 });
        recordOutcomeForDimensions({ gameId: 'sentence', dimensions: ['E', 'A', 'D'], correct: true, responseMs, repetitions });
        const cur = adaptDifficultyGeneric('sentence', { correct: true, responseMs, repetitions });
        const nextLevel = clamp((getGameDifficulty('sentence')?.level ?? 1) + (cur.stableStreak >= 4 ? 1 : 0), 1, SENTENCE_MAX_LEVEL);
        setGameDifficulty('sentence', { level: nextLevel });
        sentenceState.repetitions = 0;
        const next = document.getElementById('btn-sentence-next');
        if (next) next.style.display = 'inline-block';
        return;
    }

    await speakAsync(p.model, { rate: 0.7, pitch: 1.05 });
    await speakAsync(`${item.fragment} ${item.endings[item.correct]}`, { rate: 0.62, pitch: 1.02 });
    recordOutcomeForDimensions({ gameId: 'sentence', dimensions: ['E', 'A', 'D'], correct: false, responseMs, repetitions: repetitions + 1, errorCluster: `${item.fragment}:${selectedIndex}` });
    adaptDifficultyGeneric('sentence', { correct: false, responseMs, repetitions: repetitions + 1 });
    const nextLevel = clamp((getGameDifficulty('sentence')?.level ?? 1) - 1, 1, SENTENCE_MAX_LEVEL);
    setGameDifficulty('sentence', { level: nextLevel });
    sentenceState.repetitions = repetitions + 1;
    sentenceState.selectedIndex = null;
    if (thumbs) thumbs.disabled = true;
    sentenceState.locked = false;
}

// Was passt dazu? (D): Alltagslogik + Bedeutungsbeziehungen, ohne Kategorien.
const SEMANTIC_MAX_LEVEL = 30;
const SEMANTIC_ITEMS = [
    { level: 1, center: 'zahnbuerste', options: ['zaehne', 'ball', 'auto'], correct: 'zaehne', expansion: 'Mit der Zahnbürste putzt man die Zähne.' },
    { level: 1, center: 'schuh', options: ['fuss', 'buch', 'uhr'], correct: 'fuss', expansion: 'Ein Schuh gehört an den Fuß.' },
    { level: 2, center: 'tisch', options: ['stuhl', 'wolke', 'pferd'], correct: 'stuhl', expansion: 'Am Tisch sitzt man oft auf einem Stuhl.' },
    { level: 3, center: 'fenster', options: ['licht', 'fisch', 'hose'], correct: 'licht', expansion: 'Durch ein Fenster kommt Licht ins Zimmer.' }
];
let semanticState = { item: null, repetitions: 0, promptStartedAt: 0, locked: false, expansion: '' };

function updateSemanticProgress(level, maxLevel) {
    const fill = document.getElementById('semantic-progress-fill');
    const wrap = document.getElementById('semantic-progress-wrap');
    if (!fill || !wrap) return;
    const pct = maxLevel ? clamp((level / maxLevel) * 100, 0, 100) : 0;
    fill.style.width = `${pct}%`;
    wrap.setAttribute('aria-label', `Fortschritt: Unterlevel ${level} von ${maxLevel}`);
}

async function openSemanticGame() {
    showScreen('semantic');
    semanticState = { item: null, repetitions: 0, promptStartedAt: 0, locked: false, expansion: '' };
    getOrInitGameDifficulty('semantic', { paceMs: 850, level: 1, stableStreak: 0 });
    const replay = document.getElementById('btn-semantic-replay');
    if (replay) replay.onclick = async () => replaySemanticPrompt();
    const expand = document.getElementById('btn-semantic-expand');
    if (expand) expand.onclick = async () => { if (semanticState.expansion) await speakAsync(semanticState.expansion, { rate: 0.7, pitch: 1.05 }); };
    const diff = getGameDifficulty('semantic') || {};
    updateSemanticProgress(clamp(diff.level || 1, 1, SEMANTIC_MAX_LEVEL), SEMANTIC_MAX_LEVEL);
    await startSemanticRound(true);
}

async function replaySemanticPrompt() {
    const item = semanticState.item;
    if (!item) return;
    const replay = document.getElementById('btn-semantic-replay');
    semanticState.locked = true;
    if (replay) replay.disabled = true;
    await speakAsync(displayWordFromKey(item.center), { rate: 0.7, pitch: 1.05 });
    await speakAsync('Was passt dazu?', { rate: 0.7, pitch: 1.05 });
    semanticState.promptStartedAt = nowMs();
    if (replay) replay.disabled = false;
    semanticState.locked = false;
}

async function startSemanticRound(newItem) {
    const diff = getGameDifficulty('semantic') || {};
    const level = clamp(diff.level || 1, 1, SEMANTIC_MAX_LEVEL);
    const candidates = SEMANTIC_ITEMS.filter(x => x.level <= level);
    const pool = candidates.length ? candidates : SEMANTIC_ITEMS;
    const item = newItem || !semanticState.item ? pool[Math.floor(Math.random() * pool.length)] : semanticState.item;
    semanticState.item = item;
    semanticState.expansion = item.expansion || '';
    semanticState.locked = true;
    semanticState.promptStartedAt = 0;

    const info = document.getElementById('semantic-info');
    if (info) info.textContent = `Unterlevel ${level}/${SEMANTIC_MAX_LEVEL}. Drück auf 🔊 um zu hören.`;
    updateSemanticProgress(level, SEMANTIC_MAX_LEVEL);
    const stageBox = document.getElementById('semantic-stage');
    if (stageBox) stageBox.innerHTML = `<p>👂</p>`;
    const center = document.getElementById('semantic-center');
    const opts = document.getElementById('semantic-options');
    if (!center || !opts) return;
    center.innerHTML = '';
    opts.innerHTML = '';

    const showHints = !!appSettings.observationMode;
    const centerCard = renderWordCard({ word: item.center, label: displayWordFromKey(item.center), idx: 0, difficulty: 'leicht', showLabel: false, showMicroLabel: showHints });
    center.appendChild(centerCard);
    const choices = shuffle(item.options.slice()).slice(0, 3);
    choices.forEach((w, idx) => {
        const card = renderWordCard({
            word: w,
            label: displayWordFromKey(w),
            idx,
            difficulty: 'leicht',
            showLabel: false,
            showMicroLabel: showHints,
            onClick: async (el) => {
                if (semanticState.locked) return;
                semanticState.locked = true;
                await handleSemanticSelection(w);
            }
        });
        opts.appendChild(card);
    });

    const expandBtn = document.getElementById('btn-semantic-expand');
    if (expandBtn) expandBtn.style.display = 'none';
    semanticState.locked = false;
}

async function handleSemanticSelection(choice) {
    const p = getFeedbackPhrases();
    const item = semanticState.item;
    if (!item) return;
    const correct = choice === item.correct;
    const responseMs = Math.round(nowMs() - (semanticState.promptStartedAt || nowMs()));
    const repetitions = semanticState.repetitions || 0;

    if (correct) {
        await speakAsync(p.confirm, { rate: 0.7, pitch: 1.05 });
        recordOutcomeForDimensions({ gameId: 'semantic', dimensions: ['D', 'C', 'A'], correct: true, responseMs, repetitions });
        const cur = adaptDifficultyGeneric('semantic', { correct: true, responseMs, repetitions });
        const nextLevel = clamp((getGameDifficulty('semantic')?.level ?? 1) + (cur.stableStreak >= 4 ? 1 : 0), 1, SEMANTIC_MAX_LEVEL);
        setGameDifficulty('semantic', { level: nextLevel });

        const canTransfer = getDimensionStage('D') >= 3;
        const expandBtn = document.getElementById('btn-semantic-expand');
        if (expandBtn) expandBtn.style.display = canTransfer && semanticState.expansion ? 'inline-block' : 'none';
        if (canTransfer && semanticState.expansion) {
            await speakAsync('Möchtest du mehr hören?', { rate: 0.7, pitch: 1.05 });
        }

        semanticState.repetitions = 0;
        await sleep(450);
        await startSemanticRound(true);
        return;
    }

    await speakAsync(p.model, { rate: 0.7, pitch: 1.05 });
    await speakAsync(`${displayWordFromKey(item.center)} passt zu ${displayWordFromKey(item.correct)}.`, { rate: 0.62, pitch: 1.02 });
    recordOutcomeForDimensions({ gameId: 'semantic', dimensions: ['D', 'C', 'A'], correct: false, responseMs, repetitions: repetitions + 1, errorCluster: `${item.center}:${choice}` });
    adaptDifficultyGeneric('semantic', { correct: false, responseMs, repetitions: repetitions + 1 });
    const nextLevel = clamp((getGameDifficulty('semantic')?.level ?? 1) - 1, 1, SEMANTIC_MAX_LEVEL);
    setGameDifficulty('semantic', { level: nextLevel });
    semanticState.repetitions = repetitions + 1;
    await sleep(450);
    await startSemanticRound(false);
}

// Hör genau hin! (A/B): Gleich/anders über Laut-/Wortvergleich, ohne Schrift.
const LISTEN_MAX_LEVEL = 30;
const LISTEN_LEVELS = {
    1: { pool: ['maus', 'auto', 'haus', 'kuh', 'hund', 'meer'], minimal: false },
    2: { pool: ['tasse', 'kasse', 'hand', 'sand', 'tisch', 'fisch'], minimal: true },
    3: { pool: ['note', 'rote', 'leiter', 'weiter', 'licht', 'pflicht'], minimal: true }
};
let listenState = { a: '', b: '', same: false, repetitions: 0, promptStartedAt: 0, locked: false };

function updateListenProgress(level, maxLevel) {
    const fill = document.getElementById('listen-progress-fill');
    const wrap = document.getElementById('listen-progress-wrap');
    if (!fill || !wrap) return;
    const pct = maxLevel ? clamp((level / maxLevel) * 100, 0, 100) : 0;
    fill.style.width = `${pct}%`;
    wrap.setAttribute('aria-label', `Fortschritt: Unterlevel ${level} von ${maxLevel}`);
}

function getListenTier(level) {
    const l = clamp(parseInt(level || '1', 10) || 1, 1, LISTEN_MAX_LEVEL);
    if (l <= 10) return 1;
    if (l <= 20) return 2;
    return 3;
}

function createListenRevealCard(word, idx, difficulty) {
    const card = document.createElement('div');
    card.className = 'word-card memory-card listen-reveal-card';
    const lw = String(word || '').toLowerCase();
    card.dataset.word = lw;

    const inner = document.createElement('div');
    inner.className = 'memory-card-inner';

    const front = document.createElement('div');
    front.className = 'memory-card-front';
    const frontWrap = document.createElement('div');
    frontWrap.className = 'word-image-wrap';
    const frontPh = document.createElement('div');
    frontPh.className = 'placeholder';
    frontPh.textContent = '?';
    frontWrap.appendChild(frontPh);
    front.appendChild(frontWrap);

    const back = document.createElement('div');
    back.className = 'memory-card-back';
    const backWrap = document.createElement('div');
    backWrap.className = 'word-image-wrap';
    const img = new Image();
    img.alt = word;
    img.src = `./images/story/${lw}.png`;
    img.onerror = () => {
        img.src = generatePlaceholderPng(idx || 0, difficulty || 'leicht');
        img.style.display = 'block';
    };
    backWrap.appendChild(img);
    back.appendChild(backWrap);

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);
    return card;
}

function renderListenRevealStage(a, b, tier) {
    const stageBox = document.getElementById('listen-stage');
    if (!stageBox) return null;
    stageBox.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'listen-reveal-grid';
    const difficulty = tier === 1 ? 'leicht' : tier === 2 ? 'mittel' : 'schwer';
    const cardA = createListenRevealCard(a, 0, difficulty);
    const cardB = createListenRevealCard(b, 1, difficulty);
    grid.appendChild(cardA);
    grid.appendChild(cardB);
    stageBox.appendChild(grid);
    return { cardA, cardB };
}

async function openListenGame() {
    showScreen('listen');
    listenState = { a: '', b: '', same: false, repetitions: 0, promptStartedAt: 0, locked: false };
    getOrInitGameDifficulty('listen', { paceMs: 850, gapMs: 520, level: 1, stableStreak: 0 });
    const replay = document.getElementById('btn-listen-replay');
    if (replay) replay.onclick = async () => replayListenPrompt();
    const sameBtn = document.getElementById('btn-listen-same');
    const diffBtn = document.getElementById('btn-listen-diff');
    if (sameBtn) sameBtn.onclick = async () => { if (!listenState.locked) await handleListenChoice(true); };
    if (diffBtn) diffBtn.onclick = async () => { if (!listenState.locked) await handleListenChoice(false); };
    const diff = getGameDifficulty('listen') || {};
    updateListenProgress(clamp(diff.level || 1, 1, LISTEN_MAX_LEVEL), LISTEN_MAX_LEVEL);
    await nextListenTrial(true);
}

async function replayListenPrompt() {
    if (!listenState.a) return;
    const replay = document.getElementById('btn-listen-replay');
    if (replay?.disabled) return;
    listenState.locked = true;
    if (replay) replay.disabled = true;
    const diff = getGameDifficulty('listen') || {};
    const sublevel = clamp(diff.level || 1, 1, LISTEN_MAX_LEVEL);
    const tier = getListenTier(sublevel);
    const ui = renderListenRevealStage(listenState.a, listenState.b, tier);
    await speakAsync(listenState.a, { rate: 0.7, pitch: 1.05 });
    if (ui?.cardA) ui.cardA.classList.add('active');
    await sleep(clamp(diff.gapMs ?? 520, 320, 1100));
    await speakAsync(listenState.b, { rate: 0.7, pitch: 1.05, cancelBefore: false });
    if (ui?.cardB) ui.cardB.classList.add('active');
    await sleep(clamp(diff.paceMs ?? 850, 550, 1400));
    listenState.promptStartedAt = nowMs();
    if (replay) replay.disabled = false;
    listenState.locked = false;
}

async function nextListenTrial(newPair) {
    const diff = getGameDifficulty('listen') || {};
    const stageBox = document.getElementById('listen-stage');
    const info = document.getElementById('listen-info');
    if (info) info.textContent = '';
    if (stageBox) stageBox.innerHTML = `<p style="font-size:2rem;">👂</p>`;
    const sublevel = clamp(diff.level || 1, 1, LISTEN_MAX_LEVEL);
    updateListenProgress(sublevel, LISTEN_MAX_LEVEL);
    const tier = getListenTier(sublevel);
    const cfg = LISTEN_LEVELS[tier] || LISTEN_LEVELS[1];
    const pool = cfg.pool;
    const same = newPair || !listenState.a ? Math.random() < 0.5 : listenState.same;
    let a = '';
    let b = '';
    if (!newPair && listenState.a) {
        a = listenState.a;
        b = listenState.b;
    } else if (same) {
        a = pool[Math.floor(Math.random() * pool.length)];
        b = a;
    } else if (cfg.minimal) {
        const pairs = [];
        for (let i = 0; i < pool.length - 1; i += 2) pairs.push([pool[i], pool[i + 1]]);
        const p = pairs[Math.floor(Math.random() * pairs.length)];
        a = p[0]; b = p[1];
    } else {
        const picked = pickN(pool, 2);
        a = picked[0] || pool[0];
        b = picked[1] || pool[1] || pool[0];
    }

    listenState.a = a;
    listenState.b = b;
    listenState.same = same;
    listenState.locked = true;
    listenState.promptStartedAt = 0;
    if (newPair) listenState.repetitions = 0;
    if (info) info.textContent = `Unterlevel ${sublevel}/${LISTEN_MAX_LEVEL}. Drück auf „Frage wiederholen“. Sind die Wörter gleich oder anders?`;
}

async function playListenPair(a, b, gapMs, paceMs) {
    await speakAsync(a, { rate: 0.7, pitch: 1.05 });
    await sleep(clamp(gapMs ?? 520, 320, 1100));
    await speakAsync(b, { rate: 0.7, pitch: 1.05, cancelBefore: false });
    await sleep(clamp(paceMs ?? 850, 550, 1400));
}

async function handleListenChoice(chosenSame) {
    listenState.locked = true;
    const p = getFeedbackPhrases();
    const correct = chosenSame === listenState.same;
    const responseMs = Math.round(nowMs() - (listenState.promptStartedAt || nowMs()));
    const repetitions = listenState.repetitions || 0;

    if (correct) {
        await speakAsync(p.confirm, { rate: 0.7, pitch: 1.05 });
        recordOutcomeForDimensions({ gameId: 'listen', dimensions: ['A', 'B'], correct: true, responseMs, repetitions });
        const cur = adaptDifficultyGeneric('listen', { correct: true, responseMs, repetitions });
        const level = clamp(getGameDifficulty('listen')?.level ?? 1, 1, LISTEN_MAX_LEVEL);
        const nextLevel = clamp(level + 1, 1, LISTEN_MAX_LEVEL);
        const nextGap = clamp((getGameDifficulty('listen')?.gapMs ?? 520) - (cur.stableStreak >= 3 ? 40 : 0), 320, 1100);
        setGameDifficulty('listen', { level: nextLevel, gapMs: nextGap });
        listenState.repetitions = 0;
        await sleep(350);
        if (level >= LISTEN_MAX_LEVEL) {
            showScreen('overview');
            return;
        }
        await nextListenTrial(true);
        return;
    }

    await speakAsync('Überleg nochmal.', { rate: 0.7, pitch: 1.05 });
    const replay = document.getElementById('btn-listen-replay');
    if (replay) replay.disabled = true;
    const diff = getGameDifficulty('listen') || {};
    const gap = clamp((diff.gapMs ?? 520) + 120, 320, 1100);
    const pace = clamp((diff.paceMs ?? 850) + 120, 550, 1400);
    const sublevel = clamp(diff.level || 1, 1, LISTEN_MAX_LEVEL);
    const tier = getListenTier(sublevel);
    const ui = renderListenRevealStage(listenState.a, listenState.b, tier);
    await speakAsync(listenState.a, { rate: 0.7, pitch: 1.05 });
    if (ui?.cardA) ui.cardA.classList.add('active');
    await sleep(gap);
    await speakAsync(listenState.b, { rate: 0.7, pitch: 1.05, cancelBefore: false });
    if (ui?.cardB) ui.cardB.classList.add('active');
    await sleep(pace);
    recordOutcomeForDimensions({ gameId: 'listen', dimensions: ['A', 'B'], correct: false, responseMs, repetitions: repetitions + 1, errorCluster: `${listenState.a}:${listenState.b}` });
    adaptDifficultyGeneric('listen', { correct: false, responseMs, repetitions: repetitions + 1 });
    listenState.repetitions = repetitions + 1;
    setGameDifficulty('listen', { gapMs: clamp((getGameDifficulty('listen')?.gapMs ?? 520) + 80, 320, 1100) });
    listenState.promptStartedAt = nowMs();
    listenState.locked = false;
    if (replay) replay.disabled = false;
}

function renderMetadataScreen() {
    const root = document.getElementById('metadata-content');
    if (!root) return;
    const children = dataManager.getChildren() || [];
    const obs = !!appSettings.observationMode;
    if (!children.length) {
        root.innerHTML = `<div class="info-box"><p>Keine Kinderdaten vorhanden.</p></div>`;
        return;
    }

    const tf = document.getElementById('btn-toggle-focus');
    root.innerHTML = `
        <div class="level-card">
            <div class="level-header">
                <div class="level-icon">⚙️</div>
                <div class="difficulty-badge difficulty-leicht">Einstellungen</div>
            </div>
            <div class="action-buttons" style="margin:12px 0 0 0;">
                <button id="btn-toggle-focus" class="btn btn-secondary">${appSettings.focusMode ? 'Fokusmodus: an' : 'Fokusmodus: aus'}</button>
                <button id="btn-toggle-observation" class="btn btn-secondary">${obs ? 'Beobachtungsmodus: an' : 'Beobachtungsmodus: aus'}</button>
            </div>
        </div>
        <div id="metadata-view"></div>
    `;

    const tf2 = document.getElementById('btn-toggle-focus');
    if (tf2) tf2.onclick = () => { saveSettings({ focusMode: !appSettings.focusMode }); renderMetadataScreen(); };
    const to2 = document.getElementById('btn-toggle-observation');
    if (to2) to2.onclick = () => { saveSettings({ observationMode: !appSettings.observationMode }); renderMetadataScreen(); };

    const view = root.querySelector('#metadata-view');
    if (!view) return;

    const selectedChild = metadataState.selectedChildId
        ? children.find(c => c.id === metadataState.selectedChildId)
        : null;
    if (!selectedChild && metadataState.view !== 'select') {
        metadataState.view = 'select';
        metadataState.selectedChildId = null;
    }

    const games = Object.keys(GAME_METADATA);
    const renderMetricsCards = (profile) => {
        const gameRows = games.map(gid => {
            const meta = GAME_METADATA[gid];
            const gm = profile.gameMetrics?.[gid] || { trials: 0, correct: 0, repeats: 0, avgMs: null, totalMs: 0, errorClusters: {} };
            const diff = profile.gameDifficulty?.[gid] || {};
            const rate = gm.trials ? Math.round((gm.correct / gm.trials) * 100) : 0;
            const errTop = Object.entries(gm.errorClusters || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(', ') || '–';
            const focus = meta.focusAreas.map(a => `${a} – ${PEDAGOGY.dimensions[a]}`).join(', ');
            const baseMetrics = `
                <div class="meta-metrics" style="margin-top:10px;">
                    <div class="progress-info"><span>Spiel</span><span>${meta.title}</span></div>
                    <div class="progress-info"><span>Förderbereich</span><span>${focus}</span></div>
                    <div class="progress-info"><span>Wiederholungen</span><span>${gm.repeats || 0}x</span></div>
                    <div class="progress-info"><span>Gesamtzeit</span><span>${gm.totalMs ? formatDuration(gm.totalMs) : '–'}</span></div>
                    <div class="progress-info"><span>Fortschritt</span><span>${rate}%</span></div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${rate}%"></div></div>
                </div>
            `;
            const extra = obs ? `
                <div class="meta-metrics" style="margin-top:10px;">
                    <div class="progress-info"><span>Versuche</span><span>${gm.trials}</span></div>
                    <div class="progress-info"><span>Error-Cluster</span><span>${errTop}</span></div>
                    <div class="progress-info"><span>Difficulty-State</span><span>${Object.keys(diff).length ? JSON.stringify(diff) : '–'}</span></div>
                </div>
            ` : '';
            return `
                <div class="level-card" style="margin-top:12px;">
                    <div class="level-header">
                        <div class="level-icon">🎯</div>
                        <div class="difficulty-badge difficulty-mittel">${meta.ageRange}</div>
                    </div>
                    <h3>${meta.title}</h3>
                    <p><strong>Zielkompetenz:</strong> ${meta.targetSkill}</p>
                    ${baseMetrics}
                    ${extra}
                </div>
            `;
        }).join('');
        return gameRows;
    };

    if (metadataState.view === 'details' && selectedChild) {
        const profile = loadSupportProfile(selectedChild.id);
        view.innerHTML = `
            <div class="level-card" style="margin-top:16px;">
                <div class="level-header">
                    <div class="level-icon">📊</div>
                    <div class="difficulty-badge difficulty-leicht">Spieledetails</div>
                </div>
                <h3>${selectedChild.name}</h3>
                <div class="action-buttons" style="margin-top:14px;">
                    <button id="btn-meta-back-profile" class="btn btn-secondary">Zurück</button>
                    <button id="btn-meta-change-child" class="btn btn-secondary">Kind wechseln</button>
                </div>
            </div>
            ${renderMetricsCards(profile)}
        `;
        const b1 = document.getElementById('btn-meta-back-profile');
        if (b1) b1.onclick = () => { metadataState.view = 'profile'; renderMetadataScreen(); };
        const b2 = document.getElementById('btn-meta-change-child');
        if (b2) b2.onclick = () => { metadataState.view = 'select'; metadataState.selectedChildId = null; renderMetadataScreen(); };
        return;
    }

    if (metadataState.view === 'profile' && selectedChild) {
        const profile = loadSupportProfile(selectedChild.id);
        const dims = profile.dimensions || {};
        const totalMsAllGames = games.reduce((sum, gid) => sum + (profile.gameMetrics?.[gid]?.totalMs || 0), 0);
        const repeatsByDimension = {};
        games.forEach(gid => {
            const meta = GAME_METADATA[gid];
            const reps = profile.gameMetrics?.[gid]?.repeats || 0;
            (meta?.focusAreas || []).forEach(dim => {
                repeatsByDimension[dim] = (repeatsByDimension[dim] || 0) + reps;
            });
        });
        const dimRows = Object.keys(PEDAGOGY.dimensions).map(k => {
            const label = PEDAGOGY.dimensions[k];
            const total = dims[k]?.totalMs ? formatDuration(dims[k].totalMs) : '–';
            const repsStored = typeof dims[k]?.repetitions === 'number' ? dims[k].repetitions : 0;
            const repsFromGames = repeatsByDimension[k] || 0;
            const reps = repsStored + repsFromGames;
            return `
                <div class="meta-dev-row">
                    <div class="area">${k} – ${label}</div>
                    <div class="meta">
                        <span class="meta-dev-kpi-label">Zeit</span>
                        <span class="meta-dev-kpi-label">Wiederholung</span>
                        <span>${total}</span>
                        <span>${reps}x</span>
                    </div>
                </div>
            `;
        }).join('');

        view.innerHTML = `
            <div class="level-card" style="margin-top:16px;">
                <div class="level-header">
                    <div class="level-icon">${selectedChild.avatar || '👤'}</div>
                    <div class="difficulty-badge difficulty-leicht">Kind</div>
                </div>
                <h3>${selectedChild.name}</h3>
                <p><strong>Alter:</strong> ${selectedChild.age}</p>
                <p><strong>Gruppe:</strong> ${selectedChild.group || '–'}</p>
                <p><strong>Gesamtzeit:</strong> ${totalMsAllGames ? formatDuration(totalMsAllGames) : '–'}</p>
                <div class="info-box" style="margin-top:12px;">
                    <p><strong>Entwicklungsprofil (lokal, anonym):</strong></p>
                    <div class="meta-dev-grid">${dimRows}</div>
                    <div class="action-buttons" style="margin:14px 0 0 0;">
                        <button id="btn-meta-details" class="btn btn-success">Spieledetails</button>
                        <button id="btn-meta-change-child" class="btn btn-secondary">Kind wechseln</button>
                    </div>
                </div>
            </div>
        `;
        const d = document.getElementById('btn-meta-details');
        if (d) d.onclick = () => { metadataState.view = 'details'; renderMetadataScreen(); };
        const c = document.getElementById('btn-meta-change-child');
        if (c) c.onclick = () => { metadataState.view = 'select'; metadataState.selectedChildId = null; renderMetadataScreen(); };
        return;
    }

    metadataState.view = 'select';
    metadataState.selectedChildId = null;
    view.innerHTML = `
        <div class="level-card" style="margin-top:16px;">
            <div class="level-header">
                <div class="level-icon">👤</div>
                <div class="difficulty-badge difficulty-leicht">Kind auswählen</div>
            </div>
            <p>Wähle ein Kind aus. Erst danach werden Entwicklungsprofil und Spieledetails angezeigt.</p>
        </div>
        <div id="metadata-children" class="children-grid" style="margin-top:14px;"></div>
    `;
    const grid = document.getElementById('metadata-children');
    if (!grid) return;
    children.forEach(child => {
        const card = document.createElement('div');
        card.className = 'child-card';
        const group = String(child.group || '').trim();
        card.innerHTML = `
            <div class="avatar">${child.avatar || '👤'}</div>
            <h3>${child.name}</h3>
            <p>${child.age} Jahre</p>
            ${group ? `<p>${group}</p>` : ''}
        `;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `Kind ${child.name} auswählen`);
        const pick = () => {
            metadataState.selectedChildId = child.id;
            metadataState.view = 'profile';
            renderMetadataScreen();
        };
        card.addEventListener('click', pick);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pick();
            }
        });
        grid.appendChild(card);
    });
}

function renderForum() {
    const root = document.getElementById('forum-content');
    if (!root) return;
    const topics = [
        {
            id: 'age_3_4',
            title: 'Sprachförderung im Alter von 3–4 Jahren',
            body: `
                <p><strong>Sprache im Handeln, Wiederholen und gemeinsamen Erleben</strong></p>
                <p>Im Alter von drei bis vier Jahren befindet sich die Sprachentwicklung in einer sensiblen Aufbauphase. Kinder erweitern ihren Wortschatz rasant, beginnen einfache Satzstrukturen zu nutzen und experimentieren mit Lauten, Betonung und Rhythmus. Sprachförderung ist in diesem Alter dann wirksam, wenn sie situativ, emotional eingebettet und wiederholend erfolgt.</p>
                <p>Zentral ist die sprachliche Begleitung des Alltags: Erwachsene benennen Handlungen („Du ziehst die Jacke an“), greifen kindliche Äußerungen korrekt auf und modellieren Sprache, ohne zu korrigieren oder zu belehren. Dialoge entstehen durch gemeinsames Tun – beim Spielen, Essen oder Anziehen.</p>
                <p>Digitale Spiele können hier punktuell unterstützen, wenn sie klar strukturiert, reizarm und dialogisch nutzbar sind. Ein einfaches Memory mit Bildern oder auditiven Wort-Bild-Zuordnungen kann das Wiedererkennen und Benennen fördern – vorausgesetzt, eine erwachsene Bezugsperson begleitet das Spiel sprachlich („Was hast du gehört?“, „Zeig mal“). Wichtig: Das Medium ersetzt nicht den Dialog, sondern liefert lediglich einen Anlass für sprachliche Interaktion.</p>
                <p>Geschichtenerzählen erfolgt in dieser Altersstufe überwiegend episodisch: kurze Sequenzen, einfache Handlungen, Wiederholungen. Digitale Bilder oder Hörimpulse können helfen, Aufmerksamkeit zu bündeln – entscheidend bleibt jedoch die gemeinsame sprachliche Verarbeitung.</p>
            `.trim()
        },
        {
            id: 'age_4_5',
            title: 'Sprachförderung im Alter von 4–5 Jahren',
            body: `
                <p><strong>Sprache strukturieren, vergleichen und erweitern</strong></p>
                <p>Kinder zwischen vier und fünf Jahren verfügen zunehmend über stabile Satzmuster, stellen Fragen und beginnen, Sprache bewusst einzusetzen. Sprachförderung sollte nun stärker auf Differenzierung, Vergleich und aktive Sprachproduktion abzielen.</p>
                <p>Erzieherinnen, Erzieher und Eltern können gezielt offene Fragen stellen, Erzählungen erweitern („Was ist dann passiert?“) und Wortfelder aufbauen. Wichtig ist, Kindern Zeit zu lassen und nicht vorschnell zu ergänzen.</p>
                <p>Digitale Lernspiele können in diesem Alter sinnvoll eingesetzt werden, wenn sie klare sprachliche Ziele verfolgen.</p>
                <p><strong>Beispiele:</strong></p>
                <ul>
                    <li>Auditive Spiele, bei denen Kinder ähnliche oder unterschiedliche Wörter unterscheiden (Reime, Silben, Anlaute)</li>
                    <li>Memory-Varianten, die nicht nur Bilder, sondern auch gesprochene Wörter einbeziehen</li>
                    <li>Einfache digitale Erzählanlässe, bei denen Kinder Bilder in eine Reihenfolge bringen und dazu sprechen</li>
                </ul>
                <p>Entscheidend ist die Reflexion: Erwachsene greifen das Gehörte auf, spiegeln Aussagen und regen zum Weitererzählen an. Medien fungieren hier als Strukturhilfe, nicht als Selbstzweck.</p>
                <p>Geschichten werden länger, Zusammenhänge klarer. Digitale Impulse können unterstützen, wenn sie nicht überladen sind und Raum für eigene Sprache lassen. Sprachförderung bleibt dialogisch – nicht konsumierend.</p>
            `.trim()
        },
        {
            id: 'age_5_6',
            title: 'Sprachförderung im Alter von 5–6 Jahren',
            body: `
                <p><strong>Sprache bewusst nutzen, erzählen und reflektieren</strong></p>
                <p>Im Vorschulalter wird Sprache zunehmend instrumentell: Kinder erklären, begründen, erzählen zusammenhängend und zeigen metasprachliche Fähigkeiten. Sprachförderung sollte nun gezielt auf Erzählkompetenz, Wortschatzpräzision und phonologische Bewusstheit ausgerichtet sein.</p>
                <p>Erwachsene fördern Sprache, indem sie Kinder ausreden lassen, gezielt nachfragen und unterschiedliche Ausdrucksweisen wertschätzen. Rollenspiele, Erzählkreise und gemeinsame Planungen bieten ideale Anlässe.</p>
                <p>Digitale Spiele können hier lernzielorientiert eingesetzt werden:</p>
                <ul>
                    <li>Auditive Differenzierungsspiele (z. B. ähnlich klingende Wörter, Lautpositionen)</li>
                    <li>Komplexere Memory-Formate, bei denen Begriffe beschrieben oder erklärt werden müssen</li>
                    <li>Digital unterstütztes Geschichtenerzählen, bei dem Kinder Handlungsfolgen planen und sprachlich ausformulieren</li>
                </ul>
                <p>Wichtig ist eine klare Rahmung: kurze Nutzungseinheiten, bewusste Auswahl der Inhalte und anschließende sprachliche Verarbeitung ohne Bildschirm. Digitale Medien sind hier Werkzeuge zur Vertiefung – nicht zur Beschäftigung.</p>
                <p>Altersgemäße Sprachförderung in dieser Phase bereitet nicht nur auf die Schule vor, sondern stärkt auch Selbstwirksamkeit, Ausdrucksfähigkeit und soziale Kommunikation.</p>
            `.trim()
        }
    ];
    const openTopic = (id) => {
        const t = topics.find(x => x.id === id);
        if (!t) return;
        root.innerHTML = `
            <div class="level-card" role="button" tabindex="0">
                <div class="level-header">
                    <div class="level-icon">🧑‍🏫</div>
                    <div class="difficulty-badge difficulty-leicht">Beitrag</div>
                </div>
                <h3>${t.title}</h3>
                <div>${t.body}</div>
                <div class="action-buttons" style="margin-top:16px;">
                    <button id="btn-forum-back-list" class="btn btn-secondary">Zur Themenliste</button>
                </div>
            </div>
        `;
        const b = document.getElementById('btn-forum-back-list');
        if (b) b.onclick = () => renderForum();
    };
    root.innerHTML = `
        <div class="level-card" role="button" tabindex="0" id="btn-open-metadata">
            <div class="level-header">
                <div class="level-icon">📊</div>
                <div class="difficulty-badge difficulty-leicht">Fachkräfte</div>
            </div>
            <h3>Metadaten der Kinder</h3>
            <p>Profil, Entwicklungsstand und (optional) Beobachtungsmetriken.</p>
            <button class="btn btn-primary">Öffnen</button>
        </div>
    `;
    topics.forEach(t => {
        const card = document.createElement('div');
        card.className = 'level-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.innerHTML = `
            <div class="level-header">
                <div class="level-icon">📌</div>
                <div class="difficulty-badge difficulty-mittel">Thema</div>
            </div>
            <h3>${t.title}</h3>
            <p>Klicken zum Lesen</p>
            <button class="btn btn-primary">Lesen</button>
        `;
        card.addEventListener('click', () => openTopic(t.id));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTopic(t.id); }
        });
        root.appendChild(card);
    });

    const metaBtn = document.getElementById('btn-open-metadata');
    if (metaBtn) {
        metaBtn.addEventListener('click', () => {
            showScreen('metadata');
            renderMetadataScreen();
        });
        metaBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showScreen('metadata');
                renderMetadataScreen();
            }
        });
    }
}

function renderVideos() {
    const root = document.getElementById('videos-content');
    if (!root) return;
    const items = [
        { title: 'Beispiel: Wortschatz-Spiel begleiten', src: './video/video1.mp4', text: 'Erst gemeinsam anschauen, dann die Zielwörter benennen lassen. Kurze Wiederholungen helfen beim Festigen.' },
        { title: 'Beispiel: Erkenne im Video', src: './video/video2.mp4', text: 'Nach dem Video 1–2 Sekunden warten, dann erst auswählen. Das verbessert Aufmerksamkeit und Erinnerung.' },
        { title: 'Beispiel: Reim-Memory', src: './video/video3.mp4', text: 'Wörter klar und langsam sprechen lassen. Bei Bedarf Audio nur als Hilfe einsetzen und danach selbst nachsprechen.' }
    ];
    root.innerHTML = '';
    items.forEach(it => {
        const card = document.createElement('div');
        card.className = 'level-card';
        card.innerHTML = `
            <div class="level-header">
                <div class="level-icon">🎥</div>
                <div class="difficulty-badge difficulty-leicht">Video</div>
            </div>
            <h3>${it.title}</h3>
            <div class="word-image-wrap" style="height:260px;">
                <video style="width:100%;height:100%;object-fit:cover;border-radius:16px;" controls src="${it.src}"></video>
            </div>
            <p>${it.text}</p>
        `;
        root.appendChild(card);
    });
}
function markWordDone(word) {
    const list = document.getElementById('story-word-list');
    const card = Array.from(list.querySelectorAll('.word-card')).find(el => el.dataset.word === word);
    if (!card) return;
    const wrap = card.querySelector('.word-image-wrap');
    if (wrap && !card.classList.contains('done')) {
        const badge = document.createElement('div');
        badge.className = 'done-badge';
        badge.textContent = '✓';
        wrap.appendChild(badge);
        card.classList.add('done');
        doneWords.add(word);
        const words = LEVEL_WORDS[currentVocabLevel] || [];
        const nextBtn = document.getElementById('btn-next-level');
        if (nextBtn) nextBtn.style.display = doneWords.size >= words.length && words.length ? 'inline-block' : 'none';
    }
}

function handleActiveWordResult(transcript) {
    if (!activeTargetWord) return;
    const res = speechRecognition.validateRhyme(transcript, [activeTargetWord]);
    const srs = document.getElementById('story-recognition-status');
    if (srs) srs.innerHTML = `Gesprochen: "<strong>${transcript}</strong>"`;
    const responseMs = Math.round(nowMs() - (storyState.promptStartedAt || nowMs()));
    const repetitions = storyState.repetitions || 0;
    if (res.matchedWord) {
        markWordDone(activeTargetWord);
        recordOutcomeForDimensions({ gameId: 'story', dimensions: ['C', 'A'], correct: true, responseMs, repetitions });
        adaptDifficultyGeneric('story', { correct: true, responseMs, repetitions });
        activeTargetWord = null;
        setFocusTargets([]);
        const info = document.getElementById('story-info');
        if (info) info.textContent = 'Super! Wähle das nächste Bild.';
        if (srs) srs.textContent = 'Super! Wähle das nächste Bild.';
    } else {
        const info = document.getElementById('story-info');
        if (info) info.textContent = 'Fast! Versuch es nochmal.';
        if (srs) srs.textContent = 'Fast! Versuch es nochmal.';
        storyState.repetitions = repetitions + 1;
        recordOutcomeForDimensions({ gameId: 'story', dimensions: ['C', 'A'], correct: false, responseMs, repetitions: repetitions + 1, errorCluster: `${activeTargetWord}:${String(transcript || '')}` });
        adaptDifficultyGeneric('story', { correct: false, responseMs, repetitions: repetitions + 1 });
        speechRecognition.start();
    }
}
function renderProfileCard() {
    const container = document.getElementById('profile-card');
    if (!container || !currentChild) return;
    const group = currentChild.group || '–';
    container.innerHTML = `
        <div class="profile-row">
            <span class="label">Name</span>
            <span class="value" id="pc-name">${currentChild.name}</span>
            <button class="icon-btn" id="edit-name" aria-label="Name bearbeiten">✎</button>
        </div>
        <div class="profile-row">
            <span class="label">Alter</span>
            <span class="value" id="pc-age">${currentChild.age}</span>
            <button class="icon-btn" id="edit-age" aria-label="Alter bearbeiten">✎</button>
        </div>
        <div class="profile-row">
            <span class="label">Gruppe</span>
            <span class="value" id="pc-group">${group}</span>
            <button class="icon-btn" id="edit-group" aria-label="Gruppe bearbeiten">✎</button>
        </div>
    `;
    const editName = document.getElementById('edit-name');
    const editAge = document.getElementById('edit-age');
    const editGroup = document.getElementById('edit-group');
    editName.onclick = () => inlineEdit('pc-name', 'text', v => {
        const val = v.trim();
        if (val) {
            currentChild.name = val;
            dataManager.saveUsers();
            document.getElementById('child-name').textContent = `${currentChild.name}s Fortschritt`;
            renderProfileCard();
        }
    });
    editAge.onclick = () => inlineEdit('pc-age', 'number', v => {
        const num = parseInt(v, 10);
        if (!isNaN(num) && num > 0) {
            currentChild.age = num;
            dataManager.saveUsers();
            renderProfileCard();
        }
    });
    editGroup.onclick = () => inlineEdit('pc-group', 'text', v => {
        const val = v.trim();
        currentChild.group = val || '';
        dataManager.saveUsers();
        renderProfileCard();
    });
}

function inlineEdit(valueId, type, onSave) {
    const el = document.getElementById(valueId);
    if (!el) return;
    const current = el.textContent;
    const input = document.createElement('input');
    input.type = type;
    input.value = current === '–' ? '' : current;
    input.className = 'profile-input';
    el.replaceWith(input);
    input.focus();
    const finalize = () => {
        onSave(input.value);
    };
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') finalize();
        if (e.key === 'Escape') renderProfileCard();
    });
    input.addEventListener('blur', finalize);
}

// Render Levels-Grid
function renderLevelsGrid() {
    const container = document.getElementById('levels-grid');
    const levels = dataManager.getLevels();
    
    renderProfileCard();
    container.innerHTML = '';
    
    if (!levels || levels.length === 0) {
        const info = document.createElement('div');
        info.className = 'info-box';
        info.innerHTML = `<p>Keine Levels verfügbar. Bitte aktualisiere die Seite.</p>`;
        container.appendChild(info);
        return;
    }
    
    levels.forEach((level, index) => {
        const progress = dataManager.calculateProgress(currentChild.id, level.id);
        const completed = dataManager.getProgress(currentChild.id, level.id).length;
        const total = level.sublevels.length;
        
        const card = document.createElement('div');
        card.className = 'level-card';
        card.innerHTML = `
            <div class="level-header">
                <div class="level-icon">${level.icon}</div>
                <div class="difficulty-badge difficulty-${level.schwierigkeitsgrad}">
                    ${level.schwierigkeitsgrad}
                </div>
            </div>
            <h3>${level.name}</h3>
            <button class="btn btn-primary">
                ${completed === 0 ? 'Start' : 'Fortsetzen'}
            </button>
        `;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `Level ${level.name} öffnen`);
        
        card.querySelector('button').addEventListener('click', () => startLevel(index));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startLevel(index);
            }
        });
        container.appendChild(card);
    });
}

// Level starten
function startLevel(levelIndex) {
    currentLevelIndex = levelIndex;
    currentSublevelIndex = 0;
    currentLevelData = dataManager.getLevel(levelIndex);
    
    // Finde nächsten nicht-abgeschlossenen Sublevel
    const completedSublevels = dataManager.getProgress(currentChild.id, currentLevelData.id);
    for (let i = 0; i < currentLevelData.sublevels.length; i++) {
        if (!completedSublevels.includes(currentLevelData.sublevels[i].id)) {
            currentSublevelIndex = i;
            break;
        }
    }
    
    showScreen('training');
    renderTrainingScreen();
}

// Render Training-Screen
function renderTrainingScreen() {
    currentSublevelData = currentLevelData.sublevels[currentSublevelIndex];
    trainingState = { startedAt: nowMs(), retries: 0, recordingStartedAt: 0 };
    
    // Header
    document.getElementById('level-title').textContent = currentLevelData.name;
    document.getElementById('sublevel-info').textContent = 
        `Unter-Level ${currentSublevelIndex + 1} von ${currentLevelData.sublevels.length}`;
    
    // Progress Bar
    const progress = ((currentSublevelIndex + 1) / currentLevelData.sublevels.length) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    
    // Wort-Liste
    const wordList = document.getElementById('word-list');
    wordList.innerHTML = '';
    currentSublevelData.reim_ideen.forEach((word, idx) => {
        const wordCard = document.createElement('div');
        wordCard.className = 'word-card';
        wordCard.dataset.word = word.toLowerCase();
        const imgPath = `./images/${currentSublevelData.bild_ordner}/${word.toLowerCase()}.png`;
        const placeholderName = `Beispiel${idx + 1}`;
        wordCard.innerHTML = `
            <div class="word-image-wrap">
                <img src="${imgPath}" alt="${word}">
            </div>
            <div class="word-label">${word}</div>
        `;
        const imgEl = wordCard.querySelector('img');
        imgEl.onload = () => { /* nothing */ };
        imgEl.onerror = () => {
            imgEl.src = generatePlaceholderPng(idx, currentLevelData.schwierigkeitsgrad);
            imgEl.style.display = 'block';
        };
        wordCard.addEventListener('click', () => {
            speakWord(word);
        });
        wordCard.dataset.word = word.toLowerCase();
        wordList.appendChild(wordCard);
    });
    
    // Reset UI
    const recordBtn = document.getElementById('btn-record');
    if (recordBtn) recordBtn.style.display = speechRecognition.recognition ? 'inline-block' : 'none';
    const correctBtn = document.getElementById('btn-correct');
    if (correctBtn) correctBtn.style.display = 'none';
    const retryBtn = document.getElementById('btn-retry');
    if (retryBtn) retryBtn.style.display = 'inline-block';
    const wordImage = document.getElementById('word-image');
    if (wordImage) wordImage.innerHTML = '';
    const status = document.getElementById('recognition-status');
    if (status) status.textContent = speechRecognition.recognition ? 'Drücke auf das Mikrofon zum Starten' : 'Spracherkennung ist optional. Nutze ✓ Richtig oder ✗ Nochmal.';
    const micCircleEl = document.querySelector('.mic-circle');
    if (micCircleEl) micCircleEl.classList.remove('recording');
    setFocusTargets([]);
}

function highlightMatchedWord(word) {
    const list = document.getElementById('word-list');
    const items = list.querySelectorAll('.word-card');
    items.forEach(el => {
        const match = el.dataset.word === (word || '').toLowerCase();
        if (match) el.classList.add('correct');
    });
}

function generatePlaceholderPng(index, difficulty) {
    const w = 400, h = 300;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    let start = '#c3f0c8', end = '#38ef7d', text = '#2d6a3b';
    if (difficulty === 'mittel') { start = '#fff3cd'; end = '#ffe08a'; text = '#856404'; }
    if (difficulty === 'schwer') { start = '#f8d7da'; end = '#f3a6ad'; text = '#721c24'; }
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, start);
    grad.addColorStop(1, end);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    if (difficulty === 'leicht') {
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.58, 80, 70, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(w * 0.42, h * 0.42, 30, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(w * 0.58, h * 0.42, 30, 40, 0, 0, Math.PI * 2);
        ctx.fill();
    } else if (difficulty === 'mittel') {
        ctx.beginPath();
        ctx.moveTo(w * 0.3, h * 0.5);
        ctx.lineTo(w * 0.5, h * 0.35);
        ctx.lineTo(w * 0.7, h * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(w * 0.32, h * 0.5, w * 0.36, h * 0.25);
        ctx.clearRect(w * 0.46, h * 0.62, 20, 40);
    } else {
        for (let i = 0; i < 5; i++) {
            const cx = w * (0.25 + i * 0.15);
            const cy = h * (0.45 + (i % 2) * 0.08);
            const r = 20 + (i % 3) * 6;
            drawStar(ctx, cx, cy, r, 5);
        }
    }
    return canvas.toDataURL('image/png');
}

function drawStar(ctx, cx, cy, r, points) {
    const step = Math.PI / points;
    ctx.beginPath();
    for (let i = 0; i < 2 * points; i++) {
        const rad = i % 2 === 0 ? r : r * 0.45;
        const x = cx + Math.cos(i * step) * rad;
        const y = cy + Math.sin(i * step) * rad;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}
// Aufnahme starten
function startRecording() {
    const statusEl = document.getElementById('recognition-status');
    const mic = document.querySelector('.mic-circle');
    if (statusEl) statusEl.textContent = '🎤 Aufnahme läuft – sprich die Wörter';
    if (mic) mic.classList.add('recording');
    const hint = document.getElementById('recording-hint');
    if (hint) hint.style.display = 'inline';
    trainingRecognized.clear();
    trainingOrder = [];
    trainingState.recordingStartedAt = nowMs();
    speechRecognition.setReadingMode(true);
    speechRecognition.setKeepAlive(true);
    speechRecognition.configureThreshold(0.35, false);
    speechRecognition.onResult = (transcript) => {
        handleTrainingContinuousResult(transcript);
    };
    speechRecognition.start();
}

// Speech Result Handler
function handleSpeechResult(transcript, confidence) {
    // Nicht mehr genutzt – Transkript wird nicht angezeigt
}

let trainingRecognized = new Set();
let trainingOrder = [];

function handleTrainingContinuousResult(transcript) {
    const total = currentSublevelData.reim_ideen.length;
    const res = speechRecognition.validateRhyme(transcript, currentSublevelData.reim_ideen);
    if (res.matchedWord && res.isCorrect) {
        const w = res.matchedWord.toLowerCase();
        if (!trainingRecognized.has(w)) {
            trainingRecognized.add(w);
            trainingOrder.push(w);
            highlightMatchedWord(w);
            const statusEl = document.getElementById('recognition-status');
            if (statusEl) statusEl.textContent = `Erkannt: ${trainingRecognized.size}/${total}`;
        }
    }
    if (trainingRecognized.size >= total) {
        speechRecognition.stop();
        const mic = document.querySelector('.mic-circle');
        if (mic) mic.classList.remove('recording');
        const hint = document.getElementById('recording-hint');
        if (hint) hint.style.display = 'none';
        const statusEl = document.getElementById('recognition-status');
        if (statusEl) statusEl.textContent = 'Alle Wörter erkannt! ✓';
        const btnOk = document.getElementById('btn-correct');
        if (btnOk) btnOk.style.display = 'inline-block';
        const responseMs = Math.round(nowMs() - (trainingState.recordingStartedAt || trainingState.startedAt || nowMs()));
        recordOutcomeForDimensions({ gameId: 'training', dimensions: ['B', 'A'], correct: true, responseMs, repetitions: trainingState.retries });
    }
}

// Speech Error Handler
function handleSpeechError(error) {
    const mic = document.querySelector('.mic-circle');
    if (mic) mic.classList.remove('recording');
    
    let message = 'Fehler bei der Aufnahme.';
    
    switch(error) {
        case 'no-speech':
            message = 'Ich habe nichts gehört. Nochmal in Ruhe.';
            break;
        case 'audio-capture':
            message = 'Mikrofon ist nicht verfügbar. Bitte prüfen.';
            break;
        case 'not-allowed':
            message = 'Bitte Mikrofon-Zugriff erlauben.';
            break;
    }
    
    const statusEl = document.getElementById('recognition-status');
    if (statusEl) statusEl.textContent = message;
}

// Zeige Bild zum Wort
function showWordImage(word) {
    const imageContainer = document.getElementById('word-image');
    const imagePath = `./images/${currentSublevelData.bild_ordner}/${word.toLowerCase()}.png`;
    
    // Prüfe ob Bild existiert
    const img = new Image();
    img.onload = () => {
        imageContainer.innerHTML = `<img src="${imagePath}" alt="${word}">`;
    };
    img.onerror = () => {
        imageContainer.innerHTML = `<p style="color: #999;">📷 Bild für "${word}" nicht gefunden</p>`;
    };
    img.src = imagePath;
}

// Korrekte Antwort bestätigen
function handleCorrectAnswer() {
    const responseMs = Math.round(nowMs() - (trainingState.startedAt || nowMs()));
    recordOutcomeForDimensions({ gameId: 'training', dimensions: ['B', 'A'], correct: true, responseMs, repetitions: trainingState.retries });
    // Markiere als abgeschlossen
    const newlyCompleted = dataManager.completeSublevel(currentChild.id, currentLevelData.id, currentSublevelData.id);
    if (newlyCompleted) incrementDimensionRepetitions({ dimensions: GAME_METADATA.training.focusAreas, amount: 1 });
    
    // Nächster Sublevel oder zurück zur Übersicht
    if (currentSublevelIndex < currentLevelData.sublevels.length - 1) {
        currentSublevelIndex++;
        renderTrainingScreen();
    } else {
        speak('Gut gemacht.', { rate: 0.7, pitch: 1.05 });
        showScreen('overview');
        renderLevelsGrid();
    }
}

// Nochmal versuchen
function handleRetry() {
    trainingState.retries = (trainingState.retries || 0) + 1;
    renderTrainingScreen();
}

console.log('📱 App-Code geladen');

// Landing-Würfel Interaktion
function setupLandingDice() {
    const dice = document.getElementById('landing-dice');
    if (!dice) return;
    let rotX = -20, rotY = 20;
    let down = false, lastX = 0, lastY = 0;
    const update = () => {
        dice.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    };
    update();
    const getPos = (e) => {
        if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    };
    const onDown = (e) => {
        if (e.cancelable) e.preventDefault();
        down = true;
        const p = getPos(e);
        lastX = p.x; lastY = p.y;
    };
    const onMove = (e) => {
        if (!down) return;
        if (e.cancelable) e.preventDefault();
        const p = getPos(e);
        const dx = p.x - lastX;
        const dy = p.y - lastY;
        rotY += dx * 0.4;
        rotX -= dy * 0.4;
        lastX = p.x; lastY = p.y;
        update();
    };
    const onUp = () => { down = false; };
    dice.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    dice.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
}
