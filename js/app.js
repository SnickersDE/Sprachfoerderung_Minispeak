 

// State
let currentChild = null;
let currentLevelIndex = 0;
let currentSublevelIndex = 0;
let currentLevelData = null;
let currentSublevelData = null;

// UI Elemente
const screens = {
    login: document.getElementById('login-screen'),
    overview: document.getElementById('overview-screen'),
    training: document.getElementById('training-screen'),
    story: document.getElementById('story-screen')
};

// Initialisierung
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 App wird initialisiert...');
    
    // Warte auf DataManager
    await waitForDataManager();
    
    // Zeige Kinder-Auswahl
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
        storyStartBtn.addEventListener('click', () => openStoryGame());
    }
    const endStoryBtn = document.getElementById('btn-end-story');
    if (endStoryBtn) {
        endStoryBtn.addEventListener('click', () => {
            showScreen('overview');
            speechRecognition.onResult = (transcript, confidence) => {
                handleSpeechResult(transcript, confidence);
            };
            document.getElementById('story-text').innerHTML = '';
        });
    }
    const storyMic = document.getElementById('story-mic');
    if (storyMic) {
        storyMic.addEventListener('click', () => {
            document.getElementById('story-recognition-status').textContent = '🎤 Sprich jetzt ein Wort...';
            storyMic.classList.add('recording');
            speechRecognition.start();
        });
    }
    const playBtn = document.getElementById('btn-story-play');
    if (playBtn) playBtn.addEventListener('click', () => playStory());
    const stopBtn = document.getElementById('btn-story-stop');
    if (stopBtn) stopBtn.addEventListener('click', () => stopStory());
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
const STORY_WORDS = ['Haus','Laus','Maus','Auto','Bauernhof','Giraffe','Spielzeug','Seil','Loch'];
let availableVoices = [];
let selectedVoiceName = localStorage.getItem('story_voice_name') || '';

function openStoryGame() {
    storySelected = [];
    showScreen('story');
    renderStoryGame();
}

function renderStoryGame() {
    const list = document.getElementById('story-word-list');
    list.innerHTML = '';
    STORY_WORDS.forEach((word, idx) => {
        const card = document.createElement('div');
        card.className = 'word-card';
        card.dataset.word = word.toLowerCase();
        const imgPath = `./images/story/${word.toLowerCase()}.png`;
        card.innerHTML = `
            <div class="word-image-wrap">
                <img src="${imgPath}" alt="${word}">
            </div>
            <div class="word-label visually-hidden">${word}</div>
        `;
        const imgEl = card.querySelector('img');
        imgEl.onerror = () => {
            imgEl.src = generatePlaceholderPng(idx, 'leicht');
            imgEl.style.display = 'block';
        };
        card.addEventListener('click', () => {
            toggleStorySelection(word);
        });
        list.appendChild(card);
    });
    speechRecognition.onResult = (transcript) => {
        handleStorySpeechResult(transcript);
    };
    document.getElementById('story-recognition-status').textContent = 'Drücke auf das Mikrofon zum Starten';
    document.getElementById('story-mic').classList.remove('recording');
    document.getElementById('story-text').innerHTML = '';
    document.getElementById('story-info').textContent = 'Wähle oder sprich vier Wörter';
    loadVoices();
    populateVoiceSelect();
 }
function toggleStorySelection(word) {
    const w = word.toLowerCase();
    const idx = storySelected.findIndex(x => x.toLowerCase() === w);
    if (idx >= 0) {
        storySelected.splice(idx, 1);
        highlightStoryWord(w, false);
    } else {
        if (storySelected.length < 4) {
            storySelected.push(word);
            highlightStoryWord(w, true);
            if (storySelected.length === 4) {
                startStory();
            }
        }
    }
    document.getElementById('story-info').textContent = `Ausgewählt: ${storySelected.length}/4`;
}

function handleStorySpeechResult(transcript) {
    document.getElementById('story-mic').classList.remove('recording');
    const result = speechRecognition.validateRhyme(transcript, STORY_WORDS);
    document.getElementById('story-recognition-status').innerHTML = `Gesprochen: "<strong>${transcript}</strong>"`;
    if (result.matchedWord) toggleStorySelection(result.matchedWord);
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

let currentStoryText = '';

function startStory() {
    currentStoryText = generateStoryFromWords(storySelected);
    document.getElementById('story-text').textContent = currentStoryText;
    playStory();
}

function generateStoryFromWords(words) {
    const w = words.map(x => x.toLowerCase());
    const name = currentChild ? currentChild.name : 'Das Kind';
    const templates = [
        `${name} machte sich auf den Weg. Vor dem ${w[0]} traf es eine kleine ${w[1]}, die frech kicherte. Zusammen jagten sie eine neugierige ${w[2]}, bis plötzlich ein ${w[3]} hupte. Alle lachten, und am Ende gab es Kakao und Kekse.`,
        `Heute entdeckt ${name} etwas Neues. Beim ${w[0]} raschelte die ${w[1]} im Gras, die ${w[2]} schnupperte neugierig, und das ${w[3]} blinkte wie ein Stern. Es wurde ein fröhliches Abenteuer mit vielen Witzen und Purzelbäumen.`,
        `Es war ein sonniger Tag. ${name} sah zuerst ein ${w[0]}, dann kletterte eine ${w[1]} vorbei. Eine ${w[2]} winkte mit dem Schwanz, und ein ${w[3]} fuhr pfeifend vorbei. Alle erzählten lustige Geschichten und machten Quatsch bis die Sonne schlafen ging.`
    ];
    const intro = `Es ist Zeit für eine kleine Geschichte.`;
    const outro = `Und wenn alle müde werden, sagt die Geschichte Gute Nacht und kichert noch einmal.`;
    const mid = templates[Math.floor(Math.random() * templates.length)];
    const extra = `Am Ende gibt es eine große Umarmung und ein fröhliches Lächeln.`;
    const text = `${intro} ${mid} ${extra} ${outro}`;
    return text;
}

function playStory() {
    if (!currentStoryText || !currentStoryText.length) return;
    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(currentStoryText);
    utter.lang = 'de-DE';
    const voice = pickBestVoice();
    if (voice) utter.voice = voice;
    utter.rate = 1;
    utter.pitch = 1.1;
    window.speechSynthesis.speak(utter);
}

function stopStory() {
    window.speechSynthesis.cancel();
}

function loadVoices() {
    availableVoices = window.speechSynthesis.getVoices();
}

if (window.speechSynthesis && typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = () => {
        loadVoices();
        populateVoiceSelect();
    };
}

function populateVoiceSelect() {
    const select = document.getElementById('voice-select');
    if (!select) return;
    select.innerHTML = '';
    const deVoices = availableVoices.filter(v => v.lang && v.lang.startsWith('de'));
    const voicesToShow = deVoices.length ? deVoices : availableVoices;
    voicesToShow.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = `${v.name} (${v.lang})`;
        if (selectedVoiceName && v.name === selectedVoiceName) opt.selected = true;
        select.appendChild(opt);
    });
    select.addEventListener('change', () => {
        selectedVoiceName = select.value;
        localStorage.setItem('story_voice_name', selectedVoiceName);
    });
}

function pickBestVoice() {
    loadVoices();
    if (selectedVoiceName) {
        const match = availableVoices.find(v => v.name === selectedVoiceName);
        if (match) return match;
    }
    const deVoices = availableVoices.filter(v => v.lang && v.lang.startsWith('de'));
    const femaleRegex = /(Female|frau|Hedda|Katja|Maren|Anna|Lea|Google Deutsch|Microsoft Hedda)/i;
    const preferred = deVoices.find(v => femaleRegex.test(v.name)) || deVoices[0];
    return preferred || availableVoices[0] || null;
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
            <div class="word-label visually-hidden">${word}</div>
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
    document.getElementById('btn-correct').style.display = 'inline-block';
    document.getElementById('btn-retry').style.display = 'inline-block';
    document.getElementById('word-image').innerHTML = '';
    document.getElementById('recognition-status').textContent = speechRecognition.recognition ? 'Drücke auf das Mikrofon zum Starten' : 'Spracherkennung ist optional. Nutze ✓ Richtig oder ✗ Nochmal.';
    document.querySelector('.mic-circle').classList.remove('recording');
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
    document.getElementById('recognition-status').textContent = '🎤 Sprich jetzt ein Wort...';
    document.querySelector('.mic-circle').classList.add('recording');
    speechRecognition.start();
}

// Speech Result Handler
function handleSpeechResult(transcript, confidence) {
    document.querySelector('.mic-circle').classList.remove('recording');
    
    console.log(`Kind sagte: "${transcript}"`);
    
    const result = speechRecognition.validateRhyme(
        transcript,
        currentSublevelData.reim_ideen
    );
    
    document.getElementById('recognition-status').innerHTML = 
        `Gesprochen: "<strong>${transcript}</strong>"`;
    
    highlightMatchedWord(result.matchedWord);
    document.getElementById('word-image').innerHTML = '';
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



