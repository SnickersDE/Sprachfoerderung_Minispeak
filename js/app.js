 

// State
let currentChild = null;
let currentLevelIndex = 0;
let currentSublevelIndex = 0;
let currentLevelData = null;
let currentSublevelData = null;
let audioEnabled = true;
let currentScreenName = 'landing';
let navMode = 'kids';

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
    forum: document.getElementById('forum-screen'),
    videos: document.getElementById('videos-screen')
};

// Initialisierung
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 App wird initialisiert...');
    
    // Warte auf DataManager
    await waitForDataManager();

    setupImagePlaceholders();
    
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
            dataManager.completeSublevel(
                currentChild.id,
                currentLevelData.id,
                currentSublevelData.id
            );
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
    const landingContinue = document.getElementById('btn-landing-continue');
    if (landingContinue) {
        landingContinue.addEventListener('click', () => {
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
    showScreen('overview');
}

// Screen Navigation
function showScreen(screenName) {
    Object.keys(screens).forEach(name => {
        screens[name].classList.remove('active');
    });
    screens[screenName].classList.add('active');
    currentScreenName = screenName;
    const nav = document.getElementById('app-nav');
    if (nav) {
        nav.style.display = screenName === 'landing' ? 'none' : 'flex';
    }
    const titlebar = document.getElementById('app-titlebar');
    if (titlebar) {
        titlebar.style.display = screenName === 'landing' ? 'none' : 'flex';
    }
    setNavMode(screenName === 'forum' || screenName === 'videos' ? 'experts' : 'kids');
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
        card.innerHTML = `
            <div class="avatar">${child.avatar}</div>
            <h3>${child.name}</h3>
            <p>${child.age} Jahre</p>
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
    renderStoryGame();
}

// Reim-Memory
const MEMORY_LEVELS = {
    1: [
        { a: 'katze', b: 'tatze' },
        { a: 'hund', b: 'mund' },
        { a: 'hahn', b: 'bahn' },
        { a: 'maus', b: 'laus' },
        { a: 'kuh', b: 'schuh' },
        { a: 'ente', b: 'rente' }
    ],
    2: [
        { a: 'haus', b: 'maus' },
        { a: 'hand', b: 'sand' },
        { a: 'tisch', b: 'fisch' },
        { a: 'kiste', b: 'liste' },
        { a: 'tasse', b: 'klasse' },
        { a: 'lampe', b: 'rampe' }
    ],
    3: [
        { a: 'noten', b: 'boten' },
        { a: 'chor', b: 'tor' },
        { a: 'takt', b: 'pakt' },
        { a: 'klang', b: 'drang' },
        { a: 'saite', b: 'weite' },
        { a: 'note', b: 'rote' }
    ],
    4: [
        { a: 'kran', b: 'plan' },
        { a: 'stein', b: 'bein' },
        { a: 'mauer', b: 'bauer' },
        { a: 'zement', b: 'talent' },
        { a: 'laster', b: 'pflaster' },
        { a: 'eimer', b: 'reimer' }
    ],
    5: [
        { a: 'pille', b: 'brille' },
        { a: 'fieber', b: 'lieber' },
        { a: 'pflege', b: 'wege' },
        { a: 'narkose', b: 'rose' },
        { a: 'spritze', b: 'muetze' },
        { a: 'kur', b: 'uhr' }
    ],
    6: [
        { a: 'wagen', b: 'sagen' },
        { a: 'licht', b: 'pflicht' },
        { a: 'streife', b: 'reife' },
        { a: 'taeter', b: 'spaeter' },
        { a: 'alarm', b: 'warm' },
        { a: 'funk', b: 'trunk' }
    ],
    7: [
        { a: 'leiter', b: 'weiter' },
        { a: 'schlauch', b: 'bauch' },
        { a: 'brand', b: 'rand' },
        { a: 'flamme', b: 'klamme' },
        { a: 'rettung', b: 'bettung' },
        { a: 'sirene', b: 'szene' }
    ],
    8: [
        { a: 'tafel', b: 'stapel' },
        { a: 'stift', b: 'gift' },
        { a: 'lernen', b: 'sterne' },
        { a: 'lesen', b: 'wesen' },
        { a: 'buch', b: 'tuch' },
        { a: 'pause', b: 'maus' }
    ],
    9: [
        { a: 'hose', b: 'rose' },
        { a: 'mantel', b: 'handel' },
        { a: 'schal', b: 'wal' },
        { a: 'kappe', b: 'klappe' },
        { a: 'socke', b: 'glocke' },
        { a: 'hemd', b: 'fremd' }
    ],
    10: [
        { a: 'baum', b: 'traum' },
        { a: 'lichtung', b: 'richtung' },
        { a: 'pilz', b: 'filz' },
        { a: 'fuchs', b: 'luchs' },
        { a: 'moos', b: 'los' },
        { a: 'tanne', b: 'pfanne' }
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
    renderMemoryGame();
}

function renderMemoryGame() {
    const resetBtn = document.getElementById('btn-memory-reset');
    if (resetBtn) resetBtn.onclick = () => buildMemoryRound();
    const levelSelect = document.getElementById('memory-level');
    if (levelSelect) {
        levelSelect.onchange = () => buildMemoryRound();
    }
    buildMemoryRound();
}

function buildMemoryRound() {
    const grid = document.getElementById('memory-grid');
    if (!grid) return;
    const levelSelect = document.getElementById('memory-level');
    const currentLevel = parseInt(levelSelect ? levelSelect.value : '1', 10) || 1;
    const pairs = MEMORY_LEVELS[currentLevel] || MEMORY_LEVELS[1];
    const totalPairs = pairs.length;
    memoryTotalPairs = totalPairs;
    memoryDeck = [];
    memoryFoundPairs = 0;
    memoryFirst = null;
    memorySecond = null;
    memoryLock = false;
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
        card.addEventListener('click', () => handleMemoryCardClick(card, imgPath, item.word));
        grid.appendChild(card);
    });
    updateMemoryStatus(totalPairs);
}

function handleMemoryCardClick(card, imgPath, word) {
    if (memoryLock || card.classList.contains('found')) return;
    speakWord(word);
    const wrap = card.querySelector('.memory-card-back .word-image-wrap');
    const label = card.querySelector('.memory-card-back .word-label');
    const img = new Image();
    img.src = imgPath;
    img.alt = word;
    img.onerror = () => {
        if (!wrap) return;
        wrap.innerHTML = '<div class="placeholder">?</div>';
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
        return;
    }
    if (memoryFirst === card) return;
    memorySecond = card;
    memoryLock = true;
    const isMatch = memoryFirst.dataset.pair === memorySecond.dataset.pair;
    if (isMatch) {
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
    const words = LEVEL_WORDS[currentVocabLevel] || [];
    words.forEach((word, idx) => {
        const card = document.createElement('div');
        card.className = 'word-card';
        card.dataset.word = word.toLowerCase();
        const imgPath = `./images/story/${word.toLowerCase()}.png`;
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
            const lw = word.toLowerCase();
            highlightStoryWord(lw, true);
            activeTargetWord = lw;
            const srs5 = document.getElementById('story-recognition-status');
            if (srs5) srs5.textContent = `Sprich: ${word}`;
            speechRecognition.onResult = (transcript) => handleActiveWordResult(transcript);
            speechRecognition.setReadingMode(false);
            speechRecognition.start();
        });
        list.appendChild(card);
    });
    const srs6 = document.getElementById('story-recognition-status');
    if (srs6) srs6.textContent = 'Tippe ein Bild, dann spreche ich das Wort';
    document.getElementById('story-info').textContent = `Level ${currentVocabLevel} – Tippe ein Bild und ich spreche das Wort`;
    const nextBtn = document.getElementById('btn-next-level');
    if (nextBtn) {
        nextBtn.classList.remove('btn-secondary');
        nextBtn.classList.add('btn-success');
        nextBtn.style.display = doneWords.size >= words.length && words.length ? 'inline-block' : 'none';
    }
    const quizStart = document.getElementById('btn-story-quiz-start');
    if (quizStart) {
        quizStart.onclick = () => nextStoryQuizStep();
        quizStart.textContent = 'Beginne das Spiel';
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
    if (quizWrap) quizWrap.style.display = storyQuizActive ? 'block' : 'none';
    if (quizMic) quizMic.style.display = storyQuizActive ? 'inline-block' : 'none';
    if (quizBack) quizBack.style.display = storyQuizActive ? 'inline-block' : 'none';
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

function loadSoundProgress() {
    try {
        const raw = localStorage.getItem('sound_progress') || '{}';
        soundProgress = JSON.parse(raw);
    } catch {
        soundProgress = {};
    }
    Object.keys(SOUND_CATEGORIES).forEach(k => {
        if (!soundProgress[k]) soundProgress[k] = { done: [] };
    });
}
function saveSoundProgress() {
    localStorage.setItem('sound_progress', JSON.stringify(soundProgress));
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
}
function openSoundDetail(item) {
    showScreen('sound_detail');
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
            if (correct) {
                markSoundCompleted(soundCategory, item.id);
                showScreen('sound');
                openSoundCategory(soundCategory);
            } else {
                card.classList.remove('correct');
                setTimeout(() => {
                    card.classList.remove('correct');
                }, 600);
            }
        });
        grid.appendChild(card);
    });
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
        const audio = new Audio(path);
        audio.play();
    } catch {}
}

function speakWord(word) {
    try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(word);
        utter.lang = 'de-DE';
        const voice = pickKatjaVoice();
        if (voice) utter.voice = voice;
        utter.rate = 0.7;
        utter.pitch = 1.1;
        if (audioEnabled) window.speechSynthesis.speak(utter);
    } catch (e) {
        console.error('TTS Fehler:', e);
    }
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
    items.forEach(el => {
        if (el.dataset.word === word) {
            if (active) el.classList.add('correct'); else el.classList.remove('correct');
        }
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
        document.getElementById('story-info').textContent = 'Super! Kleine Quizrunde geschafft.';
        const nextBtn = document.getElementById('btn-next-level');
        if (nextBtn) nextBtn.style.display = 'inline-block';
        renderStoryGame();
        return;
    }
    const pool = shuffle(all).slice(0, 4);
    currentQuizTarget = pool[0];
    document.getElementById('story-info').textContent = `Zeig mir: ${currentQuizTarget}?`;
    const progressFill = document.getElementById('story-quiz-progress');
    if (progressFill) progressFill.style.width = `${Math.round((storyQuizRound/5)*100)}%`;
    const quizWrap = document.getElementById('story-quiz-progress-wrap');
    if (quizWrap) quizWrap.style.display = 'block';
    const quizMic = document.getElementById('btn-story-quiz-mic');
    if (quizMic) quizMic.style.display = 'inline-block';
    const quizBack = document.getElementById('btn-story-quiz-back');
    if (quizBack) quizBack.style.display = 'inline-block';
    renderQuizOptions(currentQuizTarget, pool);
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
            if (correct) {
                card.classList.add('correct');
                const wrap = card.querySelector('.word-image-wrap');
                const badge = document.createElement('div');
                badge.className = 'done-badge';
                badge.textContent = '✓';
                wrap.appendChild(badge);
                if (nextBtn) { nextBtn.disabled = false; nextBtn.textContent = 'nächste Frage'; }
            } else {
                card.classList.remove('correct');
                card.classList.add('active');
                setTimeout(() => { card.classList.remove('active'); }, 400);
            }
        });
        list.appendChild(card);
    });
    const nextBtn = document.getElementById('btn-story-quiz-start');
    if (nextBtn) nextBtn.disabled = true;
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
}
function startVideoQuiz() {
    const v = VIDEO_LEVELS[videoIndex];
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
            const wasSelected = videoSelected.has(opt);
            if (wasSelected) {
                videoSelected.delete(opt);
                card.classList.remove('correct');
            } else {
                videoSelected.add(opt);
                card.classList.add('correct');
            }
            validateVideoSelection();
        });
        grid.appendChild(card);
    });
    validateVideoSelection();
}
function validateVideoSelection() {
    const v = VIDEO_LEVELS[videoIndex];
    const next = document.getElementById('btn-video-next');
    if (!next) return;
    const selectedSorted = Array.from(videoSelected).sort();
    const correctSorted = v.correct.slice().sort();
    const ok = selectedSorted.length === correctSorted.length && selectedSorted.every((x, i) => x === correctSorted[i]);
    next.disabled = !ok;
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

function renderForum() {
    const root = document.getElementById('forum-content');
    if (!root) return;
    const topics = [
        { id: 'start', title: 'Wie starte ich am besten?', body: 'Kurze tägliche Einheiten (5–10 Minuten) funktionieren oft besser als seltene lange. Starte mit 1 Spiel, bleibe in einer Routine und lobe konkrete Fortschritte.' },
        { id: 'audio', title: 'Audio sinnvoll nutzen', body: 'Nutze Audio als Unterstützung: erst gemeinsam hören, dann nachsprechen. Wenn das Kind müde ist, Audio ausschalten und nur zeigen/benennen lassen.' },
        { id: 'motivation', title: 'Motivation & Frust vermeiden', body: 'Wenn Frust aufkommt: Aufgabe vereinfachen, Erfolgserlebnisse einbauen, Pausen erlauben. Lieber 3 richtige Antworten feiern als 10 erzwingen.' }
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
                <p>${t.body}</p>
                <div class="action-buttons" style="margin-top:16px;">
                    <button id="btn-forum-back-list" class="btn btn-secondary">Zur Themenliste</button>
                </div>
            </div>
        `;
        const b = document.getElementById('btn-forum-back-list');
        if (b) b.onclick = () => renderForum();
    };
    root.innerHTML = '';
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
    if (res.matchedWord) {
        markWordDone(activeTargetWord);
        activeTargetWord = null;
        if (srs) srs.textContent = 'Super! Wähle das nächste Bild.';
    } else {
        if (srs) srs.textContent = 'Fast! Versuch es nochmal.';
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
            <p>${level.beschreibung}</p>
            <div class="progress-info">
                <span>Fortschritt</span>
                <span>${completed}/${total}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <button class="btn btn-primary" style="margin-top: 15px; width: 100%;">
                ${completed === 0 ? 'Starten' : 'Fortsetzen'} →
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
            wordCard.classList.toggle('correct');
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
    const micro = document.querySelector('#training-screen .microphone-section');
    const actions = document.querySelector('#training-screen .action-buttons');
    if (micro && actions && micro.parentElement !== actions) {
        actions.prepend(micro);
    }
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
    }
}

// Speech Error Handler
function handleSpeechError(error) {
    const mic = document.querySelector('.mic-circle');
    if (mic) mic.classList.remove('recording');
    
    let message = 'Fehler bei der Aufnahme.';
    
    switch(error) {
        case 'no-speech':
            message = '🤔 Ich habe nichts gehört. Versuch es nochmal!';
            break;
        case 'audio-capture':
            message = '🎤 Mikrofon-Problem. Prüfe deine Einstellungen.';
            break;
        case 'not-allowed':
            message = '⛔ Bitte erlaube Mikrofon-Zugriff.';
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
    // Markiere als abgeschlossen
    dataManager.completeSublevel(
        currentChild.id,
        currentLevelData.id,
        currentSublevelData.id
    );
    
    // Nächster Sublevel oder zurück zur Übersicht
    if (currentSublevelIndex < currentLevelData.sublevels.length - 1) {
        currentSublevelIndex++;
        renderTrainingScreen();
    } else {
        // Level abgeschlossen!
        alert(`🎉 Toll gemacht! Du hast ${currentLevelData.name} abgeschlossen!`);
        showScreen('overview');
        renderLevelsGrid();
    }
}

// Nochmal versuchen
function handleRetry() {
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
