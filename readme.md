# 🎯 Phonologische Sprachförderung - Demo-Anwendung

## Überblick
Diese Web-basierte Demo-Anwendung dient der phonologischen Sprachförderung für Kinder im Alter von 4-7 Jahren. Die Anwendung nutzt **Speech-to-Text** zur automatischen Auswertung der Aussprache und bietet eine progressive Level-Struktur.

## Features
- ✅ 3 Levels mit je 10 Unter-Level
- ✅ Anpassbare Reime und Bilder
- ✅ Speech-to-Text Integration (Web Speech API)
- ✅ Fortschrittsverfolgung für Kinder
- ✅ Responsive Design für Tablet/Desktop
- ✅ Für Kita und Zuhause nutzbar

## Installation

### Voraussetzungen
- Moderner Browser (Chrome, Edge, Safari)
- Mikrofon-Zugriff
- Lokaler Webserver (z.B. Live Server in VS Code)

### Setup
1. Repository klonen:
```bash
   git clone https://github.com/[dein-username]/sprachfoerderung-demo.git
   cd sprachfoerderung-demo
```

2. Mit Live Server öffnen oder auf GitHub Pages hosten

3. Bilder hinzufügen:
   - Bilder in `images/level1/`, `images/level2/`, `images/level3/` platzieren
   - Dateinamen entsprechend der Reime benennen (z.B. `haus.png`, `maus.png`)

## Anpassung der Reime

### Reime ändern
1. Öffne `data/levels.json`
2. Ändere die `reim_ideen` Arrays für jeden Unter-Level
3. Speichern - Änderungen sind sofort aktiv

Beispiel:
```json
{
  "id": "l1_s1",
  "reim_ideen": ["Haus", "Maus", "Laus"],
  "schwierigkeitsgrad": "leicht"
}
```

### Bilder zuordnen
1. Bild mit Reim-Wort benennen: `haus.png`
2. In entsprechenden Ordner legen: `images/level1/haus.png`
3. Anwendung lädt Bilder automatisch basierend auf Reim-Wort

## Speech-to-Text Konfiguration

Die Anwendung nutzt die **Web Speech API** (verfügbar in Chrome, Edge, Safari).

### Genauigkeitseinstellungen
In `js/speech-recognition.js` können folgende Parameter angepasst werden:
- `SIMILARITY_THRESHOLD`: Mindestübereinstimmung (Standard: 0.8 = 80%)
- `recognition.lang`: Sprache (Standard: 'de-DE')
- `recognition.interimResults`: Zwischenergebnisse (Standard: false)

## Browser-Kompatibilität
- ✅ Chrome/Edge: Volle Unterstützung
- ✅ Safari: Volle Unterstützung (iOS 14.5+)
- ❌ Firefox: Keine Speech Recognition API

## Entwicklung

### Neue Levels hinzufügen
1. In `data/levels.json` neues Level-Objekt hinzufügen
2. 10 Unter-Level mit Reimen definieren
3. Bilder in neuem Ordner `images/level4/` ablegen

### Erweiterte Auswertung
Die Speech-Recognition kann erweitert werden um:
- Phonetische Analyse (z.B. mit Soundex-Algorithmus)
- Silbenerkennung
- Betonung und Rhythmus

Siehe `js/speech-recognition.js` für Implementierungsdetails.

## Datenschutz
- Keine Audioaufnahmen werden gespeichert
- Nur Fortschrittsdaten werden lokal im Browser gespeichert
- Für Produktiveinsatz: Backend mit Datenschutz-konformer Speicherung nötig

## Lizenz
MIT License - Freie Nutzung für pädagogische Zwecke

## Kontakt & Support
Bei Fragen oder Anregungen: [Deine E-Mail]
