   

class SpeechRecognitionModule {
    constructor() {
        this.recognition = null;
        this.isRecording = false;
        this.onResult = null;
        this.onError = null;
        this.isReadingMode = false;
        this.USE_DYNAMIC_THRESHOLD = true;
        
        // KONFIGURATION - HIER ANPASSBAR
        this.SIMILARITY_THRESHOLD = 0.8; // Basisschwelle
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
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 5; // Mehr Alternativen für robustere Ergebnisse

        // Event Handler
        this.recognition.onstart = () => {
            console.log('🎤 Aufnahme gestartet');
            this.isRecording = true;
        };

        this.recognition.onresult = (event) => {
            console.log('📝 Speech Recognition Ergebnis:', event);
            if (this.isReadingMode) {
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    // Nur finale Ergebnisse verarbeiten, um Spam zu vermeiden
                    if (!result.isFinal && !this.recognition.interimResults) continue;
                    let bestAlt = result[0];
                    for (let j = 0; j < result.length; j++) {
                        const alt = result[j];
                        if (alt.confidence > bestAlt.confidence) bestAlt = alt;
                    }
                    const transcript = bestAlt.transcript.trim();
                    const confidence = bestAlt.confidence;
                    console.log(`Erkanntes Wort: "${transcript}" (Konfidenz: ${(confidence * 100).toFixed(1)}%)`);
                    if (this.onResult) this.onResult(transcript, confidence);
                }
            } else {
                let bestAlt = event.results[0][0];
                for (let i = 0; i < event.results[0].length; i++) {
                    const alt = event.results[0][i];
                    if (alt.confidence > bestAlt.confidence) bestAlt = alt;
                }
                const transcript = bestAlt.transcript.trim();
                const confidence = bestAlt.confidence;
                console.log(`Erkanntes Wort: "${transcript}" (Konfidenz: ${(confidence * 100).toFixed(1)}%)`);
                if (this.onResult) this.onResult(transcript, confidence);
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

    // Lese-Modus aktivieren: kontinuierlich und mit Zwischen-Ergebnissen
    setReadingMode(enabled) {
        this.isReadingMode = !!enabled;
        if (this.recognition) {
            this.recognition.continuous = this.isReadingMode;
            this.recognition.interimResults = this.isReadingMode;
            this.recognition.maxAlternatives = this.isReadingMode ? 7 : 5;
        }
        // In Lesen-Modus etwas toleranter
        this.SIMILARITY_THRESHOLD = this.isReadingMode ? 0.75 : 0.8;
        // Längere Session ohne Autostop
        this.MAX_RECORDING_TIME = this.isReadingMode ? 120000 : 5000;
    }

    configureThreshold(threshold, useDynamic) {
        if (typeof threshold === 'number') this.SIMILARITY_THRESHOLD = threshold;
        if (typeof useDynamic === 'boolean') this.USE_DYNAMIC_THRESHOLD = useDynamic;
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

        // Dynamische Schwelle optional
        const len = Math.max(spokenWord.length, (bestMatch || '').length);
        let required = this.SIMILARITY_THRESHOLD;
        if (this.USE_DYNAMIC_THRESHOLD) {
            if (len <= 3) required = Math.max(required, 0.85);
            if (len >= 8) required = Math.min(required, 0.75);
        }
        
        let isCorrect = maxSimilarity >= required;
        
        // Phonetischer Fallback (deutscher Soundex-ähnlich)
        if (!isCorrect && bestMatch) {
            const s1 = this.soundexGerman(spokenWord);
            const s2 = this.soundexGerman(bestMatch);
            if (s1 && s2 && s1 === s2) {
                isCorrect = true;
                maxSimilarity = Math.max(maxSimilarity, 0.8);
            }
        }

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
        const stopwords = ['äh', 'und', 'ein', 'eine', 'der', 'die', 'das', 'mit', 'dem', 'den', 'oder'];
        let w = word
            .toLowerCase()
            .trim()
            .replace(/[.,!?;:"']/g, '');
        // Diakritik normalisieren
        w = w.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
        // Stopwords entfernen (nur am Anfang/Ende)
        stopwords.forEach(sw => {
            const reStart = new RegExp('^' + sw + '\\s+', 'g');
            const reEnd = new RegExp('\\s+' + sw + '$', 'g');
            w = w.replace(reStart, '').replace(reEnd, '');
        });
        return w;
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

    // Vereinfachter deutscher Soundex
    soundexGerman(word) {
        if (!word || !word.length) return '';
        const codes = {
            a:'', e:'', i:'', o:'', u:'', y:'', h:'', w:'',
            b:'1', p:'1',
            f:'2', v:'2',
            c:'3', g:'3', j:'3', k:'3', q:'3',
            s:'4', x:'4', z:'4',
            d:'5', t:'5',
            l:'6',
            m:'7', n:'7',
            r:'8'
        };
        const w = word.toLowerCase();
        let code = (w[0] || '').toUpperCase();
        let prev = codes[w[0]] || '';
        for (let i = 1; i < w.length && code.length < 4; i++) {
            const c = codes[w[i]] || '';
            if (c && c !== prev) {
                code += c;
                prev = c;
            }
        }
        return code.padEnd(4, '0');
    }
}

// Globale Instanz
const speechRecognition = new SpeechRecognitionModule();
