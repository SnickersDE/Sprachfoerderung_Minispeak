HAUPTANWENDUNG
 * ==============
 * Verknüpft UI, Datenverwaltung und Speech Recognition
 * 
 * Entwickler-Hinweise:
 * - Event-basierte Architektur
 * - State Management via globals (für Demo ausreichend)
 * - Für Produktion: State Management Library (z.B. Redux)
 */

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
    training: document.getElementById('training-screen')
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
    });
}

// Event Listeners
function setupEventListeners() {
    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        showScreen('login');
    });

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
    
    children.forEach(child => {
        const card = document.createElement('div');
        card.className = 'child-card';
        card.innerHTML = `
            <div class="avatar">${child.avatar}</div>
            <h3>${child.name}</h3>
            <p>${child.age} Jahre</p>
        `;
        card.addEventListener('click', () => selectChild(child.id));
        container.appendChild(card);
    });
}

// Kind auswählen
function selectChild(childId) {
    currentChild = dataManager.setCurrentChild(childId);
    document.getElementById('child-avatar').textContent = currentChild.avatar;
    document.getElementById('child-name').textContent = `${currentChild.name}s Fortschritt`;
    
    showScreen('overview');
    renderLevelsGrid();
}

// Render Levels-Grid
function renderLevelsGrid() {
    const container = document.getElementById('levels-grid');
    const levels = dataManager.getLevels();
    
    container.innerHTML = '';
    
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
        
        card.querySelector('button').addEventListener('click', () => startLevel(index));
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
    currentSublevelData.reim_ideen.forEach(word => {
        const wordCard = document.createElement('div');
        wordCard.className = 'word-card';
        wordCard.textContent = word;
        wordList.appendChild(wordCard);
    });
    
    // Reset UI
    document.getElementById('btn-record').style.display = 'inline-block';
    document.getElementById('btn-correct').style.display = 'none';
    document.getElementById('btn-retry').style.display = 'none';
    document.getElementById('word-image').innerHTML = '';
    document.getElementById('recognition-status').textContent = 'Drücke auf das Mikrofon zum Starten';
    document.querySelector('.mic-circle').classList.remove('recording');
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
    
    // Validiere Reim
    const result = speechRecognition.validateRhyme(
        transcript,
        currentSublevelData.reim_ideen
    );
    
    if (result.isCorrect) {
        // Richtig!
        document.getElementById('recognition-status').innerHTML = 
            `✅ Richtig! Du hast "<strong>${result.matchedWord}</strong>" gesagt!`;
        
        // Zeige Bild (falls vorhanden)
        showWordImage(result.matchedWord);
        
        // Zeige Feedback-Buttons
        document.getElementById('btn-record').style.display = 'none';
        document.getElementById('btn-correct').style.display = 'inline-block';
        document.getElementById('btn-retry').style.display = 'inline-block';
        
    } else {
        // Falsch
        document.getElementById('recognition-status').innerHTML = 
            `❌ Hmm, ich habe "<strong>${transcript}</strong>" verstanden. Versuch es nochmal!`;
        
        setTimeout(() => {
            document.getElementById('recognition-status').textContent = 
                'Drücke auf das Mikrofon zum Starten';
        }, 3000);
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
    const imagePath = `images/${currentSublevelData.bild_ordner}/${word.toLowerCase()}.png`;
    
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
```
