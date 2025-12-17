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
        this.CURRENT_VERSION = '1.1';
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
                        {"id": "l1_s2", "reim_ideen": ["Hund", "Mund", "Rund"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s3", "reim_ideen": ["Boot", "rot", "Brot"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s4", "reim_ideen": ["Hase", "Nase", "Vase"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s5", "reim_ideen": ["Ball", "Fall", "Stall"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s6", "reim_ideen": ["Kind", "Wind", "Rind"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s7", "reim_ideen": ["Baum", "Traum", "Zaun"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s8", "reim_ideen": ["Hand", "Sand", "Pfand"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s9", "reim_ideen": ["Hund", "Mund", "rund"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"},
                        {"id": "l1_s10", "reim_ideen": ["Eis", "Heiß", "Kreis"], "schwierigkeitsgrad": "leicht", "bild_ordner": "level1"}
                    ]
                },
                {
                    "id": "level_2",
                    "name": "Mittelschwere Reime",
                    "schwierigkeitsgrad": "mittel",
                    "beschreibung": "Zweisilbige Wörter und komplexere Laute",
                    "icon": "⭐",
                    "sublevels": [
                        {"id": "l2_s1", "reim_ideen": ["Katze", "Tatze", "Matratze"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s2", "reim_ideen": ["Sonne", "Tonne", "Krone"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s3", "reim_ideen": ["Blume", "Pflaume", "Biene"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s4", "reim_ideen": ["Tisch", "Fisch", "Wisch"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s5", "reim_ideen": ["Hahn", "Bahn", "Kahn"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s6", "reim_ideen": ["Wolle", "Rolle", "Knolle"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s7", "reim_ideen": ["Wiese", "Riese", "Briese"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s8", "reim_ideen": ["Kiste", "Liste", "Piste"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s9", "reim_ideen": ["Garten", "Karten", "Spaten"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"},
                        {"id": "l2_s10", "reim_ideen": ["Kerze", "Scherze", "Herze"], "schwierigkeitsgrad": "mittel", "bild_ordner": "level2"}
                    ]
                },
                {
                    "id": "level_3",
                    "name": "Schwierige Reime",
                    "schwierigkeitsgrad": "schwer",
                    "beschreibung": "Dreisilbige Wörter und Konsonantencluster",
                    "icon": "🏆",
                    "sublevels": [
                        {"id": "l3_s1", "reim_ideen": ["Hase", "Vase", "Käse"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s2", "reim_ideen": ["Gepäck", "Speck", "Dreck"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s3", "reim_ideen": ["Schokolade", "Marmelade", "Parade"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s4", "reim_ideen": ["Drache", "Wache", "Lache"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s5", "reim_ideen": ["Regenbogen", "Ellenbogen"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s6", "reim_ideen": ["Glücklich", "Pfirsich", "Teppich"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s7", "reim_ideen": ["Stadt", "Blatt", "Glatt"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s8", "reim_ideen": ["Spielzeug", "Werkzeug", "Flugzeug"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s9", "reim_ideen": ["Ritter", "Gewitter", "Glitter"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"},
                        {"id": "l3_s10", "reim_ideen": ["Elegant", "Elefant", "Diamant"], "schwierigkeitsgrad": "schwer", "bild_ordner": "level3"}
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
        // Lade komplette Benutzerdaten aus localStorage (inkl. Profilfelder)
        this.loadFromStorage();
        
        console.log('✅ Daten inline geladen');
    }
   loadFromStorage() {
        try {
            const stored = localStorage.getItem('sprachfoerderung_users');
            const storedVersion = localStorage.getItem('sprachfoerderung_version');
            if (stored && storedVersion === this.CURRENT_VERSION) {
                const storedData = JSON.parse(stored);
                // Übernehme gesamte Benutzerdaten inkl. Name, Alter, Gruppe, Fortschritt
                if (storedData && Array.isArray(storedData.children)) {
                    this.usersData.children = storedData.children.map(ch => ({
                        id: ch.id,
                        name: ch.name,
                        age: ch.age,
                        avatar: ch.avatar,
                        group: ch.group || '',
                        progress: ch.progress || {
                            level_1: { completed_sublevels: [] },
                            level_2: { completed_sublevels: [] },
                            level_3: { completed_sublevels: [] }
                        }
                    }));
                    console.log('✅ Benutzerdaten aus localStorage geladen');
                }
            } else {
                // Speichere die Default-Daten initial mit aktueller Version
                this.saveUsers();
            }
        } catch (e) {
            console.warn('⚠️ Konnte localStorage nicht lesen, verwende Default-Daten', e);
   
        }
    }

    saveUsers() {
        localStorage.setItem('sprachfoerderung_users', JSON.stringify(this.usersData));
        localStorage.setItem('sprachfoerderung_version', this.CURRENT_VERSION);
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
