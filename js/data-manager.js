 

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
            const response = await fetch('./data/levels.json?v=' + Date.now(), {
                cache: 'no-store',
                headers: { 'Accept': 'application/json' }
            });
            this.levelsData = await response.json();
            console.log('✅ Levels geladen:', this.levelsData);
        } catch (error) {
            console.error('❌ Fehler beim Laden der Levels:', error);
            this.levelsData = {
                levels: []
            };
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
                const response = await fetch('./data/users.json?v=' + Date.now(), {
                    cache: 'no-store',
                    headers: { 'Accept': 'application/json' }
                });
                this.usersData = await response.json();
                this.saveUsers();
                console.log('✅ Benutzer aus JSON geladen und gespeichert');
            } catch (error) {
                console.error('❌ Fehler beim Laden der Benutzer:', error);
                this.usersData = {
                    children: [
                        {
                            id: 'child_fallback_1',
                            name: 'Anna',
                            age: 5,
                            avatar: '👧',
                            progress: {
                                level_1: { completed_sublevels: [] },
                                level_2: { completed_sublevels: [] },
                                level_3: { completed_sublevels: [] }
                            }
                        },
                        {
                            id: 'child_fallback_2',
                            name: 'Max',
                            age: 6,
                            avatar: '👦',
                            progress: {
                                level_1: { completed_sublevels: [] },
                                level_2: { completed_sublevels: [] },
                                level_3: { completed_sublevels: [] }
                            }
                        }
                    ]
                };
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
        this.loadChildProgress(childId);
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
            this.saveChildProgress(childId);
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
        localStorage.removeItem(`progress_${childId}`);
        console.log(`🔄 Fortschritt für ${child.name} zurückgesetzt`);
        }
    }
}

saveChildProgress(childId) 
    const child = this.usersData.children.find(c => c.id === childId);
    if (child) {
        localStorage.setItem(`progress_${childId}`, JSON.stringify(child.progress));
    }
}

loadChildProgress(childId) {
    const raw = localStorage.getItem(`progress_${childId}`);
    if (!raw) return;
    try {
        const saved = JSON.parse(raw);
        const child = this.usersData.children.find(c => c.id === childId);
        if (child) {
            child.progress = Object.assign(child.progress || {}, saved);
        }
    } catch (e) {
        console.error('Fehler beim Laden des Kind-Fortschritts', e);
    }
}

// Globale Instanz
const dataManager = new DataManager();

