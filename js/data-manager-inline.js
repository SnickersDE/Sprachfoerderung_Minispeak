/**
 * DATA MANAGER - INLINE VERSION
 * ==============================
 * Für GitHub Pages: Daten direkt im Code statt JSON-Dateien
 * 
 * HINWEIS: Ersetze data-manager.js mit dieser Datei in index.html
 */

class DataManager {
    constructor() {
        this.levelsData = null;
        this.usersData = null;
        this.currentChild = null;
        this.init();
    }

    init() {
        // Daten direkt definieren statt laden
        this.levelsData = {
            "levels": [
                {
                    "id": "level_1",
                    "name": "Einfache Reime",
                    "schwierigkeitsgrad": "leicht",
                    "beschreibung": "Einsilbige Wörter mit klaren Endreimen",
                    "icon": "🌟",
                    "sublevels": [
                        {"id": "l1_s1", "reim_ideen": ["Haus", "Maus", "Laus"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s2", "reim_ideen": ["Bär", "mehr", "Heer"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s3", "reim_ideen": ["Boot", "rot", "Brot"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s4", "reim_ideen": ["Hase", "Nase", "Vase"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s5", "reim_ideen": ["Ball", "Fall", "Stall"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s6", "reim_ideen": ["Schuh", "Kuh", "Ruh"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s7", "reim_ideen": ["Baum", "Traum", "Raum"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s8", "reim_ideen": ["Fisch", "Tisch", "frisch"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s9", "reim_ideen": ["Hund", "Mund", "rund"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s10", "reim_ideen": ["Stern", "fern", "gern"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"}
                    ]
                },
                {
                    "id": "level_2",
                    "name": "Mittelschwere Reime",
                    "schwierigkeitsgrad": "mittel",
                    "beschreibung": "Zweisilbige Wörter und komplexere Laute",
                    "icon": "⭐",
                    "sublevels": [
                        {"id": "l2_s1", "reim_ideen": ["Katze", "Tatze", "Matze"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s2", "reim_ideen": ["Sonne", "Tonne", "Wonne"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s3", "reim_ideen": ["Blume", "Pflaume", "Räume"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s4", "reim_ideen": ["Fenster", "Gespenster", "Dienster"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s5", "reim_ideen": ["Krone", "Bohne", "Lohne"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s6", "reim_ideen": ["Wolke", "Scholle", "Rolle"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s7", "reim_ideen": ["Wiese", "Riese", "diese"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s8", "reim_ideen": ["Kiste", "Liste", "Piste"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s9", "reim_ideen": ["Garten", "warten", "Karten"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s10", "reim_ideen": ["Kerze", "Herze", "Schmerze"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"}
                    ]
                },
                {
                    "id": "level_3",
                    "name": "Schwierige Reime",
                    "schwierigkeitsgrad": "schwer",
                    "beschreibung": "Dreisilbige Wörter und Konsonantencluster",
                    "icon": "🏆",
                    "sublevels": [
                        {"id": "l3_s1", "reim_ideen": ["Schmetterling", "Wetterding", "Zetterkind"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s2", "reim_ideen": ["Elefant", "elegant", "relevant"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s3", "reim_ideen": ["Schokolade", "Marmelade", "Parade"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s4", "reim_ideen": ["Regenbogen", "Sonnenwogen", "Wellenhogen"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s5", "reim_ideen": ["Kaninchen", "Vanille", "Minichen"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s6", "reim_ideen": ["Glücklich", "Brücke", "Stücke"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s7", "reim_ideen": ["Bibliothek", "Diskothek", "Apothek"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s8", "reim_ideen": ["Geburtstag", "Feuertag", "Trauertag"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s9", "reim_ideen": ["Abenteuer", "Ungeheuer", "teuer"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s10", "reim_ideen": ["Weihnachten", "Sachen", "Drachen"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"}
                    ]
                }
            ]
        };
        
this.usersData = {
  "children": [
    {
      "id": "child_1",
      "name": "Anna",
      "age": 5,
      "avatar": "👧",
      "progress": {
        "level_1": { "completed_sublevels": [] },
        "level_2": { "completed_sublevels": [] },
        "level_3": { "completed_sublevels": [] }
      }
    },
    {
      "id": "child_2",
      "name": "Benni",
      "age": 6,
      "avatar": "👦",
      "progress": {
        "level_1": { "completed_sublevels": [] },
        "level_2": { "completed_sublevels": [] },
        "level_3": { "completed_sublevels": [] }
      }
    },
    {
      "id": "child_3",
      "name": "Ayleen",
      "age": 5,
      "avatar": "👧",
      "progress": {
        "level_1": { "completed_sublevels": [] },
        "level_2": { "completed_sublevels": [] },
        "level_3": { "completed_sublevels": [] }
      }
    },
    {
      "id": "child_4",
      "name": "Sebastian",
      "age": 5,
      "avatar": "👦",
      "progress": {
        "level_1": { "completed_sublevels": [] },
        "level_2": { "completed_sublevels": [] },
        "level_3": { "completed_sublevels": [] }
      }
    },
    {
      "id": "child_5",
      "name": "Pia",
      "age": 6,
      "avatar": "👧",
      "progress": {
        "level_1": { "completed_sublevels": [] },
        "level_2": { "completed_sublevels": [] },
        "level_3": { "completed_sublevels": [] }
      }
    },
    {
      "id": "child_6",
      "name": "Florian",
      "age": 3,
      "avatar": "👦",
      "progress": {
        "level_1": { "completed_sublevels": [] },
        "level_2": { "completed_sublevels": [] },
        "level_3": { "completed_sublevels": [] }
      }
    },
    {
      "id": "child_7",
      "name": "Anja",
      "age": 4,
      "avatar": "👧",
      "progress": {
        "level_1": { "completed_sublevels": [] },
        "level_2": { "completed_sublevels": [] },
        "level_3": { "completed_sublevels": [] }
      }
    },
    {
      "id": "child_8",
      "name": "Tobias",
      "age": 5,
      "avatar": "👦",
      "progress": {
        "level_1": { "completed_sublevels": [] },
        "level_2": { "completed_sublevels": [] },
        "level_3": { "completed_sublevels": [] }
      }
    },
    {
      "id": "child_9",
      "name": "Pedro",
      "age": 5,
      "avatar": "👦",
      "progress": {
        "level_1": { "completed_sublevels": [] },
        "level_2": { "completed_sublevels": [] },
        "level_3": { "completed_sublevels": [] }
      }
    },
    {
      "id": "child_10",
      "name": "Luis",
      "age": 6,
      "avatar": "👦",
      "progress": {
        "level_1": { "completed_sublevels": [] },
        "level_2": { "completed_sublevels": [] },
        "level_3": { "completed_sublevels": [] }
      }
    },
    {
      "id": "child_11",
      "name": "Marie",
      "age": 3,
      "avatar": "👧",
      "progress": {
        "level_1": { "completed_sublevels": [] },
        "level_2": { "completed_sublevels": [] },
        "level_3": { "completed_sublevels": [] }
      }
    }
  ]
};
        // Lade gespeicherte Fortschritte aus localStorage
        this.loadProgressFromStorage();

        console.log('✅ Daten inline geladen');
    }

    loadProgressFromStorage() {
        const stored = localStorage.getItem('sprachfoerderung_users');
        if (stored) {
            const storedData = JSON.parse(stored);
            // Merge Fortschritte
            storedData.children.forEach(storedChild => {
                const child = this.usersData.children.find(c => c.id === storedChild.id);
                if (child) {
                    child.progress = storedChild.progress;
                }
            });
            console.log('✅ Fortschritte aus localStorage geladen');
        }
    }

    saveUsers() {
        localStorage.setItem('sprachfoerderung_users', JSON.stringify(this.usersData));
        console.log('💾 Benutzer gespeichert');
    }

    getChildren() {
        return this.usersData?.children || [];
    }

    setCurrentChild(childId) {
        this.currentChild = this.usersData.children.find(c => c.id === childId);
        console.log('👤 Kind ausgewählt:', this.currentChild);
        return this.currentChild;
    }

    getLevels() {
        return this.levelsData?.levels || [];
    }

    getLevel(levelIndex) {
        return this.levelsData?.levels[levelIndex];
    }

    getProgress(childId, levelId) {
        const child = this.usersData.children.find(c => c.id === childId);
        return child?.progress[levelId]?.completed_sublevels || [];
    }

    completeSublevel(childId, levelId, sublevelId) {
        const child = this.usersData.children.find(c => c.id === childId);
        
        if (child) {
            if (!child.progress[levelId].completed_sublevels.includes(sublevelId)) {
                child.progress[levelId].completed_sublevels.push(sublevelId);
                this.saveUsers();
                console.log(`✅ Sublevel ${sublevelId} abgeschlossen für ${child.name}`);
            }
        }
    }

    calculateProgress(childId, levelId) {
        const level = this.getLevels().find(l => l.id === levelId);
        const completed = this.getProgress(childId, levelId);
        const total = level?.sublevels.length || 1;
        return Math.round((completed.length / total) * 100);
    }

    resetProgress(childId) {
        const child = this.usersData.children.find(c => c.id === childId);
        if (child) {
            Object.keys(child.progress).forEach(levelId => {
                child.progress[levelId].completed_sublevels = [];
            });
            this.saveUsers();
            console.log(`🔄 Fortschritt für ${child.name} zurückgesetzt`);
        }
    }
}

// Globale Instanz
const dataManager = new DataManager();
