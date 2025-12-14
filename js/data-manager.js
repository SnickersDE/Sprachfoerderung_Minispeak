/**
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
  
  // Globale Instanz
const dataManager = new DataManager();
