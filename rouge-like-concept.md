Das ist ein spannendes Projekt\! Die Kombination aus Schach und einem RPG/Roguelike-Modus bietet großes Potenzial für ein einzigartiges Spielerlebnis.

Hier ist ein ausführliches Konzept, das darauf abzielt, die strategische Tiefe des Schachs mit den Progressionselementen und der Unvorhersehbarkeit eines Roguelikes zu verschmelzen.

-----

## ♟️ Konzept: Schach-Roguelike "Die Königsjagd"

Das Spielprinzip ist ein **Einzelspieler-Run**, bei dem der Spieler eine vorgegebene Anzahl von **Schach-Begegnungen** überleben muss, um den Endgegner (z.B. den "Dunklen König" oder "Usurpator") zu besiegen. Nach jeder gewonnenen Schachpartie wird der Spieler mit **Upgrades, Artefakten oder neuen Fähigkeiten** belohnt, die seine Spielfiguren verbessern oder neue strategische Optionen eröffnen. Bei einer Niederlage ist der Run vorbei (**Permadeath**).

### 1\. Grundlegende Struktur des Runs

| Element | Beschreibung | HTML/JS/PHP Umsetzung |
| :--- | :--- | :--- |
| **Der Run** | Eine komplette Spielsession vom Start bis zum Permadeath oder Sieg. | JS-Objekt speichert den Zustand (Level, Gold, Inventar). |
| **Zonen (Biomes)** | Der Run ist in thematisch verschiedene Zonen unterteilt (z.B. "Wald des Bauernopfers", "Gebirgspass des Läufers"). Jede Zone hat eine bestimmte Anzahl von Knotenpunkten/Partien. | PHP-Array/DB speichert die Zonen-Konfiguration und die zugehörigen Gegner-Profile. |
| **Knotenpunkt (Begegnung)** | Jede Begegnung ist eine Schachpartie gegen einen **spezialisierten Gegner** (siehe 3.). Nach dem Sieg gibt es Belohnungen. | JS-Funktion startet die Schachlogik. PHP speichert den Fortschritt in der Datenbank (für Highscores/Meta-Progression). |
| **Permadeath** | Wird eine Schachpartie verloren, ist der Run beendet. | JS beendet den Run und sendet das Ergebnis an PHP. |

### 2\. Spieler-Progression (Run-spezifische Upgrades)

Diese Upgrades werden **nur für den aktuellen Run** gewährt und gehen bei Permadeath verloren. Sie sind der Kern des Roguelike-Gefühls.

#### A. Verbesserungen der Spielfiguren (Stat-Upgrades)

Der Spieler kann die Standard-Schachregeln modifizieren, indem er seine Figuren verbessert.

| Figur | Upgrade-Beispiele | Auswirkung auf die Schachpartie |
| :--- | :--- | :--- |
| **Bauer** | **"Schildträger"**: Erhält eine zusätzliche Lebenspunkt-Leiste (muss 2x geschlagen werden). | Müssen 2 Züge lang angegriffen werden, um geschlagen zu werden. |
| **Turm** | **"Artillerie"**: Kann diagonal angreifen, aber nur, wenn das Zielfeld 3+ Felder entfernt ist. | Neue, unvorhergesehene Angriffswege. |
| **Springer** | **"Reitersturm"**: Nach dem Schlagen einer Figur erhält der Springer einen sofortigen Bonus-Zug (darf aber keine weitere Figur schlagen). | Massive Tempo-Vorteile nach erfolgreichen Angriffen. |
| **Läufer** | **"Durchdringung"**: Greift durch die erste Figur hindurch und schlägt die zweite Figur auf derselben Diagonale (muss in einer Linie sein). | Kann eine Figur schlagen, obwohl eine andere den Weg versperrt. |
| **Dame** | **"Teleport"**: Einmal pro Partie kann die Dame auf ein beliebiges leeres Feld springen (ersetzt den Zug). | Positionsvorteil/Flucht. |
| **König** | **"Wiederbelebung"**: Einmal pro Run kann der König geschlagen werden, ohne dass die Partie verloren ist. Die Figur wird stattdessen vom Brett entfernt. | Ein "zweites Leben" für den Run. |

#### B. Artefakte (Passive Boni)

Dies sind mächtige, den Run verändernde Gegenstände.

  * **Der Fluch der Kette**: Alle eigenen Figuren dürfen nur ein Feld ziehen (wie der König), aber der König darf sich wie die Dame bewegen.
  * **Amulett der Zeitumkehr**: Einmal pro Partie kann der letzte Zug rückgängig gemacht werden.
  * **Trank der Überraschung**: Alle Bauern auf der 7. Reihe starten als Dame.
  * **Helm der Voraussicht**: Zeigt die kritischen Felder des Gegners an (Felder, auf die ein Angriff abzielt).

#### C. Währung und Shop (Gold)

  * **Gold**: Wird für Siege oder besondere Ereignisse erhalten.
  * **Shop-Knoten**: Ein besonderer Knotenpunkt auf der Karte, auf dem Gold gegen Upgrades, Artefakte oder das Entfernen/Upgraden einer bestehenden Figur (z.B. **Turm** gegen **Belagerungsturm** mit +1 Reichweite) eingetauscht werden kann.

### 3\. Gegner-Spezialisierungen

Um die Partien abwechslungsreich zu gestalten, sollten die Gegner thematische Strategien oder Startaufstellungen verwenden.

| Gegner-Thema | Spezialisierung und Strategie | Umsetzung (PHP/JS) |
| :--- | :--- | :--- |
| **Der Bauern-Horde** | Startet mit 12 Bauern statt 8. Alle Figuren ziehen nur diagonal (Läufer-Strategie). | Modifizierte Startaufstellung in der JS-Initialisierung. |
| **Der Doppel-Turm** | Besitzt 4 Türme, aber keine Läufer. Aggressive, vertikale Angriffe. | Turm-Strategie-Algorithmus (bevorzugt offene Linien). |
| **Der Verzauberer** | Startet mit einem Läufer auf $e5$. Die Spielfiguren des Gegners haben eine **einmalige Spezialfähigkeit** (z.B. ein Bauer kann ein Feld überspringen). | Zusätzliche JS-Funktionen, die die Zuglogik einmalig erweitern. |
| **Der Endgegner** | **Der Usurpator**: Startet mit einer Dame und einem Turm extra, aber ohne König (Ziel ist es, alle Figuren zu schlagen, nicht nur den König). | Geänderte Gewinnbedingung in der Schach-Logik (JS). |

### 4\. Implementierungstipps für HTML/CSS/JS/PHP

#### 🛠️ Frontend (HTML/CSS/JS)

1.  **Schachbrett-Logik (JS):** Die Kernlogik muss flexibel genug sein, um die Upgrades der Figuren zu verarbeiten.
      * **Objektorientierte Figuren:** Jede Figur sollte ein JS-Objekt sein, das Attribute wie `movementPattern` (Array von möglichen Zügen), `health` (für Bauern-Upgrade) und `specialAbility` (Funktion) speichern kann.
      * **Validierung:** Die `isValidMove`-Funktion muss die aktuellen Upgrades des Spielers berücksichtigen, um festzustellen, ob ein Zug legal ist.
2.  **UI für den Run-Status:**
      * Ein **HUD** (Heads-Up-Display) muss immer sichtbar sein, um den Fortschritt, Gold und die aktuellen Artefakte anzuzeigen (z.B. eine Seitenleiste).
      * **Upgrade-Auswahl-Screen:** Nach einem Sieg muss ein modal/overlay erscheinen, das 2-4 zufällige Upgrades zur Auswahl präsentiert.

#### 🗄️ Backend (PHP/Datenbank)

1.  **Datenhaltung:** Die Datenbank (z.B. MySQL) wird für die Meta-Progression und Highscores benötigt.
      * **Tabelle `runs`:** Speichert `player_id`, `score`, `duration`, `is_win`, `run_date`.
2.  **Zufallsgenerierung:** PHP ist ideal, um die Struktur des Runs zu generieren, bevor die Schachpartie beginnt (oder um die Zufälligkeit zu gewährleisten).
      * Generieren Sie die Abfolge der Gegner-Themen und die zufälligen Belohnungen im Voraus.
      * Beim Laden eines Knotens fordert JS die Konfiguration (Gegner-Thema, Belohnungs-Pool) von PHP an.

#### 💡 Beispiel: Upgrade-Auswahl (JS/HTML)

```javascript
// Beispiel für ein Figuren-Upgrade-Objekt
const knightUpgrade = {
    name: "Reitersturm",
    description: "Springer erhalten einen Bonus-Zug nach dem Schlagen.",
    apply: function(boardState) {
        // Hier müsste die Zugvalidierung für den Springer dynamisch angepasst werden
        boardState.pieces.knight.specialAbility = 'bonusMoveAfterCapture';
    }
};

function displayRewards(rewards) {
    // Generiert den Auswahl-Bildschirm basierend auf den übergebenen Belohnungen
    // ... HTML/CSS-Logik zum Anzeigen der Optionen
}

// Nach dem Sieg
displayRewards([knightUpgrade, bishopUpgrade, artifactShield]);
```

### 5\. Meta-Progression (Zwischen den Runs)

Um Spieler zu motivieren, nach einem Permadeath weiterzuspielen:

  * **Freischaltbare Start-Boni:** Spieler können Münzen oder Erfahrungspunkte für gewonnene Zonen sammeln. Diese können verwendet werden, um neue Klassen (die mit einem spezifischen Start-Artefakt beginnen) oder dauerhafte Boni (z.B. +5% mehr Gold pro Run) freizuschalten.
  * **Highscore-Liste:** Speichern der besten Runs über PHP in der Datenbank.

-----

Dieses Konzept bietet eine klare Struktur für die Entwicklung. Der Schlüssel wird die **flexible Implementierung der Figuren-Logik in JavaScript** sein, um die dynamischen Upgrades sauber verarbeiten zu können.

Welche spezifische Figur oder Fähigkeit würden Sie gerne als Erstes umsetzen?