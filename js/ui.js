/**
 * UI Controller
 * Schach - Chess Game
 */

class UI {
    constructor() {
        this.elements = {};
        this.initElements();
    }

    /**
     * Initialize UI element references
     */
    initElements() {
        this.elements = {
            // Buttons
            startGameBtn: document.getElementById('startGameBtn'),
            flipBoardBtn: document.getElementById('flipBoardBtn'),
            undoBtn: document.getElementById('undoBtn'),
            redoBtn: document.getElementById('redoBtn'),
            resignBtn: document.getElementById('resignBtn'),
            drawBtn: document.getElementById('drawBtn'),
            loginBtn: document.getElementById('loginBtn'),
            registerBtn: document.getElementById('registerBtn'),
            newGameBtn: document.getElementById('newGameBtn'),
            reviewGameBtn: document.getElementById('reviewGameBtn'),
            
            // Game mode buttons
            vsAiBtn: document.getElementById('vsAiBtn'),
            vsPlayerLocalBtn: document.getElementById('vsPlayerLocalBtn'),
            vsPlayerOnlineBtn: document.getElementById('vsPlayerOnlineBtn'),
            
            // Panels
            aiOptionsPanel: document.getElementById('aiOptionsPanel'),
            
            // Timers
            whiteTimer: document.getElementById('whiteTimer'),
            blackTimer: document.getElementById('blackTimer'),
            
            // Status and history
            gameStatus: document.getElementById('gameStatus'),
            moveHistory: document.getElementById('moveHistory'),
            capturedWhite: document.getElementById('capturedWhite'),
            capturedBlack: document.getElementById('capturedBlack'),
            
            // Modals
            promotionModal: document.getElementById('promotionModal'),
            promotionOptions: document.getElementById('promotionOptions'),
            gameOverModal: document.getElementById('gameOverModal'),
            gameOverTitle: document.getElementById('gameOverTitle'),
            gameOverMessage: document.getElementById('gameOverMessage'),
            drawOfferModal: document.getElementById('drawOfferModal'),
            drawOfferMessage: document.getElementById('drawOfferMessage'),
            acceptDrawBtn: document.getElementById('acceptDrawBtn'),
            declineDrawBtn: document.getElementById('declineDrawBtn')
        };
    }

    /**
     * Update game status display
     */
    updateStatus(message, type = '') {
        if (this.elements.gameStatus) {
            this.elements.gameStatus.innerHTML = `<p>${message}</p>`;
            this.elements.gameStatus.className = 'game-status';
            if (type) {
                this.elements.gameStatus.classList.add(type);
            }
        }
    }

    /**
     * Update turn indicator
     */
    updateTurnIndicator(currentTurn) {
        const message = currentTurn === COLORS.WHITE ? 
            "White's turn" : "Black's turn";
        this.updateStatus(message);
        
        // Update timer highlighting
        if (this.elements.whiteTimer) {
            this.elements.whiteTimer.classList.toggle('active', currentTurn === COLORS.WHITE);
        }
        if (this.elements.blackTimer) {
            this.elements.blackTimer.classList.toggle('active', currentTurn === COLORS.BLACK);
        }
    }

    /**
     * Add move to history
     */
    addMoveToHistory(move, moveNumber) {
        const moveList = this.elements.moveHistory?.querySelector('.move-list');
        if (!moveList) return;

        const isWhite = move.color === COLORS.WHITE;
        
        if (isWhite) {
            // Add move number
            const numSpan = document.createElement('span');
            numSpan.className = 'move-number';
            numSpan.textContent = moveNumber + '.';
            moveList.appendChild(numSpan);
        }

        // Add move notation
        const moveSpan = document.createElement('span');
        moveSpan.className = 'move';
        moveSpan.textContent = move.notation;
        moveSpan.dataset.index = this.getMoveIndex(moveNumber, isWhite);
        moveList.appendChild(moveSpan);

        // If black's move, add empty span for grid alignment
        if (!isWhite) {
            // Nothing needed for grid
        }

        // Scroll to bottom
        if (this.elements.moveHistory) {
            this.elements.moveHistory.scrollTop = this.elements.moveHistory.scrollHeight;
        }
    }

    /**
     * Get move index for history navigation
     */
    getMoveIndex(moveNumber, isWhite) {
        return (moveNumber - 1) * 2 + (isWhite ? 0 : 1);
    }

    /**
     * Clear move history
     */
    clearMoveHistory() {
        const moveList = this.elements.moveHistory?.querySelector('.move-list');
        if (moveList) {
            moveList.innerHTML = '';
        }
    }

    /**
     * Update captured pieces display
     */
    updateCapturedPieces(capturedPieces) {
        if (this.elements.capturedWhite) {
            this.elements.capturedWhite.innerHTML = capturedPieces.white
                .map(p => PIECE_FONTAWESOME.white[p.type])
                .join('');
        }
        if (this.elements.capturedBlack) {
            this.elements.capturedBlack.innerHTML = capturedPieces.black
                .map(p => PIECE_FONTAWESOME.black[p.type])
                .join('');
        }
    }

    /**
     * Show promotion modal
     */
    showPromotionModal(color, callback) {
        if (!this.elements.promotionModal || !this.elements.promotionOptions) return;

        const pieces = [PIECE_TYPES.QUEEN, PIECE_TYPES.ROOK, PIECE_TYPES.BISHOP, PIECE_TYPES.KNIGHT];
        
        this.elements.promotionOptions.innerHTML = pieces.map(piece => `
            <button class="promotion-option" data-piece="${piece}">
                ${PIECE_FONTAWESOME[color][piece]}
            </button>
        `).join('');

        // Add click handlers
        this.elements.promotionOptions.querySelectorAll('.promotion-option').forEach(btn => {
            btn.onclick = () => {
                this.hidePromotionModal();
                callback(btn.dataset.piece);
            };
        });

        this.elements.promotionModal.classList.add('active');
    }

    /**
     * Hide promotion modal
     */
    hidePromotionModal() {
        if (this.elements.promotionModal) {
            this.elements.promotionModal.classList.remove('active');
        }
    }

    /**
     * Show game over modal
     */
    showGameOverModal(result) {
        if (!this.elements.gameOverModal) return;

        let title = 'Game Over';
        let message = '';

        switch (result.state) {
            case GAME_STATES.CHECKMATE:
                title = 'Checkmate!';
                message = `${result.winner === COLORS.WHITE ? 'White' : 'Black'} wins by checkmate.`;
                break;
            case GAME_STATES.STALEMATE:
                title = 'Stalemate!';
                message = 'The game is a draw by stalemate.';
                break;
            case GAME_STATES.RESIGNED:
                if (result.reason === 'timeout') {
                    title = 'Time Out!';
                    message = `${result.winner === COLORS.WHITE ? 'White' : 'Black'} wins on time.`;
                } else {
                    title = 'Resignation';
                    message = `${result.winner === COLORS.WHITE ? 'White' : 'Black'} wins by resignation.`;
                }
                break;
            case GAME_STATES.DRAW:
                title = 'Draw!';
                const reasons = {
                    'insufficient_material': 'The game is a draw due to insufficient material.',
                    'fifty_move_rule': 'The game is a draw by the fifty-move rule.',
                    'threefold_repetition': 'The game is a draw by threefold repetition.',
                    'agreement': 'The game is a draw by mutual agreement.'
                };
                message = reasons[result.reason] || 'The game is a draw.';
                break;
        }

        if (this.elements.gameOverTitle) {
            this.elements.gameOverTitle.textContent = title;
        }
        if (this.elements.gameOverMessage) {
            this.elements.gameOverMessage.textContent = message;
        }

        this.elements.gameOverModal.classList.add('active');
    }

    /**
     * Hide game over modal
     */
    hideGameOverModal() {
        if (this.elements.gameOverModal) {
            this.elements.gameOverModal.classList.remove('active');
        }
    }

    /**
     * Show draw offer modal
     */
    showDrawOfferModal(offeredBy, onAccept, onDecline) {
        if (!this.elements.drawOfferModal) return;

        const message = offeredBy === COLORS.WHITE ? 
            'White has offered a draw. Do you accept?' :
            'Black has offered a draw. Do you accept?';
        
        if (this.elements.drawOfferMessage) {
            this.elements.drawOfferMessage.textContent = message;
        }

        // Setup button handlers
        if (this.elements.acceptDrawBtn) {
            this.elements.acceptDrawBtn.onclick = () => {
                this.hideDrawOfferModal();
                if (onAccept) onAccept();
            };
        }
        
        if (this.elements.declineDrawBtn) {
            this.elements.declineDrawBtn.onclick = () => {
                this.hideDrawOfferModal();
                if (onDecline) onDecline();
            };
        }

        this.elements.drawOfferModal.classList.add('active');
    }

    /**
     * Hide draw offer modal
     */
    hideDrawOfferModal() {
        if (this.elements.drawOfferModal) {
            this.elements.drawOfferModal.classList.remove('active');
        }
    }

    /**
     * Enable/disable game controls
     */
    setGameControlsEnabled(enabled) {
        const controls = ['undoBtn', 'resignBtn', 'drawBtn', 'hintBtn'];
        controls.forEach(btn => {
            const element = this.elements[btn] || document.getElementById(btn);
            if (element) {
                element.disabled = !enabled;
            }
        });
    }

    /**
     * Set active game mode button
     */
    setActiveGameMode(mode) {
        const buttons = {
            [GAME_MODES.VS_AI]: this.elements.vsAiBtn,
            [GAME_MODES.PVP_LOCAL]: this.elements.vsPlayerLocalBtn,
            [GAME_MODES.PVP_ONLINE]: this.elements.vsPlayerOnlineBtn
        };

        Object.entries(buttons).forEach(([m, btn]) => {
            if (btn) {
                btn.classList.toggle('active', m === mode);
            }
        });

        // Show/hide AI options
        if (this.elements.aiOptionsPanel) {
            this.elements.aiOptionsPanel.style.display = 
                mode === GAME_MODES.VS_AI ? 'block' : 'none';
        }
    }

    /**
     * Get selected difficulty
     */
    getSelectedDifficulty() {
        const radio = document.querySelector('input[name="difficulty"]:checked');
        return radio ? radio.value : AI_DIFFICULTIES.EASY;
    }

    /**
     * Get selected color
     */
    getSelectedColor() {
        const btn = document.querySelector('.color-btn.active');
        const color = btn?.dataset.color || 'white';
        if (color === 'random') {
            return Math.random() < 0.5 ? COLORS.WHITE : COLORS.BLACK;
        }
        return color;
    }

    /**
     * Set active color button
     */
    setActiveColorButton(color) {
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === color);
        });
    }

    /**
     * Update timer display
     */
    updateTimer(color, seconds) {
        const timer = color === COLORS.WHITE ? 
            this.elements.whiteTimer : this.elements.blackTimer;
        
        if (timer) {
            timer.textContent = Utils.formatTime(seconds);
            timer.classList.toggle('low-time', seconds < 30);
        }
    }

    /**
     * Setup button click handlers
     */
    setupColorButtons() {
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setActiveColorButton(btn.dataset.color);
            });
        });
    }

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
        const totalEncounters = (state.zone - 1) * 3 + state.encounter;
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

    /**
     * Show roguelike dashboard modal
     * @param {Object} stats - Player stats { totalRuns, victories, highestZone }
     * @param {Function} onStart - Callback when start button is clicked
     */
    showRoguelikeDashboard(stats, onStart) {
        const modal = document.getElementById('roguelikeDashboard');
        
        // Update stats
        document.getElementById('dashboardTotalRuns').textContent = stats.totalRuns || 0;
        document.getElementById('dashboardVictories').textContent = stats.victories || 0;
        document.getElementById('dashboardHighestZone').textContent = stats.highestZone || 0;
        
        // Setup start button
        const startBtn = document.getElementById('startRunBtn');
        const newHandler = () => {
            this.hideRoguelikeDashboard();
            onStart();
        };
        
        // Remove old listeners by cloning
        const newStartBtn = startBtn.cloneNode(true);
        startBtn.parentNode.replaceChild(newStartBtn, startBtn);
        newStartBtn.addEventListener('click', newHandler);
        
        modal.classList.add('active');
    }

    /**
     * Hide roguelike dashboard modal
     */
    hideRoguelikeDashboard() {
        const modal = document.getElementById('roguelikeDashboard');
        modal.classList.remove('active');
    }

    /**
     * Show roguelike game over modal
     * @param {Object} result - { victory, zone, gold, score, message }
     * @param {Function} onNewRun - Callback for new run button
     * @param {Function} onDashboard - Callback for dashboard button
     */
    showRoguelikeGameOver(result, onNewRun, onDashboard) {
        const modal = document.getElementById('roguelikeGameOverModal');
        
        // Update title and icon
        const title = document.getElementById('roguelikeGameOverTitle');
        const icon = document.getElementById('roguelikeResultIcon');
        const message = document.getElementById('roguelikeGameOverMessage');
        
        if (result.victory) {
            title.textContent = '🎉 Victory!';
            icon.textContent = '👑';
            message.textContent = result.message || 'You have conquered all zones!';
        } else {
            title.textContent = '💀 Defeated';
            icon.textContent = '⚔️';
            message.textContent = result.message || 'Your run has ended. Try again!';
        }
        
        // Update stats
        document.getElementById('summaryZone').textContent = result.zone || 1;
        document.getElementById('summaryGold').textContent = result.gold || 0;
        document.getElementById('summaryScore').textContent = result.score || 0;
        
        // Setup buttons
        const newRunBtn = document.getElementById('roguelikeNewRunBtn');
        const dashboardBtn = document.getElementById('roguelikeDashboardBtn');
        
        // Remove old listeners by cloning
        const newNewRunBtn = newRunBtn.cloneNode(true);
        const newDashboardBtn = dashboardBtn.cloneNode(true);
        newRunBtn.parentNode.replaceChild(newNewRunBtn, newRunBtn);
        dashboardBtn.parentNode.replaceChild(newDashboardBtn, dashboardBtn);
        
        newNewRunBtn.addEventListener('click', () => {
            this.hideRoguelikeGameOver();
            onNewRun();
        });
        
        newDashboardBtn.addEventListener('click', () => {
            this.hideRoguelikeGameOver();
            onDashboard();
        });
        
        modal.classList.add('active');
    }

    /**
     * Hide roguelike game over modal
     */
    hideRoguelikeGameOver() {
        const modal = document.getElementById('roguelikeGameOverModal');
        modal.classList.remove('active');
    }
}
