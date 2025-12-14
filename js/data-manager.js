
 * DATA MANAGER
 * =============
 * Verwaltet Levels, Benutzer und Fortschritte
 * 
 * Entwickler-Hinweise:
 * - Nutzt localStorage für Browser-Persistenz
 * - Für Produktiveinsatz: Backend-API integrieren
 * - JSON-Dateien werden beim ersten Laden in localStorage kopiert
 */

class DataManager {
    constructor() {
        this.levelsData = null;
        this.usersData = null;
        this.currentChild = null;
        this.init();
    }

    async init() {
        // Lade Levels aus JSON
        try {
            const response = await fetch('data/levels.json');
            this.levelsData = await response.json();
            console.log('✅ Levels geladen:', this.levelsData);
        } catch (error) {
            console.error('❌ Fehler beim Laden der Levels:', error);
        }

        // Lade Benutzer aus JSON oder localStorage
        await this.loadUsers();
    }

    async loadUsers() {
        // Prüfe ob bereits im localStorage
        const storedUsers = localStorage.getItem('sprachfoerderung_users');
        
        if (storedUsers) {
            this.usersData = JSON.parse(storedUsers);
            console.log('✅ Benutzer aus localStorage geladen');
        } else {
            try {
                const response = await fetch('data/users.json');
                this.usersData = await response.json();
                this.saveUsers();
                console.log('✅ Benutzer aus JSON geladen und gespeichert');
            } catch (error) {
                console.error('❌ Fehler beim Laden der Benutzer:', error);
            }
        }
    }

    saveUsers() {
        localStorage.setItem('sprachfoerderung_users', JSON.stringify(this.usersData));
        console.log('💾 Benutzer gespeichert');
    }
	
    // Hole alle Kinder
    getChildren() {
        return this.usersData?.children || [];
    }

    // Setze aktuelles Kind
    setCurrentChild(childId) {
        this.currentChild = this.usersData.children.find(c => c.id === childId);
        console.log('👤 Kind ausgewählt:', this.currentChild);
        return this.currentChild;
    }

    // Hole alle Levels
    getLevels() {
        return this.levelsData?.levels || [];
    }

    // Hole spezifisches Level
    getLevel(levelIndex) {
        return this.levelsData?.levels[levelIndex];
    }

    // Hole Fortschritt eines Kindes für ein Level
    getProgress(childId, levelId) {
        const child = this.usersData.children.find(c => c.id === childId);
        return child?.progress[levelId]?.completed_sublevels || [];
    }

    // Markiere Unter-Level als abgeschlossen
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

// Berechne Fortschritt in Prozent
calculateProgress(childId, levelId) {
    const level = this.getLevels().find(l => l.id === levelId);
    const completed = this.getProgress(childId, levelId);
    const total = level?.sublevels.length || 1;
    return Math.round((completed.length / total) * 100);
}

// Reset Fortschritt (für Demo)
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

**Entwickler-Beschreibung für `data-manager.js`:**
- **Zweck**: Zentrale Datenverwaltung für Levels und Benutzerfortschritte
- **localStorage**: Speichert Fortschritte lokal im Browser (keine Server-Kommunikation nötig)
- **Erweiterung**: Für Produktiveinsatz Backend-API einbinden (z.B. REST oder GraphQL)
- **Anpassung**: Neue Methoden können hinzugefügt werden (z.B. `exportProgress()` für CSV-Export)

---