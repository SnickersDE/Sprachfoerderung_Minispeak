   

// State
let currentChild = null;
let currentLevelIndex = 0;
let currentSublevelIndex = 0;
let currentLevelData = null;
let currentSublevelData = null;
let audioEnabled = true;
let currentScreenName = 'landing';
let navMode = 'kids';
let landingTitleVideoStartTimeout = null;
let landingTitleVideoStopper = null;
let disableLandingLogoTransitionOnce = false;
let profileEditUnlocked = false;
let bootSplashWasShown = false;
let bootSplashController = null;
let bootSplashAppReady = false;
let bootSplashVideoReady = false;

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
    observationMode: false,
    theme: 'light'
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
    videostory: { title: 'Videostory', ageRange: '4–7', focusAreas: ['D', 'A'], targetSkill: 'Ruhiges Folgen einer Geschichte (visuell)' },
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
let videoStoryRuntime = null;
let videoStoryLastOpenAt = 0;

const BOOK_LIBRARY = [
    {
        id: 'placeholder',
        title: 'Platzhalter-Buch',
        description: 'Ein kurzes Beispielbuch zum Testen des PDF-Readers.',
        pdfSrc: null
    }
];
let bookState = { activeId: '', objectUrl: '' };

// UI Elemente
const screens = {
    login: document.getElementById('login-screen'),
    landing: document.getElementById('landing-screen'),
    overview: document.getElementById('overview-screen'),
    training: document.getElementById('training-screen'),
    story: document.getElementById('story-screen'),
    books: document.getElementById('books-screen'),
    book_reader: document.getElementById('book-reader-screen'),
    memory: document.getElementById('memory-screen'),
    sound: document.getElementById('sound-screen'),
    sound_detail: document.getElementById('sound-detail-screen'),
    video: document.getElementById('video-screen'),
    videostory: document.getElementById('videostory-screen'),
    lang_memory: document.getElementById('lang-memory-screen'),
    sentence: document.getElementById('sentence-screen'),
    semantic: document.getElementById('semantic-screen'),
    listen: document.getElementById('listen-screen'),
    metadata: document.getElementById('metadata-screen'),
    forum: document.getElementById('forum-screen'),
    videos: document.getElementById('videos-screen')
};

const SCREEN_TO_GAME_ID = {
    training: 'training',
    story: 'story',
    memory: 'memory',
    sound: 'sound',
    sound_detail: 'sound',
    video: 'video',
    videostory: 'videostory',
    lang_memory: 'lang_memory',
    sentence: 'sentence',
    semantic: 'semantic',
    listen: 'listen'
};
let activeGameSession = null;

function getGameIdForScreen(screenName) {
    return SCREEN_TO_GAME_ID[screenName] || '';
}

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
    document.body.dataset.theme = appSettings.theme === 'dark' ? 'dark' : 'light';
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
    const gm = supportProfile.gameMetrics[gameId] || { trials: 0, correct: 0, repeats: 0, avgMs: null, totalMs: 0, runs: 0, sessionMs: 0, errorClusters: {} };
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
        confirm: 'Super.',
        confirmAlt: 'Toll.',
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

function recordGameRun(gameId, amount = 1) {
    if (!currentChild) return;
    if (!supportProfile) ensureSupportProfileLoaded();
    if (!supportProfile) return;
    const inc = Math.max(0, parseInt(amount, 10) || 0);
    if (!inc) return;
    const prev = supportProfile.gameMetrics[gameId] || { trials: 0, correct: 0, repeats: 0, avgMs: null, totalMs: 0, runs: 0, sessionMs: 0, errorClusters: {} };
    prev.runs = (prev.runs || 0) + inc;
    supportProfile.gameMetrics[gameId] = prev;
    saveSupportProfile();
}

function recordGameSessionMs(gameId, ms) {
    if (!currentChild) return;
    if (!supportProfile) ensureSupportProfileLoaded();
    if (!supportProfile) return;
    const add = Math.max(0, Math.round(ms || 0));
    if (!add) return;
    const prev = supportProfile.gameMetrics[gameId] || { trials: 0, correct: 0, repeats: 0, avgMs: null, totalMs: 0, runs: 0, sessionMs: 0, errorClusters: {} };
    prev.sessionMs = (prev.sessionMs || 0) + add;
    supportProfile.gameMetrics[gameId] = prev;
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

function startBootSplash() {
    const splash = document.getElementById('boot-splash');
    const video = document.getElementById('boot-splash-video');
    if (!splash || !video) return;
    bootSplashWasShown = true;
    bootSplashAppReady = false;
    bootSplashVideoReady = false;

    video.muted = true;
    video.loop = false;
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;
    video.preload = 'auto';

    const progressFill = document.getElementById('boot-splash-progress-fill');
    if (progressFill) progressFill.style.width = '0%';

    const srcCandidates = ['./video/title.mp4', './title.mp4', './images/title.mp4'];
    let srcIndex = 0;
    let rafId = null;
    let fallbackTimer = null;
    let startedAt = nowMs();

    const stopProgress = () => {
        if (rafId != null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    };

    const hide = () => {
        stopProgress();
        if (fallbackTimer != null) {
            clearTimeout(fallbackTimer);
            fallbackTimer = null;
        }
        splash.classList.add('is-hiding');
        setTimeout(() => {
            try { video.pause(); } catch {}
            try { video.removeAttribute('src'); video.load(); } catch {}
            try { splash.remove(); } catch {}
            if (bootSplashController) bootSplashController = null;
        }, 750);
    };

    const tryHide = () => {
        if (!bootSplashAppReady || !bootSplashVideoReady) return;
        hide();
    };

    const updateProgress = () => {
        if (!progressFill) return;
        const dur = video.duration;
        let pct = 0;
        if (Number.isFinite(dur) && dur > 0) {
            const earlyMs = 1000;
            const earlySec = earlyMs / 1000;
            const effectiveDur = Math.max(0.1, dur - earlySec);
            pct = clamp((video.currentTime / effectiveDur) * 100, 0, 99);
        } else {
            const elapsed = nowMs() - startedAt;
            pct = clamp((elapsed / 3250) * 95, 0, 95);
        }
        progressFill.style.width = `${pct}%`;
        rafId = requestAnimationFrame(updateProgress);
    };

    const tryNextSrc = () => {
        const src = srcCandidates[srcIndex++];
        if (!src) return false;
        try {
            startedAt = nowMs();
            if (progressFill) progressFill.style.width = '0%';
            video.src = src;
            video.load();
        } catch {}
        return true;
    };

    const onError = () => {
        if (tryNextSrc()) return;
        bootSplashVideoReady = true;
        if (progressFill) progressFill.style.width = '100%';
        tryHide();
        hide();
    };

    video.addEventListener('error', onError);
    if (!tryNextSrc()) {
        bootSplashVideoReady = true;
        if (progressFill) progressFill.style.width = '100%';
        tryHide();
        hide();
        return;
    }

    bootSplashController = { tryHide };
    fallbackTimer = setTimeout(() => {
        fallbackTimer = null;
        bootSplashVideoReady = true;
        if (progressFill) progressFill.style.width = '100%';
        tryHide();
    }, 10000);

    const onEnded = () => {
        bootSplashVideoReady = true;
        if (progressFill) progressFill.style.width = '100%';
        tryHide();
    };
    video.addEventListener('ended', onEnded, { once: true });

    const tryPlay = () => {
        try {
            video.currentTime = 0;
            const p = video.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch {}
    };

    video.addEventListener('loadeddata', () => {
        stopProgress();
        updateProgress();
        tryPlay();
    }, { once: true });
    tryPlay();
}

function markBootSplashAppReady() {
    bootSplashAppReady = true;
    if (bootSplashController) bootSplashController.tryHide();
}

// Initialisierung
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 App wird initialisiert...');

    startBootSplash();
    
    // Warte auf DataManager
    await waitForDataManager();

    setupImagePlaceholders();
    applyGlobalModeClasses();
    enableMobileBackgroundIfPhone();
    
    // Zeige Landing initial
    showScreen('landing');
    renderChildrenList();
    if (!bootSplashWasShown) scheduleLandingTitleVideo();
    
    // Setup Event Listeners
    setupEventListeners();
    setupLandingDice();
    
    console.log('✅ App bereit!');
    markBootSplashAppReady();
});

function stopLandingTitleVideo() {
    if (landingTitleVideoStartTimeout != null) {
        clearTimeout(landingTitleVideoStartTimeout);
        landingTitleVideoStartTimeout = null;
    }
    if (typeof landingTitleVideoStopper === 'function') {
        try { landingTitleVideoStopper(); } catch {}
        landingTitleVideoStopper = null;
    }
}

function scheduleLandingTitleVideo() {
    stopLandingTitleVideo();
    landingTitleVideoStartTimeout = setTimeout(() => {
        landingTitleVideoStartTimeout = null;
        landingTitleVideoStopper = playLandingTitleVideo({ plays: 2 });
    }, 200);
}

function playLandingTitleVideo({ plays = 2 } = {}) {
    const img = document.getElementById('landing-title-img');
    const video = document.getElementById('landing-title-video');
    if (!img || !video) return null;
    if (currentScreenName !== 'landing') return null;
    const wrap = img.closest('.landing-title-wrap');
    let stopped = false;
    let bumpTimeout = null;
    let bumpCleanupTimeout = null;
    const srcCandidates = ['./title.mp4', './video/title.mp4', './images/title.mp4'];
    let srcIndex = 0;
    const tryNextSrc = () => {
        const src = srcCandidates[srcIndex++];
        if (!src) return false;
        try {
            video.src = src;
            video.load();
        } catch {}
        return true;
    };
    const stop = () => {
        if (stopped) return;
        stopped = true;
        if (bumpTimeout != null) {
            clearTimeout(bumpTimeout);
            bumpTimeout = null;
        }
        if (bumpCleanupTimeout != null) {
            clearTimeout(bumpCleanupTimeout);
            bumpCleanupTimeout = null;
        }
        if (wrap) wrap.classList.remove('landing-title-end-bump');
        try { video.pause(); } catch {}
        try { video.removeEventListener('ended', onEnded); } catch {}
        try { video.removeEventListener('error', onError); } catch {}
        try { video.removeEventListener('loadedmetadata', onMeta); } catch {}
        try { video.removeEventListener('loadeddata', onLoaded); } catch {}
        video.style.opacity = '0';
        img.style.opacity = '';
    };
    const onError = () => {
        if (tryNextSrc()) return;
        stop();
    };
    const triggerEndBump = () => {
        if (stopped) return;
        if (!wrap) return;
        wrap.classList.remove('landing-title-end-bump');
        void wrap.offsetWidth;
        wrap.classList.add('landing-title-end-bump');
        if (bumpCleanupTimeout != null) clearTimeout(bumpCleanupTimeout);
        bumpCleanupTimeout = setTimeout(() => {
            bumpCleanupTimeout = null;
            if (wrap) wrap.classList.remove('landing-title-end-bump');
        }, 160);
    };
    let currentPlay = 1;
    const scheduleEndBumpForCurrentPlay = () => {
        if (bumpTimeout != null) {
            clearTimeout(bumpTimeout);
            bumpTimeout = null;
        }
        if (currentPlay !== Math.max(1, plays)) return;
        const dur = Number(video.duration);
        if (!Number.isFinite(dur) || dur <= 0) return;
        const ms = Math.max(0, Math.round((dur - 0.11) * 1000));
        bumpTimeout = setTimeout(() => {
            bumpTimeout = null;
            triggerEndBump();
        }, ms);
    };
    const onMeta = () => scheduleEndBumpForCurrentPlay();
    const onLoaded = () => startPlayback();
    let started = false;
    let played = 0;
    const onEnded = () => {
        if (stopped) return;
        played += 1;
        if (played >= Math.max(1, plays)) {
            stop();
            return;
        }
        try {
            currentPlay = played + 1;
            video.currentTime = 0;
            const p = video.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
            scheduleEndBumpForCurrentPlay();
        } catch {
            stop();
        }
    };
    const startPlayback = () => {
        if (stopped || started) return;
        started = true;
        img.style.opacity = '0';
        video.style.opacity = '1';
        video.muted = true;
        video.loop = false;
        video.autoplay = false;
        video.controls = false;
        video.playsInline = true;
        video.disablePictureInPicture = true;
        try {
            currentPlay = 1;
            video.currentTime = 0;
            const p = video.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
            scheduleEndBumpForCurrentPlay();
        } catch {
            stop();
        }
    };
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('loadeddata', onLoaded, { once: true });
    if (!tryNextSrc()) return null;
    try {
        if (video.readyState >= 2) startPlayback();
    } catch {}
    return stop;
}

function enableMobileBackgroundIfPhone() {
    const isPhone = !!(window.matchMedia && window.matchMedia('(max-width: 600px)').matches);
    if (!isPhone) return;
    const src = './images/landing-placeholder-mobile.png';
    try {
        const probe = new Image();
        probe.onload = () => {
            document.body.dataset.bg = 'mobile';
        };
        probe.onerror = () => {};
        probe.src = src;
    } catch {}
}

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

    const navTheme = document.getElementById('btn-nav-theme');
    if (navTheme) {
        navTheme.addEventListener('click', () => {
            const nextTheme = appSettings.theme === 'dark' ? 'light' : 'dark';
            saveSettings({ theme: nextTheme });
            updateNavThemeIcon();
        });
        updateNavThemeIcon();
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

    const profileEditToggle = document.getElementById('btn-profile-edit-toggle');
    if (profileEditToggle) {
        profileEditToggle.addEventListener('click', () => {
            if (!currentChild) return;
            profileEditUnlocked = !profileEditUnlocked;
            renderProfileCard();
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
            disableLandingLogoTransitionOnce = true;
            stopLandingTitleVideo();
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
        landingExperts.addEventListener('click', async () => {
            disableLandingLogoTransitionOnce = true;
            stopLandingTitleVideo();
            const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
            if (isMobile) {
                const img = document.getElementById('landing-title-img');
                if (img) img.classList.add('landing-logo-bump');
                await sleep(260);
            }
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
        storyCard.addEventListener('click', () => openStoryGame());
        storyCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openStoryGame();
            }
        });
    }
    const storyStartBtn = document.getElementById('btn-story-start');
    if (storyStartBtn) {
        storyStartBtn.addEventListener('click', () => {
            openStoryGame();
        });
    }
    const booksCard = document.getElementById('books-card');
    const booksStartBtn = document.getElementById('btn-books-start');
    if (booksCard) {
        booksCard.addEventListener('click', () => openBooksGame());
        booksCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openBooksGame();
            }
        });
    }
    if (booksStartBtn) booksStartBtn.addEventListener('click', (e) => { e.stopPropagation(); openBooksGame(); });
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

    const videoStoryCard = document.getElementById('videostory-card');
    const videoStoryStartBtn = document.getElementById('btn-videostory-start');
    if (videoStoryCard) {
        videoStoryCard.addEventListener('click', () => openVideoStoryGame());
        videoStoryCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVideoStoryGame(); } });
    }
    if (videoStoryStartBtn) videoStoryStartBtn.addEventListener('click', (e) => { e.stopPropagation(); openVideoStoryGame(); });

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

    const endVideoStoryBtn = document.getElementById('btn-end-videostory');
    if (endVideoStoryBtn) endVideoStoryBtn.addEventListener('click', () => { cleanupVideoStory(); showScreen('overview'); });
    const videoStoryNextBtn = document.getElementById('btn-videostory-next');
    if (videoStoryNextBtn) videoStoryNextBtn.addEventListener('click', () => { if (videoStoryRuntime && typeof videoStoryRuntime.next === 'function') videoStoryRuntime.next(); });

    const endLangMemoryBtn = document.getElementById('btn-end-lang-memory');
    if (endLangMemoryBtn) endLangMemoryBtn.addEventListener('click', () => showScreen('overview'));
    const endSentenceBtn = document.getElementById('btn-end-sentence');
    if (endSentenceBtn) endSentenceBtn.addEventListener('click', async () => {
        const cur = getGameDifficulty('sentence') || {};
        const nextLevel = clamp((cur.level ?? 1) - 1, 1, SENTENCE_MAX_LEVEL);
        setGameDifficulty('sentence', { level: nextLevel });
        sentenceState.locked = true;
        await startSentenceRound(true);
    });
    const endSemanticBtn = document.getElementById('btn-end-semantic');
    if (endSemanticBtn) endSemanticBtn.addEventListener('click', () => showScreen('overview'));
    const endListenBtn = document.getElementById('btn-end-listen');
    if (endListenBtn) endListenBtn.addEventListener('click', () => showScreen('overview'));
    const endBooksBtn = document.getElementById('btn-end-books');
    if (endBooksBtn) endBooksBtn.addEventListener('click', () => { cleanupBookReader(); showScreen('overview'); });
    const bookReaderBackBtn = document.getElementById('btn-book-reader-back');
    if (bookReaderBackBtn) bookReaderBackBtn.addEventListener('click', () => { cleanupBookReader(); showScreen('books'); renderBooks(); });
    const endBookReaderBtn = document.getElementById('btn-end-book-reader');
    if (endBookReaderBtn) endBookReaderBtn.addEventListener('click', () => { cleanupBookReader(); showScreen('overview'); });
    const endMetadataBtn = document.getElementById('btn-end-metadata');
    if (endMetadataBtn) endMetadataBtn.addEventListener('click', () => { showScreen('forum'); renderForum(); });
    const videoQuizStart = document.getElementById('btn-video-quiz-start');
    if (videoQuizStart) {
        videoQuizStart.addEventListener('click', () => startVideoPlayback());
    }
    const videoNextBtn = document.getElementById('btn-video-next');
    if (videoNextBtn) {
        videoNextBtn.addEventListener('click', () => nextVideoStep());
    }
    const videoPrevBtn = document.getElementById('btn-video-prev');
    if (videoPrevBtn) {
        videoPrevBtn.addEventListener('click', () => prevVideoStep());
    }
}

function updateNavThemeIcon() {
    const btn = document.getElementById('btn-nav-theme');
    if (!btn) return;
    const dark = appSettings.theme === 'dark';
    btn.textContent = dark ? '☀️' : '🌙';
    btn.setAttribute('aria-label', dark ? 'Light-Mode aktivieren' : 'Dark-Mode aktivieren');
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
    if (currentScreenName === 'videostory') {
        cleanupVideoStory();
        showScreen('overview');
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
    const prev = currentScreenName;
    const prevGameId = getGameIdForScreen(prev);
    const nextGameId = getGameIdForScreen(screenName);
    if (activeGameSession && prevGameId && activeGameSession.gameId === prevGameId && nextGameId !== prevGameId) {
        recordGameSessionMs(prevGameId, nowMs() - (activeGameSession.startedAt || nowMs()));
        activeGameSession = null;
    }
    if (nextGameId && (!activeGameSession || activeGameSession.gameId !== nextGameId)) {
        activeGameSession = { gameId: nextGameId, startedAt: nowMs() };
    }
    const skipLandingLogoTransition = disableLandingLogoTransitionOnce;
    disableLandingLogoTransitionOnce = false;
    let logoTransition = null;
    if (prev === 'landing' && screenName !== 'landing') {
        stopLandingTitleVideo();
        if (skipLandingLogoTransition) {
            logoTransition = null;
        } else {
        const landingImg = document.getElementById('landing-title-img');
        const navImg = document.getElementById('nav-title-img');
        if (landingImg && navImg) {
            const startRect = landingImg.getBoundingClientRect();
            if (startRect.width > 2 && startRect.height > 2) {
                const useVideo = true;
                let movingEl = null;
                if (useVideo) {
                    const video = document.createElement('video');
                    video.setAttribute('aria-hidden', 'true');
                    video.setAttribute('playsinline', '');
                    video.setAttribute('preload', 'auto');
                    video.muted = true;
                    video.loop = false;
                    video.autoplay = true;
                    video.controls = false;
                    video.playsInline = true;
                    video.disablePictureInPicture = true;
                    const srcCandidates = ['./title.mp4', './video/title.mp4', './images/title.mp4'];
                    let srcIndex = 0;
                    const tryNextSrc = () => {
                        const src = srcCandidates[srcIndex++];
                        if (!src) return false;
                        try {
                            video.src = src;
                            video.load();
                        } catch {}
                        return true;
                    };
                    const onVideoError = () => {
                        if (tryNextSrc()) return;
                        try { video.removeEventListener('error', onVideoError); } catch {}
                    };
                    video.addEventListener('error', onVideoError);
                    tryNextSrc();
                    video.poster = landingImg.getAttribute('src') || '';
                    movingEl = video;
                }
                if (!movingEl) {
                    const clone = landingImg.cloneNode(true);
                    clone.removeAttribute('id');
                    clone.setAttribute('aria-hidden', 'true');
                    movingEl = clone;
                }
                Object.assign(movingEl.style, {
                    position: 'fixed',
                    left: `${startRect.left}px`,
                    top: `${startRect.top}px`,
                    width: `${startRect.width}px`,
                    height: `${startRect.height}px`,
                    margin: '0',
                    pointerEvents: 'none',
                    zIndex: '9999',
                    transformOrigin: 'top left',
                    transform: 'translate3d(0,0,0) scale(1)',
                    willChange: 'transform'
                });
                if (movingEl.tagName && movingEl.tagName.toLowerCase() === 'video') {
                    movingEl.style.objectFit = 'contain';
                    movingEl.style.background = 'transparent';
                }
                document.body.appendChild(movingEl);
                if (movingEl.tagName && movingEl.tagName.toLowerCase() === 'video') {
                    try {
                        movingEl.currentTime = 0;
                        const p = movingEl.play();
                        if (p && typeof p.catch === 'function') p.catch(() => {});
                    } catch {}
                }
                const prevNavOpacity = navImg.style.opacity;
                const prevNavTransition = navImg.style.transition;
                navImg.style.transition = 'opacity 180ms ease';
                navImg.style.opacity = '0';
                logoTransition = { movingEl, startRect, navImg, prevNavOpacity, prevNavTransition };
            }
        }
        }
    }
    if (prev === 'videostory' && screenName !== 'videostory') {
        cleanupVideoStory();
    }
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
    if (logoTransition) {
        const { movingEl, startRect, navImg, prevNavOpacity, prevNavTransition } = logoTransition;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const endRect = navImg.getBoundingClientRect();
                if (!(endRect.width > 2 && endRect.height > 2)) {
                    try { movingEl.remove(); } catch {}
                    navImg.style.opacity = prevNavOpacity;
                    navImg.style.transition = prevNavTransition;
                    return;
                }
                const dx = endRect.left - startRect.left;
                const dy = endRect.top - startRect.top;
                const sx = endRect.width / startRect.width;
                const sy = endRect.height / startRect.height;
                const durationMs = 760;
                movingEl.style.transition = `transform ${durationMs}ms cubic-bezier(0.18, 0.92, 0.2, 1)`;
                let cleaned = false;
                const cleanup = () => {
                    if (cleaned) return;
                    cleaned = true;
                    try { movingEl.remove(); } catch {}
                    navImg.style.opacity = prevNavOpacity || '1';
                    navImg.style.transition = prevNavTransition;
                };
                const onEnd = (e) => {
                    if (e.propertyName !== 'transform') return;
                    movingEl.removeEventListener('transitionend', onEnd);
                    cleanup();
                };
                movingEl.addEventListener('transitionend', onEnd);
                setTimeout(cleanup, durationMs + 220);
                movingEl.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`;
            });
        });
    }
    setNavMode(screenName === 'forum' || screenName === 'videos' ? 'experts' : 'kids');
    updateNavForumButton();
    const gameplayScreens = new Set(['training', 'story', 'memory', 'sound', 'sound_detail', 'video', 'videostory', 'lang_memory', 'sentence', 'semantic', 'listen']);
    if (gameplayScreens.has(screenName)) {
        setFocusTargets([]);
        setFocusActive(screenName !== 'video' && screenName !== 'videostory');
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
    profileEditUnlocked = false;
    document.getElementById('child-avatar').textContent = currentChild.avatar;
    document.getElementById('child-name').textContent = `${currentChild.name}s Fortschritt`;
    
    showScreen('overview');
    renderProfileCard();
    renderLevelsGrid();
}

const STORY_WORDS = [
    'Apfel',
    'Auto',
    'Bauernhof',
    'Brot',
    'Buch',
    'Computer',
    'Drache',
    'Einhorn',
    'Elefant',
    'Fuß',
    'Giraffe',
    'Haus',
    'Hund',
    'Krawatte',
    'Kuh',
    'Laus',
    'Loch',
    'Mama',
    'Maus',
    'Meer',
    'Papa',
    'Pferd',
    'Pinguin',
    'Prinzessin',
    'Regenbogen',
    'Ritter',
    'Seil',
    'Spielzeug',
    'Stuhl',
    'Tisch',
    'Turm',
    'Uhr',
    'Weihnachtsmann'
];
let doneWords = new Set();
let activeTargetWord = null;
const STORY_LEVEL_SIZE = 6;
let storyLevel = 1;
let storyLevelWords = [];
let storyLevelTransitioning = false;
let storyHasStarted = false;
let storyRoundCompleted = false;

function buildStoryLevelWords() {
    const pool = shuffle(STORY_WORDS);
    const picked = [];
    const seen = new Set();
    for (const w of pool) {
        const key = normalizeWordKey(w);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        picked.push({ label: w, key });
        if (picked.length >= STORY_LEVEL_SIZE) break;
    }
    storyLevelWords = picked;
    storyRoundCompleted = false;
}

function completeStoryRound() {
    if (storyRoundCompleted) return;
    storyRoundCompleted = true;
    recordGameRun('story', 1);
    incrementDimensionRepetitions({ dimensions: GAME_METADATA.story.focusAreas, amount: 1 });
}

function advanceStoryLevel({ auto = false } = {}) {
    if (storyLevelTransitioning) return;
    storyLevelTransitioning = true;
    storyLevel += 1;
    doneWords.clear();
    currentQuizTargetKey = '';
    currentQuizTarget = '';
    storyQuizRound = 0;
    storyQuizActive = true;
    storyHasStarted = true;
    buildStoryLevelWords();
    renderStoryGame();
    const delay = auto ? 350 : 0;
    setTimeout(() => {
        storyLevelTransitioning = false;
        runStoryQuizStep();
    }, delay);
}

function openStoryGame() {
    showScreen('story');
    activeTargetWord = null;
    storyQuizActive = false;
    storyQuizRound = 0;
    currentQuizTarget = '';
    doneWords.clear();
    storyLevel = 1;
    storyLevelWords = [];
    storyHasStarted = false;
    storyLevelTransitioning = false;
    storyRoundCompleted = false;
    setFocusTargets([]);
    storyState = { promptStartedAt: 0, repetitions: 0 };
    storyQuizState = { promptStartedAt: 0, repetitions: 0 };
    renderStoryGame();
}

function openBooksGame() {
    cleanupBookReader();
    showScreen('books');
    renderBooks();
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
let memoryRoundCompleted = false;

function completeMemoryRound() {
    if (memoryRoundCompleted) return;
    memoryRoundCompleted = true;
    recordGameRun('memory', 1);
    incrementDimensionRepetitions({ dimensions: GAME_METADATA.memory.focusAreas, amount: 1 });
}

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
    memoryRoundCompleted = false;
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
    img.alt = word;
    const idx = parseInt(card.dataset.idx || '0', 10) || 0;
    const difficulty = currentLevel <= 3 ? 'leicht' : currentLevel <= 7 ? 'mittel' : 'schwer';
    applyWordImage(img, normalizeWordKey(word), idx, difficulty, [imgPath].filter(Boolean));
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
            completeMemoryRound();
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

function normalizeWordKey(word) {
    return String(word || '')
        .toLowerCase()
        .trim()
        .replace(/[.,!?;:"']/g, '')
        .replace(/\s+/g, '')
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss');
}

function applyWordImage(imgEl, key, idx, difficulty, preferredPaths) {
    if (!imgEl) return;
    const k = normalizeWordKey(key);
    const candidates = []
        .concat(Array.isArray(preferredPaths) ? preferredPaths : [])
        .concat([
            `./images/story/${k}.png`,
            `./images/story/${k}.jpg`,
            `./images/level1/${k}.png`,
            `./images/level1/${k}.jpg`,
            `./images/level2/${k}.png`,
            `./images/level2/${k}.jpg`,
            `./images/level3/${k}.png`,
            `./images/level3/${k}.jpg`
        ]);

    let i = 0;
    const tryNext = () => {
        while (i < candidates.length) {
            const src = candidates[i++];
            if (src) {
                imgEl.src = src;
                return;
            }
        }
        imgEl.onerror = null;
        imgEl.src = generatePlaceholderPng(idx || 0, difficulty || 'leicht');
        imgEl.style.display = 'block';
    };
    imgEl.onerror = tryNext;
    tryNext();
}
function renderStoryGame() {
    const list = document.getElementById('story-word-list');
    if (!list) return;
    list.innerHTML = '';
    setFocusTargets([]);
    const words = storyHasStarted
        ? (storyLevelWords.length ? storyLevelWords : (buildStoryLevelWords(), storyLevelWords))
        : shuffle(STORY_WORDS).map(w => ({ label: w, key: normalizeWordKey(w) }));
    words.forEach((item, idx) => {
        const word = item.label;
        const lw = item.key || normalizeWordKey(word);
        const card = document.createElement('div');
        card.className = 'word-card';
        card.dataset.word = lw;
        card.innerHTML = `
            <div class="word-image-wrap">
                <img alt="${word}">
            </div>
            <div class="word-label">${word}</div>
        `;
        const imgEl = card.querySelector('img');
        applyWordImage(imgEl, lw, idx, 'leicht');
        if (storyHasStarted && doneWords.has(lw)) {
            const wrap = card.querySelector('.word-image-wrap');
            if (wrap) {
                const badge = document.createElement('div');
                badge.className = 'done-badge';
                badge.textContent = '✓';
                wrap.appendChild(badge);
            }
            card.classList.add('done');
        }
        card.addEventListener('click', () => {
            speakWord(word);
            if (!storyQuizActive || !currentQuizTargetKey) return;
            if (card.classList.contains('done')) return;
            const nextBtn = document.getElementById('btn-story-quiz-start');
            const responseMs = Math.round(nowMs() - (storyQuizState.promptStartedAt || nowMs()));
            const repetitions = storyQuizState.repetitions || 0;
            const correct = lw === currentQuizTargetKey;
            if (correct) {
                card.classList.add('correct');
                markWordDone(lw);
                updateStoryQuizProgress();
                const srs = document.getElementById('story-recognition-status');
                if (doneWords.size >= (storyLevelWords.length || STORY_LEVEL_SIZE)) {
                    if (srs) srs.textContent = 'Super! Nächstes Level…';
                    if (nextBtn) { nextBtn.disabled = true; nextBtn.textContent = 'Weiter'; }
                    recordOutcomeForDimensions({ gameId: 'story', dimensions: ['C', 'A'], correct: true, responseMs, repetitions });
                    adaptDifficultyGeneric('story', { correct: true, responseMs, repetitions });
                    currentQuizTargetKey = '';
                    currentQuizTarget = '';
                    completeStoryRound();
                    advanceStoryLevel({ auto: true });
                    return;
                }
                if (srs) srs.textContent = 'Richtig! Drück auf „Weiter“.';
                if (nextBtn) { nextBtn.disabled = false; nextBtn.textContent = 'Weiter'; }
                recordOutcomeForDimensions({ gameId: 'story', dimensions: ['C', 'A'], correct: true, responseMs, repetitions });
                adaptDifficultyGeneric('story', { correct: true, responseMs, repetitions });
                currentQuizTargetKey = '';
                currentQuizTarget = '';
                return;
            }
            card.classList.remove('correct');
            card.classList.add('wrong');
            setTimeout(() => { card.classList.remove('wrong'); }, 400);
            storyQuizState.repetitions = repetitions + 1;
            recordOutcomeForDimensions({ gameId: 'story', dimensions: ['C', 'A'], correct: false, responseMs, repetitions: repetitions + 1, errorCluster: `${currentQuizTargetKey}:${lw}` });
            adaptDifficultyGeneric('story', { correct: false, responseMs, repetitions: repetitions + 1 });
        });
        list.appendChild(card);
    });
    const srs6 = document.getElementById('story-recognition-status');
    const si = document.getElementById('story-info');
    if (!storyQuizActive) {
        if (srs6) srs6.textContent = 'Schaut euch gemeinsam diese Bilder an. Sie kommen in allen Spielen vor und bereiten den Wortschatz des Kindes auf euer Spielerlebnis vor.';
        if (si) si.textContent = 'Höre das Wort und tippe das passende Bild.';
    }
    const nextBtn = document.getElementById('btn-next-level');
    if (nextBtn) {
        nextBtn.classList.remove('btn-secondary');
        nextBtn.classList.add('btn-primary');
        nextBtn.style.display = storyHasStarted ? 'inline-block' : 'none';
        nextBtn.onclick = () => {
            if (!storyHasStarted) return;
            advanceStoryLevel({ auto: false });
        };
    }
    const quizStart = document.getElementById('btn-story-quiz-start');
    if (quizStart) {
        quizStart.onclick = () => nextStoryQuizStep();
        quizStart.textContent = storyQuizActive ? 'Weiter' : 'Spiel beginnen';
        quizStart.disabled = false;
    }
    const quizMic = document.getElementById('btn-story-quiz-mic');
    if (quizMic) {
        quizMic.onclick = () => {
            if (storyQuizActive && currentQuizTarget) speakWord(`Zeig mir ${currentQuizTarget}`);
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
    if (quizWrap) quizWrap.style.display = storyQuizActive ? 'block' : 'none';
    if (quizMic) quizMic.style.display = storyQuizActive ? 'inline-block' : 'none';
    if (quizBack) quizBack.style.display = 'none';
    if (storyQuizActive) updateStoryQuizProgress();
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
        card.className = 'level-card sound-category-card';
        card.innerHTML = `
            <div class="word-image-wrap sound-category-bg" style="background-image:url('./images/sounds/categories/${key}.png');">
                <div class="progress-bar"><div class="progress-fill" style="width:${getSoundCategoryPercent(key)}%"></div></div>
                <div class="sound-category-label">${cat.label}</div>
            </div>
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

// Wortschatz-Quiz („Zeig mir X“)
let storyQuizActive = false;
let storyQuizRound = 0;
let currentQuizTarget = '';
let currentQuizTargetKey = '';

function updateStoryQuizProgress() {
    const fill = document.getElementById('story-quiz-progress');
    const wrap = document.getElementById('story-quiz-progress-wrap');
    if (wrap) wrap.style.display = storyQuizActive ? 'block' : 'none';
    if (!fill) return;
    const total = storyLevelWords.length || STORY_LEVEL_SIZE;
    const pct = total ? Math.round((doneWords.size / total) * 100) : 0;
    fill.style.width = `${pct}%`;
}

function startStoryQuiz() {
    storyQuizActive = true;
    storyQuizRound = 0;
    storyHasStarted = true;
    storyRoundCompleted = false;
    buildStoryLevelWords();
    doneWords.clear();
    renderStoryGame();
    runStoryQuizStep();
}

function runStoryQuizStep() {
    if (!storyLevelWords.length) buildStoryLevelWords();
    const remaining = storyLevelWords
        .map(w => w.key)
        .filter(k => k && !doneWords.has(k));

    if (!remaining.length) {
        completeStoryRound();
        advanceStoryLevel({ auto: true });
        return;
    }

    const targetKey = remaining[Math.floor(Math.random() * remaining.length)];
    const targetLabel = storyLevelWords.find(w => w.key === targetKey)?.label || targetKey;
    currentQuizTargetKey = targetKey;
    currentQuizTarget = targetLabel;
    storyQuizState.promptStartedAt = nowMs();
    storyQuizState.repetitions = 0;
    const info = document.getElementById('story-info');
    if (info) info.textContent = `Zeig mir: ${targetLabel}?`;
    const srs = document.getElementById('story-recognition-status');
    if (srs) srs.textContent = 'Tippe das passende Bild.';

    const quizStart = document.getElementById('btn-story-quiz-start');
    if (quizStart) { quizStart.disabled = true; quizStart.textContent = 'Weiter'; }
    const quizMic = document.getElementById('btn-story-quiz-mic');
    if (quizMic) quizMic.style.display = 'inline-block';

    updateStoryQuizProgress();
    speakWord(`Zeig mir ${targetLabel}`);
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
    if (currentQuizTarget) speakWord(`Zeig mir ${currentQuizTarget}`);
}

const VIDEO_LEVELS = [
    { src: './video/video1.mp4', options: ['Hund','Apfel','Brot','Regenbogen','Kuh'], correct: ['Apfel','Brot','Regenbogen'] },
    { src: './video/video2.mp4', options: ['Drache','Katze','Wolke','Ritter','Prinzessin'], correct: ['Drache','Ritter','Prinzessin'] },
    { src: './video/video3.mp4', options: ['Elefant','Diamant','Sand','Wasser','Koffer'], correct: ['Elefant','Sand','Wasser'] }
];
let videoIndex = 0;
let videoSelected = new Set();
let videoPlayToken = 0;
let videoQuizRevealTimeout = null;

function hideVideoQuizUi() {
    if (videoQuizRevealTimeout) {
        clearTimeout(videoQuizRevealTimeout);
        videoQuizRevealTimeout = null;
    }
    const wrap = document.getElementById('video-quiz-wrap');
    if (wrap) {
        wrap.classList.remove('is-visible');
        wrap.style.display = 'none';
    }
    const grid = document.getElementById('video-card-grid');
    if (grid) grid.innerHTML = '';
    const next = document.getElementById('btn-video-next');
    if (next) next.disabled = true;
    videoSelected.clear();
}

function showVideoQuizUi() {
    const wrap = document.getElementById('video-quiz-wrap');
    if (!wrap) return;
    wrap.style.display = 'block';
    wrap.classList.remove('is-visible');
    requestAnimationFrame(() => wrap.classList.add('is-visible'));
}

function startVideoPlayback() {
    const player = document.getElementById('video-player');
    const btn = document.getElementById('btn-video-quiz-start');
    if (!player) return;
    hideVideoQuizUi();
    videoPlayToken += 1;
    const token = videoPlayToken;
    if (btn) btn.disabled = true;
    const info = document.getElementById('video-info');
    if (info) info.textContent = 'Schau dir das Video an.';
    player.onended = () => handleVideoPlaybackEnded(token);
    try {
        const p = player.play();
        if (p && typeof p.catch === 'function') {
            p.catch(() => {
                if (token !== videoPlayToken) return;
                if (btn) btn.disabled = false;
                try { player.controls = true; } catch {}
            });
        }
    } catch {
        if (btn) btn.disabled = false;
        try { player.controls = true; } catch {}
    }
}

function handleVideoPlaybackEnded(token) {
    if (token !== videoPlayToken) return;
    if (videoQuizRevealTimeout) {
        clearTimeout(videoQuizRevealTimeout);
        videoQuizRevealTimeout = null;
    }
    videoQuizRevealTimeout = setTimeout(() => {
        if (token !== videoPlayToken) return;
        speakWord('Was hast du im Video gesehen?');
        startVideoQuiz();
        showVideoQuizUi();
        videoQuizRevealTimeout = null;
    }, 1250);
}

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
    if (info) info.textContent = 'Drück auf „Spiel beginnen“.';
    hideVideoQuizUi();
    if (player) {
        videoPlayToken += 1;
        try { player.pause(); } catch {}
        player.src = v.src;
        player.load();
        try { player.currentTime = 0; } catch {}
        try { player.controls = false; } catch {}
        player.onended = null;
    }
    const grid = document.getElementById('video-card-grid');
    if (grid) grid.innerHTML = '';
    const next = document.getElementById('btn-video-next');
    if (next) next.disabled = true;
    const prev = document.getElementById('btn-video-prev');
    if (prev) prev.disabled = videoIndex <= 0;
    const quizStart = document.getElementById('btn-video-quiz-start');
    if (quizStart) { quizStart.disabled = false; quizStart.textContent = 'Spiel beginnen'; }
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
    const grid = document.getElementById('video-card-grid');
    if (!grid) return;
    grid.innerHTML = '';
    videoSelected.clear();
    const quizStart = document.getElementById('btn-video-quiz-start');
    if (quizStart) quizStart.disabled = true;
    v.options.forEach((opt, idx) => {
        const lw = normalizeWordKey(opt);
        const card = document.createElement('div');
        card.className = 'word-card';
        card.dataset.opt = opt;
        card.dataset.word = lw;
        card.innerHTML = `
            <div class="word-image-wrap">
                <img alt="${opt}">
            </div>
            <div class="word-label">${opt}</div>
        `;
        const img = card.querySelector('img');
        applyWordImage(img, lw, idx, 'mittel');
        card.addEventListener('click', () => {
            speakWord(opt);
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

const VIDEOSTORY_LIBRARY = {
    demo: {
        id: 'demo',
        title: 'Videostory',
        startSceneId: 'scene1',
        scenes: [
            {
                id: 'scene1',
                videoSrc: './video/videostory/video1.mp4',
                nextSceneId: null,
                choices: [
                    { id: 'wind', label: 'Wind', icon: '💨', narration: 'Wind!', nextSceneId: 'scene2' },
                    { id: 'pilz', label: 'Pilz', icon: '🍄', narration: 'Pilz!', nextSceneId: 'scene3' }
                ]
            },
            { id: 'scene2', videoSrc: './video/videostory/video2.mp4', nextSceneId: null },
            { id: 'scene3', videoSrc: './video/videostory/video3.mp4', nextSceneId: null }
        ]
    }
};

function openVideoStoryGame(storyId = 'demo') {
    const t = nowMs();
    if (t - videoStoryLastOpenAt < 650) return;
    videoStoryLastOpenAt = t;
    const story = VIDEOSTORY_LIBRARY[storyId] || Object.values(VIDEOSTORY_LIBRARY)[0];
    if (!story) return;
    if (!videoStoryRuntime) videoStoryRuntime = createVideoStoryRuntime();
    videoStoryRuntime.open(story);
}

function cleanupVideoStory() {
    try { videoStoryRuntime?.close(); } catch {}
}

function createVideoStoryRuntime() {
    const state = {
        story: null,
        sceneById: new Map(),
        currentSceneId: '',
        transitioning: false,
        activeSlot: 'a',
        preloaded: new Map()
    };

    const els = () => ({
        stage: document.getElementById('videostory-stage'),
        videoA: document.getElementById('videostory-video-a'),
        videoB: document.getElementById('videostory-video-b'),
        choicesWrap: document.getElementById('videostory-choices'),
        choiceWindBtn: document.getElementById('btn-videostory-choice-wind'),
        choicePilzBtn: document.getElementById('btn-videostory-choice-pilz'),
        nextBtn: document.getElementById('btn-videostory-next'),
        sceneSelect: document.getElementById('videostory-scene-select'),
        dim: document.getElementById('videostory-dim'),
        loading: document.getElementById('videostory-loading'),
        loadingFill: document.getElementById('videostory-loading-fill'),
        loadingText: document.getElementById('videostory-loading-text')
    });

    const setLoading = (on) => {
        const { loading } = els();
        if (!loading) return;
        loading.style.display = on ? 'flex' : 'none';
    };

    const updateLoading = (pct) => {
        const { loadingFill, loadingText } = els();
        const p = clamp(Math.round(pct), 0, 100);
        if (loadingFill) loadingFill.style.width = `${p}%`;
        if (loadingText) loadingText.textContent = `${p}%`;
    };

    const normalizeVideoEl = (v) => {
        if (!v) return;
        v.muted = true;
        v.loop = true;
        v.autoplay = true;
        v.playsInline = true;
        v.controls = false;
        v.preload = 'auto';
    };

    const preloadSrc = async (src, timeoutMs = 6500) => {
        if (!src) return false;
        if (state.preloaded.has(src)) return true;
        return await new Promise(resolve => {
            const v = document.createElement('video');
            normalizeVideoEl(v);
            let done = false;
            const finish = (ok) => {
                if (done) return;
                done = true;
                try { v.removeAttribute('src'); v.load(); } catch {}
                state.preloaded.set(src, ok);
                resolve(ok);
            };
            const onOk = () => finish(true);
            const onErr = () => finish(false);
            v.addEventListener('canplaythrough', onOk, { once: true });
            v.addEventListener('loadeddata', onOk, { once: true });
            v.addEventListener('error', onErr, { once: true });
            try {
                v.src = src;
                v.load();
            } catch {
                finish(false);
                return;
            }
            setTimeout(() => finish(true), timeoutMs);
        });
    };

    const ensureVideoSrc = async (videoEl, src) => {
        if (!videoEl || !src) return false;
        normalizeVideoEl(videoEl);
        if (videoEl.getAttribute('src') === src) return true;
        return await new Promise(resolve => {
            let done = false;
            const finish = (ok) => {
                if (done) return;
                done = true;
                resolve(ok);
            };
            const onOk = () => finish(true);
            const onErr = () => finish(false);
            videoEl.addEventListener('loadeddata', onOk, { once: true });
            videoEl.addEventListener('canplay', onOk, { once: true });
            videoEl.addEventListener('error', onErr, { once: true });
            try {
                videoEl.setAttribute('src', src);
                videoEl.load();
            } catch {
                finish(false);
                return;
            }
            setTimeout(() => finish(true), 5000);
        });
    };

    const playMuted = async (videoEl) => {
        if (!videoEl) return;
        try {
            videoEl.muted = true;
            await videoEl.play();
        } catch {}
    };

    const setActiveClasses = (activeEl, inactiveEl) => {
        [activeEl, inactiveEl].forEach(v => {
            if (!v) return;
            v.classList.remove('is-active', 'is-incoming', 'is-outgoing');
        });
        if (activeEl) activeEl.classList.add('is-active');
    };

    const applyTransition = async ({ outgoingEl, incomingEl }) => {
        const { stage, nextBtn } = els();
        if (!stage || !outgoingEl || !incomingEl) return;
        stage.classList.add('is-transitioning');
        outgoingEl.classList.add('is-outgoing');
        incomingEl.classList.add('is-incoming');
        await playMuted(incomingEl);
        await sleep(560);
        outgoingEl.classList.remove('is-active', 'is-outgoing', 'is-incoming');
        incomingEl.classList.remove('is-incoming', 'is-outgoing');
        incomingEl.classList.add('is-active');
        stage.classList.remove('is-transitioning');
        if (nextBtn) nextBtn.disabled = false;
        try { outgoingEl.pause(); } catch {}
    };

    const getScene = (sceneId) => {
        if (!sceneId) return null;
        return state.sceneById.get(sceneId) || null;
    };

    const updateNextBtn = (scene) => {
        const { nextBtn, sceneSelect } = els();
        if (sceneSelect) sceneSelect.value = scene?.id || '';
        if (!nextBtn) return;
        const hasChoices = Array.isArray(scene?.choices) && scene.choices.length > 0;
        nextBtn.style.display = hasChoices ? 'none' : 'inline-block';
        nextBtn.disabled = false;
        nextBtn.textContent = scene?.nextSceneId ? 'Weiter' : 'Fertig';
    };

    const getChoiceById = (scene, id) => {
        const choices = Array.isArray(scene?.choices) ? scene.choices : [];
        return choices.find(c => c?.id === id) || null;
    };

    const setChoicesForScene = (scene) => {
        const { choicesWrap, choiceWindBtn, choicePilzBtn } = els();
        if (!choicesWrap) return;
        const choices = Array.isArray(scene?.choices) ? scene.choices : [];
        const hasChoices = choices.length > 0;
        choicesWrap.style.display = hasChoices ? 'flex' : 'none';

        const wind = getChoiceById(scene, 'wind');
        const pilz = getChoiceById(scene, 'pilz');

        if (choiceWindBtn) {
            const ok = !!wind;
            choiceWindBtn.style.display = ok ? 'inline-flex' : 'none';
            choiceWindBtn.disabled = !ok;
            choiceWindBtn.setAttribute('aria-label', ok ? `${wind.label} wählen` : 'Option wählen');
            const icon = choiceWindBtn.querySelector('.videostory-choice-icon');
            if (icon) icon.textContent = ok ? (wind.icon || '💨') : '💨';
        }

        if (choicePilzBtn) {
            const ok = !!pilz;
            choicePilzBtn.style.display = ok ? 'inline-flex' : 'none';
            choicePilzBtn.disabled = !ok;
            choicePilzBtn.setAttribute('aria-label', ok ? `${pilz.label} wählen` : 'Option wählen');
            const icon = choicePilzBtn.querySelector('.videostory-choice-icon');
            if (icon) icon.textContent = ok ? (pilz.icon || '🍄') : '🍄';
        }
    };

    const setChoicesEnabled = (enabled) => {
        const { choiceWindBtn, choicePilzBtn } = els();
        [choiceWindBtn, choicePilzBtn].forEach(btn => {
            if (!btn) return;
            btn.disabled = !enabled;
        });
    };

    const choose = async (choiceId) => {
        if (state.transitioning) return;
        const cur = getScene(state.currentSceneId);
        if (!cur) return;
        const choice = getChoiceById(cur, choiceId);
        if (!choice?.nextSceneId) return;
        const nextScene = getScene(choice.nextSceneId);
        if (!nextScene) return;

        state.transitioning = true;
        setChoicesEnabled(false);

        const { nextBtn } = els();
        if (nextBtn) nextBtn.disabled = true;
        await speakAsync(choice.narration || choice.label || '', { rate: 0.7, pitch: 1.05, cancelBefore: true });
        await preloadSrc(nextScene.videoSrc, 5000);
        setChoicesForScene(null);
        await showScene(nextScene.id, { initial: false });
        state.transitioning = false;
    };

    const showScene = async (sceneId, { initial = false } = {}) => {
        const scene = getScene(sceneId);
        if (!scene) return;
        const { videoA, videoB, nextBtn } = els();
        const activeEl = state.activeSlot === 'a' ? videoA : videoB;
        const inactiveEl = state.activeSlot === 'a' ? videoB : videoA;
        if (!activeEl || !inactiveEl) return;
        if (nextBtn) nextBtn.disabled = true;
        if (initial) {
            await preloadSrc(scene.videoSrc, 5000);
            await ensureVideoSrc(activeEl, scene.videoSrc);
            setActiveClasses(activeEl, inactiveEl);
            await playMuted(activeEl);
            state.currentSceneId = scene.id;
            updateNextBtn(scene);
            setChoicesForScene(scene);
            return;
        }
        await preloadSrc(scene.videoSrc, 5000);
        await ensureVideoSrc(inactiveEl, scene.videoSrc);
        setActiveClasses(activeEl, inactiveEl);
        inactiveEl.classList.add('is-incoming');
        await applyTransition({ outgoingEl: activeEl, incomingEl: inactiveEl });
        state.activeSlot = state.activeSlot === 'a' ? 'b' : 'a';
        state.currentSceneId = scene.id;
        updateNextBtn(scene);
        setChoicesForScene(scene);
    };

    const preloadStory = async (story) => {
        const scenes = Array.isArray(story?.scenes) ? story.scenes : [];
        const total = scenes.length || 1;
        let done = 0;
        setLoading(true);
        updateLoading(0);
        for (const s of scenes) {
            await preloadSrc(s.videoSrc);
            done++;
            updateLoading((done / total) * 100);
            await sleep(30);
        }
        await sleep(160);
        setLoading(false);
    };

    const open = async (story) => {
        close();
        state.story = story;
        state.sceneById = new Map((story.scenes || []).map(s => [s.id, s]));
        state.currentSceneId = '';
        state.transitioning = false;
        state.activeSlot = 'a';
        showScreen('videostory');
        const { nextBtn, videoA, videoB, sceneSelect, choiceWindBtn, choicePilzBtn } = els();
        if (nextBtn) { nextBtn.disabled = true; nextBtn.textContent = 'Weiter'; }
        if (choiceWindBtn) choiceWindBtn.onclick = () => choose('wind');
        if (choicePilzBtn) choicePilzBtn.onclick = () => choose('pilz');
        if (sceneSelect) {
            const scenes = Array.isArray(story?.scenes) ? story.scenes : [];
            sceneSelect.innerHTML = scenes
                .map((s, i) => `<option value="${s.id}">${s.title || s.label || `Szene ${i + 1}`}</option>`)
                .join('');
            sceneSelect.onchange = async () => {
                const picked = sceneSelect.value;
                if (!picked || picked === state.currentSceneId || state.transitioning) return;
                state.transitioning = true;
                if (nextBtn) nextBtn.disabled = true;
                await showScene(picked, { initial: false });
                state.transitioning = false;
            };
        }
        [videoA, videoB].forEach(v => { if (v) v.removeAttribute('src'); });
        await preloadStory(story);
        const startId = story.startSceneId || (story.scenes && story.scenes[0] ? story.scenes[0].id : '');
        await showScene(startId, { initial: true });
    };

    const next = async () => {
        if (state.transitioning) return;
        const cur = getScene(state.currentSceneId);
        if (!cur) return;
        if (Array.isArray(cur.choices) && cur.choices.length > 0) return;
        if (!cur.nextSceneId) {
            cleanupVideoStory();
            showScreen('overview');
            return;
        }
        state.transitioning = true;
        const { nextBtn } = els();
        if (nextBtn) nextBtn.disabled = true;
        await preloadSrc(getScene(cur.nextSceneId)?.videoSrc || '');
        await showScene(cur.nextSceneId, { initial: false });
        state.transitioning = false;
    };

    const close = () => {
        const { stage, videoA, videoB, nextBtn, sceneSelect, choicesWrap, choiceWindBtn, choicePilzBtn } = els();
        if (stage) stage.classList.remove('is-transitioning');
        [videoA, videoB].forEach(v => {
            if (!v) return;
            v.classList.remove('is-active', 'is-incoming', 'is-outgoing');
            try { v.pause(); } catch {}
            try { v.removeAttribute('src'); v.load(); } catch {}
        });
        if (sceneSelect) {
            sceneSelect.onchange = null;
            sceneSelect.innerHTML = '';
        }
        if (choiceWindBtn) choiceWindBtn.onclick = null;
        if (choicePilzBtn) choicePilzBtn.onclick = null;
        if (choicesWrap) choicesWrap.style.display = 'none';
        if (nextBtn) nextBtn.disabled = false;
        setLoading(false);
        updateLoading(0);
        state.story = null;
        state.sceneById = new Map();
        state.currentSceneId = '';
        state.transitioning = false;
        state.activeSlot = 'a';
    };

    return { open, next, close };
}

// Fokus: Ein Lernschritt pro Interaktion. Audio führt, Visuals unterstützen.
// Spiele sind Werkzeuge für gemeinsame Entwicklungsdimensionen (A–G) und Stufen (1–4).
// Fehler sind Lernsignale: Wiederholung + Modellierung + langsameres Tempo, ohne negatives Markieren.

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
    const lw = normalizeWordKey(key);
    card.dataset.word = lw;
    const labelHtml = showLabel ? `<div class="word-label">${text}</div>` : '';
    const microLabelHtml = showMicroLabel ? `<div class="micro-label">${text}</div>` : '';
    card.innerHTML = `
        <div class="word-image-wrap">
            <img alt="${text}">
            ${microLabelHtml}
        </div>
        ${labelHtml}
    `;
    const imgEl = card.querySelector('img');
    applyWordImage(imgEl, lw, idx || 0, difficulty || 'leicht');
    if (typeof onClick === 'function') card.addEventListener('click', () => onClick(card, lw));
    return card;
}

// Sprachgedächtnis (G): Drei Wörter hören, dann fehlt eins → rezeptiv erinnern.
let langMemoryState = { words: [], missing: '', missingIndex: -1, repetitions: 0, promptStartedAt: 0, locked: false, phase: 'intro' };
let langMemoryLastOpenAt = 0;
let langMemoryIntroToken = 0;
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

const LANG_MEMORY_QUESTION_TEXT = 'Unten sind jetzt neue Wörter.\nWelches Wort fehlt oben? Tipp es an.';

function setLangMemoryArrowVisible(visible) {
    const el = document.getElementById('lang-memory-arrow');
    if (!el) return;
    el.style.display = visible ? 'flex' : 'none';
}

function setLangMemoryStageText(text) {
    const stageBox = document.getElementById('lang-memory-stage');
    if (!stageBox) return;
    const t = String(text || '').trim();
    stageBox.innerHTML = '';
    if (!t) return;
    const p = document.createElement('p');
    p.style.margin = '0';
    p.style.lineHeight = '1.35';
    p.style.whiteSpace = 'pre-line';
    p.textContent = t;
    stageBox.appendChild(p);
}

function getLangMemoryIntroStageText(words) {
    const list = formatLangMemoryWords(words).join(', ');
    return `Schau mal: drei Wörter.\n(${list})\nMerk sie dir.\nEin Wort geht weg.`;
}

async function speakLangMemoryQuestion(cancelBefore = false) {
    await speakAsync('Unten sind jetzt neue Wörter.', { rate: 0.7, pitch: 1.05, cancelBefore });
    await speakAsync('Welches Wort fehlt oben? Tipp es an.', { rate: 0.7, pitch: 1.05, cancelBefore: false });
}

async function runLangMemoryIntroSequence(cancelFirst = true) {
    if (!langMemoryState.words.length) return;
    const diff = getGameDifficulty('lang_memory') || {};
    langMemoryIntroToken += 1;
    langMemoryState.locked = true;
    setLangMemoryStageText(getLangMemoryIntroStageText(langMemoryState.words));
    await speakAsync('Schau mal: drei Wörter.', { rate: 0.7, pitch: 1.05, cancelBefore: cancelFirst });
    await presentLangMemoryWords(langMemoryState.words, diff.paceMs, null, false);
    await speakAsync('Merk sie dir.', { rate: 0.7, pitch: 1.05, cancelBefore: false });
    await speakAsync('Ein Wort geht weg.', { rate: 0.7, pitch: 1.05, cancelBefore: false });
    langMemoryState.locked = false;
    await beginLangMemoryQuestion({ speakPrompt: false });
    setLangMemoryStageText(LANG_MEMORY_QUESTION_TEXT);
    await speakLangMemoryQuestion(false);
}

async function openLangMemoryGame() {
    const t = nowMs();
    if (t - langMemoryLastOpenAt < 650) return;
    langMemoryLastOpenAt = t;
    showScreen('lang_memory');
    langMemoryState = { words: [], missing: '', missingIndex: -1, repetitions: 0, promptStartedAt: 0, locked: false, phase: 'intro' };
    getOrInitGameDifficulty('lang_memory', { paceMs: 850, delayMs: 950, level: 1, stableStreak: 0 });
    await startLangMemoryRound(true);
    const replay = document.getElementById('btn-lang-memory-replay');
    if (replay) replay.onclick = async () => replayLangMemoryPrompt();

    const token = ++langMemoryIntroToken;
    setTimeout(async () => {
        if (token !== langMemoryIntroToken) return;
        if (!screens.lang_memory?.classList?.contains('active')) return;
        if (langMemoryState.phase !== 'intro') return;
        if (langMemoryState.locked) return;
        await runLangMemoryIntroSequence(true);
    }, 1500);
}

async function replayLangMemoryPrompt() {
    if (!langMemoryState.words.length) return;
    const replay = document.getElementById('btn-lang-memory-replay');
    const prevLocked = langMemoryState.locked;
    if (replay) replay.disabled = true;
    langMemoryState.locked = true;
    langMemoryIntroToken += 1;
    if (langMemoryState.phase === 'question') {
        setLangMemoryStageText(LANG_MEMORY_QUESTION_TEXT);
        await speakLangMemoryQuestion(true);
    } else {
        langMemoryState.locked = false;
        await runLangMemoryIntroSequence(true);
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
    const maxLevel = LANG_MEMORY_LEVELS.length || 1;
    const level = clamp(parseInt(difficulty.level || '1', 10) || 1, 1, maxLevel);
    const triple = LANG_MEMORY_LEVELS[level - 1] || ['haus', 'maus', 'laus'];
    const words = newSet || !langMemoryState.words.length ? shuffle(triple).slice(0, 3) : langMemoryState.words.slice();
    const missingIdx = Math.floor(Math.random() * words.length);
    const missing = words[missingIdx];
    langMemoryState.words = words;
    langMemoryState.missing = missing;
    langMemoryState.missingIndex = missingIdx;
    langMemoryState.locked = true;
    langMemoryState.phase = 'intro';

    const levelEl = document.getElementById('lang-memory-level');
    if (levelEl) levelEl.textContent = `Level ${level}/${maxLevel}`;

    const info = document.getElementById('lang-memory-info');
    if (info) {
        info.textContent = '';
    }
    updateLangMemoryProgress(level, maxLevel);
    setLangMemoryStageText(getLangMemoryIntroStageText(words));

    const present = document.getElementById('lang-memory-present');
    const options = document.getElementById('lang-memory-options');
    if (present) present.innerHTML = '';
    if (options) options.innerHTML = '';
    if (options) options.classList.remove('is-framed');
    setLangMemoryArrowVisible(false);

    if (present) {
        words.forEach((w, idx) => {
            const c = renderWordCard({
                word: w,
                idx,
                difficulty: 'leicht',
                showLabel: false,
                onClick: (el) => {
                    if (el && el.classList.contains('is-missing')) return;
                    speakWord(w);
                }
            });
            present.appendChild(c);
        });
    }

    const replay = document.getElementById('btn-lang-memory-replay');
    if (replay) replay.disabled = false;
    langMemoryState.locked = false;
}

async function presentLangMemoryWords(words, paceMs, afterText, cancelFirst = true) {
    const wordRate = 0.7;
    for (let i = 0; i < words.length; i++) {
        setFocusTargets([]);
        await speakAsync(words[i], { rate: wordRate, pitch: 1.05, cancelBefore: cancelFirst ? i === 0 : false });
        await sleep(clamp(paceMs ?? 850, 550, 1400));
    }
    if (afterText) await speakAsync(afterText, { rate: 0.7, pitch: 1.05, cancelBefore: false });
}

async function beginLangMemoryQuestion({ speakPrompt = true } = {}) {
    if (langMemoryState.phase === 'question') return;
    if (langMemoryState.locked) return;

    const stageBox = document.getElementById('lang-memory-stage');
    const present = document.getElementById('lang-memory-present');
    const options = document.getElementById('lang-memory-options');
    if (!stageBox || !present || !options) return;

    langMemoryState.locked = true;
    langMemoryState.phase = 'question';

    const words = langMemoryState.words.slice();
    const missing = langMemoryState.missing;

    const info = document.getElementById('lang-memory-info');
    if (info) {
        info.textContent = '';
    }

    setLangMemoryStageText(LANG_MEMORY_QUESTION_TEXT);
    options.innerHTML = '';
    options.classList.add('is-framed');
    setLangMemoryArrowVisible(true);

    const cards = Array.from(present.querySelectorAll('.word-card'));
    const missingIdx = words.indexOf(missing);
    if (cards[missingIdx]) {
        cards[missingIdx].classList.add('is-missing');
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
                if (el) el.classList.add('selected');
                await handleLangMemorySelection(w, el);
            }
        });
        options.appendChild(card);
    });

    if (speakPrompt) await speakLangMemoryQuestion(true);
}

async function animateLangMemoryInsertIntoMissing(choiceCardEl) {
    const present = document.getElementById('lang-memory-present');
    if (!present) return false;
    const missingCard = present.querySelector('.word-card.is-missing');
    const targetWrap = missingCard ? missingCard.querySelector('.word-image-wrap') : null;
    const srcImg = choiceCardEl ? choiceCardEl.querySelector('img') : null;
    const src = srcImg?.getAttribute('src') || srcImg?.src || '';
    if (!missingCard || !targetWrap || !src) return false;

    const rect = targetWrap.getBoundingClientRect();
    const fly = new Image();
    fly.src = src;
    fly.alt = '';
    fly.style.position = 'fixed';
    fly.style.left = `${rect.left}px`;
    fly.style.top = `${rect.top}px`;
    fly.style.width = `${rect.width}px`;
    fly.style.height = `${rect.height}px`;
    fly.style.objectFit = 'contain';
    fly.style.zIndex = '9999';
    fly.style.borderRadius = '14px';
    fly.style.boxShadow = '0 14px 40px rgba(0,0,0,0.18)';
    fly.style.transform = 'translateY(-150px)';
    fly.style.opacity = '1';
    fly.style.transition = 'transform 1150ms cubic-bezier(0.22, 0.61, 0.36, 1)';
    document.body.appendChild(fly);

    fly.getBoundingClientRect();
    fly.style.transform = 'translateY(0)';

    await new Promise(resolve => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            resolve(true);
        };
        fly.addEventListener('transitionend', finish, { once: true });
        setTimeout(finish, 1300);
    });

    try { fly.remove(); } catch {}

    targetWrap.innerHTML = '';
    const img = new Image();
    img.alt = langMemoryState.missing || '';
    img.src = src;
    targetWrap.appendChild(img);
    missingCard.classList.remove('is-missing');
    missingCard.classList.add('correct');
    return true;
}

async function handleLangMemorySelection(choice, choiceEl) {
    const p = getFeedbackPhrases();
    const correct = choice === langMemoryState.missing;
    const responseMs = Math.round(nowMs() - (langMemoryState.promptStartedAt || nowMs()));
    const repetitions = langMemoryState.repetitions || 0;

    const options = document.getElementById('lang-memory-options');
    const optionCards = options ? Array.from(options.querySelectorAll('.word-card')) : [];
    optionCards.forEach(el => el.classList.remove('selected', 'wrong', 'correct'));
    if (choiceEl) choiceEl.classList.add('selected');

    if (correct) {
        await speakAsync(choice, { rate: 0.7, pitch: 1.05, cancelBefore: true });
        await animateLangMemoryInsertIntoMissing(choiceEl);
        await speakAsync('Richtig toll gemacht', { rate: 0.7, pitch: 1.05, cancelBefore: false });
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

    if (choiceEl) choiceEl.classList.add('wrong');
    await speakAsync(choice, { rate: 0.7, pitch: 1.05, cancelBefore: true });
    setLangMemoryStageText('Probier es nochmal');
    await speakAsync('Probier es nochmal', { rate: 0.7, pitch: 1.05, cancelBefore: false });
    recordOutcomeForDimensions({ gameId: 'lang_memory', dimensions: ['G', 'C', 'A'], correct: false, responseMs, repetitions: repetitions + 1, errorCluster: `${langMemoryState.missing}:${choice}` });
    adaptDifficultyGeneric('lang_memory', { correct: false, responseMs, repetitions: repetitions + 1 });
    const nextDelay = clamp((getGameDifficulty('lang_memory')?.delayMs ?? 950) + 140, 450, 1500);
    setGameDifficulty('lang_memory', { delayMs: nextDelay });
    langMemoryState.repetitions = repetitions + 1;
    setTimeout(() => {
        if (choiceEl) choiceEl.classList.remove('wrong');
        if (screens.lang_memory?.classList?.contains('active') && langMemoryState.phase === 'question') {
            setLangMemoryStageText(LANG_MEMORY_QUESTION_TEXT);
        }
    }, 650);
    langMemoryState.locked = false;
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
let sentenceState = { item: null, repetitions: 0, promptStartedAt: 0, locked: false, selectedIndex: null, phase: 'intro', started: false, needsIntro: true, guideToken: 0 };
let sentenceLastOpenAt = 0;
let sentenceIntroToken = 0;
let sentenceNextAttentionTimeout = null;
let sentenceBuilderState = { active: false, tokens: [], keys: [], placed: [], currentSentence: '', tileOrder: [], speechStarted: false };
let sentenceBuilderTouchDrag = null;
let sentenceBuilderSpeechChain = Promise.resolve();

function getSentenceBuilderEls() {
    return {
        wrap: document.getElementById('sentence-builder'),
        slots: document.getElementById('sentence-builder-slots'),
        tiles: document.getElementById('sentence-builder-tiles'),
        options: document.getElementById('sentence-options')
    };
}

function sentenceToTokens(text) {
    const raw = String(text || '').trim();
    if (!raw) return [];
    return raw
        .replace(/[.,!?;:"']/g, '')
        .split(/\s+/g)
        .filter(Boolean);
}

function showSentenceBuilder(on) {
    const { wrap, options } = getSentenceBuilderEls();
    if (wrap) wrap.style.display = on ? 'block' : 'none';
    if (options) options.style.display = on ? 'none' : 'grid';
}

function resetSentenceBuilder() {
    sentenceBuilderState = { active: false, tokens: [], keys: [], placed: [], currentSentence: '', tileOrder: [], speechStarted: false };
    sentenceBuilderTouchDrag = null;
    sentenceBuilderSpeechChain = Promise.resolve();
    const { slots, tiles } = getSentenceBuilderEls();
    if (slots) slots.innerHTML = '';
    if (tiles) tiles.innerHTML = '';
    showSentenceBuilder(false);
}

function queueSentenceBuilderSpeech(text) {
    const t = String(text || '').trim();
    if (!t) return sentenceBuilderSpeechChain;
    const cancelBefore = !sentenceBuilderState.speechStarted;
    sentenceBuilderState.speechStarted = true;
    sentenceBuilderSpeechChain = sentenceBuilderSpeechChain.then(() => speakAsync(t, { rate: 0.7, pitch: 1.05, cancelBefore }));
    return sentenceBuilderSpeechChain;
}

function getSentenceSlotFromPoint(x, y) {
    try {
        const el = document.elementFromPoint(x, y);
        return el ? el.closest('.sentence-slot') : null;
    } catch {
        return null;
    }
}

function setSentenceSlotWrong(slotEl) {
    if (!slotEl) return;
    slotEl.classList.remove('is-drop-target');
    slotEl.classList.add('is-wrong');
    setTimeout(() => {
        try { slotEl.classList.remove('is-wrong'); } catch {}
    }, 1000);
}

function updateSentenceBuilderNextButton() {
    if (!sentenceBuilderState.active) return;
    const next = document.getElementById('btn-sentence-next');
    if (!next) return;
    const complete = sentenceBuilderState.placed.every(Boolean);
    next.disabled = !complete;
    if (complete) flashSentenceNextAttention(1400);
}

function renderSentenceBuilder() {
    const { slots, tiles } = getSentenceBuilderEls();
    if (!slots || !tiles) return;
    slots.innerHTML = '';
    tiles.innerHTML = '';

    sentenceBuilderState.keys.forEach((k, idx) => {
        const slot = document.createElement('div');
        slot.className = 'sentence-slot';
        slot.dataset.slotIndex = String(idx);
        const placedKey = sentenceBuilderState.placed[idx] || '';
        if (placedKey) {
            const img = document.createElement('img');
            img.alt = sentenceBuilderState.tokens[idx] || '';
            applyWordImage(img, placedKey, idx, 'leicht');
            slot.appendChild(img);
        }
        slot.addEventListener('click', () => {
            if (sentenceState.locked) return;
            if (!sentenceBuilderState.active) return;
            const cur = sentenceBuilderState.placed[idx];
            if (!cur) return;
            sentenceBuilderState.placed[idx] = '';
            renderSentenceBuilder();
        });
        slots.appendChild(slot);
    });

    const tileOrder = Array.isArray(sentenceBuilderState.tileOrder) && sentenceBuilderState.tileOrder.length
        ? sentenceBuilderState.tileOrder
        : shuffle(sentenceBuilderState.keys.map((_, i) => i));
    tileOrder.forEach((idx) => {
        const k = sentenceBuilderState.keys[idx];
        if (sentenceBuilderState.placed.includes(k)) return;
        const card = document.createElement('div');
        card.className = 'word-card';
        card.setAttribute('draggable', 'false');
        card.dataset.tileKey = k;
        card.dataset.tileIndex = String(idx);
        const wrap = document.createElement('div');
        wrap.className = 'word-image-wrap';
        const img = document.createElement('img');
        img.alt = sentenceBuilderState.tokens[idx] || '';
        img.setAttribute('draggable', 'false');
        applyWordImage(img, k, idx, 'leicht');
        wrap.appendChild(img);
        card.appendChild(wrap);

        card.addEventListener('pointerdown', (e) => {
            if (sentenceState.locked) return;
            if (!sentenceBuilderState.active) return;
            if (!e.isPrimary) return;
            if (sentenceBuilderState.placed.includes(k)) return;
            sentenceBuilderTouchDrag = {
                pointerId: e.pointerId,
                key: k,
                tileIndex: idx,
                sourceEl: card,
                started: false,
                startX: e.clientX,
                startY: e.clientY,
                ghostEl: null,
                offsetX: 0,
                offsetY: 0,
                lastX: e.clientX,
                lastY: e.clientY,
                rafId: null,
                overSlotEl: null
            };
            try { card.setPointerCapture(e.pointerId); } catch {}
        });

        card.addEventListener('pointermove', (e) => {
            const s = sentenceBuilderTouchDrag;
            if (!s) return;
            if (e.pointerId !== s.pointerId) return;
            s.lastX = e.clientX;
            s.lastY = e.clientY;

            const dx = e.clientX - s.startX;
            const dy = e.clientY - s.startY;
            const dist = Math.hypot(dx, dy);
            if (!s.started && dist < 6) return;

            if (!s.started) {
                s.started = true;
                const r = card.getBoundingClientRect();
                s.offsetX = s.startX - r.left;
                s.offsetY = s.startY - r.top;
                const ghost = card.cloneNode(true);
                ghost.classList.add('sentence-drag-ghost');
                ghost.style.width = `${r.width}px`;
                ghost.style.height = `${r.height}px`;
                document.body.appendChild(ghost);
                s.ghostEl = ghost;
                card.classList.add('is-dragging');
            }

            if (s.ghostEl && s.rafId == null) {
                s.rafId = requestAnimationFrame(() => {
                    s.rafId = null;
                    if (!s.ghostEl) return;
                    s.ghostEl.style.left = `${s.lastX - s.offsetX}px`;
                    s.ghostEl.style.top = `${s.lastY - s.offsetY}px`;
                });
            }

            const slotEl = getSentenceSlotFromPoint(e.clientX, e.clientY);
            const slotIndex = slotEl ? parseInt(slotEl.dataset.slotIndex || '-1', 10) : -1;
            const canDrop = !!slotEl && slotIndex >= 0 && !sentenceBuilderState.placed[slotIndex];
            const nextOver = canDrop ? slotEl : null;
            if (s.overSlotEl && s.overSlotEl !== nextOver) {
                try { s.overSlotEl.classList.remove('is-drop-target'); } catch {}
            }
            s.overSlotEl = nextOver;
            if (nextOver) nextOver.classList.add('is-drop-target');
        });

        card.addEventListener('pointerup', async (e) => {
            const s = sentenceBuilderTouchDrag;
            if (!s) return;
            if (e.pointerId !== s.pointerId) return;
            sentenceBuilderTouchDrag = null;

            card.classList.remove('is-dragging');
            if (s.rafId != null) {
                cancelAnimationFrame(s.rafId);
                s.rafId = null;
            }
            if (s.ghostEl) {
                try { s.ghostEl.remove(); } catch {}
                s.ghostEl = null;
            }
            if (s.overSlotEl) {
                try { s.overSlotEl.classList.remove('is-drop-target'); } catch {}
            }
            if (!s.started) return;

            const slotEl = getSentenceSlotFromPoint(e.clientX, e.clientY);
            const slotIndex = slotEl ? parseInt(slotEl.dataset.slotIndex || '-1', 10) : -1;
            if (!slotEl || slotIndex < 0) return;
            if (sentenceBuilderState.placed[slotIndex]) {
                setSentenceSlotWrong(slotEl);
                return;
            }
            const expected = sentenceBuilderState.keys[slotIndex];
            if (s.key !== expected) {
                setSentenceSlotWrong(slotEl);
                return;
            }

            sentenceBuilderState.placed[slotIndex] = s.key;
            renderSentenceBuilder();
            updateSentenceBuilderNextButton();
            await queueSentenceBuilderSpeech(sentenceBuilderState.tokens[slotIndex] || '');
            if (sentenceBuilderState.placed.every(Boolean)) {
                await queueSentenceBuilderSpeech(sentenceBuilderState.currentSentence);
            }
        });

        card.addEventListener('pointercancel', () => {
            const s = sentenceBuilderTouchDrag;
            if (!s) return;
            sentenceBuilderTouchDrag = null;
            card.classList.remove('is-dragging');
            if (s.rafId != null) {
                cancelAnimationFrame(s.rafId);
                s.rafId = null;
            }
            if (s.ghostEl) {
                try { s.ghostEl.remove(); } catch {}
                s.ghostEl = null;
            }
            if (s.overSlotEl) {
                try { s.overSlotEl.classList.remove('is-drop-target'); } catch {}
            }
        });

        tiles.appendChild(card);
    });

    updateSentenceBuilderNextButton();
}

function startSentenceBuilder(fullSentence) {
    const tokens = sentenceToTokens(fullSentence);
    const keys = tokens.map(t => normalizeWordKey(t));
    sentenceBuilderState = {
        active: true,
        tokens,
        keys,
        placed: new Array(tokens.length).fill(''),
        currentSentence: fullSentence,
        tileOrder: shuffle(keys.map((_, i) => i)),
        speechStarted: false
    };
    const next = document.getElementById('btn-sentence-next');
    if (next) next.disabled = true;
    showSentenceBuilder(true);
    renderSentenceBuilder();
}

function setSentenceStageText(text) {
    const stageBox = document.getElementById('sentence-stage');
    if (!stageBox) return;
    const t = String(text || '').trim();
    stageBox.innerHTML = '';
    if (!t) return;
    const p = document.createElement('p');
    p.style.margin = '0';
    p.style.lineHeight = '1.35';
    p.style.whiteSpace = 'pre-line';
    p.textContent = t;
    stageBox.appendChild(p);
}

const sentenceGuideShakeTimers = new WeakMap();
function shakeSentenceGuideEl(el) {
    if (!el) return;
    try { el.classList.remove('sentence-guide-shake'); } catch {}
    try { void el.offsetWidth; } catch {}
    try { el.classList.add('sentence-guide-shake'); } catch {}
    const prev = sentenceGuideShakeTimers.get(el);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
        try { el.classList.remove('sentence-guide-shake'); } catch {}
        sentenceGuideShakeTimers.delete(el);
    }, 1000);
    sentenceGuideShakeTimers.set(el, t);
}

function setSentenceStageGuideIcons(flags = {}) {
    const stageBox = document.getElementById('sentence-stage');
    if (!stageBox) return;
    const showEar = !!flags.ear;
    const showMagnifier = !!flags.magnifier;
    const showSpeaker = !!flags.speaker;
    const showSolution = !!flags.solution;
    stageBox.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'sentence-stage-icons';
    const addIcon = (txt) => {
        const el = document.createElement('div');
        el.className = 'sentence-stage-icon';
        el.textContent = txt;
        row.appendChild(el);
        return el;
    };
    const created = { earEl: null, magnifierEl: null, speakerBtn: null, solutionBtn: null };
    if (showEar) created.earEl = addIcon('👂');
    if (showMagnifier) created.magnifierEl = addIcon('🔍');
    if (showSpeaker) {
        const btn = document.createElement('button');
        btn.id = 'btn-sentence-replay-mini';
        btn.className = 'btn btn-success';
        btn.type = 'button';
        btn.textContent = '🔊';
        row.appendChild(btn);
        created.speakerBtn = btn;
    }
    if (showSolution) {
        const btn = document.createElement('button');
        btn.id = 'btn-sentence-solution-mini';
        btn.className = 'btn btn-success';
        btn.type = 'button';
        btn.textContent = '👍';
        row.appendChild(btn);
        created.solutionBtn = btn;
    }
    stageBox.appendChild(row);
    if (created.speakerBtn) {
        created.speakerBtn.onclick = async () => {
            if (!sentenceState.started) return;
            await replaySentencePrompt();
        };
    }
    if (created.solutionBtn) {
        created.solutionBtn.onclick = async () => {
            if (!sentenceState.started) return;
            if (sentenceState.locked) return;
            await revealSentenceSolution();
        };
    }
    return created;
}

async function revealSentenceSolution() {
    const item = sentenceState.item;
    if (!item) return;
    if (sentenceState.locked) return;
    sentenceState.locked = true;

    const opts = document.getElementById('sentence-options');
    const cards = opts ? Array.from(opts.querySelectorAll('.word-card')) : [];
    cards.forEach(el => el.classList.remove('selected', 'maybe', 'wrong', 'correct'));
    const correctCard = cards.find(el => parseInt(el.dataset.choiceIndex || '-1', 10) === item.correct);
    if (correctCard) correctCard.classList.add('correct');

    const fullSentence = `${item.fragment} ${item.endings[item.correct]}`;
    await speakAsync(fullSentence, { rate: 0.7, pitch: 1.05, cancelBefore: true });
    startSentenceBuilder(fullSentence);
    const msg = 'Das ist die Lösung. Ordne jetzt die Bilder in die richtige Reihenfolge.';
    setSentenceStageText(msg);
    await speakAsync(msg, { rate: 0.7, pitch: 1.05, cancelBefore: false });
    sentenceState.locked = false;
}

async function playSentenceIntroGuide() {
    const item = sentenceState.item;
    if (!item) return;
    const token = (sentenceState.guideToken || 0) + 1;
    sentenceState.guideToken = token;
    const name = String(currentChild?.name || '').trim();
    const greet = name ? `Hallo ${name}. Gleich hörst du einen Satz.` : 'Hallo. Gleich hörst du einen Satz.';
    const s1 = setSentenceStageGuideIcons({ ear: true }) || {};
    shakeSentenceGuideEl(s1.earEl);
    await speakAsync(greet, { rate: 0.7, pitch: 1.05, cancelBefore: true });
    if (sentenceState.guideToken !== token) return;
    await speakAsync(item.fragment, { rate: 0.7, pitch: 1.05, cancelBefore: false });
    sentenceState.promptStartedAt = nowMs();
    sentenceState.phase = 'choose';
    if (sentenceState.guideToken !== token) return;
    const s2 = setSentenceStageGuideIcons({ ear: true, magnifier: true }) || {};
    shakeSentenceGuideEl(s2.magnifierEl);
    await speakAsync('Such dir das Bild aus was am besten dazu passt.', { rate: 0.7, pitch: 1.05, cancelBefore: false });
    if (sentenceState.guideToken !== token) return;
    const s3 = setSentenceStageGuideIcons({ ear: true, magnifier: true, speaker: true }) || {};
    shakeSentenceGuideEl(s3.speakerBtn);
    await speakAsync('Wenn du den Satz nochmal hören möchtest dann wähle den Lautsprecher.', { rate: 0.7, pitch: 1.05, cancelBefore: false });
    if (sentenceState.guideToken !== token) return;
    const s4 = setSentenceStageGuideIcons({ ear: true, magnifier: true, speaker: true, solution: true }) || {};
    shakeSentenceGuideEl(s4.solutionBtn);
    await speakAsync('Der grüne Knopf zeigt dir die Lösung.', { rate: 0.7, pitch: 1.05, cancelBefore: false });
}

function flashSentenceNextAttention(ms = 2000) {
    const btn = document.getElementById('btn-sentence-next');
    if (!btn) return;
    btn.classList.add('is-attention');
    if (sentenceNextAttentionTimeout) {
        clearTimeout(sentenceNextAttentionTimeout);
        sentenceNextAttentionTimeout = null;
    }
    sentenceNextAttentionTimeout = setTimeout(() => {
        btn.classList.remove('is-attention');
        sentenceNextAttentionTimeout = null;
    }, Math.max(0, ms || 0));
}

function updateSentenceProgress(level, maxLevel) {
    const fill = document.getElementById('sentence-progress-fill');
    const wrap = document.getElementById('sentence-progress-wrap');
    if (!fill || !wrap) return;
    const pct = maxLevel ? clamp((level / maxLevel) * 100, 0, 100) : 0;
    fill.style.width = `${pct}%`;
    wrap.setAttribute('aria-label', `Fortschritt: Unterlevel ${level} von ${maxLevel}`);
}

async function openSentenceGame() {
    const t = nowMs();
    if (t - sentenceLastOpenAt < 650) return;
    sentenceLastOpenAt = t;
    showScreen('sentence');
    sentenceState = { item: null, repetitions: 0, promptStartedAt: 0, locked: false, selectedIndex: null, phase: 'intro', started: false, needsIntro: true, guideToken: 0 };
    getOrInitGameDifficulty('sentence', { paceMs: 850, level: 1, stableStreak: 0 });
    const replay = document.getElementById('btn-sentence-replay');
    const focusBtn = document.getElementById('btn-sentence-focus');
    if (replay) replay.disabled = false;
    if (focusBtn) focusBtn.disabled = true;
    const next = document.getElementById('btn-sentence-next');
    if (next) next.disabled = true;
    const endBtn = document.getElementById('btn-end-sentence');
    if (endBtn) endBtn.disabled = true;
    resetSentenceBuilder();
    const opts = document.getElementById('sentence-options');
    if (opts) opts.innerHTML = '';
    setSentenceStageGuideIcons({});

    const startSession = async () => {
        if (sentenceState.locked) return;
        if (sentenceState.started) return;
        sentenceState.started = true;
        sentenceState.guideToken += 1;
        if (focusBtn) focusBtn.disabled = false;
        if (next) next.disabled = true;
        if (endBtn) endBtn.disabled = false;
        await startSentenceRound(true);
        sentenceState.locked = true;
        await playSentenceIntroGuide();
        sentenceState.locked = false;
    };
    if (replay) replay.onclick = async () => {
        if (!sentenceState.started) {
            await startSession();
            return;
        }
        await replaySentencePrompt();
    };
    if (focusBtn) focusBtn.onclick = () => {
        const opts = document.getElementById('sentence-options');
        if (!opts) return;
        opts.classList.toggle('is-focus');
        if (opts.classList.contains('is-focus')) {
            setTimeout(() => {
                try { opts.classList.remove('is-focus'); } catch {}
            }, 1600);
        }
    };
    if (next) next.onclick = async () => {
        if (!sentenceState.started) return;
        if (sentenceBuilderState.active && !sentenceBuilderState.placed.every(Boolean)) return;
        sentenceState.locked = true;
        await startSentenceRound(true);
    };
    const diff = getGameDifficulty('sentence') || {};
    updateSentenceProgress(clamp(diff.level || 1, 1, SENTENCE_MAX_LEVEL), SENTENCE_MAX_LEVEL);
    setSentenceStageGuideIcons({});
    await startSession();
}

async function replaySentencePrompt() {
    if (!sentenceState.item) return;
    sentenceState.guideToken += 1;
    sentenceIntroToken += 1;
    sentenceState.phase = 'choose';
    setSentenceStageGuideIcons({ ear: true, magnifier: true, speaker: true, solution: true });
    await speakAsync(sentenceState.item.fragment, { rate: 0.7, pitch: 1.05, cancelBefore: true });
    sentenceState.promptStartedAt = nowMs();
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
    sentenceState.phase = 'intro';

    const info = document.getElementById('sentence-info');
    if (info) info.textContent = '';
    resetSentenceBuilder();
    const levelEl = document.getElementById('sentence-level');
    if (levelEl) levelEl.textContent = `Unterlevel ${level}/${SENTENCE_MAX_LEVEL}`;
    updateSentenceProgress(level, SENTENCE_MAX_LEVEL);
    setSentenceStageGuideIcons({ speaker: true });
    const opts = document.getElementById('sentence-options');
    if (!opts) return;
    opts.innerHTML = '';
    const next = document.getElementById('btn-sentence-next');
    if (next) next.disabled = true;
    if (sentenceNextAttentionTimeout) {
        clearTimeout(sentenceNextAttentionTimeout);
        sentenceNextAttentionTimeout = null;
    }
    if (next) {
        next.classList.remove('is-attention');
    }

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
            if (sentenceState.phase !== 'choose') return;
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
            el.classList.remove('selected', 'maybe', 'wrong', 'correct');
        });
    }
    if (cardEl) cardEl.classList.add('selected');
    sentenceState.selectedIndex = selectedIndex;
    await speakAsync(`${item.fragment} ${item.endings[selectedIndex]}`, { rate: 0.7, pitch: 1.05, cancelBefore: true });
}

async function confirmSentenceSelection() {
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
    if (correct) {
        if (selectedCard) selectedCard.classList.add('correct');
        const fullSentence = `${item.fragment} ${item.endings[item.correct]}`;
        await speakAsync(fullSentence, { rate: 0.7, pitch: 1.05 });
        startSentenceBuilder(fullSentence);
        const praise = 'Super. Ordne jetzt die Bilder in die richtige Reihenfolge.';
        setSentenceStageText(praise);
        await speakAsync(praise, { rate: 0.7, pitch: 1.05 });
        recordOutcomeForDimensions({ gameId: 'sentence', dimensions: ['E', 'A', 'D'], correct: true, responseMs, repetitions });
        const cur = adaptDifficultyGeneric('sentence', { correct: true, responseMs, repetitions });
        const nextLevel = clamp((getGameDifficulty('sentence')?.level ?? 1) + (cur.stableStreak >= 4 ? 1 : 0), 1, SENTENCE_MAX_LEVEL);
        setGameDifficulty('sentence', { level: nextLevel });
        sentenceState.repetitions = 0;
        return;
    }

    if (selectedCard) selectedCard.classList.add('maybe');
    setSentenceStageText('Probier es nochmal');
    await speakAsync('Probier es nochmal', { rate: 0.7, pitch: 1.05 });
    recordOutcomeForDimensions({ gameId: 'sentence', dimensions: ['E', 'A', 'D'], correct: false, responseMs, repetitions: repetitions + 1, errorCluster: `${item.fragment}:${selectedIndex}` });
    adaptDifficultyGeneric('sentence', { correct: false, responseMs, repetitions: repetitions + 1 });
    const nextLevel = clamp((getGameDifficulty('sentence')?.level ?? 1) - 1, 1, SENTENCE_MAX_LEVEL);
    setGameDifficulty('sentence', { level: nextLevel });
    sentenceState.repetitions = repetitions + 1;
    sentenceState.selectedIndex = null;
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
let semanticState = { item: null, repetitions: 0, promptStartedAt: 0, locked: false, expansion: '', selectedChoice: null };
let semanticDragSourceEl = null;
let semanticDragChoice = '';
let semanticTouchDrag = null;
let semanticConnectionClearTimeout = null;

function ensureSemanticConnectionLayer() {
    let layer = document.getElementById('semantic-connection-layer');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'semantic-connection-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    return layer;
}

function clearSemanticConnection() {
    if (semanticConnectionClearTimeout != null) {
        clearTimeout(semanticConnectionClearTimeout);
        semanticConnectionClearTimeout = null;
    }
    const layer = document.getElementById('semantic-connection-layer');
    if (layer) layer.innerHTML = '';
}

function showSemanticConnection(fromEl, toEl) {
    if (!fromEl || !toEl) return;
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    const x1 = a.left + a.width / 2;
    const y1 = a.top + a.height / 2;
    const x2 = b.left + b.width / 2;
    const y2 = b.top + b.height / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.max(0, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const layer = ensureSemanticConnectionLayer();
    layer.innerHTML = '';
    const line = document.createElement('div');
    line.className = 'semantic-connection-line';
    line.style.left = `${x1}px`;
    line.style.top = `${y1 - 6}px`;
    line.style.width = `${len}px`;
    line.style.setProperty('--angle', `${angle}deg`);
    const dot = document.createElement('div');
    dot.className = 'semantic-connection-dot';
    dot.style.left = `${x2}px`;
    dot.style.top = `${y2}px`;
    layer.appendChild(line);
    layer.appendChild(dot);
    semanticConnectionClearTimeout = setTimeout(() => {
        clearSemanticConnection();
    }, 900);
}

function semanticSelectChoice(choiceKey, el) {
    const opts = document.getElementById('semantic-options');
    if (opts) {
        const prevSel = opts.querySelector('.word-card.selected');
        if (prevSel) prevSel.classList.remove('selected');
    }
    if (el) el.classList.add('selected');
    semanticState.selectedChoice = choiceKey;
    const confirm = document.getElementById('btn-semantic-thumbs-up');
    if (confirm) confirm.disabled = false;
}

async function semanticDropAnswer(choiceKey, optionEl, centerEl) {
    if (!choiceKey) return;
    if (semanticState.locked) return;
    const item = semanticState.item;
    if (!item) return;
    semanticState.locked = true;
    semanticSelectChoice(choiceKey, optionEl);
    const confirm = document.getElementById('btn-semantic-thumbs-up');
    if (confirm) confirm.disabled = true;
    if (choiceKey === item.correct) showSemanticConnection(optionEl, centerEl);
    await handleSemanticSelection(choiceKey);
}

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
    semanticState = { item: null, repetitions: 0, promptStartedAt: 0, locked: false, expansion: '', selectedChoice: null };
    getOrInitGameDifficulty('semantic', { paceMs: 850, level: 1, stableStreak: 0 });
    const replay = document.getElementById('btn-semantic-replay');
    if (replay) replay.onclick = async () => replaySemanticPrompt();
    const confirm = document.getElementById('btn-semantic-thumbs-up');
    if (confirm) confirm.onclick = async () => {
        if (semanticState.locked) return;
        if (!semanticState.selectedChoice) return;
        semanticState.locked = true;
        await handleSemanticSelection(semanticState.selectedChoice);
    };
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
    semanticState.selectedChoice = null;
    semanticState.locked = true;
    semanticState.promptStartedAt = 0;
    semanticDragSourceEl = null;
    semanticDragChoice = '';
    semanticTouchDrag = null;
    clearSemanticConnection();

    updateSemanticProgress(level, SEMANTIC_MAX_LEVEL);
    const levelEl = document.getElementById('semantic-level');
    if (levelEl) levelEl.textContent = `Unterlevel ${level}/${SEMANTIC_MAX_LEVEL}`;
    const stageBox = document.getElementById('semantic-stage');
    if (stageBox) stageBox.innerHTML = `<div class="semantic-ear-hint"><span class="semantic-ear-icon">👂</span><span class="semantic-ear-text">Hör gut zu und sag uns, was passt dazu?</span></div>`;
    const center = document.getElementById('semantic-center');
    const opts = document.getElementById('semantic-options');
    if (!center || !opts) return;
    center.innerHTML = '';
    opts.innerHTML = '';

    const showHints = !!appSettings.observationMode;
    const centerCard = renderWordCard({ word: item.center, label: displayWordFromKey(item.center), idx: 0, difficulty: 'leicht', showLabel: false, showMicroLabel: showHints });
    center.appendChild(centerCard);
    if (centerCard) {
        centerCard.addEventListener('dragover', (e) => {
            e.preventDefault();
            centerCard.classList.add('semantic-drop-target');
        });
        centerCard.addEventListener('dragleave', () => {
            centerCard.classList.remove('semantic-drop-target');
        });
        centerCard.addEventListener('drop', async (e) => {
            e.preventDefault();
            centerCard.classList.remove('semantic-drop-target');
            const raw = (e.dataTransfer && (e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text'))) || '';
            const picked = semanticDragSourceEl;
            const finalChoice = semanticDragChoice || String(raw || '').trim();
            if (semanticDragSourceEl) {
                try { semanticDragSourceEl.classList.remove('is-dragging'); } catch {}
            }
            semanticDragSourceEl = null;
            semanticDragChoice = '';
            await semanticDropAnswer(finalChoice, picked, centerCard);
        });
    }
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
                semanticSelectChoice(w, el);
                speakWord(displayWordFromKey(w));
            }
        });
        if (card) {
            card.setAttribute('draggable', 'true');
            card.addEventListener('dragstart', (e) => {
                if (semanticState.locked) {
                    try { e.preventDefault(); } catch {}
                    return;
                }
                semanticDragSourceEl = card;
                semanticDragChoice = w;
                card.classList.add('is-dragging');
                semanticSelectChoice(w, card);
                try {
                    if (e.dataTransfer) {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', w);
                    }
                } catch {}
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('is-dragging');
                if (semanticDragSourceEl === card) {
                    semanticDragSourceEl = null;
                    semanticDragChoice = '';
                }
                if (centerCard) centerCard.classList.remove('semantic-drop-target');
            });

            card.addEventListener('pointerdown', (e) => {
                if (semanticState.locked) return;
                if (!e.isPrimary) return;
                if (e.pointerType !== 'touch') return;
                semanticTouchDrag = {
                    pointerId: e.pointerId,
                    word: w,
                    sourceEl: card,
                    started: false,
                    startX: e.clientX,
                    startY: e.clientY,
                    ghostEl: null,
                    offsetX: 0,
                    offsetY: 0
                };
                try { card.setPointerCapture(e.pointerId); } catch {}
            });
            card.addEventListener('pointermove', (e) => {
                const s = semanticTouchDrag;
                if (!s) return;
                if (e.pointerId !== s.pointerId) return;
                const dx = e.clientX - s.startX;
                const dy = e.clientY - s.startY;
                const dist = Math.hypot(dx, dy);
                if (!s.started && dist < 10) return;
                if (!s.started) {
                    s.started = true;
                    const r = card.getBoundingClientRect();
                    s.offsetX = s.startX - r.left;
                    s.offsetY = s.startY - r.top;
                    const ghost = card.cloneNode(true);
                    ghost.classList.add('semantic-drag-ghost');
                    ghost.style.width = `${r.width}px`;
                    ghost.style.height = `${r.height}px`;
                    document.body.appendChild(ghost);
                    s.ghostEl = ghost;
                    card.classList.add('is-dragging');
                    semanticSelectChoice(w, card);
                }
                if (s.ghostEl) {
                    s.ghostEl.style.left = `${e.clientX - s.offsetX}px`;
                    s.ghostEl.style.top = `${e.clientY - s.offsetY}px`;
                }
                if (centerCard) {
                    const cr = centerCard.getBoundingClientRect();
                    const inside = e.clientX >= cr.left && e.clientX <= cr.right && e.clientY >= cr.top && e.clientY <= cr.bottom;
                    centerCard.classList.toggle('semantic-drop-target', inside);
                }
            });
            card.addEventListener('pointerup', async (e) => {
                const s = semanticTouchDrag;
                if (!s) return;
                if (e.pointerId !== s.pointerId) return;
                semanticTouchDrag = null;
                card.classList.remove('is-dragging');
                if (s.ghostEl) {
                    try { s.ghostEl.remove(); } catch {}
                }
                if (!s.started) return;
                if (!centerCard) return;
                centerCard.classList.remove('semantic-drop-target');
                const cr = centerCard.getBoundingClientRect();
                const inside = e.clientX >= cr.left && e.clientX <= cr.right && e.clientY >= cr.top && e.clientY <= cr.bottom;
                if (!inside) return;
                await semanticDropAnswer(w, card, centerCard);
            });
            card.addEventListener('pointercancel', () => {
                const s = semanticTouchDrag;
                if (!s) return;
                semanticTouchDrag = null;
                card.classList.remove('is-dragging');
                if (s.ghostEl) {
                    try { s.ghostEl.remove(); } catch {}
                }
                if (centerCard) centerCard.classList.remove('semantic-drop-target');
            });
        }
        opts.appendChild(card);
    });

    const expandBtn = document.getElementById('btn-semantic-expand');
    if (expandBtn) expandBtn.style.display = 'none';
    const confirm = document.getElementById('btn-semantic-thumbs-up');
    if (confirm) confirm.disabled = true;
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
        const opts = document.getElementById('semantic-options');
        if (opts) {
            const picked = opts.querySelector('.word-card.selected');
            if (picked) picked.classList.add('correct');
        }
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

    const opts = document.getElementById('semantic-options');
    if (opts) {
        const correctEl = Array.from(opts.querySelectorAll('.word-card')).find(el => el.dataset.word === normalizeWordKey(item.correct));
        if (correctEl) correctEl.classList.add('correct');
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
let listenState = { a: '', b: '', same: false, repetitions: 0, promptStartedAt: 0, locked: false, started: false };
let listenLastOpenAt = 0;
let listenIntroToken = 0;
let listenGuideToken = 0;
let listenReplayAttentionTimeout = null;

function flashListenReplayAttention(ms = 2000) {
    const btn = document.getElementById('btn-listen-replay');
    if (!btn) return;
    btn.classList.add('is-attention');
    if (listenReplayAttentionTimeout) {
        clearTimeout(listenReplayAttentionTimeout);
        listenReplayAttentionTimeout = null;
    }
    listenReplayAttentionTimeout = setTimeout(() => {
        btn.classList.remove('is-attention');
        listenReplayAttentionTimeout = null;
    }, Math.max(0, ms || 0));
}

function setListenGuideState(flags = {}) {
    const box = document.getElementById('listen-guide');
    if (!box) return;
    const ear = !!flags.ear;
    const miniButtons = !!flags.miniButtons;
    const question = !!flags.question;
    if (!ear && !miniButtons && !question) {
        box.innerHTML = '';
        box.style.display = 'none';
        return;
    }
    box.style.display = 'block';
    box.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'listen-guide-row';
    const left = document.createElement('div');
    left.className = 'listen-guide-left';
    const right = document.createElement('div');
    right.className = 'listen-guide-right';
    if (ear) {
        const icon = document.createElement('div');
        icon.className = 'listen-guide-icon';
        icon.textContent = '👂';
        left.appendChild(icon);
    }
    if (miniButtons) {
        const same = document.createElement('button');
        same.type = 'button';
        same.className = 'listen-guide-mini-symbol-btn same';
        same.textContent = '＝';
        same.setAttribute('aria-label', 'gleich');
        const diff = document.createElement('button');
        diff.type = 'button';
        diff.className = 'listen-guide-mini-symbol-btn diff';
        diff.textContent = '≠';
        diff.setAttribute('aria-label', 'anders');
        right.appendChild(same);
        right.appendChild(diff);
    }
    if (question) {
        const q = document.createElement('div');
        q.className = 'listen-guide-mini-q';
        q.textContent = '❓';
        right.appendChild(q);
    }
    row.appendChild(left);
    row.appendChild(right);
    box.appendChild(row);
}

const listenShakeTimers = new WeakMap();
function shakeListenElement(el) {
    if (!el) return;
    try { el.classList.remove('listen-shake'); } catch {}
    try { void el.offsetWidth; } catch {}
    try { el.classList.add('listen-shake'); } catch {}
    const prev = listenShakeTimers.get(el);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
        try { el.classList.remove('listen-shake'); } catch {}
        listenShakeTimers.delete(el);
    }, 1000);
    listenShakeTimers.set(el, t);
}

async function playListenIntroGuide() {
    const token = ++listenGuideToken;
    const replayBtn = document.getElementById('btn-listen-replay');
    const sameBtn = document.getElementById('btn-listen-same');
    const diffBtn = document.getElementById('btn-listen-diff');
    setListenGuideState({ ear: true });
    await speakAsync('Hör gut zu.', { rate: 0.7, pitch: 1.05, cancelBefore: true });
    if (token !== listenGuideToken) return;
    setListenGuideState({ ear: true, miniButtons: true });
    shakeListenElement(sameBtn);
    await speakAsync('Klingen sie gleich drückst du den grünen Knopf.', { rate: 0.7, pitch: 1.05, cancelBefore: false });
    if (token !== listenGuideToken) return;
    setListenGuideState({ ear: true, miniButtons: true });
    shakeListenElement(diffBtn);
    await speakAsync('Klingen sie nicht gleich drückst du den blauen Knopf.', { rate: 0.7, pitch: 1.05, cancelBefore: false });
    if (token !== listenGuideToken) return;
    setListenGuideState({ ear: true, question: true });
    shakeListenElement(replayBtn);
    await speakAsync('Drück auf das Fragezeichen.', { rate: 0.7, pitch: 1.05, cancelBefore: false });
    if (token !== listenGuideToken) return;
    await speakAsync('Und wir fangen an.', { rate: 0.7, pitch: 1.05, cancelBefore: false });
}

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
    const lw = normalizeWordKey(word);
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
    applyWordImage(img, lw, idx || 0, difficulty || 'leicht');
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
    stageBox.style.display = 'block';
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
    const t = nowMs();
    if (t - listenLastOpenAt < 650) return;
    listenLastOpenAt = t;
    showScreen('listen');
    listenState = { a: '', b: '', same: false, repetitions: 0, promptStartedAt: 0, locked: false, started: false };
    getOrInitGameDifficulty('listen', { paceMs: 850, gapMs: 520, level: 1, stableStreak: 0 });
    const replay = document.getElementById('btn-listen-replay');
    if (replay) replay.onclick = async () => { if (listenState.started) await replayListenPrompt(); };
    const sameBtn = document.getElementById('btn-listen-same');
    const diffBtn = document.getElementById('btn-listen-diff');
    if (sameBtn) sameBtn.onclick = async () => { if (listenState.started && !listenState.locked) await handleListenChoice(true); };
    if (diffBtn) diffBtn.onclick = async () => { if (listenState.started && !listenState.locked) await handleListenChoice(false); };
    const startBtn = document.getElementById('btn-listen-session-start');
    if (replay) replay.disabled = true;
    if (sameBtn) sameBtn.disabled = true;
    if (diffBtn) diffBtn.disabled = true;
    setListenGuideState({});
    const diff = getGameDifficulty('listen') || {};
    updateListenProgress(clamp(diff.level || 1, 1, LISTEN_MAX_LEVEL), LISTEN_MAX_LEVEL);
    const startSession = async () => {
        if (listenState.locked) return;
        if (listenState.started) return;
        listenState.started = true;
        listenIntroToken += 1;
        if (replay) replay.disabled = false;
        if (sameBtn) sameBtn.disabled = false;
        if (diffBtn) diffBtn.disabled = false;
        await nextListenTrial(true);
        await playListenIntroGuide();
    };
    if (startBtn) startBtn.onclick = async () => startSession();
}

async function replayListenPrompt() {
    if (!listenState.a) return;
    const replay = document.getElementById('btn-listen-replay');
    if (replay?.disabled) return;
    listenIntroToken += 1;
    if (listenReplayAttentionTimeout) {
        clearTimeout(listenReplayAttentionTimeout);
        listenReplayAttentionTimeout = null;
    }
    if (replay) replay.classList.remove('is-attention');
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
    const sublevel = clamp(diff.level || 1, 1, LISTEN_MAX_LEVEL);
    const levelEl = document.getElementById('listen-level');
    if (levelEl) levelEl.textContent = `Unterlevel ${sublevel}/${LISTEN_MAX_LEVEL}`;
    if (info) {
        info.innerHTML = `
            <span class="listen-info-line">Drück auf „Frag mich etwas ❓“.</span>
            <span class="listen-info-line">
                gleich
                <button type="button" class="listen-mini-symbol-btn same" aria-label="gleich">＝</button>
                oder anders
                <button type="button" class="listen-mini-symbol-btn diff" aria-label="anders">≠</button>
            </span>
        `;
        const miniSame = info.querySelector('.listen-mini-symbol-btn.same');
        const miniDiff = info.querySelector('.listen-mini-symbol-btn.diff');
        if (miniSame) miniSame.onclick = async () => { if (!listenState.locked) await handleListenChoice(true); };
        if (miniDiff) miniDiff.onclick = async () => { if (!listenState.locked) await handleListenChoice(false); };
    }
    if (stageBox) {
        stageBox.innerHTML = '';
        stageBox.style.display = 'none';
    }
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
            const gm = profile.gameMetrics?.[gid] || { trials: 0, correct: 0, repeats: 0, avgMs: null, totalMs: 0, runs: 0, sessionMs: 0, errorClusters: {} };
            const diff = profile.gameDifficulty?.[gid] || {};
            const rate = gm.trials ? Math.round((gm.correct / gm.trials) * 100) : 0;
            const errTop = Object.entries(gm.errorClusters || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(', ') || '–';
            const focus = meta.focusAreas.map(a => `${a} – ${PEDAGOGY.dimensions[a]}`).join(', ');
            const runs = typeof gm.runs === 'number' ? gm.runs : (gm.repeats || 0);
            const sessionMs = typeof gm.sessionMs === 'number' ? gm.sessionMs : (gm.totalMs || 0);
            const baseMetrics = `
                <div class="meta-metrics" style="margin-top:10px;">
                    <div class="progress-info"><span>Spiel</span><span>${meta.title}</span></div>
                    <div class="progress-info"><span>Förderbereich</span><span>${focus}</span></div>
                    <div class="progress-info"><span>Wiederholungen</span><span>${runs}x</span></div>
                    <div class="progress-info"><span>Gesamtzeit</span><span>${sessionMs ? formatDuration(sessionMs) : '–'}</span></div>
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
        const totalMsAllGames = games.reduce((sum, gid) => sum + (profile.gameMetrics?.[gid]?.sessionMs || profile.gameMetrics?.[gid]?.totalMs || 0), 0);
        const repeatsByDimension = {};
        games.forEach(gid => {
            const meta = GAME_METADATA[gid];
            const reps = profile.gameMetrics?.[gid]?.runs || profile.gameMetrics?.[gid]?.repeats || 0;
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

function renderBooks() {
    const root = document.getElementById('books-content');
    if (!root) return;
    root.innerHTML = '';
    BOOK_LIBRARY.forEach((b, idx) => {
        const card = document.createElement('div');
        card.className = 'level-card';
        card.innerHTML = `
            <div class="level-header">
                <div class="level-icon">📄</div>
                <div class="difficulty-badge difficulty-leicht">Buch</div>
            </div>
            <h3>${b.title}</h3>
            <p>${b.description}</p>
            <button class="btn btn-success" style="padding:10px 16px;border-radius:12px;font-size:0.95rem;">Lesen</button>
        `;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `${b.title} lesen`);
        const open = () => openBookReader(b.id);
        const btn = card.querySelector('button');
        if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); open(); });
        card.addEventListener('click', open);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
        root.appendChild(card);
    });
}

function openBookReader(bookId) {
    const book = BOOK_LIBRARY.find(b => b.id === bookId) || BOOK_LIBRARY[0];
    if (!book) return;
    bookState.activeId = book.id;
    const title = document.getElementById('book-reader-title');
    if (title) title.textContent = book.title || 'Buch';
    const frame = document.getElementById('book-pdf-frame');
    if (frame) {
        frame.src = book.pdfSrc || ensurePlaceholderPdfUrl();
    }
    showScreen('book_reader');
}

function cleanupBookReader() {
    const frame = document.getElementById('book-pdf-frame');
    if (frame) frame.src = 'about:blank';
    if (bookState.objectUrl) {
        try { URL.revokeObjectURL(bookState.objectUrl); } catch {}
    }
    bookState.objectUrl = '';
    bookState.activeId = '';
}

function ensurePlaceholderPdfUrl() {
    if (bookState.objectUrl) return bookState.objectUrl;
    const bytes = buildPlaceholderPdfBytes('Platzhalter PDF: Buch lesen');
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    bookState.objectUrl = url;
    return url;
}

function buildPlaceholderPdfBytes(titleText) {
    const enc = new TextEncoder();
    const parts = [];
    let length = 0;
    const push = (s) => { parts.push(s); length += enc.encode(s).length; };
    const offsets = Array(6).fill(0);
    const escapePdf = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const addObj = (n, body) => {
        offsets[n] = length;
        push(`${n} 0 obj\n${body}\nendobj\n`);
    };

    push('%PDF-1.4\n');
    addObj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    addObj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    addObj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');

    const content = `BT\n/F1 26 Tf\n72 770 Td\n(${escapePdf(titleText)}) Tj\nET\n`;
    const contentLen = enc.encode(content).length;
    addObj(4, `<< /Length ${contentLen} >>\nstream\n${content}endstream`);
    addObj(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    const xrefOffset = length;
    const pad10 = (n) => String(n).padStart(10, '0');
    push('xref\n0 6\n');
    push('0000000000 65535 f \n');
    for (let i = 1; i <= 5; i++) {
        push(`${pad10(offsets[i])} 00000 n \n`);
    }
    push('trailer\n<< /Size 6 /Root 1 0 R >>\n');
    push(`startxref\n${xrefOffset}\n%%EOF\n`);

    return enc.encode(parts.join(''));
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
        updateStoryQuizProgress();
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
    container.classList.toggle('edit-locked', !profileEditUnlocked);
    container.innerHTML = `
        <div class="overview-profile-line" role="group" aria-label="Kinderdetails">
            <div class="overview-profile-field">
                <span class="overview-profile-label">Avatar:</span>
                <span class="overview-profile-value" id="pc-avatar">${currentChild.avatar || '👤'}</span>
                <button class="icon-btn" id="edit-avatar" aria-label="Avatar bearbeiten">✎</button>
            </div>
            <div class="overview-profile-field">
                <span class="overview-profile-label">Name:</span>
                <span class="overview-profile-value" id="pc-name">${currentChild.name}</span>
                <button class="icon-btn" id="edit-name" aria-label="Name bearbeiten">✎</button>
            </div>
            <div class="overview-profile-field">
                <span class="overview-profile-label">Alter:</span>
                <span class="overview-profile-value" id="pc-age">${currentChild.age}</span>
                <button class="icon-btn" id="edit-age" aria-label="Alter bearbeiten">✎</button>
            </div>
            <div class="overview-profile-field">
                <span class="overview-profile-label">Gruppe:</span>
                <span class="overview-profile-value" id="pc-group">${group}</span>
                <button class="icon-btn" id="edit-group" aria-label="Gruppe bearbeiten">✎</button>
            </div>
        </div>
    `;
    const headerToggle = document.getElementById('btn-profile-edit-toggle');
    if (headerToggle) headerToggle.textContent = profileEditUnlocked ? 'Bearbeiten beenden' : 'Details bearbeiten';
    const editAvatar = document.getElementById('edit-avatar');
    const editName = document.getElementById('edit-name');
    const editAge = document.getElementById('edit-age');
    const editGroup = document.getElementById('edit-group');
    editAvatar.onclick = () => inlineSelect('pc-avatar', ['👧', '👦', '🧒', '👶', '👤'], v => {
        const val = String(v || '').trim() || '👤';
        currentChild.avatar = val;
        dataManager.saveUsers();
        const headerAvatar = document.getElementById('child-avatar');
        if (headerAvatar) headerAvatar.textContent = val;
        renderProfileCard();
    });
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

function inlineSelect(valueId, options, onSave) {
    const el = document.getElementById(valueId);
    if (!el) return;
    const current = String(el.textContent || '').trim();
    const select = document.createElement('select');
    select.className = 'voice-select';
    (options || []).forEach(opt => {
        const o = document.createElement('option');
        o.value = String(opt);
        o.textContent = String(opt);
        select.appendChild(o);
    });
    select.value = current;
    el.replaceWith(select);
    select.focus();
    const finalize = () => {
        onSave(select.value);
    };
    select.addEventListener('change', finalize);
    select.addEventListener('keydown', e => {
        if (e.key === 'Enter') finalize();
        if (e.key === 'Escape') renderProfileCard();
    });
    select.addEventListener('blur', finalize);
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
        const key = normalizeWordKey(word);
        wordCard.dataset.word = key;
        const preferred = [`./images/${currentSublevelData.bild_ordner}/${key}.png`, `./images/${currentSublevelData.bild_ordner}/${key}.jpg`];
        wordCard.innerHTML = `
            <div class="word-image-wrap">
                <img alt="${word}">
            </div>
            <div class="word-label">${word}</div>
        `;
        const imgEl = wordCard.querySelector('img');
        applyWordImage(imgEl, key, idx, currentLevelData.schwierigkeitsgrad, preferred);
        wordCard.addEventListener('click', () => {
            speakWord(word);
        });
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
