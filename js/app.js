

// State
let currentChild = null;
let currentLevelIndex = 0;
let currentSublevelIndex = 0;
let currentLevelData = null;
let currentSublevelData = null;

// UI Elemente
const screens = {
    login: document.getElementById('login-screen'),
    landing: document.getElementById('landing-screen'),
    overview: document.getElementById('overview-screen'),
    training: document.getElementById('training-screen'),
    story: document.getElementById('story-screen'),
    memory: document.getElementById('memory-screen'),
    sound: document.getElementById('sound-screen'),
    sound_detail: document.getElementById('sound-detail-screen')
};

// Initialisierung
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 App wird initialisiert...');
    
    // Warte auf DataManager
    await waitForDataManager();
    
    // Zeige Kinder-Auswahl initial
    renderChildrenList();
    
    // Setup Event Listeners
    setupEventListeners();
    
    console.log('✅ App bereit!');
});

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
    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        showScreen('login');
    });
    
    const resetBtn = document.getElementById('btn-reset-progress');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (!currentChild) return;
            dataManager.resetProgress(currentChild.id);
            renderLevelsGrid();
        });
    }

    // Training beenden
    document.getElementById('btn-end-training').addEventListener('click', () => {
        showScreen('overview');
        renderLevelsGrid();
    });

    // Aufnahme-Button
    document.getElementById('btn-record').addEventListener('click', () => {
        startRecording();
    });
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
    const navTitle = document.getElementById('btn-nav-title');
    if (navKinder) {
        navKinder.addEventListener('click', () => {
            showScreen('login');
            renderChildrenList();
        });
    }
    if (navOverview) {
        navOverview.addEventListener('click', () => {
            showScreen('overview');
            renderLevelsGrid();
        });
    }
    if (navTitle) {
        navTitle.addEventListener('click', () => {
            showScreen('landing');
        });
    }
    const landingContinue = document.getElementById('btn-landing-continue');
    if (landingContinue) {
        landingContinue.addEventListener('click', () => {
            showScreen('login');
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
    const memory2Card = document.getElementById('memory2-card');
    const memory3Card = document.getElementById('memory3-card');
    const memory1StartBtn = document.getElementById('btn-memory1-start');
    const memory2StartBtn = document.getElementById('btn-memory2-start');
    const memory3StartBtn = document.getElementById('btn-memory3-start');
    if (memory1Card) {
        memory1Card.addEventListener('click', () => { memoryLevel = 1; openMemoryGame(); });
        memory1Card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); memoryLevel = 1; openMemoryGame(); } });
    }
    if (memory2Card) {
        memory2Card.addEventListener('click', () => { memoryLevel = 2; openMemoryGame(); });
        memory2Card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); memoryLevel = 2; openMemoryGame(); } });
    }
    if (memory3Card) {
        memory3Card.addEventListener('click', () => { memoryLevel = 3; openMemoryGame(); });
        memory3Card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); memoryLevel = 3; openMemoryGame(); } });
    }
    if (memory1StartBtn) memory1StartBtn.addEventListener('click', () => { memoryLevel = 1; openMemoryGame(); });
    if (memory2StartBtn) memory2StartBtn.addEventListener('click', () => { memoryLevel = 2; openMemoryGame(); });
    if (memory3StartBtn) memory3StartBtn.addEventListener('click', () => { memoryLevel = 3; openMemoryGame(); });
    const soundCard = document.getElementById('sound-card');
    const soundStartBtn = document.getElementById('btn-sound-start');
    if (soundCard) {
        soundCard.addEventListener('click', () => openSoundGame());
        soundCard.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSoundGame(); } });
    }
    if (soundStartBtn) soundStartBtn.addEventListener('click', () => openSoundGame());
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
    const storyMic = document.getElementById('story-mic');
    if (storyMic) {
        storyMic.addEventListener('click', () => {
            document.getElementById('story-recognition-status').textContent = 'Ich spreche langsam: Tippe ein Bild!';
            try {
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance('Tippe ein Bild, dann sage ich das Wort.');
                utter.lang = 'de-DE';
                const voice = pickKatjaVoice();
                if (voice) utter.voice = voice;
                utter.rate = 0.75;
                utter.pitch = 1.0;
                window.speechSynthesis.speak(utter);
            } catch {}
        });
    }
    const nextBtn = document.getElementById('btn-next-level');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentVocabLevel < 3) {
                currentVocabLevel += 1;
                doneWords.clear();
                activeTargetWord = null;
                renderStoryGame();
                document.getElementById('story-recognition-status').textContent = 'Neues Level! Tippe ein Bild.';
            } else {
                document.getElementById('story-recognition-status').textContent = 'Alle Levels geschafft! 🎉';
                nextBtn.style.display = 'none';
            }
        });
    }
}

// Screen Navigation
function showScreen(screenName) {
    Object.keys(screens).forEach(name => {
        screens[name].classList.remove('active');
    });
    screens[screenName].classList.add('active');
}

// Render Kinder-Liste
function renderChildrenList() {
    const container = document.getElementById('children-list');
    const children = dataManager.getChildren();
    
    container.innerHTML = '';
    
    if (!children || children.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'info-box';
        empty.innerHTML = `<p>Keine Kinderdaten gefunden. Bitte aktualisiere die Seite oder prüfe die Datei <code>./data/users.json</code>.</p>`;
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

let storySelected = [];
const LEVEL_WORDS = {
    1: ['Haus','Laus','Maus','Auto','Seil','Loch','Meer','Fuß','Tisch','Buch','Uhr','Stuhl','Turm','Pferd'],
    2: ['Papa','Mama','Ritter','Schuhe','Hallo','Wolke','Lampe','Koffer','Tasche','Fenster','Spielzeug','Einhorn','Katze','Tatze'],
    3: ['Krawatte','Computer','Weihnachtsmann','Pinguin','Elefant','Bauernhof','Prinzessin','Giraffe','Drache']
};
let currentVocabLevel = 1;
let doneWords = new Set();
let activeTargetWord = null;
let openAiKey = localStorage.getItem('openai_key') || '';
let readingActive = false;
let readingShown = new Set();
let readingTargets = [];

function openStoryGame() {
    storySelected = [];
    showScreen('story');
    renderStoryGame();
}

// Reim-Memory
let memoryLevel = 1;
let memoryTarget = '';
let memoryRhymeSet = [];
let memoryFoundCount = 0;

function openMemoryGame() {
    showScreen('memory');
    memoryLevel = 1;
    renderMemoryGame();
}

function renderMemoryGame() {
    const levelSelect = document.getElementById('memory-level');
    if (levelSelect) {
        levelSelect.value = String(memoryLevel);
        levelSelect.onchange = () => {
            memoryLevel = parseInt(levelSelect.value, 10) || 1;
            buildMemoryRound();
        };
    }
    const playBtn = document.getElementById('btn-memory-play');
    if (playBtn) playBtn.onclick = () => playTargetAudio();
    const resetBtn = document.getElementById('btn-memory-reset');
    if (resetBtn) resetBtn.onclick = () => buildMemoryRound();
    buildMemoryRound();
}

function getRhymeGroupsForLevel(memLevel) {
    return dataManager.getRhymeGroupsForMemoryLevel(memLevel);
}

function buildMemoryRound() {
    const grid = document.getElementById('memory-grid');
    if (!grid) return;
    const groups = getRhymeGroupsForLevel(memoryLevel);
    const targetGroup = groups[Math.floor(Math.random() * groups.length)];
    memoryTarget = targetGroup[Math.floor(Math.random() * targetGroup.length)];
    memoryRhymeSet = targetGroup.slice();
    memoryFoundCount = 0;
    grid.innerHTML = '';
    const targetBox = document.getElementById('memory-target');
    if (targetBox) {
        const folder = `level${memoryLevel}`;
        const path = `./images/${folder}/${memoryTarget.toLowerCase()}.png`;
        const img = new Image();
        img.onload = () => { targetBox.innerHTML = `<img src="${path}" alt="${memoryTarget}">`; };
        img.onerror = () => { targetBox.innerHTML = `<img src="${generatePlaceholderPng(0, memoryLevel === 1 ? 'leicht' : memoryLevel === 2 ? 'mittel' : 'schwer')}" alt="${memoryTarget}">`; };
        img.src = path;
    }
    const rhymeCount = memoryLevel === 1 ? 2 : memoryLevel === 2 ? 3 : 4;
    const distractorCount = memoryLevel === 1 ? 2 : memoryLevel === 2 ? 3 : 4;
    const rhymeChoices = shuffle(memoryRhymeSet.filter(w => w !== memoryTarget)).slice(0, rhymeCount);
    const nonRhymesPool = dataManager.getNonRhymesForMemoryLevel(memoryLevel);
    const distractors = [];
    for (let i = 0; i < nonRhymesPool.length && distractors.length < distractorCount; i++) {
        const w = nonRhymesPool[i];
        if (!memoryRhymeSet.includes(w) && !distractors.includes(w)) distractors.push(w);
    }
    const cards = shuffle([...rhymeChoices, ...distractors]);
    const folder = `level${memoryLevel}`;
    cards.forEach((word, idx) => {
        const card = document.createElement('div');
        card.className = 'word-card';
        card.dataset.word = word.toLowerCase();
        const imgPath = `./images/${folder}/${word.toLowerCase()}.png`;
        card.innerHTML = `
            <div class="word-image-wrap">
                <div class="placeholder">?</div>
            </div>
            <div class="word-label visually-hidden">${word}</div>
        `;
        card.addEventListener('click', () => handleMemoryCardClick(card, imgPath, word));
        grid.appendChild(card);
    });
    updateMemoryStatus();
}

function handleMemoryCardClick(card, imgPath, word) {
    const wrap = card.querySelector('.word-image-wrap');
    const label = card.querySelector('.word-label');
    const img = new Image();
    img.src = imgPath;
    img.alt = word;
    img.onerror = () => {
        wrap.innerHTML = '';
        const ph = document.createElement('div');
        ph.className = 'placeholder';
        ph.textContent = '?';
        wrap.appendChild(ph);
    };
    img.onload = () => {
        wrap.innerHTML = '';
        wrap.appendChild(img);
        label.classList.remove('visually-hidden');
    };
    speakWord(word);
    const isRhyme = memoryRhymeSet.includes(word);
    if (isRhyme) {
        card.classList.add('correct');
        const badge = document.createElement('div');
        badge.className = 'done-badge';
        badge.textContent = '✓';
        const existing = wrap.querySelector('.done-badge');
        if (!existing) wrap.appendChild(badge);
        memoryFoundCount++;
        updateMemoryStatus();
        const targetTotal = Math.min(memoryRhymeSet.length - 1, (memoryLevel === 1 ? 2 : memoryLevel === 2 ? 3 : 4));
        if (memoryFoundCount >= targetTotal) {
            document.getElementById('memory-info').textContent = 'Super! Runde geschafft!';
        }
    } else {
        setTimeout(() => {
            wrap.innerHTML = '<div class="placeholder">?</div>';
            label.classList.add('visually-hidden');
            card.classList.remove('correct');
        }, 900);
    }
}

function updateMemoryStatus() {
    const total = (memoryLevel === 1 ? 2 : memoryLevel === 2 ? 3 : 4);
    const box = document.getElementById('memory-status');
    if (box) box.innerHTML = `<p>Gefundene Reime: ${memoryFoundCount}/${total} • Zielwort: ${memoryTarget}</p>`;
    const pf = document.getElementById('memory-progress-fill');
    if (pf) {
        const pct = total ? Math.round((memoryFoundCount / total) * 100) : 0;
        pf.style.width = `${pct}%`;
    }
}

function playTargetAudio() {
    if (!memoryTarget) return;
    speakWord(memoryTarget);
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
            document.getElementById('story-recognition-status').textContent = `Sprich: ${word}`;
            speechRecognition.onResult = (transcript) => handleActiveWordResult(transcript);
            speechRecognition.setReadingMode(false);
            speechRecognition.start();
        });
        list.appendChild(card);
    });
    document.getElementById('story-recognition-status').textContent = 'Tippe ein Bild, dann spreche ich das Wort';
    document.getElementById('story-mic').classList.remove('recording');
    document.getElementById('story-info').textContent = `Level ${currentVocabLevel} – Tippe ein Bild und ich spreche das Wort`;
    const nextBtn = document.getElementById('btn-next-level');
    if (nextBtn) nextBtn.style.display = doneWords.size >= words.length && words.length ? 'inline-block' : 'none';
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
            <div class="action-buttons">
                <button class="btn btn-success">🟢 Abspielen</button>
                <button class="btn btn-primary">Auswählen</button>
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
        utter.rate = 0.75;
        utter.pitch = 1.0;
        window.speechSynthesis.speak(utter);
    } catch (e) {
        console.error('TTS Fehler:', e);
    }
}

function pickKatjaVoice() {
    const voices = window.speechSynthesis.getVoices() || [];
    const matchKatja = voices.find(v => /katja/i.test(v.name));
    if (matchKatja) return matchKatja;
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
    document.getElementById('story-recognition-status').innerHTML = `Gesprochen: "<strong>${transcript}</strong>"`;
    if (res.matchedWord) {
        markWordDone(activeTargetWord);
        activeTargetWord = null;
        document.getElementById('story-recognition-status').textContent = 'Super! Wähle das nächste Bild.';
    } else {
        document.getElementById('story-recognition-status').textContent = 'Fast! Versuch es nochmal.';
        speechRecognition.start();
    }
}

let currentStoryText = '';

async function startStory() {
    document.getElementById('story-text').textContent = 'Die Geschichte wird gerade geschrieben...';
    try {
        if (!openAiKey) {
            currentStoryText = 'Bitte gib deinen OpenAI API Key ein, um die Geschichte zu erzeugen.';
        } else {
            currentStoryText = await generateCreativeStoryOpenAI(storySelected);
        }
    } catch (e) {
        currentStoryText = 'Die Geschichte konnte gerade nicht erzeugt werden.';
    }
    document.getElementById('story-text').textContent = currentStoryText;
    readingShown.clear();
    readingTargets = extractTargetsFromStory(currentStoryText, STORY_WORDS);
}

function generateStoryFromWords(words) {
    const lower = words.map(x => x.toLowerCase());
    const dict = {
        haus: {def:'das', noun:'Haus'},
        laus: {def:'die', noun:'Laus'},
        maus: {def:'die', noun:'Maus'},
        auto: {def:'das', noun:'Auto'},
        bauernhof: {def:'der', noun:'Bauernhof'},
        giraffe: {def:'die', noun:'Giraffe'},
        spielzeug: {def:'das', noun:'Spielzeug'},
        seil: {def:'das', noun:'Seil'},
        loch: {def:'das', noun:'Loch'}
    };
    const defPhrase = (key) => {
        const d = dict[key] || {def:'das', noun:key};
        const art = d.def.charAt(0).toUpperCase() + d.def.slice(1);
        return `${art} ${d.noun}`;
    };
    const name = currentChild ? currentChild.name : 'Das Kind';
    const p0 = defPhrase(lower[0]);
    const p1 = defPhrase(lower[1]);
    const p2 = defPhrase(lower[2]);
    const p3 = defPhrase(lower[3]);
    const intro = `Es ist Zeit für eine kleine Geschichte.`;
    const extra = `Am Ende gibt es eine große Umarmung und ein fröhliches Lächeln.`;
    const outro = `Dann sagt die Geschichte Gute Nacht und kichert ein letztes Mal.`;
    const phrases = [p0, p1, p2, p3];
    const mid = phrases.join(', ');
    return `${intro} ${name} entdeckt heute ${mid}. ${extra} ${outro}`;
}

function randPick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

function generateProceduralStory(words) {
    const lower = words.map(x => x.toLowerCase());
    const dict = {
        haus: {def:'das', noun:'Haus'}, laus: {def:'die', noun:'Laus'}, maus: {def:'die', noun:'Maus'},
        auto: {def:'das', noun:'Auto'}, bauernhof: {def:'der', noun:'Bauernhof'}, giraffe: {def:'die', noun:'Giraffe'},
        spielzeug: {def:'das', noun:'Spielzeug'}, seil: {def:'das', noun:'Seil'}, loch: {def:'das', noun:'Loch'},
        papa: {def:'der', noun:'Papa'}, mama: {def:'die', noun:'Mama'}, turm: {def:'der', noun:'Turm'},
        prinzessin: {def:'die', noun:'Prinzessin'}, ritter: {def:'der', noun:'Ritter'}, pferd: {def:'das', noun:'Pferd'},
        einhorn: {def:'das', noun:'Einhorn'}, drache: {def:'der', noun:'Drache'}
    };
    const artNoun = (k) => {
        const d = dict[k] || {def:'das', noun:k};
        return `${d.def} ${d.noun}`;
    };
    const actions = {
        haus: ['leuchtet warm', 'steht ganz still', 'knarzt leise'],
        laus: ['krabbelt flink', 'kichert leise', 'versteckt sich kurz'],
        maus: ['flitzt schnell', 'kichert frech', 'huscht vorbei'],
        auto: ['hupt freundlich', 'fährt langsam vorbei', 'blinkt hell'],
        bauernhof: ['duftet nach Heu', 'ist heute sehr ruhig', 'klingt nach Musik'],
        giraffe: ['hüpft fröhlich', 'streckt den Hals weit', 'lacht leise'],
        spielzeug: ['funkelt bunt', 'klappert lustig', 'dreht sich im Kreis'],
        seil: ['schwingt sanft', 'zittert ein bisschen', 'liegt ganz ruhig'],
        loch: ['ist tief', 'ist geheimnisvoll', 'wartet still']
    };
    const starters = ['Plötzlich', 'Kurz darauf', 'Danach', 'Später', 'Zwischendurch'];
    const groupLines = [
        'Dann erzählen alle einen Witz.',
        'Kurz darauf klatschen alle in die Hände.',
        'Später zeichnen alle ein Herz in die Luft.',
        'Am Ende machen alle einen Purzelbaum.'
    ];
    const tokenizeAction = (s) => {
        const parts = s.split(' ');
        return { verb: parts[0], tail: parts.slice(1).join(' ') };
    };
    const sentenceForKey = (k) => {
        const phrase = artNoun(k);
        const act = randPick(actions[k] || ['ist fröhlich']);
        const tok = tokenizeAction(act);
        const useStarter = Math.random() < 0.5;
        if (useStarter) {
            const st = randPick(starters);
            return `${st} ${tok.verb} ${phrase}${tok.tail ? ' ' + tok.tail : ''}.`;
        }
        return `${cap(phrase)} ${tok.verb}${tok.tail ? ' ' + tok.tail : ''}.`;
    };
    const name = currentChild ? currentChild.name : 'Das Kind';
    const intro = `${name} erlebt heute etwas Wunderbares.`;
    const ensured = lower.map(k => sentenceForKey(k));
    const dialogTemplates = [
        (p) => `„Guten Morgen!“ sagt ${p}.`,
        (p) => `„Komm, wir spielen,“ sagt ${p}.`,
        (p) => `„Ich helfe dir,“ flüstert ${p}.`,
        (p) => `„Das ist lustig!“ ruft ${p}.`,
        (p) => `„Magst du mitkommen?“ fragt ${p}.`
    ];
    const extras = [];
    for (let i = 0; i < 4; i++) {
        const k = randPick(lower);
        const p = artNoun(k);
        extras.push(sentenceForKey(k));
        extras.push(randPick(dialogTemplates)(p));
        if (i % 2 === 1) extras.push(randPick(groupLines));
    }
    const outro = `Zum Schluss gibt es eine Umarmung und ein Lächeln.`;
    const all = [intro, ...ensured, ...extras, outro];
    const seen = new Set();
    const unique = [];
    for (const s of all) {
        const k = s.trim();
        if (!seen.has(k)) {
            seen.add(k);
            unique.push(s);
        }
    }
    let text = unique.join(' ');
    const wordsCount = text.split(/\s+/).length;
    if (wordsCount > 230) {
        text = text.split(/\s+/).slice(0, 220).join(' ') + '.';
    }
    return text;
}

async function generateCreativeStoryOpenAI(words) {
    const base = words.join(', ');
    const extra = ['Papa','Mama','Turm','Prinzessin','Ritter','Pferd','Einhorn','Drache'].join(', ');
    const prompt = `Erstelle eine kindgerechte Geschichte mit der Länge 300–350 Zeichen.
Baue die Begriffe ein: ${base}. Erweitere um: ${extra}.
Schreibe im Stil einer Kinderbuchautorin, ohne feste Bausteine, jedes Mal einzigartig.
Sprachebene passend für 4–6-Jährige, klare, korrekte Sätze.`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + openAiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {role:'system', content:'Du bist eine erfahrene Kinderbuchautorin. Du schreibst kurze, kindgerechte, einzigartige Geschichten in warmem Ton mit korrekter Grammatik.'},
                {role:'user', content: prompt}
            ],
            temperature: 0.95
        })
    });
    if (!res.ok) throw new Error('OpenAI story generation failed');
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return text.trim();
}

function playStory() {
    if (!currentStoryText || !currentStoryText.length) return;
    readingActive = true;
    document.getElementById('story-recognition-status').textContent = '🎤 Vorlesen aktiv – sprich die Wörter der Geschichte';
    document.getElementById('story-mic').classList.add('recording');
    speechRecognition.setReadingMode(true);
    speechRecognition.onResult = (transcript) => {
        handleReadingSpeech(transcript);
    };
    speechRecognition.start();
}

function stopStory() {
    readingActive = false;
    speechRecognition.stop();
    speechRecognition.setReadingMode(false);
    document.getElementById('story-mic').classList.remove('recording');
    document.getElementById('story-recognition-status').textContent = 'Vorlesen gestoppt';
    const seq = document.getElementById('story-sequence');
    if (seq) seq.innerHTML = '';
    readingShown.clear();
    const list = document.getElementById('story-word-list');
    list.querySelectorAll('.word-card.correct').forEach(el => el.classList.remove('correct'));
}

function appendSequenceImage(word) {
    const container = document.getElementById('story-sequence');
    if (!container) return;
    const img = document.createElement('img');
    const path = `./images/story/${word.toLowerCase()}.png`;
    img.src = path;
    img.alt = word;
    img.className = 'fade-in';
    img.onerror = () => {
        img.src = generatePlaceholderPng(0, 'leicht');
    };
    container.appendChild(img);
}

function handleReadingSpeech(transcript) {
    const res = speechRecognition.validateRhyme(transcript, readingTargets.length ? readingTargets : STORY_WORDS);
    if (res.matchedWord && !readingShown.has(res.matchedWord.toLowerCase())) {
        readingShown.add(res.matchedWord.toLowerCase());
        appendSequenceImage(res.matchedWord);
        highlightStoryWord(res.matchedWord.toLowerCase(), true);
        if (readingShown.size >= readingTargets.length) {
            stopStory();
        }
    }
}

function extractTargetsFromStory(text, dictionary) {
    const lower = text.toLowerCase();
    const seen = new Set();
    const ordered = [];
    dictionary.forEach(w => {
        const lw = w.toLowerCase();
        if (lower.includes(lw) && !seen.has(lw)) {
            seen.add(lw);
            ordered.push(lw);
        }
    });
    return ordered;
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
        info.innerHTML = `<p>Keine Levels verfügbar. Bitte prüfe die Datei <code>./data/levels.json</code>.</p>`;
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
    document.getElementById('btn-record').style.display = speechRecognition.recognition ? 'inline-block' : 'none';
    document.getElementById('btn-correct').style.display = 'none';
    document.getElementById('btn-retry').style.display = 'inline-block';
    document.getElementById('word-image').innerHTML = '';
    document.getElementById('recognition-status').textContent = speechRecognition.recognition ? 'Drücke auf das Mikrofon zum Starten' : 'Spracherkennung ist optional. Nutze ✓ Richtig oder ✗ Nochmal.';
    document.querySelector('.mic-circle').classList.remove('recording');
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
    const res = speechRecognition.validateRhyme(transcript, currentSublevelData.reim_ideen);
    if (res.matchedWord && res.isCorrect) {
        const w = res.matchedWord.toLowerCase();
        if (!trainingRecognized.has(w)) {
            trainingRecognized.add(w);
            trainingOrder.push(w);
            highlightMatchedWord(w);
            const statusEl = document.getElementById('recognition-status');
            if (statusEl) statusEl.textContent = `Erkannt: ${trainingRecognized.size}/${currentSublevelData.reim_ideen.length}`;
        }
        if (trainingRecognized.size >= currentSublevelData.reim_ideen.length) {
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
}

// Speech Error Handler
function handleSpeechError(error) {
    document.querySelector('.mic-circle').classList.remove('recording');
    
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
    
    document.getElementById('recognition-status').textContent = message;
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
