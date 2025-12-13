# 🎮 Roguelike Chess Mode - Development Roadmap
## "Die Königsjagd" Implementation Plan

**Document Version:** 1.0  
**Last Updated:** December 13, 2025  
**Status:** Planning Phase  
**Project:** Schach Chess Game

---

## 📋 Executive Summary

This roadmap details the implementation of a chess-roguelike game mode for Schach, combining strategic chess gameplay with RPG progression elements inspired by games like Slay the Spire and FTL. Players embark on **runs** through multiple zones, facing specialized chess opponents and collecting upgrades to modify piece abilities.

**Key Metrics:**
- **Estimated Timeline:** 4-6 weeks for full implementation  
- **MVP Timeline:** 2-3 days for proof of concept  
- **Feasibility Rating:** 7.5/10 (Achievable with careful refactoring)
- **Team Size:** 1-2 developers
- **Risk Level:** Medium (requires architectural changes but no breaking rewrites)

---

## 🎯 Core Features Overview

| Feature | Description | Priority | Complexity | Time Est. |
|---------|-------------|----------|------------|-----------|
| **Run System** | Multi-encounter chess games with permadeath | Critical | Medium | 2-3 days |
| **Piece Upgrades** | Stat modifications (HP, movement, abilities) | Critical | High | 1 week |
| **Artifacts** | Passive bonuses affecting gameplay | High | Medium | 3-4 days |
| **Enemy Specializations** | Themed opponents with custom strategies | High | High | 1 week |
| **Custom Win Conditions** | Boss fights with alternative victory requirements | Medium | High | 2-3 days |
| **Meta-Progression** | Persistent unlocks between runs | Medium | Low | 2-3 days |
| **Shop System** | Gold economy for purchasing upgrades | Low | Low | 2 days |

---

## 🏗️ Architecture Analysis

### Current Codebase Strengths

✅ **Modal System** (`ui.js`)  
The existing promotion modal provides a perfect template for upgrade selection screens. Can directly clone and adapt the `showPromotionModal()` pattern.

✅ **Callback Architecture** (`game.js`)  
Game events use callbacks (`onMove`, `onGameOver`, `onCheck`) making it easy to add roguelike hooks like `onEncounterVictory` and `onUpgradeApplied`.

✅ **AI Difficulty System** (`ai.js`)  
The 3-tier difficulty system (Easy/Medium/Hard) can be repurposed as enemy type configurations with custom evaluation functions.

✅ **Position Cloning** (`utils.js`)  
`Utils.deepClone()` enables safe upgrade simulation without side effects, critical for testing "what if" scenarios.

✅ **Game Mode Switching**  
Existing `GAME_MODES` enum makes adding `GAME_MODES.ROGUELIKE` straightforward without refactoring the entire codebase.

### Critical Refactoring Needs

🔴 **Piece Representation System**  
**Current:** Simple objects `{ type: 'pawn', color: 'white' }`  
**Problem:** No way to add HP, abilities, or stat modifications  
**Solution:** Parallel upgrade tracking (see below)

🔴 **Move Validation Logic**  
**Current:** Hardcoded `switch` statements in `Pieces.getValidMoves()`  
**Problem:** Cannot dynamically add/remove abilities like "Reitersturm" bonus move  
**Solution:** Ability hook system with event triggers

🔴 **Win Condition Checking**  
**Current:** Always checks for king checkmate in `game.checkGameState()`  
**Problem:** Boss fights need alternative conditions (capture all pieces)  
**Solution:** Pluggable win condition framework

🔴 **Upgrade Persistence**  
**Current:** No mechanism to track piece modifications across moves  
**Problem:** Upgrades would be lost when position is cloned  
**Solution:** Separate upgrade layer parallel to position object

---

## 💡 Architectural Solution: Parallel Upgrade Tracking

### The Challenge

Current pieces are **immutable simple objects**. Adding properties like HP or abilities breaks:
1. Position cloning (`Utils.deepClone()`)
2. Capture detection (expects simple type/color)
3. FEN notation (cannot encode custom properties)
4. Move simulation (`Pieces.makeMove()`)

### The Solution: Dual-Layer State

```javascript
class ChessGame {
    constructor() {
        // Layer 1: Standard chess position (unchanged)
        this.position = {
            'e2': { type: 'pawn', color: 'white' },
            'd1': { type: 'queen', color: 'white' }
        };
        
        // Layer 2: NEW - Parallel upgrade tracking
        this.pieceUpgrades = {
            'e2': { 
                hp: 2,              // Schildträger upgrade
                maxHp: 2,
                abilities: ['shield']
            },
            'd1': {
                abilities: ['teleport'],  // Queen teleport artifact
                teleportCharges: 1
            }
        };
    }
}
```

### Benefits

✅ **Non-Breaking:** Standard chess mode never touches `pieceUpgrades`  
✅ **Incremental:** Can add upgrades one at a time  
✅ **Debuggable:** Easy to inspect both layers separately  
✅ **Flexible:** Can add any property without schema changes  
✅ **Performant:** Only clones upgrade layer when needed  

### Implementation Pattern

```javascript
// In pieces.js - Modify makeMove() signature
makeMove(position, from, move, gameState, pieceUpgrades = null) {
    // Standard move logic
    const newPosition = Utils.deepClone(position);
    
    // NEW: Handle upgrades if provided
    if (pieceUpgrades) {
        const targetUpgrade = pieceUpgrades[move.to];
        
        // Check for HP system (Schildträger)
        if (targetUpgrade?.hp > 1) {
            targetUpgrade.hp--;  // Reduce HP instead of capture
            return { position: newPosition, upgrades: pieceUpgrades, damageDealt: true };
        }
    }
    
    // Standard capture
    delete newPosition[move.to];
    newPosition[move.to] = newPosition[from];
    delete newPosition[from];
    
    // Transfer upgrades to new square
    if (pieceUpgrades?.[from]) {
        pieceUpgrades[move.to] = pieceUpgrades[from];
        delete pieceUpgrades[from];
    }
    
    return { position: newPosition, upgrades: pieceUpgrades };
}
```

---

## 📅 Development Phases

---

## Phase 1: Foundation & Proof of Concept
**Duration:** 2-3 days  
**Goal:** One playable encounter with one working upgrade  
**Team:** 1 developer

### Overview

Build the minimal viable product to validate the parallel tracking approach. By the end of Phase 1, you should be able to:
1. Start a roguelike run
2. Play one chess match against AI
3. Win and see upgrade selection modal
4. Apply Schildträger (2 HP pawn) upgrade
5. Play another match with the upgrade active
6. Observe the pawn survive one capture

---

### Task 1.1: Database Schema Extensions

**Files:** `sql/migrations/002_add_roguelike_tables.sql`

Create three new tables to support roguelike runs:

```sql
-- Stores each roguelike run attempt
CREATE TABLE roguelike_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    current_zone INT DEFAULT 1,
    current_encounter INT DEFAULT 1,
    gold INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    victory TINYINT(1) DEFAULT 0,
    final_score INT DEFAULT 0,
    run_data JSON DEFAULT NULL COMMENT 'Stores serialized game state',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_active (user_id, is_active),
    INDEX idx_leaderboard (final_score DESC, completed_at DESC)
);

-- Stores upgrades acquired during a run
CREATE TABLE roguelike_run_upgrades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_id INT NOT NULL,
    upgrade_type ENUM('piece_stat', 'artifact', 'ability') NOT NULL,
    upgrade_key VARCHAR(50) NOT NULL COMMENT 'e.g., SCHILDTRAEGER, TELEPORT',
    target_piece ENUM('pawn', 'knight', 'bishop', 'rook', 'queen', 'king') NULL,
    target_square VARCHAR(2) NULL COMMENT 'e.g., e2 for specific piece upgrade',
    upgrade_data JSON NOT NULL COMMENT 'Stores HP, abilities, charges, etc.',
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES roguelike_runs(id) ON DELETE CASCADE,
    INDEX idx_run (run_id)
);

-- Stores persistent meta-progression across runs
CREATE TABLE roguelike_meta_progression (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    total_runs INT DEFAULT 0,
    total_victories INT DEFAULT 0,
    highest_zone_reached INT DEFAULT 0,
    meta_currency INT DEFAULT 0 COMMENT 'Persistent currency for unlocks',
    unlocked_data JSON DEFAULT '{}' COMMENT 'Classes, starting artifacts, etc.',
    stats_data JSON DEFAULT '{}' COMMENT 'Detailed statistics',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Migration Instructions:**
1. Connect to MySQL: `mysql -u root -p schach`
2. Run migration: `SOURCE sql/migrations/002_add_roguelike_tables.sql;`
3. Verify tables: `SHOW TABLES LIKE 'roguelike%';`

**Acceptance Criteria:**
- [ ] All 3 tables created without errors
- [ ] Foreign keys work (test: insert user, insert run, delete user → run cascades)
- [ ] JSON columns accept valid JSON (test: `INSERT INTO roguelike_runs (user_id, run_data) VALUES (1, '{"test": true}')`)
- [ ] Indexes exist (verify: `SHOW INDEXES FROM roguelike_runs`)

**Testing Script:**
```sql
-- Test data insertion
INSERT INTO roguelike_runs (user_id, gold) VALUES (1, 100);
SET @run_id = LAST_INSERT_ID();
INSERT INTO roguelike_run_upgrades (run_id, upgrade_type, upgrade_key, upgrade_data) 
VALUES (@run_id, 'piece_stat', 'SCHILDTRAEGER', '{"hp": 2, "maxHp": 2}');
SELECT * FROM roguelike_runs WHERE id = @run_id;
SELECT * FROM roguelike_run_upgrades WHERE run_id = @run_id;
```

**Estimated Time:** 1-2 hours

---

### Task 1.2: Constants & Game Mode Setup

**Files:** constants.js, game.js

#### Step 1: Add Roguelike Constants

Add to constants.js after line 133 (GAME_MODES):

```javascript
// Roguelike game mode
const GAME_MODES = {
    VS_AI: 'vs-ai',
    PVP_LOCAL: 'pvp-local',
    PVP_ONLINE: 'pvp-online',
    ROGUELIKE: 'roguelike'  // NEW
};

// Roguelike upgrade definitions
const ROGUELIKE_UPGRADES = {
    // PHASE 1: MVP Upgrade
    SCHILDTRAEGER: {
        id: 'SCHILDTRAEGER',
        name: 'Schildträger',
        description: 'This pawn gains +1 HP and must be captured twice to be removed from the board',
        type: 'piece_stat',
        targetPiece: 'pawn',
        icon: '🛡️',
        rarity: 'common',
        apply: (piece) => ({
            hp: 2,
            maxHp: 2,
            abilities: ['shield']
        }),
        cost: 40  // For shop encounters (Phase 4)
    },
    
    // PHASE 2: Additional Upgrades (placeholder for now)
    REITERSTURM: {
        id: 'REITERSTURM',
        name: 'Reitersturm',
        description: 'After capturing, this knight gains one bonus move (cannot capture again)',
        type: 'ability',
        targetPiece: 'knight',
        icon: '⚡',
        rarity: 'rare',
        apply: (piece) => ({
            abilities: ['bonusMoveAfterCapture']
        }),
        cost: 60
    },
    
    ARTILLERIE: {
        id: 'ARTILLERIE',
        name: 'Artillerie',
        description: 'This rook can attack diagonally, but only if the target is 3+ squares away',
        type: 'ability',
        targetPiece: 'rook',
        icon: '🎯',
        rarity: 'rare',
        apply: (piece) => ({
            abilities: ['longRangeDiagonal']
        }),
        cost: 70
    },
    
    // Artifacts (global effects)
    ZEITUMKEHR: {
        id: 'ZEITUMKEHR',
        name: 'Amulett der Zeitumkehr',
        description: 'Allows you to undo one move per game',
        type: 'artifact',
        icon: '⏪',
        rarity: 'uncommon',
        apply: () => ({
            undoCharges: 1
        }),
        cost: 50
    }
};

// Helper function to get upgrade by ID
function getUpgradeById(id) {
    return ROGUELIKE_UPGRADES[id] || null;
}

// Helper function to get upgrades by type
function getUpgradesByType(type) {
    return Object.values(ROGUELIKE_UPGRADES).filter(u => u.type === type);
}

// Helper function to get upgrades by target piece
function getUpgradesForPiece(pieceType) {
    return Object.values(ROGUELIKE_UPGRADES).filter(u => u.targetPiece === pieceType);
}
```

#### Step 2: Extend ChessGame Class

Modify game.js constructor (lines 6-39):

```javascript
class ChessGame {
    constructor() {
        // Existing properties
        this.position = {};
        this.currentTurn = COLORS.WHITE;
        this.gameState = GAME_STATES.NOT_STARTED;
        this.gameMode = GAME_MODES.VS_AI;
        this.playerColor = COLORS.WHITE;
        this.aiDifficulty = AI_DIFFICULTIES.EASY;
        
        // Game state tracking
        this.castlingRights = 'KQkq';
        this.enPassantSquare = null;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        
        // History
        this.moveHistory = [];
        this.positionHistory = [];
        this.redoStack = [];
        this.capturedPieces = { white: [], black: [] };
        
        // Draw offer tracking
        this.drawOffered = false;
        this.drawOfferedBy = null;
        
        // Callbacks
        this.onMove = null;
        this.onGameOver = null;
        this.onCheck = null;
        this.onTurnChange = null;
        
        // ============================================
        // NEW: Roguelike Mode Properties
        // ============================================
        this.roguelikeMode = false;
        this.runId = null;
        this.currentZone = 1;
        this.currentEncounter = 1;
        this.maxZones = 5;
        this.encountersPerZone = 3;
        this.gold = 0;
        
        // Parallel upgrade tracking layer
        this.pieceUpgrades = {};  // { 'e2': { hp: 2, maxHp: 2, abilities: [] } }
        this.artifacts = [];      // Array of active artifact objects
        this.pendingBonusMove = null;  // For abilities like Reitersturm
        
        // NEW: Roguelike Callbacks
        this.onEncounterVictory = null;   // Triggered when player wins encounter
        this.onRunComplete = null;         // Triggered when run finishes (win/loss)
        this.onUpgradeApplied = null;      // Triggered when upgrade is applied
        this.onGoldChanged = null;         // Triggered when gold amount changes
    }
    
    // ... existing methods ...
}
```

**Acceptance Criteria:**
- [ ] Constants load without JavaScript errors (check browser console)
- [ ] `getUpgradeById('SCHILDTRAEGER')` returns upgrade object
- [ ] `ChessGame` instantiates with all new properties
- [ ] Existing chess mode still works (play normal game to verify)
- [ ] No TypeErrors or undefined references

**Testing:**
```javascript
// In browser console after loading index.html:
console.log(ROGUELIKE_UPGRADES.SCHILDTRAEGER);  // Should show upgrade object
const game = new ChessGame();
console.log(game.roguelikeMode);  // Should be false
console.log(game.pieceUpgrades);  // Should be {}
```

**Estimated Time:** 1-2 hours

---

### Task 1.3: Upgrade Modal UI

**Files:** index.html, `css/roguelike.css` (NEW), ui.js

#### Step 1: HTML Structure

Add to index.html after the `gameOverModal` (around line 350):

```html
<!-- Roguelike Upgrade Selection Modal -->
<div class="modal" id="upgradeModal">
    <div class="modal-content upgrade-modal-content">
        <h2>⚔️ Choose Your Reward</h2>
        <p class="upgrade-subtitle">Select one upgrade to enhance your chess pieces</p>
        <div class="upgrade-options" id="upgradeOptions">
            <!-- Dynamically populated with upgrade cards -->
        </div>
        <p class="upgrade-hint">💡 Tip: Upgrades stack! Multiple pawns can have Schildträger.</p>
    </div>
</div>

<!-- Roguelike HUD (initially hidden) -->
<aside class="roguelike-hud" id="roguelikeHUD" style="display: none;">
    <div class="hud-section run-progress">
        <h3>📍 Progress</h3>
        <div class="progress-info">
            <div class="progress-item">
                <span class="label">Zone:</span>
                <span class="value"><strong id="currentZone">1</strong> / 5</span>
            </div>
            <div class="progress-item">
                <span class="label">Battle:</span>
                <span class="value"><strong id="currentEncounter">1</strong> / 3</span>
            </div>
        </div>
        <div class="progress-bar-container">
            <div class="progress-bar" id="runProgressBar" style="width: 0%"></div>
        </div>
    </div>
    
    <div class="hud-section resources">
        <h3>💰 Gold</h3>
        <div class="gold-display">
            <span class="gold-amount" id="goldAmount">0</span>
        </div>
    </div>
    
    <div class="hud-section active-upgrades">
        <h3>⬆️ Active Upgrades</h3>
        <div class="upgrade-list" id="activeUpgradeList">
            <p class="empty-state">No upgrades yet</p>
        </div>
    </div>
    
    <div class="hud-section artifacts">
        <h3>✨ Artifacts</h3>
        <div class="artifact-list" id="artifactList">
            <p class="empty-state">No artifacts yet</p>
        </div>
    </div>
</aside>
```

#### Step 2: CSS Styling

Create `css/roguelike.css`:

```css
/* ============================================
   Roguelike HUD Styling
   ============================================ */

.roguelike-hud {
    position: fixed;
    right: 20px;
    top: 80px;
    width: 280px;
    background: linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(30, 30, 45, 0.98) 100%);
    border-radius: 16px;
    padding: 0;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
    color: white;
    z-index: 100;
    overflow: hidden;
    backdrop-filter: blur(10px);
}

.hud-section {
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.hud-section:last-child {
    border-bottom: none;
}

.hud-section h3 {
    margin: 0 0 15px 0;
    font-size: 14px;
    font-weight: 600;
    color: #a0a0ff;
    text-transform: uppercase;
    letter-spacing: 1px;
}

/* Progress Section */
.progress-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 15px;
}

.progress-item {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
}

.progress-item .label {
    color: #aaa;
}

.progress-item .value {
    color: #fff;
    font-weight: 600;
}

.progress-bar-container {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    transition: width 0.5s ease;
    border-radius: 4px;
}

/* Gold Section */
.gold-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
}

.gold-amount {
    font-size: 32px;
    font-weight: bold;
    color: #ffd700;
    text-shadow: 0 2px 8px rgba(255, 215, 0, 0.5);
}

/* Upgrade List */
.upgrade-list, .artifact-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 40px;
}

.empty-state {
    color: #666;
    font-size: 12px;
    font-style: italic;
    margin: 0;
}

.upgrade-badge, .artifact-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(102, 126, 234, 0.2);
    border: 1px solid rgba(102, 126, 234, 0.4);
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    cursor: help;
    transition: all 0.2s;
}

.upgrade-badge:hover, .artifact-badge:hover {
    background: rgba(102, 126, 234, 0.4);
    border-color: rgba(102, 126, 234, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.artifact-badge {
    background: rgba(245, 87, 108, 0.2);
    border-color: rgba(245, 87, 108, 0.4);
}

.artifact-badge:hover {
    background: rgba(245, 87, 108, 0.4);
    border-color: rgba(245, 87, 108, 0.6);
    box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);
}

/* ============================================
   Upgrade Selection Modal
   ============================================ */

#upgradeModal .modal-content {
    max-width: 900px;
    padding: 40px;
    background: linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%);
}

#upgradeModal h2 {
    text-align: center;
    color: #fff;
    font-size: 32px;
    margin-bottom: 10px;
}

.upgrade-subtitle {
    text-align: center;
    color: #999;
    margin-bottom: 30px;
    font-size: 16px;
}

.upgrade-hint {
    text-align: center;
    color: #ffd700;
    margin-top: 20px;
    font-size: 14px;
}

.upgrade-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
}

.upgrade-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    padding: 24px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    color: white;
    text-align: center;
    border: 3px solid transparent;
    position: relative;
    overflow: hidden;
}

.upgrade-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
    opacity: 0;
    transition: opacity 0.3s;
}

.upgrade-card:hover::before {
    opacity: 1;
}

.upgrade-card:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 15px 40px rgba(102, 126, 234, 0.5);
    border-color: #fff;
}

.upgrade-card.artifact {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.upgrade-card.artifact:hover {
    box-shadow: 0 15px 40px rgba(245, 87, 108, 0.5);
}

.upgrade-card.common {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.upgrade-card.rare {
    background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.upgrade-icon {
    font-size: 56px;
    margin-bottom: 12px;
    display: block;
    text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.upgrade-card h4 {
    margin: 12px 0 8px 0;
    font-size: 20px;
    font-weight: 600;
}

.upgrade-card p {
    font-size: 14px;
    opacity: 0.95;
    margin: 0;
    line-height: 1.5;
}

.upgrade-rarity {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    text-transform: uppercase;
    font-weight: 600;
    margin-top: 10px;
    background: rgba(255, 255, 255, 0.2);
}

/* Responsive adjustments */
@media (max-width: 1400px) {
    .roguelike-hud {
        right: 10px;
        width: 240px;
    }
}

@media (max-width: 1200px) {
    .roguelike-hud {
        display: none !important;  /* Hide HUD on smaller screens */
    }
}
```

#### Step 3: UI JavaScript Methods

Add to ui.js after line 189:

```javascript
/**
 * Show upgrade selection modal with options
 * @param {Array} upgrades - Array of upgrade objects
 * @param {Function} callback - Called when user selects an upgrade
 */
showUpgradeModal(upgrades, callback) {
    const modal = document.getElementById('upgradeModal');
    const optionsContainer = document.getElementById('upgradeOptions');
    optionsContainer.innerHTML = '';
    
    upgrades.forEach(upgrade => {
        const card = document.createElement('button');
        card.className = `upgrade-card ${upgrade.type === 'artifact' ? 'artifact' : upgrade.rarity || 'common'}`;
        card.innerHTML = `
            <div class="upgrade-icon">${upgrade.icon}</div>
            <h4>${upgrade.name}</h4>
            <p>${upgrade.description}</p>
            ${upgrade.rarity ? `<span class="upgrade-rarity">${upgrade.rarity}</span>` : ''}
        `;
        card.onclick = () => {
            this.hideUpgradeModal();
            callback(upgrade);
        };
        optionsContainer.appendChild(card);
    });
    
    modal.classList.add('active');
}

/**
 * Hide upgrade modal
 */
hideUpgradeModal() {
    const modal = document.getElementById('upgradeModal');
    modal.classList.remove('active');
}

/**
 * Update roguelike HUD with current game state
 * @param {Object} state - { zone, encounter, gold, pieceUpgrades, artifacts }
 */
updateRoguelikeHUD(state) {
    // Update progress
    document.getElementById('currentZone').textContent = state.zone;
    document.getElementById('currentEncounter').textContent = state.encounter;
    
    // Calculate progress percentage (zone * 3 encounters per zone)
    const totalEncounters = state.zone * 3 + state.encounter;
    const maxEncounters = 15;  // 5 zones * 3 encounters
    const progressPercent = (totalEncounters / maxEncounters) * 100;
    document.getElementById('runProgressBar').style.width = `${progressPercent}%`;
    
    // Update gold
    document.getElementById('goldAmount').textContent = state.gold;
    
    // Update active upgrades
    const upgradeList = document.getElementById('activeUpgradeList');
    const upgradeCount = Object.keys(state.pieceUpgrades || {}).length;
    
    if (upgradeCount === 0) {
        upgradeList.innerHTML = '<p class="empty-state">No upgrades yet</p>';
    } else {
        upgradeList.innerHTML = '';
        Object.entries(state.pieceUpgrades).forEach(([square, upgrade]) => {
            const badge = document.createElement('span');
            badge.className = 'upgrade-badge';
            
            const abilities = upgrade.abilities?.join(', ') || 'Enhanced';
            const hpInfo = upgrade.hp ? ` (${upgrade.hp}/${upgrade.maxHp} HP)` : '';
            badge.title = `${square}: ${abilities}${hpInfo}`;
            
            badge.innerHTML = `
                <span>${square}</span>
                <span>${upgrade.hp ? '🛡️' : '⬆️'}</span>
            `;
            upgradeList.appendChild(badge);
        });
    }
    
    // Update artifacts
    const artifactList = document.getElementById('artifactList');
    if (!state.artifacts || state.artifacts.length === 0) {
        artifactList.innerHTML = '<p class="empty-state">No artifacts yet</p>';
    } else {
        artifactList.innerHTML = '';
        state.artifacts.forEach(artifact => {
            const badge = document.createElement('span');
            badge.className = 'artifact-badge';
            badge.title = `${artifact.name}: ${artifact.description}`;
            badge.textContent = artifact.icon;
            artifactList.appendChild(badge);
        });
    }
}

/**
 * Show or hide roguelike HUD
 * @param {Boolean} show - True to show, false to hide
 */
toggleRoguelikeHUD(show) {
    const hud = document.getElementById('roguelikeHUD');
    hud.style.display = show ? 'block' : 'none';
}
```

#### Step 4: Update UI Constructor

Modify ui.js constructor to include new elements (around line 70):

```javascript
// Add to this.elements object
this.elements = {
    // ... existing elements ...
    upgradeModal: document.getElementById('upgradeModal'),
    roguelikeHUD: document.getElementById('roguelikeHUD')
};
```

#### Step 5: Link CSS

Add to index.html `<head>` section (around line 10):

```html
<link rel="stylesheet" href="css/roguelike.css">
```

**Acceptance Criteria:**
- [ ] Upgrade modal displays without errors
- [ ] Clicking upgrade card triggers callback and closes modal
- [ ] HUD displays zone/encounter/gold correctly
- [ ] Progress bar animates smoothly
- [ ] CSS styling matches game theme (dark, modern)
- [ ] Upgrade badges show tooltips on hover
- [ ] Empty states show when no upgrades/artifacts

**Testing:**
```javascript
// In browser console:
ui.toggleRoguelikeHUD(true);
ui.updateRoguelikeHUD({
    zone: 2,
    encounter: 3,
    gold: 150,
    pieceUpgrades: {
        'e2': { hp: 2, maxHp: 2, abilities: ['shield'] }
    },
    artifacts: [{ name: 'Test', description: 'Test artifact', icon: '⏪' }]
});

ui.showUpgradeModal([
    ROGUELIKE_UPGRADES.SCHILDTRAEGER,
    ROGUELIKE_UPGRADES.ZEITUMKEHR
], (upgrade) => console.log('Selected:', upgrade.name));
```

**Estimated Time:** 3-4 hours

---

### Task 1.4: Implement "Schildträger" Upgrade (MVP Test)

**Files:** pieces.js, game.js

This is the **core** of Phase 1 - making the HP system work.

#### Step 1: Modify `Pieces.makeMove()` for HP System

**File:** pieces.js (around line 83)

**Current code:**
```javascript
makeMove(position, from, move, gameState) {
    const newPosition = Utils.deepClone(position);
    // ... move logic ...
    return { position: newPosition };
}
```

**New code with upgrade support:**
```javascript
/**
 * Make a move and return the new position (simulation for validation)
 * NOW SUPPORTS: Upgrade tracking and HP system
 * 
 * @param {Object} position - Current position
 * @param {String} from - From square (e.g., 'e2')
 * @param {Object} move - Move object or target square string
 * @param {Object} gameState - Game state (castling, en passant, etc.)
 * @param {Object} pieceUpgrades - Optional upgrade tracking object
 * @returns {Object} { position, upgrades, captured, damageDealt }
 */
makeMove(position, from, move, gameState, pieceUpgrades = null) {
    const newPosition = Utils.deepClone(position);
    const piece = newPosition[from];
    
    // Parse move target
    const target = move.to || move;
    const targetSquare = typeof target === 'string' ? target : target.to;
    
    // ============================================
    // NEW: Handle HP System for Captures
    // ============================================
    if (newPosition[targetSquare]) {  // There's a piece to capture
        if (pieceUpgrades && pieceUpgrades[targetSquare]) {
            const targetUpgrade = pieceUpgrades[targetSquare];
            
            // Check if target has HP (e.g., Schildträger pawn)
            if (targetUpgrade.hp && targetUpgrade.hp > 1) {
                // Reduce HP instead of capturing
                const newUpgrades = Utils.deepClone(pieceUpgrades);
                newUpgrades[targetSquare].hp--;
                
                console.log(`[HP System] ${targetSquare} took damage: ${newUpgrades[targetSquare].hp}/${targetUpgrade.maxHp} HP remaining`);
                
                // Return WITHOUT moving the piece (capture failed, piece survives)
                return {
                    position: newPosition,  // Position unchanged
                    upgrades: newUpgrades,
                    captured: false,
                    damageDealt: true,
                    remainingHp: newUpgrades[targetSquare].hp
                };
            }
            
            // HP depleted or no HP - proceed with normal capture
            if (targetUpgrade.hp) {
                console.log(`[HP System] ${targetSquare} HP depleted, piece captured`);
            }
        }
    }
    
    // ============================================
    // Standard Capture & Move Logic
    // ============================================
    const capturedPiece = newPosition[targetSquare];
    delete newPosition[targetSquare];
    newPosition[targetSquare] = piece;
    delete newPosition[from];
    
    // Transfer upgrades to new square
    let newUpgrades = pieceUpgrades ? Utils.deepClone(pieceUpgrades) : null;
    if (newUpgrades && newUpgrades[from]) {
        newUpgrades[targetSquare] = newUpgrades[from];
        delete newUpgrades[from];
        console.log(`[Upgrades] Transferred upgrade from ${from} to ${targetSquare}`);
    }
    
    // Handle special moves (castling, en passant, promotion)
    // ... existing special move logic (unchanged) ...
    
    return {
        position: newPosition,
        upgrades: newUpgrades,
        captured: !!capturedPiece,
        damageDealt: false
    };
}
```

#### Step 2: Update `ChessGame.makeMove()` to Support HP

**File:** game.js (around line 130)

**Find the existing `makeMove()` method and modify:**

```javascript
/**
 * Make a move on the board
 * NOW SUPPORTS: Roguelike upgrades and HP system
 */
makeMove(from, to, promotion = null) {
    // Existing validation
    if (this.gameState !== GAME_STATES.ACTIVE) {
        console.warn('Game is not active');
        return null;
    }
    
    const piece = this.position[from];
    if (!piece) {
        console.warn('No piece at', from);
        return null;
    }
    
    if (piece.color !== this.currentTurn) {
        console.warn('Not your turn');
        return null;
    }
    
    // Get valid moves and check if target is legal
    const validMoves = this.getValidMoves(from);
    const moveObj = validMoves.find(m => {
        const target = m.to || m;
        return (typeof target === 'string' ? target : target.to) === to;
    });
    
    if (!moveObj) {
        console.warn('Illegal move');
        return null;
    }
    
    // ============================================
    // NEW: Execute move with upgrade support
    // ============================================
    const result = Pieces.makeMove(
        this.position,
        from,
        { to, promotion },
        this.getGameState(),
        this.roguelikeMode ? this.pieceUpgrades : null  // Pass upgrades only in roguelike mode
    );
    
    // ============================================
    // NEW: Handle damage dealt (HP reduced, no capture)
    // ============================================
    if (result.damageDealt) {
        console.log(`[Game] Damage dealt to ${to}, ${result.remainingHp} HP remaining`);
        
        // Update upgrades but NOT position (piece survives)
        if (result.upgrades) {
            this.pieceUpgrades = result.upgrades;
        }
        
        // Trigger visual feedback via callback
        if (this.onMove) {
            this.onMove({
                from,
                to,
                piece: piece.type,
                color: piece.color,
                notation: this.generateAlgebraicNotation(from, to, piece, false),
                damageDealt: true,
                remainingHp: result.remainingHp,
                fen: this.generateFEN()
            });
        }
        
        // DON'T switch turns - attacker gets to try again or move elsewhere
        this.updateStatus();
        return {
            from,
            to,
            damageDealt: true,
            remainingHp: result.remainingHp
        };
    }
    
    // ============================================
    // Standard capture/move logic
    // ============================================
    const capturedPiece = this.position[to];
    
    // Update position
    this.position = result.position;
    
    // Update upgrades if in roguelike mode
    if (result.upgrades) {
        this.pieceUpgrades = result.upgrades;
    }
    
    // Handle capture
    if (capturedPiece) {
        this.capturedPieces[Utils.oppositeColor(piece.color)].push(capturedPiece.type);
        this.halfMoveClock = 0;
    } else if (piece.type === PIECE_TYPES.PAWN) {
        this.halfMoveClock = 0;
    } else {
        this.halfMoveClock++;
    }
    
    // Save position to history
    this.positionHistory.push(Utils.deepClone(this.position));
    
    // Generate move record
    const moveRecord = {
        from,
        to,
        piece: piece.type,
        color: piece.color,
        captured: capturedPiece ? capturedPiece.type : null,
        notation: this.generateAlgebraicNotation(from, to, piece, !!capturedPiece, promotion),
        fen: this.generateFEN()
    };
    
    this.moveHistory.push(moveRecord);
    this.redoStack = [];  // Clear redo stack
    
    // Switch turns
    this.currentTurn = Utils.oppositeColor(this.currentTurn);
    this.fullMoveNumber++;
    
    // Trigger callbacks
    if (this.onMove) {
        this.onMove(moveRecord);
    }
    
    if (this.onTurnChange) {
        this.onTurnChange(this.currentTurn);
    }
    
    // Check game state (check, checkmate, stalemate)
    this.checkGameState();
    
    return moveRecord;
}
```

#### Step 3: Add Upgrade Application Method

Add this new method to `ChessGame` class:

```javascript
/**
 * Apply an upgrade to a specific piece or globally (artifact)
 * @param {String} upgradeKey - Key from ROGUELIKE_UPGRADES (e.g., 'SCHILDTRAEGER')
 * @param {String} targetSquare - Square to apply upgrade (null for artifacts)
 * @returns {Boolean} Success status
 */
applyUpgrade(upgradeKey, targetSquare = null) {
    const upgrade = ROGUELIKE_UPGRADES[upgradeKey];
    if (!upgrade) {
        console.error('[Upgrade] Unknown upgrade:', upgradeKey);
        return false;
    }
    
    console.log(`[Upgrade] Applying ${upgrade.name} to ${targetSquare || 'global'}`);
    
    if (upgrade.type === 'artifact') {
        // ============================================
        // Global Effect (Artifact)
        // ============================================
        this.artifacts.push(upgrade);
        const artifactData = upgrade.apply();
        
        // Apply artifact properties to game (e.g., undoCharges)
        Object.assign(this, artifactData);
        console.log('[Upgrade] Artifact applied:', artifactData);
        
    } else {
        // ============================================
        // Piece-Specific Upgrade
        // ============================================
        if (!targetSquare) {
            console.error('[Upgrade] Piece upgrade requires target square');
            return false;
        }
        
        const piece = this.position[targetSquare];
        if (!piece) {
            console.error(`[Upgrade] No piece at ${targetSquare}`);
            return false;
        }
        
        if (piece.type !== upgrade.targetPiece) {
            console.error(`[Upgrade] Cannot apply ${upgrade.name} to ${piece.type}`);
            return false;
        }
        
        if (piece.color !== this.playerColor) {
            console.error(`[Upgrade] Can only upgrade your own pieces`);
            return false;
        }
        
        // Initialize or update upgrade for this piece
        if (!this.pieceUpgrades[targetSquare]) {
            this.pieceUpgrades[targetSquare] = { abilities: [] };
        }
        
        const upgradeData = upgrade.apply(piece);
        Object.assign(this.pieceUpgrades[targetSquare], upgradeData);
        
        console.log(`[Upgrade] Applied to ${targetSquare}:`, this.pieceUpgrades[targetSquare]);
    }
    
    // Trigger callback
    if (this.onUpgradeApplied) {
        this.onUpgradeApplied(upgrade, targetSquare);
    }
    
    return true;
}
```

**Acceptance Criteria:**
- [ ] Pawn with Schildträger survives first capture attempt
- [ ] HP reduces from 2 to 1 on first hit
- [ ] Second capture removes the pawn
- [ ] Console logs show HP system working
- [ ] Upgrade data persists across moves
- [ ] Standard chess mode unaffected (no upgrades = normal captures)
- [ ] `game.applyUpgrade('SCHILDTRAEGER', 'e2')` works

**Testing:**
```javascript
// In browser console after starting a game:
game.roguelikeMode = true;
game.applyUpgrade('SCHILDTRAEGER', 'e2');
console.log(game.pieceUpgrades);  // Should show: { 'e2': { hp: 2, maxHp: 2, abilities: ['shield'] } }

// Then play a move capturing e2:
// - First capture: e2 pawn loses 1 HP but survives
// - Second capture: e2 pawn is removed
```

**Estimated Time:** 4-6 hours

---

### Task 1.5: Basic Run Flow (Start → Fight → Upgrade → End)

**Files:** main.js, `php/roguelike/start-run.php` (NEW), `php/roguelike/end-run.php` (NEW)

#### Step 1: Add Roguelike Buttons to UI

**File:** index.html (around line 50, game mode buttons section)

```html
<div class="game-mode-buttons">
    <button class="btn" id="vsAiBtn">vs AI</button>
    <button class="btn" id="vsPlayerLocalBtn">vs Player (Local)</button>
    <button class="btn" id="vsPlayerOnlineBtn">vs Player (Online)</button>
    <!-- NEW: Roguelike mode button -->
    <button class="btn btn-special" id="roguelikeBtn">
        🎮 Roguelike Mode
        <span class="beta-badge">BETA</span>
    </button>
</div>
```

Add CSS for special button:
```css
/* In css/style.css */
.btn-special {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-weight: 600;
    position: relative;
}

.btn-special:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.beta-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #ffd700;
    color: #000;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 8px;
    font-weight: bold;
}
```

#### Step 2: Implement Run Flow in main.js

Add to main.js (around line 140):

```javascript
/**
 * Start a new roguelike run
 */
async function startRoguelikeRun() {
    // Check authentication
    if (!isAuthenticated) {
        ui.showAuthModal('login');
        ui.updateStatus('Please login to play Roguelike mode', 'warning');
        return;
    }
    
    console.log('[Roguelike] Starting new run...');
    
    try {
        // Call backend to create run
        const response = await fetch('/php/roguelike/start-run.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (!result.success) {
            const errorMsg = result.errors?.general || 'Failed to start run';
            ui.updateStatus(errorMsg, 'error');
            alert(errorMsg);
            return;
        }
        
        console.log('[Roguelike] Run created:', result.data);
        
        // Initialize game in roguelike mode
        game.roguelikeMode = true;
        game.runId = result.data.runId;
        game.currentZone = 1;
        game.currentEncounter = 1;
        game.gold = 0;
        game.pieceUpgrades = {};
        game.artifacts = [];
        
        // Setup callbacks
        game.onGameOver = handleRoguelikeGameOver;
        
        // Start first encounter
        startRoguelikeEncounter();
        
    } catch (error) {
        console.error('[Roguelike] Error starting run:', error);
        ui.updateStatus('Network error. Please try again.', 'error');
    }
}

/**
 * Start a roguelike encounter (chess match)
 */
function startRoguelikeEncounter() {
    console.log(`[Roguelike] Starting Zone ${game.currentZone}, Encounter ${game.currentEncounter}`);
    
    // Show HUD
    ui.toggleRoguelikeHUD(true);
    ui.updateRoguelikeHUD({
        zone: game.currentZone,
        encounter: game.currentEncounter,
        gold: game.gold,
        pieceUpgrades: game.pieceUpgrades,
        artifacts: game.artifacts
    });
    
    // Start chess game with current upgrades intact
    const position = game.newGame({
        mode: GAME_MODES.ROGUELIKE,
        playerColor: COLORS.WHITE,
        difficulty: AI_DIFFICULTIES.EASY  // TODO: Map to enemy type in Phase 3
    });
    
    board.renderPosition(position);
    ui.updateStatus(`Zone ${game.currentZone} - Encounter ${game.currentEncounter}`, 'info');
}

/**
 * Handle end of roguelike game (win or loss)
 */
async function handleRoguelikeGameOver(result) {
    console.log('[Roguelike] Game over:', result);
    
    if (result.winner === game.playerColor) {
        // ============================================
        // VICTORY - Show upgrade selection
        // ============================================
        console.log('[Roguelike] Victory! Showing rewards...');
        
        // Award gold
        const goldReward = 50;
        game.gold += goldReward;
        
        // Generate 3 random upgrades for selection
        // For MVP, use same upgrades every time
        const availableUpgrades = [
            ROGUELIKE_UPGRADES.SCHILDTRAEGER,
            ROGUELIKE_UPGRADES.ZEITUMKEHR
        ];
        
        // Randomly pick 2 upgrades (or all if fewer available)
        const upgradeOptions = [];
        const upgradePool = [...availableUpgrades];
        for (let i = 0; i < Math.min(2, upgradePool.length); i++) {
            const index = Math.floor(Math.random() * upgradePool.length);
            upgradeOptions.push(upgradePool.splice(index, 1)[0]);
        }
        
        // Show upgrade selection modal
        ui.showUpgradeModal(upgradeOptions, async (selectedUpgrade) => {
            console.log('[Roguelike] Player selected:', selected Upgrade.name);
            
            if (selectedUpgrade.type === 'piece_stat' || selectedUpgrade.type === 'ability') {
                // ============================================
                // Piece Upgrade - Let player select which piece
                // ============================================
                ui.updateStatus(`Click a ${selectedUpgrade.targetPiece} to upgrade`, 'highlight');
                
                // Temporarily override square click handler
                const originalHandler = board.onSquareClick;
                board.onSquareClick = (square) => {
                    const piece = game.position[square];
                    
                    if (piece && piece.type === selectedUpgrade.targetPiece && piece.color === game.playerColor) {
                        // Valid selection
                        const success = game.applyUpgrade(selectedUpgrade.id, square);
                        
                        if (success) {
                            ui.updateStatus(`${selectedUpgrade.name} applied to ${square}!`, 'success');
                            board.onSquareClick = originalHandler;  // Restore handler
                            
                            // Visual feedback
                            board.highlightSquare(square, 'upgrade-applied');
                            setTimeout(() => {
                                board.clearHighlights();
                                proceedToNextEncounter();
                            }, 1500);
                        } else {
                            ui.updateStatus('Failed to apply upgrade', 'error');
                        }
                    } else {
                        ui.updateStatus(`Select a ${selectedUpgrade.targetPiece}`, 'warning');
                    }
                };
            } else {
                // ============================================
                // Artifact - Apply immediately
                // ============================================
                game.applyUpgrade(selectedUpgrade.id);
                ui.updateStatus(`${selectedUpgrade.name} acquired!`, 'success');
                setTimeout(() => proceedToNextEncounter(), 1000);
            }
        });
        
    } else {
        // ============================================
        // DEFEAT - End run
        // ============================================
        console.log('[Roguelike] Defeat. Ending run...');
        await endRoguelikeRun(false);
    }
}

/**
 * Proceed to next encounter or zone
 */
function proceedToNextEncounter() {
    game.currentEncounter++;
    
    if (game.currentEncounter > game.encountersPerZone) {
        // Zone complete - move to next zone
        game.currentZone++;
        game.currentEncounter = 1;
        
        if (game.currentZone > game.maxZones) {
            // RUN COMPLETE - VICTORY!
            console.log('[Roguelike] Run complete! Victory!');
            endRoguelikeRun(true);
            return;
        }
        
        ui.updateStatus(`Zone ${game.currentZone} - ${game.currentZone === game.maxZones ? 'FINAL ZONE!' : 'New Zone'}`, 'highlight');
    }
    
    // Start next encounter
    setTimeout(() => startRoguelikeEncounter(), 1500);
}

/**
 * End the roguelike run (save to database)
 */
async function endRoguelikeRun(victory) {
    console.log(`[Roguelike] Ending run - Victory: ${victory}`);
    
    try {
        const response = await fetch('/php/roguelike/end-run.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                runId: game.runId,
                victory: victory,
                finalZone: game.currentZone,
                finalGold: game.gold,
                upgrades: Object.keys(game.pieceUpgrades).length,
                artifacts: game.artifacts.length
            })
        });
        
        const result = await response.json();
        console.log('[Roguelike] Run saved:', result);
        
        // Hide HUD
        ui.toggleRoguelikeHUD(false);
        game.roguelikeMode = false;
        
        // Show final message
        if (victory) {
            ui.showGameOverModal({
                winner: game.playerColor,
                reason: 'Run Complete!'
            });
            ui.updateStatus(`🎉 Victory! You completed all ${game.maxZones} zones! Score: ${result.data?.score || 0}`, 'success');
        } else {
            ui.showGameOverModal({
                winner: Utils.oppositeColor(game.playerColor),
                reason: 'Permadeath'
            });
            ui.updateStatus(`💀 Run Failed at Zone ${game.currentZone}. Try again?`, 'error');
        }
        
    } catch (error) {
        console.error('[Roguelike] Error ending run:', error);
        ui.updateStatus('Failed to save run data', 'error');
    }
}

// ============================================
// Event Listeners
// ============================================

// Add roguelike button listener in setupEventListeners()
document.getElementById('roguelikeBtn')?.addEventListener('click', startRoguelikeRun);
```

#### Step 3: PHP Backend Endpoints

**File:** `php/roguelike/start-run.php` (NEW)

```php
<?php
/**
 * Start Roguelike Run Endpoint
 * Creates a new run record for the authenticated user
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../includes/config.php';
require_once __DIR__ . '/../../includes/auth.php';

// Only POST allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Method not allowed']]);
    exit;
}

// Check authentication
if (!auth()->isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Not authenticated']]);
    exit;
}

$userId = $_SESSION['user_id'];

try {
    // Check if user already has an active run
    $existingRun = db()->fetchOne(
        "SELECT id, current_zone, current_encounter, gold 
         FROM roguelike_runs 
         WHERE user_id = ? AND is_active = 1",
        [$userId]
    );
    
    if ($existingRun) {
        // Return existing run instead of error (resume feature)
        echo json_encode([
            'success' => true,
            'data' => [
                'runId' => $existingRun['id'],
                'zone' => $existingRun['current_zone'],
                'encounter' => $existingRun['current_encounter'],
                'gold' => $existingRun['gold'],
                'resumed' => true
            ]
        ]);
        exit;
    }
    
    // Create new run
    $runId = db()->insert(
        "INSERT INTO roguelike_runs (user_id, current_zone, current_encounter, gold, is_active) 
         VALUES (?, 1, 1, 0, 1)",
        [$userId]
    );
    
    // Log run start
    if (DEBUG_MODE) {
        error_log("Roguelike run started - User: $userId, Run ID: $runId");
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'runId' => $runId,
            'zone' => 1,
            'encounter' => 1,
            'gold' => 0
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    if (DEBUG_MODE) {
        echo json_encode(['success' => false, 'errors' => ['general' => $e->getMessage()]]);
    } else {
        echo json_encode(['success' => false, 'errors' => ['general' => 'Failed to start run']]);
    }
}
```

**File:** `php/roguelike/end-run.php` (NEW)

```php
<?php
/**
 * End Roguelike Run Endpoint
 * Marks run as complete and calculates score
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../../includes/config.php';
require_once __DIR__ . '/../../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Method not allowed']]);
    exit;
}

if (!auth()->isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Not authenticated']]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$runId = $input['runId'] ?? null;
$victory = $input['victory'] ?? false;
$finalZone = $input['finalZone'] ?? 1;
$finalGold = $input['finalGold'] ?? 0;
$upgradeCount = $input['upgrades'] ?? 0;
$artifactCount = $input['artifacts'] ?? 0;

if (!$runId) {
    echo json_encode(['success' => false, 'errors' => ['general' => 'Run ID required']]);
    exit;
}

try {
    // Calculate score: (zone * 100) + gold + (upgrades * 20) + (artifacts * 30)
    // Victory multiplier: 2x
    $baseScore = ($finalZone * 100) + $finalGold + ($upgradeCount * 20) + ($artifactCount * 30);
    $finalScore = $victory ? $baseScore * 2 : $baseScore;
    
    // Update run record
    $updated = db()->update(
        "UPDATE roguelike_runs 
         SET is_active = 0, 
             completed_at = NOW(), 
             victory = ?, 
             final_score = ? 
         WHERE id = ? AND user_id = ?",
        [$victory ? 1 : 0, $finalScore, $runId, $_SESSION['user_id']]
    );
    
    if ($updated === 0) {
        throw new Exception('Run not found or already completed');
    }
    
    // Update meta-progression
    $metaCurrency = $victory ? 100 : 25;  // More currency for victories
    
    db()->query(
        "INSERT INTO roguelike_meta_progression 
         (user_id, total_runs, total_victories, highest_zone_reached, meta_currency) 
         VALUES (?, 1, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
            total_runs = total_runs + 1,
            total_victories = total_victories + ?,
            highest_zone_reached = GREATEST(highest_zone_reached, ?),
            meta_currency = meta_currency + ?",
        [
            $_SESSION['user_id'], 
            $victory ? 1 : 0, 
            $finalZone, 
            $metaCurrency,
            $victory ? 1 : 0,
            $finalZone,
            $metaCurrency
        ]
    );
    
    // Log completion
    if (DEBUG_MODE) {
        error_log("Roguelike run ended - Run ID: $runId, Victory: " . ($victory ? 'Yes' : 'No') . ", Score: $finalScore");
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'score' => $finalScore,
            'victory' => $victory,
            'metaCurrency' => $metaCurrency
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    if (DEBUG_MODE) {
        echo json_encode(['success' => false, 'errors' => ['general' => $e->getMessage()]]);
    } else {
        echo json_encode(['success' => false, 'errors' => ['general' => 'Failed to end run']]);
    }
}
```

**Create directory:**
```bash
mkdir php/roguelike
```

**Acceptance Criteria:**
- [ ] Clicking "Roguelike Mode" button starts new run
- [ ] Backend creates run record in database
- [ ] First encounter starts automatically
- [ ] Winning encounter shows upgrade modal with 2 options
- [ ] Selecting Schildträger prompts piece selection
- [ ] Clicking pawn applies upgrade (console shows confirmation)
- [ ] Next encounter starts with upgrade active
- [ ] Pawn with upgrade survives first capture (HP system works!)
- [ ] Losing any encounter ends run and saves to database
- [ ] Completing all 15 encounters (5 zones × 3) shows victory screen

**Testing Checklist:**
1. [ ] Start run while logged out → redirected to login
2. [ ] Start run while logged in → run created
3. [ ] Win first game → upgrade modal appears
4. [ ] Select artifact → applied immediately, next encounter starts
5. [ ] Select piece upgrade → prompted to click piece
6. [ ] Click wrong piece → warning message
7. [ ] Click correct piece → upgrade applied, visual feedback
8. [ ] Lose encounter → run ends, database updated
9. [ ] Check database → run marked inactive, score calculated
10. [ ] Check meta-progression → total_runs incremented

**Estimated Time:** 6-8 hours

---

### Phase 1 Success Criteria

✅ **One upgrade (Schildträger) fully functional**
- Pawn gains 2 HP
- Survives first capture
- Second capture removes it
- HP tracking persists across moves

✅ **Basic run flow works end-to-end**
- Start run → Fight AI → Win → Get upgrade → Apply → Fight again → Repeat
- Loss triggers permadeath
- Victory after 15 encounters

✅ **Database stores run data**
- `roguelike_runs` table populated
- `roguelike_meta_progression` updated
- Scores calculated correctly

✅ **HUD displays progress**
- Zone/encounter numbers update
- Progress bar animates
- Gold counter works
- Upgrade badges appear

✅ **No breaking changes to standard chess**
- Normal chess mode still plays identically
- Upgrade system isolated to roguelike mode
- No performance degradation

**Total Phase 1 Time:** 16-24 hours (2-3 days)

---

## Phase 2: Core Upgrade System
**Duration:** 1-2 weeks (40-80 hours)  
**Goal:** 5+ upgrades, ability triggers, artifact system, visual feedback

### Overview

Expand the upgrade system beyond Schildträger to include:
- **Ability-based upgrades** (bonus moves, special attacks)
- **Artifact system** (global passive effects)
- **Ability trigger hooks** (events that fire on capture, move, etc.)
- **Visual feedback** (HP bars, damage numbers, ability indicators)

---

### Task 2.1: Ability Trigger System

**Challenge:** Upgrades like "Reitersturm" (knight bonus move after capture) require **event-driven** logic.

**Files:** game.js, pieces.js, board.js

#### Implementation Strategy

**Step 1: Add Trigger Queue to ChessGame**

```javascript
// In game.js constructor
this.pendingAbilityTriggers = [];  // Queue of pending ability triggers
this.abilityHandlers = {};         // Registry of ability handler functions

// Register ability handlers
this.registerAbilityHandlers();
```

**Step 2: Create Ability Handler Registry**

```javascript
/**
 * Register all ability handlers
 */
registerAbilityHandlers() {
    // Reitersturm: Bonus move after capture
    this.abilityHandlers['bonusMoveAfterCapture'] = {
        trigger: 'afterCapture',
        condition: (context) => context.captured && context.movingPiece,
        execute: (context) => {
            this.pendingBonusMove = {
                square: context.to,
                canCapture: false,  // Bonus move cannot capture
                expiresAfter: 1     // Must be used immediately
            };
            console.log('[Ability] Reitersturm triggered - bonus move available');
        }
    };
    
    // Long Range Diagonal (Artillerie): Rook can attack diagonally from 3+ squares
    this.abilityHandlers['longRangeDiagonal'] = {
        trigger: 'moveGeneration',
        condition: (context) => context.piece.type === 'rook',
        execute: (context) => {
            // Add diagonal moves if distance >= 3
            const diagonalMoves = this.generateLongRangeDiagonals(context.square);
            context.moves.push(...diagonalMoves);
        }
    };
    
    // Durchdringung (Bishop pierce): Attack through first piece to hit second
    this.abilityHandlers['pierce'] = {
        trigger: 'moveGeneration',
        condition: (context) => context.piece.type === 'bishop',
        execute: (context) => {
            const pierceMoves = this.generatePierceMoves(context.square);
            context.moves.push(...pierceMoves);
        }
    };
}
```

**Step 3: Modify `makeMove()` to Check Triggers**

```javascript
makeMove(from, to, promotion) {
    // ... existing move logic ...
    
    const piece = this.position[from];
    const captured = this.position[to];
    
    // Execute move
    const result = Pieces.makeMove(/* ... */);
    
    // ============================================
    // NEW: Check for ability triggers
    // ============================================
    if (this.roguelikeMode && this.pieceUpgrades[to]) {
        const upgrade = this.pieceUpgrades[to];
        
        // Check each ability on the piece
        upgrade.abilities?.forEach(abilityKey => {
            const handler = this.abilityHandlers[abilityKey];
            
            if (handler && handler.trigger === 'afterCapture') {
                const context = {
                    from, to, piece, captured,
                    movingPiece: piece.type,
                    captured: !!captured
                };
                
                if (handler.condition(context)) {
                    handler.execute(context);
                }
            }
        });
    }
    
    // ============================================
    // Handle pending bonus move
    // ============================================
    if (this.pendingBonusMove) {
        ui.updateStatus(`${piece.type.toUpperCase()} has a bonus move!`, 'highlight');
        board.highlightSquare(this.pendingBonusMove.square, 'bonus-move');
        
        // Don't switch turns yet
        this.onMove(moveRecord);
        return moveRecord;
    }
    
    // Normal turn switch
    this.currentTurn = Utils.oppositeColor(this.currentTurn);
    // ...
}
```

**Step 4: Handle Bonus Move Consumption**

```javascript
// In getValidMoves()
getValidMoves(square) {
    // Check if this is a bonus move
    if (this.pendingBonusMove && this.pendingBonusMove.square === square) {
        const moves = Pieces.getValidMoves(this.position, square, true, this.getGameState());
        
        // Filter out captures if bonus move can't capture
        if (!this.pendingBonusMove.canCapture) {
            return moves.filter(m => !this.position[m.to || m]);
        }
        
        return moves;
    }
    
    // ... normal move generation ...
}

// After bonus move is made
if (this.pendingBonusMove && this.pendingBonusMove.square === from) {
    console.log('[Ability] Bonus move consumed');
    this.pendingBonusMove = null;
    board.clearHighlights();
    
    // NOW switch turns
    this.currentTurn = Utils.oppositeColor(this.currentTurn);
}
```

**Estimated Time:** 6-8 hours

---

### Task 2.2: Implement Additional Piece Upgrades

#### Upgrade 1: Reitersturm (Knight)

**Already covered in Task 2.1 - just add the constant:**

```javascript
// Already exists in constants.js from Phase 1
REITERSTURM: {
    id: 'REITERSTURM',
    name: 'Reitersturm',
    description: 'After capturing, this knight gains one bonus move (cannot capture again)',
    type: 'ability',
    targetPiece: 'knight',
    icon: '⚡',
    rarity: 'rare',
    apply: (piece) => ({ abilities: ['bonusMoveAfterCapture'] })
}
```

**Testing:**
- Apply to knight
- Capture with knight
- Should highlight knight and prompt for bonus move
- Bonus move should not allow capture
- After bonus move, turn switches normally

**Time:** 2-3 hours (testing + debugging)

---

#### Upgrade 2: Artillerie (Rook Long Diagonal)

**Add to game.js:**

```javascript
/**
 * Generate long-range diagonal moves for Artillerie upgrade
 */
generateLongRangeDiagonals(square) {
    const moves = [];
    const coords = Utils.parseSquare(square);
    if (!coords) return moves;
    
    const directions = [
        {file: 1, rank: 1},   // Up-right
        {file: 1, rank: -1},  // Down-right
        {file: -1, rank: 1},  // Up-left
        {file: -1, rank: -1}  // Down-left
    ];
    
    directions.forEach(dir => {
        for (let dist = 3; dist < 8; dist++) {  // Only 3+ squares away
            const newFile = coords.file + dir.file * dist;
            const newRank = coords.rank + dir.rank * dist;
            
            if (newFile < 0 || newFile > 7 || newRank < 0 || newRank > 7) break;
            
            const targetSquare = Utils.toSquare(newFile, newRank);
            const targetPiece = this.position[targetSquare];
            
            if (targetPiece) {
                // Can only attack enemy pieces
                if (targetPiece.color !== this.currentTurn) {
                    moves.push({ to: targetSquare, capture: true, special: 'artillery' });
                }
                break;  // Can't jump over pieces
            }
            
            moves.push({ to: targetSquare, special: 'artillery' });
        }
    });
    
    return moves;
}
```

**Modify `Pieces.getValidMoves()` to call ability handlers:**

```javascript
// In pieces.js
getValidMoves(position, square, includeSpecialMoves, gameState, pieceUpgrades) {
    let moves = [];
    
    // ... standard move generation ...
    
    // NEW: Apply ability modifications
    if (pieceUpgrades && pieceUpgrades[square]) {
        const upgrade = pieceUpgrades[square];
        
        if (upgrade.abilities?.includes('longRangeDiagonal') && piece.type === 'rook') {
            // This would need access to game instance - better to do in game.getValidMoves()
            // See Task 2.1 for integration point
        }
    }
    
    return moves;
}
```

**Better approach - handle in `game.getValidMoves()`:**

```javascript
getValidMoves(square) {
    let moves = Pieces.getValidMoves(this.position, square, true, this.getGameState());
    
    // NEW: Apply ability-based move modifications
    if (this.roguelikeMode && this.pieceUpgrades[square]) {
        const upgrade = this.pieceUpgrades[square];
        const piece = this.position[square];
        
        if (upgrade.abilities?.includes('longRangeDiagonal') && piece.type === 'rook') {
            const extraMoves = this.generateLongRangeDiagonals(square);
            moves.push(...extraMoves);
        }
    }
    
    // Filter for check (standard)
    return moves.filter(/* ... */);
}
```

**Time:** 3-4 hours

---

#### Upgrade 3: Durchdringung (Bishop Pierce)

**Concept:** Bishop can attack THROUGH one friendly/enemy piece to hit the second piece on the diagonal.

```javascript
/**
 * Generate pierce moves for Durchdringung upgrade
 */
generatePierceMoves(square) {
    const moves = [];
    const coords = Utils.parseSquare(square);
    if (!coords) return moves;
    
    const directions = [
        {file: 1, rank: 1},
        {file: 1, rank: -1},
        {file: -1, rank: 1},
        {file: -1, rank: -1}
    ];
    
    directions.forEach(dir => {
        let firstPieceFound = false;
        let firstPieceSquare = null;
        
        for (let dist = 1; dist < 8; dist++) {
            const newFile = coords.file + dir.file * dist;
            const newRank = coords.rank + dir.rank * dist;
            
            if (newFile < 0 || newFile > 7 || newRank < 0 || newRank > 7) break;
            
            const targetSquare = Utils.toSquare(newFile, newRank);
            const targetPiece = this.position[targetSquare];
            
            if (!firstPieceFound && targetPiece) {
                // First piece encountered - mark it
                firstPieceFound = true;
                firstPieceSquare = targetSquare;
                continue;
            }
            
            if (firstPieceFound && targetPiece) {
                // Second piece - can pierce if enemy
                if (targetPiece.color !== this.currentTurn) {
                    moves.push({ 
                        to: targetSquare, 
                        capture: true, 
                        special: 'pierce',
                        piercedSquare: firstPieceSquare  // For visual feedback
                    });
                }
                break;  // Stop after second piece
            }
        }
    });
    
    return moves;
}
```

**Time:** 4-5 hours (complex logic + testing)

---

#### Upgrade 4: Teleport (Queen)

**One-time use per game - queen jumps to any empty square.**

```javascript
TELEPORT: {
    id: 'TELEPORT',
    name: 'Teleportation',
    description: 'Once per game, this queen can teleport to any empty square',
    type: 'ability',
    targetPiece: 'queen',
    icon: '🌀',
    rarity: 'rare',
    apply: (piece) => ({
        abilities: ['teleport'],
        teleportCharges: 1
    })
}
```

**Implementation:**

```javascript
// In game.getValidMoves()
if (upgrade.abilities?.includes('teleport') && upgrade.teleportCharges > 0 && piece.type === 'queen') {
    // Add ALL empty squares as valid moves
    for (let file = 0; file < 8; file++) {
        for (let rank = 0; rank < 8; rank++) {
            const sq = Utils.toSquare(file, rank);
            if (!this.position[sq] && sq !== square) {
                moves.push({ to: sq, special: 'teleport' });
            }
        }
    }
}

// In makeMove() - consume charge
if (moveObj.special === 'teleport') {
    this.pieceUpgrades[to].teleportCharges--;
    console.log('[Ability] Teleport used - 0 charges remaining');
}
```

**Time:** 3-4 hours

---

#### Upgrade 5: Wiederbelebung (King Second Life)

**King can be captured once without losing - respawns on starting square.**

```javascript
WIEDERBELEBUNG: {
    id: 'WIEDERBELEBUNG',
    name: 'Wiederbelebung',
    description: 'This king can be captured once without losing the game - it respawns on its starting square',
    type: 'ability',
    targetPiece: 'king',
    icon: '♻️',
    rarity: 'legendary',
    apply: (piece) => ({
        abilities: ['revive'],
        reviveCharges: 1
    })
}
```

**Implementation:**

```javascript
// In game.checkGameState()
checkGameState() {
    const inCheck = Pieces.isInCheck(this.position, this.currentTurn);
    const legalMoves = Pieces.getAllLegalMoves(this.position, this.currentTurn, this.getGameState());
    
    if (legalMoves.length === 0 && inCheck) {
        // Checkmate - but check for revive ability
        if (this.roguelikeMode) {
            const kingSquare = this.findKing(this.currentTurn);
            const kingUpgrade = kingSquare ? this.pieceUpgrades[kingSquare] : null;
            
            if (kingUpgrade?.abilities?.includes('revive') && kingUpgrade.reviveCharges > 0) {
                // REVIVE!
                kingUpgrade.reviveCharges--;
                
                // Respawn king on starting square
                const startSquare = this.currentTurn === COLORS.WHITE ? 'e1' : 'e8';
                if (!this.position[startSquare]) {
                    this.position[startSquare] = { type: 'king', color: this.currentTurn };
                    this.pieceUpgrades[startSquare] = kingUpgrade;
                    
                    ui.updateStatus('👑 KING REVIVED! Second life consumed.', 'highlight');
                    console.log('[Ability] King revived at', startSquare);
                    
                    return;  // Game continues!
                }
            }
        }
        
        // Normal checkmate
        this.gameState = GAME_STATES.CHECKMATE;
        if (this.onGameOver) {
            this.onGameOver({
                winner: Utils.oppositeColor(this.currentTurn),
                reason: 'checkmate'
            });
        }
    }
}
```

**Time:** 4-6 hours (complex interaction with game over logic)

---

**Total Task 2.2 Time:** 16-22 hours

---

### Task 2.3: Artifact System Implementation

**Artifacts** are global effects that don't target specific pieces.

#### Artifact 1: Zeitumkehr (Undo Charge)

```javascript
// Already defined in Phase 1 constants
ZEITUMKEHR: {
    id: 'ZEITUMKEHR',
    name: 'Amulett der Zeitumkehr',
    description: 'Allows you to undo one move per game',
    type: 'artifact',
    icon: '⏪',
    rarity: 'uncommon',
    apply: () => ({ undoCharges: 1 })
}
```

**Implementation:**

```javascript
// In main.js - modify undo handler
function handleUndo() {
    if (game.roguelikeMode && game.undoCharges > 0) {
        // Consume artifact charge
        game.undoCharges--;
        ui.updateStatus(`Undo used - ${game.undoCharges} charges remaining`, 'info');
    } else if (!game.canUndo()) {
        ui.updateStatus('Cannot undo', 'warning');
        return;
    }
    
    game.undo();
    board.renderPosition(game.position);
}
```

**Time:** 2 hours

---

#### Artifact 2: Helm der Voraussicht (Show Enemy Attacks)

**Highlights all squares under enemy attack.**

```javascript
HELM_VORAUSSICHT: {
    id: 'HELM_VORAUSSICHT',
    name: 'Helm der Voraussicht',
    description: 'Reveals all squares attacked by enemy pieces (highlighted in red)',
    type: 'artifact',
    icon: '👁️',
    rarity: 'rare',
    apply: () => ({ showEnemyAttacks: true })
}
```

**Implementation:**

```javascript
// In board.js - add method to highlight attacked squares
highlightAttackedSquares(position, color) {
    const attackedSquares = new Set();
    
    Object.entries(position).forEach(([square, piece]) => {
        if (piece && piece.color === color) {
            const moves = Pieces.getValidMoves(position, square, false);
            moves.forEach(move => {
                const target = move.to || move;
                attackedSquares.add(target);
            });
        }
    });
    
    attackedSquares.forEach(sq => {
        this.highlightSquare(sq, 'enemy-attack');
    });
}

// In main.js - call after AI moves
if (game.showEnemyAttacks && game.currentTurn === game.playerColor) {
    board.highlightAttackedSquares(game.position, Utils.oppositeColor(game.playerColor));
}
```

**CSS:**
```css
.square.enemy-attack {
    background-color: rgba(255, 0, 0, 0.2) !important;
    box-shadow: inset 0 0 10px rgba(255, 0, 0, 0.4);
}
```

**Time:** 3-4 hours

---

#### Artifact 3: Trank der Überraschung (Pawns Start as Queens on 7th Rank)

```javascript
TRANK_UEBERRASCHUNG: {
    id: 'TRANK_UEBERRASCHUNG',
    name: 'Trank der Überraschung',
    description: 'All your pawns that reach the 7th rank instantly become queens',
    type: 'artifact',
    icon: '🧪',
    rarity: 'uncommon',
    apply: () => ({ autoPromoteToQueen: true })
}
```

**Implementation:**

```javascript
// In game.makeMove() - auto-promote
if (this.autoPromoteToQueen && piece.type === 'pawn') {
    const promotionRank = piece.color === COLORS.WHITE ? 7 : 0;
    const coords = Utils.parseSquare(to);
    
    if (coords && coords.rank === promotionRank) {
        promotion = 'queen';  // Force queen promotion
        console.log('[Artifact] Auto-promoted pawn to queen');
    }
}
```

**Time:** 2 hours

---

#### Artifact 4: Fluch der Kette (All Pieces Move Like King, King Moves Like Queen)

**This is a CURSED artifact - debuff with a powerful upside.**

```javascript
FLUCH_KETTE: {
    id: 'FLUCH_KETTE',
    name: 'Fluch der Kette',
    description: '⚠️ CURSED: All your pieces can only move 1 square (like king), BUT your king moves like a queen',
    type: 'artifact',
    icon: '⛓️',
    rarity: 'legendary',
    apply: () => ({ chainCurse: true })
}
```

**Implementation:**

```javascript
// In game.getValidMoves()
if (this.chainCurse && piece.color === this.playerColor) {
    if (piece.type === 'king') {
        // King moves like queen
        moves = Pieces.getQueenMoves(this.position, square, piece.color);
    } else {
        // All other pieces move only 1 square
        moves = moves.filter(move => {
            const fromCoords = Utils.parseSquare(square);
            const toCoords = Utils.parseSquare(move.to || move);
            if (!fromCoords || !toCoords) return false;
            
            const fileDist = Math.abs(toCoords.file - fromCoords.file);
            const rankDist = Math.abs(toCoords.rank - fromCoords.rank);
            
            return Math.max(fileDist, rankDist) === 1;  // Only 1 square
        });
    }
}
```

**Time:** 4-5 hours (complex move filtering)

---

**Total Task 2.3 Time:** 11-13 hours

---

### Task 2.4: Visual Feedback System

**Add visual indicators for HP, abilities, damage, etc.**

#### Feature 1: HP Bars on Pieces

**File:** `board.js`

```javascript
/**
 * Render a piece with optional HP bar
 */
renderPieceWithHP(square, piece, upgrade) {
    const squareElement = this.getSquareElement(square);
    
    // Render piece (existing code)
    this.renderPiece(square, piece);
    
    // Add HP bar if piece has HP upgrade
    if (upgrade && upgrade.hp && upgrade.maxHp) {
        const hpBar = document.createElement('div');
        hpBar.className = 'hp-bar-container';
        
        const hpFill = document.createElement('div');
        hpFill.className = 'hp-bar-fill';
        hpFill.style.width = `${(upgrade.hp / upgrade.maxHp) * 100}%`;
        
        hpBar.appendChild(hpFill);
        squareElement.appendChild(hpBar);
    }
}
```

**CSS:**
```css
.hp-bar-container {
    position: absolute;
    bottom: 2px;
    left: 5%;
    width: 90%;
    height: 4px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 2px;
    overflow: hidden;
}

.hp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff4444 0%, #44ff44 100%);
    transition: width 0.3s ease;
}
```

**Time:** 2-3 hours

---

#### Feature 2: Floating Damage Numbers

```javascript
/**
 * Show floating damage indicator
 */
showDamageNumber(square, damage, type = 'damage') {
    const squareElement = this.getSquareElement(square);
    const rect = squareElement.getBoundingClientRect();
    
    const damageEl = document.createElement('div');
    damageEl.className = `floating-damage ${type}`;
    damageEl.textContent = type === 'damage' ? `-${damage}` : `+${damage}`;
    damageEl.style.left = `${rect.left + rect.width / 2}px`;
    damageEl.style.top = `${rect.top}px`;
    
    document.body.appendChild(damageEl);
    
    // Animate and remove
    setTimeout(() => damageEl.remove(), 1500);
}
```

**CSS:**
```css
.floating-damage {
    position: fixed;
    font-size: 24px;
    font-weight: bold;
    color: #ff4444;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    pointer-events: none;
    animation: floatUp 1.5s ease-out forwards;
    z-index: 10000;
}

.floating-damage.heal {
    color: #44ff44;
}

@keyframes floatUp {
    0% {
        transform: translateY(0) scale(1);
        opacity: 1;
    }
    100% {
        transform: translateY(-60px) scale(1.5);
        opacity: 0;
    }
}
```

**Time:** 2-3 hours

---

#### Feature 3: Ability Glow Effects

```css
.square.has-ability {
    box-shadow: 0 0 15px rgba(102, 126, 234, 0.6);
    animation: abilityPulse 2s ease-in-out infinite;
}

@keyframes abilityPulse {
    0%, 100% {
        box-shadow: 0 0 10px rgba(102, 126, 234, 0.4);
    }
    50% {
        box-shadow: 0 0 20px rgba(102, 126, 234, 0.8);
    }
}
```

**Apply dynamically:**
```javascript
// In board.renderPosition()
Object.entries(pieceUpgrades).forEach(([square, upgrade]) => {
    if (upgrade.abilities && upgrade.abilities.length > 0) {
        const squareEl = this.getSquareElement(square);
        squareEl.classList.add('has-ability');
    }
});
```

**Time:** 1-2 hours

---

**Total Task 2.4 Time:** 5-8 hours

---

### Phase 2 Success Criteria

✅ **5+ piece upgrades functional**
- [ ] Schildträger (HP system)
- [ ] Reitersturm (bonus move)
- [ ] Artillerie (long diagonal)
- [ ] Durchdringung (pierce)
- [ ] Teleport (queen jump)
- [ ] Wiederbelebung (king revive)

✅ **4+ artifacts implemented**
- [ ] Zeitumkehr (undo charge)
- [ ] Helm der Voraussicht (show attacks)
- [ ] Trank der Überraschung (auto-promote)
- [ ] Fluch der Kette (movement restriction)

✅ **Ability triggers work correctly**
- [ ] Bonus moves fire after capture
- [ ] Charges are consumed properly
- [ ] Multiple abilities can stack on one piece

✅ **Visual feedback enhances gameplay**
- [ ] HP bars display on upgraded pieces
- [ ] Damage numbers float up on hit
- [ ] Ability glow effects show enhanced pieces
- [ ] UI feels polished and responsive

✅ **No performance degradation**
- [ ] Game runs smoothly with 10+ upgrades active
- [ ] Visual effects don't cause lag
- [ ] Memory leaks checked and fixed

**Total Phase 2 Time:** 40-50 hours (1 week with testing/polish)

---

## Phase 3: Enemy Specializations & Boss Fights
**Duration:** 1 week (40 hours)  
**Goal:** 4 enemy types with unique strategies, custom win conditions, zone progression

### Overview

Transform the roguelike mode from fighting identical AI opponents to facing **themed enemies** with custom starting positions, strategies, and win conditions.

---

### Task 3.1: Enemy Configuration System

**Files:** `js/roguelike.js` (NEW), `js/roguelikeEnemies.js` (NEW)

**Create `js/roguelikeEnemies.js`:**

```javascript
/**
 * Roguelike Enemy Configurations
 * Defines themed opponents with custom strategies
 */

const ENEMY_CONFIGS = {
    BAUERN_HORDE: {
        id: 'BAUERN_HORDE',
        name: 'Die Bauern-Horde',
        description: '12 aggressive pawns supported by bishops on all diagonals',
        difficulty: 'medium',
        themeColor: '#8B4513',  // Brown
        
        generatePosition: () => {
            const position = { ...INITIAL_POSITION };  // Player gets normal setup
            
            // Black side: 12 pawns + 4 bishops + king
            // Remove knights, rooks, queen
            delete position['b8'];
            delete position['g8'];
            delete position['a8'];
            delete position['h8'];
            delete position['d8'];
            
            // Add extra pawns on 6th rank
            position['a6'] = { type: 'pawn', color: 'black' };
            position['b6'] = { type: 'pawn', color: 'black' };
            position['g6'] = { type: 'pawn', color: 'black' };
            position['h6'] = { type: 'pawn', color: 'black' };
            
            // Add bishops on diagonals
            position['d6'] = { type: 'bishop', color: 'black' };
            position['e6'] = { type: 'bishop', color: 'black' };
            
            return position;
        },
        
        aiConfig: {
            maxDepth: 2,
            maxThinkTime: 3000,
            evaluationModifier: (score, position, color) => {
                // Bonus for advanced pawns
                let pawnBonus = 0;
                Object.entries(position).forEach(([square, piece]) => {
                    if (piece && piece.type === 'pawn' && piece.color === color) {
                        const coords = Utils.parseSquare(square);
                        const advancement = color === 'white' ? coords.rank : (7 - coords.rank);
                        pawnBonus += advancement * 15;  // More bonus for advanced pawns
                    }
                });
                return score + pawnBonus;
            },
            openingBook: false  // Disable opening book for themed enemy
        },
        
        rewards: {
            gold: 60,
            upgradePool: ['SCHILDTRAEGER', 'ARTILLERIE', 'ZEITUMKEHR']
        }
    },
    
    DOPPEL_TURM: {
        id: 'DOPPEL_TURM',
        name: 'Der Doppel-Turm',
        description: '4 powerful rooks dominate the files with aggressive vertical play',
        difficulty: 'hard',
        themeColor: '#4169E1',  // Royal blue
        
        generatePosition: () => {
            const position = { ...INITIAL_POSITION };
            
            // Black side: 4 rooks + 2 knights + 6 pawns + king
            // Remove bishops, queen
            delete position['c8'];
            delete position['f8'];
            delete position['d8'];
            
            // Add extra rooks
            position['d8'] = { type: 'rook', color: 'black' };
            position['e8'] = { type: 'rook', color: 'black' };
            
            // Remove some pawns for balance
            delete position['d7'];
            delete position['e7'];
            
            return position;
        },
        
        aiConfig: {
            maxDepth: 3,
            maxThinkTime: 5000,
            evaluationModifier: (score, position, color) => {
                // Huge bonus for controlling open files
                let fileControl = 0;
                
                for (let file = 0; file < 8; file++) {
                    let hasRook = false;
                    let hasPawn = false;
                    
                    for (let rank = 0; rank < 8; rank++) {
                        const square = Utils.toSquare(file, rank);
                        const piece = position[square];
                        
                        if (piece && piece.color === color) {
                            if (piece.type === 'rook') hasRook = true;
                            if (piece.type === 'pawn') hasPawn = true;
                        }
                    }
                    
                    if (hasRook && !hasPawn) {
                        fileControl += 40;  // Open file with rook = huge bonus
                    }
                }
                
                return score + fileControl;
            }
        },
        
        rewards: {
            gold: 80,
            upgradePool: ['REITERSTURM', 'DURCHDRINGUNG', 'HELM_VORAUSSICHT']
        }
    },
    
    VERZAUBERER: {
        id: 'VERZAUBERER',
        name: 'Der Verzauberer',
        description: 'Mysterious sorcerer whose pieces have one-time special abilities',
        difficulty: 'medium',
        themeColor: '#9370DB',  // Medium purple
        
        generatePosition: () => {
            const position = { ...INITIAL_POSITION };
            
            // Black side: Standard + central bishop on e5
            position['e5'] = { type: 'bishop', color: 'black' };
            
            return position;
        },
        
        // Enemy gets special abilities too!
        enemyUpgrades: {
            'e5': { 
                abilities: ['teleport'],
                teleportCharges: 1
            },
            'd7': {  // One pawn can double-move
                abilities: ['doubleMove'],
                doubleMoveCharges: 1
            }
        },
        
        aiConfig: {
            maxDepth: 3,
            maxThinkTime: 4000,
            evaluationModifier: (score, position, color) => {
                // Favor center control
                let centerControl = 0;
                const centerSquares = ['d4', 'd5', 'e4', 'e5'];
                
                centerSquares.forEach(sq => {
                    const piece = position[sq];
                    if (piece && piece.color === color) {
                        centerControl += 25;
                    }
                });
                
                return score + centerControl;
            }
        },
        
        rewards: {
            gold: 70,
            upgradePool: ['TELEPORT', 'WIEDERBELEBUNG', 'TRANK_UEBERRASCHUNG']
        }
    },
    
    USURPATOR: {
        id: 'USURPATOR',
        name: 'Der Usurpator',
        description: '🔥 FINAL BOSS: A kingless army with overwhelming force. Capture ALL pieces to win!',
        difficulty: 'boss',
        themeColor: '#DC143C',  // Crimson
        
        generatePosition: () => {
            const position = { ...INITIAL_POSITION };
            
            // Black side: NO KING! 2 queens, 2 rooks, 4 knights, 2 bishops, 8 pawns
            delete position['e8'];  // Remove king
            
            // Add extra queen
            position['e8'] = { type: 'queen', color: 'black' };
            position['d8'] = { type: 'queen', color: 'black' };  // Already removed
            
            // Add extra knights
            position['c7'] = { type: 'knight', color: 'black' };
            position['f7'] = { type: 'knight', color: 'black' };
            
            return position;
        },
        
        winCondition: 'capture_all_enemy_pieces',  // Custom win condition!
        
        aiConfig: {
            maxDepth: 4,
            maxThinkTime: 8000,
            aggressive: true,
            evaluationModifier: (score, position, color) => {
                // Favor material trades (player must capture ALL)
                const enemyColor = color === 'white' ? 'black' : 'white';
                const enemyPieces = Object.values(position).filter(p => p && p.color === enemyColor).length;
                
                // Fewer enemy pieces = closer to their victory
                return score - (enemyPieces * 30);
            }
        },
        
        rewards: {
            gold: 200,
            upgradePool: ['WIEDERBELEBUNG', 'FLUCH_KETTE'],  // Legendary rewards
            runComplete: true
        }
    }
};

/**
 * Get enemy config by ID
 */
function getEnemyConfig(enemyId) {
    return ENEMY_CONFIGS[enemyId] || null;
}
```

**Add to index.html after `roguelike.css`:**
```html
<script src="js/roguelikeEnemies.js"></script>
```

**Time:** 4-6 hours

---

### Task 3.2: Custom Win Condition Framework

**Modify game.js to support pluggable win conditions:**

```javascript
/**
 * Check game state (check, checkmate, stalemate, draw, custom win conditions)
 */
checkGameState() {
    // ============================================
    // NEW: Check custom win condition first (boss fights)
    // ============================================
    if (this.roguelikeMode && this.enemyConfig?.winCondition) {
        const customResult = this.checkCustomWinCondition(this.enemyConfig.winCondition);
        if (customResult) {
            this.gameState = customResult.state;
            if (this.onGameOver) {
                this.onGameOver(customResult);
            }
            return customResult;
        }
    }
    
    // Standard chess win conditions
    const inCheck = Pieces.isInCheck(this.position, this.currentTurn);
    const legalMoves = Pieces.getAllLegalMoves(this.position, this.currentTurn, this.getGameState());
    
    if (legalMoves.length === 0) {
        if (inCheck) {
            // Checkmate
            this.gameState = GAME_STATES.CHECKMATE;
            if (this.onGameOver) {
                this.onGameOver({
                    state: GAME_STATES.CHECKMATE,
                    winner: Utils.oppositeColor(this.currentTurn),
                    reason: 'checkmate'
                });
            }
        } else {
            // Stalemate
            this.gameState = GAME_STATES.STALEMATE;
            if (this.onGameOver) {
                this.onGameOver({
                    state: GAME_STATES.STALEMATE,
                    winner: null,
                    reason: 'stalemate'
                });
            }
        }
    }
    
    // Check for draws (50-move rule, insufficient material, etc.)
    // ... existing draw logic ...
}

/**
 * Check custom win conditions for roguelike bosses
 */
checkCustomWinCondition(conditionType) {
    switch (conditionType) {
        case 'capture_all_enemy_pieces':
            return this.checkCaptureAllCondition();
        
        case 'survive_n_turns':
            return this.checkSurvivalCondition();
        
        case 'capture_specific_piece':
            return this.checkCaptureSpecificCondition();
        
        default:
            console.warn('[Win Condition] Unknown condition:', conditionType);
            return null;
    }
}

/**
 * Usurpator win condition: Capture ALL enemy pieces
 */
checkCaptureAllCondition() {
    const playerColor = this.playerColor;
    const enemyColor = Utils.oppositeColor(playerColor);
    
    const playerPieces = Object.values(this.position).filter(p => p && p.color === playerColor);
    const enemyPieces = Object.values(this.position).filter(p => p && p.color === enemyColor);
    
    // Player wins if all enemy pieces captured
    if (enemyPieces.length === 0) {
        return {
            state: GAME_STATES.CHECKMATE,
            winner: playerColor,
            reason: '🏆 All enemy pieces captured! The Usurpator has fallen!'
        };
    }
    
    // Enemy wins if all player pieces captured
    if (playerPieces.length === 0) {
        return {
            state: GAME_STATES.CHECKMATE,
            winner: enemyColor,
            reason: '💀 All your pieces were captured!'
        };
    }
    
    // Game continues
    return null;
}

/**
 * Survival win condition: Survive X moves
 */
checkSurvivalCondition() {
    if (!this.survivalTurnsRequired) return null;
    
    if (this.fullMoveNumber >= this.survivalTurnsRequired) {
        return {
            state: GAME_STATES.CHECKMATE,
            winner: this.playerColor,
            reason: `⏰ Survived ${this.survivalTurnsRequired} turns!`
        };
    }
    
    return null;
}
```

**Time:** 3-4 hours

---

### Task 3.3: Zone Progression System

**Create `js/roguelikeZones.js`:**

```javascript
/**
 * Roguelike Zone and Encounter Progression
 * Maps zones to enemy types
 */

const ZONE_PROGRESSION = [
    {
        zone: 1,
        name: 'The Pawn Fields',
        description: 'Face waves of aggressive pawns',
        encounters: [
            { type: 'BAUERN_HORDE', encounterNumber: 1 },
            { type: 'BAUERN_HORDE', encounterNumber: 2 },
            { type: 'DOPPEL_TURM', encounterNumber: 3 }  // Mini-boss
        ]
    },
    
    {
        zone: 2,
        name: 'The Mystic Tower',
        description: 'Face enchanted enemies with special powers',
        encounters: [
            { type: 'VERZAUBERER', encounterNumber: 1 },
            { type: 'BAUERN_HORDE', encounterNumber: 2 },
            { type: 'VERZAUBERER', encounterNumber: 3 }
        ]
    },
    
    {
        zone: 3,
        name: 'The Rook Fortress',
        description: 'Powerful rooks dominate the battlefield',
        encounters: [
            { type: 'DOPPEL_TURM', encounterNumber: 1 },
            { type: 'DOPPEL_TURM', encounterNumber: 2 },
            { type: 'VERZAUBERER', encounterNumber: 3 }
        ]
    },
    
    {
        zone: 4,
        name: 'The Chaotic Realm',
        description: 'Mixed threats test all your skills',
        encounters: [
            { type: 'VERZAUBERER', encounterNumber: 1 },
            { type: 'DOPPEL_TURM', encounterNumber: 2 },
            { type: 'BAUERN_HORDE', encounterNumber: 3 }
        ]
    },
    
    {
        zone: 5,
        name: 'The Throne of the Usurpator',
        description: '🔥 FINAL ZONE: Face the ultimate challenge',
        encounters: [
            { type: 'DOPPEL_TURM', encounterNumber: 1 },
            { type: 'VERZAUBERER', encounterNumber: 2 },
            { type: 'USURPATOR', encounterNumber: 3 }  // FINAL BOSS
        ]
    }
];

/**
 * Get encounter configuration for specific zone/encounter
 */
function getEncounterForZone(zone, encounterNumber) {
    const zoneConfig = ZONE_PROGRESSION.find(z => z.zone === zone);
    if (!zoneConfig) {
        console.error('[Zones] Invalid zone:', zone);
        return null;
    }
    
    const encounter = zoneConfig.encounters.find(e => e.encounterNumber === encounterNumber);
    if (!encounter) {
        console.error('[Zones] Invalid encounter:', encounterNumber);
        return null;
    }
    
    return {
        zoneName: zoneConfig.name,
        zoneDescription: zoneConfig.description,
        enemyType: encounter.type,
        enemyConfig: getEnemyConfig(encounter.type)
    };
}
```

**Modify `startRoguelikeEncounter()` in main.js:**

```javascript
function startRoguelikeEncounter() {
    console.log(`[Roguelike] Starting Zone ${game.currentZone}, Encounter ${game.currentEncounter}`);
    
    // Get encounter configuration
    const encounterInfo = getEncounterForZone(game.currentZone, game.currentEncounter);
    if (!encounterInfo) {
        console.error('[Roguelike] Failed to load encounter');
        return;
    }
    
    const enemyConfig = encounterInfo.enemyConfig;
    console.log('[Roguelike] Enemy:', enemyConfig.name);
    
    // Store enemy config on game
    game.enemyConfig = enemyConfig;
    
    // Generate custom starting position
    const customPosition = enemyConfig.generatePosition();
    
    // Apply enemy upgrades if any (Verzauberer)
    if (enemyConfig.enemyUpgrades) {
        // Merge with existing player upgrades
        Object.assign(game.pieceUpgrades, enemyConfig.enemyUpgrades);
    }
    
    // Configure AI with enemy settings
    if (chessAI) {
        chessAI.maxDepth = enemyConfig.aiConfig.maxDepth;
        chessAI.maxThinkTime = enemyConfig.aiConfig.maxThinkTime;
        chessAI.customEvaluator = enemyConfig.aiConfig.evaluationModifier;
    }
    
    // Show HUD with zone info
    ui.toggleRoguelikeHUD(true);
    ui.updateRoguelikeHUD({
        zone: game.currentZone,
        encounter: game.currentEncounter,
        gold: game.gold,
        pieceUpgrades: game.pieceUpgrades,
        artifacts: game.artifacts
    });
    
    // Start game with custom position
    game.newGame({
        mode: GAME_MODES.ROGUELIKE,
        playerColor: COLORS.WHITE,
        customPosition: customPosition  // NEW: Pass custom position
    });
    
    board.renderPosition(game.position);
    
    // Show enemy info
    ui.updateStatus(`${encounterInfo.zoneName} - ${enemyConfig.name}`, 'info');
    
    // Show enemy description
    setTimeout(() => {
        ui.showMessage(`⚔️ ${enemyConfig.description}`, 'warning', 4000);
    }, 500);
}
```

**Modify `game.newGame()` to accept custom position:**

```javascript
newGame(options = {}) {
    this.gameMode = options.mode || GAME_MODES.VS_AI;
    this.playerColor = options.playerColor || COLORS.WHITE;
    this.aiDifficulty = options.difficulty || AI_DIFFICULTIES.EASY;
    
    // ============================================
    // NEW: Custom starting position (for roguelike enemies)
    // ============================================
    if (options.customPosition) {
        this.position = Utils.deepClone(options.customPosition);
    } else {
        this.position = Utils.deepClone(INITIAL_POSITION);
    }
    
    this.currentTurn = COLORS.WHITE;
    this.gameState = GAME_STATES.ACTIVE;
    
    // ... rest of initialization ...
    
    return this.position;
}
```

**Time:** 5-6 hours

---

### Task 3.4: AI Strategy Customization

**Modify ai.js to use custom evaluators:**

```javascript
// In ChessAI class
class ChessAI {
    constructor() {
        // ... existing properties ...
        this.customEvaluator = null;  // NEW: Custom evaluation function
    }
    
    /**
     * Evaluate position with optional custom evaluator
     */
    evaluatePosition(position, color) {
        // Standard evaluation
        let score = 0;
        
        // Material count
        score += this.evaluateMaterial(position, color);
        
        // Positional bonuses
        score += this.evaluatePosition(position, color);
        
        // Mobility
        score += this.evaluateMobility(position, color);
        
        // King safety
        score += this.evaluateKingSafety(position, color);
        
        // ============================================
        // NEW: Apply custom enemy evaluator
        // ============================================
        if (this.customEvaluator) {
            score = this.customEvaluator(score, position, color);
        }
        
        return score;
    }
}
```

**Time:** 2-3 hours

---

### Phase 3 Success Criteria

✅ **4 enemy types playable**
- [ ] Bauern-Horde (12 pawns + bishops)
- [ ] Doppel-Turm (4 rooks)
- [ ] Verzauberer (special abilities)
- [ ] Usurpator (final boss, no king)

✅ **Custom starting positions work**
- [ ] Enemies spawn with correct piece layouts
- [ ] Player always starts with standard setup
- [ ] Positions are balanced (player can win)

✅ **Usurpator boss uses custom win condition**
- [ ] Must capture ALL enemy pieces to win
- [ ] Checkmate doesn't end game
- [ ] Win message shows correct reason

✅ **Zone progression works**
- [ ] 5 zones, 3 encounters each
- [ ] Zone names display correctly
- [ ] Enemy difficulty escalates properly
- [ ] Final boss appears in Zone 5, Encounter 3

✅ **AI plays differently per enemy type**
- [ ] Bauern-Horde pushes pawns aggressively
- [ ] Doppel-Turm controls open files
- [ ] Verzauberer uses special abilities
- [ ] Usurpator plays very aggressively

✅ **Rewards are appropriate**
- [ ] Early zones give common upgrades
- [ ] Later zones give rare/legendary
- [ ] Gold scales with difficulty
- [ ] Final boss gives huge rewards

**Total Phase 3 Time:** 14-19 hours

---

## Phase 4: Meta-Progression & Polish
**Duration:** 1 week (40 hours)  
**Goal:** Persistent unlocks, shop system, leaderboards, visual effects

### Task 4.1: Meta-Currency & Unlocks (5-6 hours)
### Task 4.2: Shop Encounters (4-5 hours)
### Task 4.3: Leaderboard System (4-5 hours)
### Task 4.4: Visual Polish & Effects (8-10 hours)
### Task 4.5: Balance Testing & Tuning (10-12 hours)

**Total Phase 4 Time:** 31-38 hours

---

## 📊 Testing Strategy

### Unit Tests
- Upgrade application (HP reduction, ability triggers)
- Win condition checking (standard + custom)
- Zone progression (correct enemy spawns)
- Gold calculation (rewards scale properly)

### Integration Tests
- Full run playthrough (start to victory)
- Database persistence (run state saves/loads)
- UI synchronization (HUD matches game state)
- AI behavior (different per enemy type)

### Balance Testing
- Win rate per zone (target: 50-70%)
- Average run length (target: 20-30 minutes)
- Upgrade power levels (no overpowered combos)
- Gold economy (can afford shop items)

---

## 🚨 Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance degradation | Medium | High | Profile, optimize cloning, use requestAnimationFrame |
| Breaking existing chess | Low | Critical | Feature branch, extensive testing, feature flag |
| Database schema conflicts | Medium | Medium | Test migrations on fresh DB, rollback scripts |
| Balance issues | High | Medium | Iterative playtesting, easy config tweaking |
| HP system breaks FEN | Low | Medium | Store upgrades separately, maintain FEN compatibility |
| AI too weak/strong | High | High | Adjustable depth/evaluation per enemy |

---

## 📈 Success Metrics

### MVP (Phase 1)
- [ ] One upgrade works end-to-end
- [ ] Basic run completes without errors
- [ ] Database stores run correctly

### Beta (Phases 2-3)
- [ ] 10+ runs completed by testers
- [ ] 5+ upgrades functional
- [ ] 3+ enemy types playable
- [ ] No game-breaking bugs
- [ ] Average session time: 15-25 minutes

### Production (Phase 4)
- [ ] 100+ runs in first week
- [ ] 70%+ positive feedback
- [ ] <5% crash rate
- [ ] Leaderboards populated
- [ ] Meta-progression working

---

## 🔄 Iteration Plan

**Week 1-2:** Collect feedback on upgrade balance  
**Week 3:** Add community-requested upgrades  
**Week 4:** Implement daily challenges  
**Week 5+:** Consider co-op mode

---

## 📚 Documentation Updates Needed

- [ ] README.md - Add roguelike mode section
- [ ] copilot-instructions.md - Document upgrade system
- [ ] `docs/ROGUELIKE_GUIDE.md` (NEW) - Player guide
- [ ] `docs/BALANCE_CHANGELOG.md` (NEW) - Track tuning

---

## 🎯 Complete Deliverables Checklist

### Phase 1: Foundation (2-3 days)
- [ ] Database migration (`002_add_roguelike_tables.sql`)
- [ ] Roguelike constants (constants.js)
- [ ] Upgrade modal UI (index.html, `css/roguelike.css`)
- [ ] HUD display (index.html, `ui.js`)
- [ ] Schildträger upgrade (HP system in pieces.js, game.js)
- [ ] Basic run flow (main.js)
- [ ] PHP endpoints (`php/roguelike/start-run.php`, `end-run.php`)

### Phase 2: Core System (1-2 weeks)
- [ ] 5+ piece upgrades functional
- [ ] Ability trigger system (game.js)
- [ ] 4+ artifacts implemented
- [ ] Visual feedback (HP bars, damage numbers, glows)
- [ ] Upgrade registry (constants.js)

### Phase 3: Enemies (1 week)
- [ ] 4 enemy configs (`js/roguelikeEnemies.js`)
- [ ] Custom starting positions
- [ ] Boss win conditions (game.js)
- [ ] Zone progression (`js/roguelikeZones.js`)
- [ ] AI strategy customization (ai.js)

### Phase 4: Polish (1 week)
- [ ] Meta-progression system
- [ ] Shop encounters
- [ ] Leaderboards
- [ ] Visual effects
- [ ] Run summary screen
- [ ] Balance testing complete

---

## 🏁 Next Steps - START HERE

### Immediate Actions (Today):

1. **Create feature branch:**
   ```bash
   git checkout -b feature/roguelike-mode
   ```

2. **Run database migration:**
   - Open phpMyAdmin or MySQL CLI
   - Execute `sql/migrations/002_add_roguelike_tables.sql`
   - Verify tables created: `SHOW TABLES LIKE 'roguelike%';`

3. **Add roguelike constants:**
   - Open `js/constants.js`
   - Add `GAME_MODES.ROGUELIKE = 'roguelike';`
   - Add `ROGUELIKE_UPGRADES` object (see Task 1.2)
   - Test: Load index.html, check console for errors

4. **Create upgrade modal:**
   - Add HTML to `index.html` (Task 1.3 Step 1)
   - Create `css/roguelike.css` with modal + HUD styles
   - Add methods to `ui.js` (`showUpgradeModal`, `updateRoguelikeHUD`)
   - Test: Call `ui.showUpgradeModal()` in browser console

5. **Test Schildträger upgrade:**
   - Modify `pieces.js` `makeMove()` to accept `pieceUpgrades` parameter
   - Add HP reduction logic before capture
   - Modify `game.js` `makeMove()` to pass `pieceUpgrades`
   - Add `applyUpgrade()` method to `ChessGame` class
   - Test in console:
     ```javascript
     game.roguelikeMode = true;
     game.applyUpgrade('SCHILDTRAEGER', 'e2');
     // Then try to capture e2 pawn - should survive first hit
     ```

6. **Implement basic run flow:**
   - Add roguelike button to `index.html`
   - Create `startRoguelikeRun()` function in `main.js`
   - Create PHP endpoints: `php/roguelike/start-run.php` and `end-run.php`
   - Test full flow: Start run → Win game → See upgrade modal → Apply upgrade → Next encounter

7. **Verify Phase 1 success criteria:**
   - [ ] Schildträger pawn survives first capture
   - [ ] HP reduces from 2 → 1 → 0 (removed)
   - [ ] HUD displays zone/encounter correctly
   - [ ] Upgrade modal shows and accepts input
   - [ ] Database stores run record
   - [ ] Victory after 15 encounters shows win screen
   - [ ] Standard chess mode still works identically

---

### Week 1 Goal: Phase 1 MVP Complete

**By end of Week 1, you should have:**
- ✅ One functional upgrade (Schildträger with HP system)
- ✅ Complete run flow (start → fight → upgrade → repeat → end)
- ✅ Database persistence working
- ✅ HUD displaying game state
- ✅ Upgrade selection modal functional

**Key milestone:** Play through a full 15-encounter run, selecting Schildträger on the first win, and verify the HP system works in subsequent encounters.

---

### Communication Plan

**Daily standups (5 min):**
- What did I complete yesterday?
- What am I working on today?
- Any blockers?

**Weekly reviews (30 min):**
- Demo current progress
- Playtest latest build
- Adjust priorities based on findings
- Update roadmap estimates

**Testing schedule:**
- After each task: Unit test that feature
- After each phase: Integration test full flow
- Before merging: Regression test standard chess mode
- Before production: Balance test with 10+ runs

---

### Support Resources

**Debugging tips:**
- Use `console.log('[Roguelike]', ...)` prefix for all roguelike logs
- Enable `DEBUG_MODE = true` in `includes/config.php` for backend logs
- Check `logs/emails.log` for email verification issues
- Use browser DevTools Network tab to debug API calls

**Performance monitoring:**
- Watch Chrome DevTools Performance tab during gameplay
- Profile `Utils.deepClone()` - this is called frequently
- Monitor memory usage with 10+ upgrades active
- Test on slower devices (mobile, older laptops)

**Code review checklist:**
- [ ] No breaking changes to standard chess
- [ ] Feature flag (`roguelikeMode`) isolates all new code
- [ ] Database queries use prepared statements
- [ ] Error handling on all API calls
- [ ] Console logs use appropriate levels (log/warn/error)
- [ ] CSS doesn't leak into standard chess UI
- [ ] No memory leaks (remove event listeners on cleanup)

---

## 🎮 Play Testing Guide

### What to Test Each Phase:

**Phase 1 (MVP):**
- Can you start a roguelike run?
- Does the first encounter load?
- Can you win and see upgrades?
- Does Schildträger HP system work?
- Can you complete all 15 encounters?
- Does the run save to database?

**Phase 2 (Upgrades):**
- Do all 5+ upgrades work as described?
- Can you stack multiple upgrades on one piece?
- Do artifacts apply globally?
- Are there overpowered combinations?
- Is the UI clear about what each upgrade does?
- Do visual effects enhance or distract?

**Phase 3 (Enemies):**
- Do enemies feel different from each other?
- Is the difficulty curve smooth (Zone 1 → 5)?
- Does the Usurpator boss feel epic?
- Are custom win conditions clear?
- Does zone progression make sense?
- Are rewards appropriate per zone?

**Phase 4 (Meta):**
- Does meta-currency feel rewarding?
- Is the shop balanced?
- Do leaderboards motivate replays?
- Are unlocks exciting?
- Does visual polish feel complete?

---

## 🚀 Launch Checklist

**Before merging to main:**
- [ ] All Phase 1-4 tasks complete
- [ ] 50+ playtest runs completed
- [ ] No critical bugs in bug tracker
- [ ] Performance benchmarks met (60 FPS, <2s load)
- [ ] Database migrations tested on production-like environment
- [ ] Feature announcement written
- [ ] Tutorial/guide published
- [ ] Rollback plan documented

**Post-launch monitoring (Week 1):**
- [ ] Track crash rate (<5% target)
- [ ] Monitor completion rate (>30% target)
- [ ] Collect user feedback
- [ ] Watch for exploits/balance issues
- [ ] Check database growth rate
- [ ] Monitor server load

---

## 📊 Estimated Timeline Summary

| Phase | Duration | Deliverables | Risk |
|-------|----------|--------------|------|
| **Phase 1: MVP** | 2-3 days (16-24h) | HP system, basic run flow, database | 🟢 Low |
| **Phase 2: Upgrades** | 1-2 weeks (40-50h) | 5+ upgrades, 4+ artifacts, visual feedback | 🟡 Medium |
| **Phase 3: Enemies** | 1 week (40h) | 4 enemies, boss fights, zone progression | 🟡 Medium |
| **Phase 4: Polish** | 1 week (40h) | Meta-progression, shop, leaderboards | 🟢 Low |
| **Testing & Balance** | Ongoing (20h) | Playtesting, bug fixes, tuning | 🟢 Low |
| **TOTAL** | **4-5 weeks** | **Full roguelike mode** | 🟡 Medium |

---

## 🎯 Success Definition

**Roguelike mode is successful if:**
1. ✅ 70%+ of players who start a run complete Zone 1
2. ✅ 30%+ of players complete a full run (Zone 5)
3. ✅ Average session time: 20-30 minutes
4. ✅ 80%+ positive feedback on upgrade variety
5. ✅ Leaderboards have 50+ entries in first month
6. ✅ No game-breaking bugs reported in first 2 weeks
7. ✅ Standard chess mode unaffected (0 regression bugs)

---

## 🔚 Final Notes

**This is an ambitious feature** - expect 4-5 weeks of focused development. The phased approach allows you to:
- Ship MVP early (Phase 1 in 2-3 days)
- Gather feedback before investing in all upgrades
- Pivot if certain mechanics don't work
- Maintain standard chess stability throughout

**Start small, iterate fast, and have fun building!** 🎮♟️

Good luck with the implementation! 🚀
```

---

This completes the roadmap document. The "Next Steps" section now provides:
- **7 immediate action items** to start Phase 1 today
- **Week 1 goal** with clear milestone
- **Communication plan** for tracking progress
- **Support resources** for debugging
- **Play testing guide** with focus areas per phase
- **Launch checklist** for production readiness
- **Timeline summary** table
- **Success metrics** for post-launch evaluation

The roadmap is now fully actionable and ready to guide implementation! 🎯