 

class SpeechRecognitionModule {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.onResult = null;
        this.onError = null;
        
        // KONFIGURATION - HIER ANPASSBAR
        this.SIMILARITY_THRESHOLD = 0.8; // 80% Ähnlichkeit nötig
        this.LANGUAGE = 'de-DE';
        this.MAX_RECORDING_TIME = 5000; // 5 Sekunden
        
        this.init();
    }

    init() {
        // Prüfe Browser-Unterstützung
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('❌ Speech Recognition nicht unterstützt in diesem Browser');
            this.recognition = null;
            return;
        }

        // Initialisiere Speech Recognition
        this.recognition = new SpeechRecognition();
        this.recognition.lang = this.LANGUAGE;
        this.recognition.continuous = false; // Nur ein Wort
        this.recognition.interimResults = false; // Nur finale Ergebnisse
        this.recognition.maxAlternatives = 3; // Top 3 Alternativen

        // Event Handler
        this.recognition.onstart = () => {
            console.log('🎤 Aufnahme gestartet');
            this.isRecording = true;
        };

        this.recognition.onresult = (event) => {
            console.log('📝 Speech Recognition Ergebnis:', event);
            const transcript = event.results[0][0].transcript.trim();
            const confidence = event.results[0][0].confidence;
            
            console.log(`Erkanntes Wort: "${transcript}" (Konfidenz: ${(confidence * 100).toFixed(1)}%)`);
            
            if (this.onResult) {
                this.onResult(transcript, confidence);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('❌ Speech Recognition Fehler:', event.error);
            this.isRecording = false;
            
            if (this.onError) {
                this.onError(event.error);
            }
        };

        this.recognition.onend = () => {
            console.log('🛑 Aufnahme beendet');
            this.isRecording = false;
        };

        console.log('✅ Speech Recognition initialisiert');
    }

    // Starte Aufnahme
    start() {
        if (!this.recognition) {
            console.warn('Speech Recognition nicht verfügbar');
            return;
        }

        if (this.isRecording) {
            console.warn('⚠️ Aufnahme läuft bereits');
            return;
        }

        try {
            this.recognition.start();
            
            // Auto-Stop nach MAX_RECORDING_TIME
            setTimeout(() => {
                if (this.isRecording) {
                    this.stop();
                }
            }, this.MAX_RECORDING_TIME);
            
        } catch (error) {
            console.error('Fehler beim Starten:', error);
        }
    }

    // Stoppe Aufnahme
    stop() {
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
        }
    }

    /**
     * REIM-VALIDIERUNG
     * ================
     * Prüft ob erkanntes Wort zu einem der Ziel-Reime passt
     * 
     * @param {string} spokenWord - Erkanntes Wort vom Kind
     * @param {Array} targetWords - Liste gültiger Reim-Wörter
     * @returns {Object} - { isCorrect, matchedWord, similarity }
     */
    validateRhyme(spokenWord, targetWords) {
        console.log(`🔍 Validiere: "${spokenWord}" gegen`, targetWords);
        
        spokenWord = this.normalizeWord(spokenWord);
        const normalizedTargets = targetWords.map(w => this.normalizeWord(w));

        let bestMatch = null;
        let maxSimilarity = 0;

        normalizedTargets.forEach((target, index) => {
            const similarity = this.calculateSimilarity(spokenWord, target);
            console.log(`   Ähnlichkeit zu "${targetWords[index]}": ${(similarity * 100).toFixed(1)}%`);
            
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                bestMatch = targetWords[index];
            }
        });

        const isCorrect = maxSimilarity >= this.SIMILARITY_THRESHOLD;

        console.log(isCorrect ? 
            `✅ KORREKT! "${spokenWord}" ≈ "${bestMatch}" (${(maxSimilarity * 100).toFixed(1)}%)` :
            `❌ FALSCH! Beste Übereinstimmung: ${(maxSimilarity * 100).toFixed(1)}% (Mindestens ${this.SIMILARITY_THRESHOLD * 100}% nötig)`
        );

        return {
            isCorrect,
            matchedWord: bestMatch,
            similarity: maxSimilarity
        };
    }

    /**
     * NORMALISIERUNG
     * ==============
     * Bereitet Wörter für Vergleich vor
     */
    normalizeWord(word) {
        return word
            .toLowerCase()
            .trim()
            .replace(/[.,!?;:"']/g, ''); // Entferne Satzzeichen
    }

    /**
     * ÄHNLICHKEITSBERECHNUNG
     * ======================
     * Verwendet Levenshtein-Distanz für Vergleich
     * 
     * Alternative Ansätze:
     * - Soundex-Algorithmus für phonetischen Vergleich
     * - Metaphone für verbesserte phonetische Ähnlichkeit
     */
    calculateSimilarity(word1, word2) {
        const distance = this.levenshteinDistance(word1, word2);
        const maxLength = Math.max(word1.length, word2.length);
        
        if (maxLength === 0) return 1.0;
        
        return 1 - (distance / maxLength);
    }

    /**
     * LEVENSHTEIN-DISTANZ
     * ===================
     * Berechnet minimale Anzahl Änderungen zwischen zwei Strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // Substitution
                        matrix[i][j - 1] + 1,     // Insertion
                        matrix[i - 1][j] + 1      // Deletion
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * PHONETISCHE ERWEITERUNG (OPTIONAL)
     * ===================================
     * Für bessere Reim-Erkennung kann Soundex integriert werden
     * 
     * Beispiel-Implementierung:
     */
    /*
    soundex(word) {
        // Deutscher Soundex-Algorithmus
        const codes = {
            'a': '', 'e': '', 'i': '', 'o': '', 'u': '',
            'h': '', 'w': '', 'y': '',
            'b': '1', 'p': '1',
            'f': '2', 'v': '2', 'w': '2',
            'c': '3', 'g': '3', 'j': '3', 'k': '3', 'q': '3',
            's': '4', 'x': '4', 'z': '4',
            'd': '5', 't': '5',
            'l': '6',
            'm': '7', 'n': '7',
            'r': '8'
        };

        word = word.toLowerCase();
        let soundexCode = word[0].toUpperCase();
        let prevCode = codes[word[0].toLowerCase()] || '';

        for (let i = 1; i < word.length && soundexCode.length < 4; i++) {
            const code = codes[word[i]] || '';
            if (code && code !== prevCode) {
                soundexCode += code;
                prevCode = code;
            }
        }

        return soundexCode.padEnd(4, '0');
    }

    // Dann in validateRhyme():
    const spokenSoundex = this.soundex(spokenWord);
    const targetSoundex = this.soundex(target);
    if (spokenSoundex === targetSoundex) {
        // Phonetisch identisch!
    }
    */
}

// Globale Instanz
const speechRecognition = new SpeechRecognitionModule();
