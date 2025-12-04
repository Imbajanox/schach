/**
 * Game API Client
 * Handles communication with the server for game data persistence
 * Schach - Chess Game
 */

class GameAPI {
    constructor() {
        this.baseUrl = 'php/game';
        this.currentGameId = null;
        this.moveNumber = 0;
        this.gameOptions = null;
        
        // Setup page unload handler
        this.setupUnloadHandler();
        
        // Check for abandoned game on load
        this.checkAbandonedGame();
    }
    
    /**
     * Setup handler for page unload/reload
     */
    setupUnloadHandler() {
        // Use beforeunload to save state
        window.addEventListener('beforeunload', () => {
            if (this.currentGameId) {
                // Save current game state to localStorage
                this.saveGameState();
            }
        });
        
        // Use pagehide for mobile browsers
        window.addEventListener('pagehide', () => {
            if (this.currentGameId) {
                this.saveGameState();
            }
        });
    }
    
    /**
     * Save current game state to localStorage
     */
    saveGameState() {
        if (!this.currentGameId) return;
        
        const gameState = {
            gameId: this.currentGameId,
            moveNumber: this.moveNumber,
            options: this.gameOptions,
            timestamp: Date.now()
        };
        
        localStorage.setItem('schach_active_game', JSON.stringify(gameState));
    }
    
    /**
     * Clear saved game state
     */
    clearGameState() {
        localStorage.removeItem('schach_active_game');
    }
    
    /**
     * Check for abandoned game on page load
     */
    async checkAbandonedGame() {
        const savedState = localStorage.getItem('schach_active_game');
        if (!savedState) return;
        
        try {
            const state = JSON.parse(savedState);
            
            // If the saved game is older than 24 hours, abandon it
            const ageHours = (Date.now() - state.timestamp) / (1000 * 60 * 60);
            
            if (state.gameId) {
                // Abandon the old game on the server
                await this.abandonGame(state.gameId);
            }
            
            // Clear the saved state
            this.clearGameState();
        } catch (error) {
            console.error('Error checking abandoned game:', error);
            this.clearGameState();
        }
    }
    
    /**
     * Abandon a game (mark as abandoned on server)
     */
    async abandonGame(gameId) {
        try {
            const response = await fetch(`${this.baseUrl}/abandon.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    game_id: gameId
                })
            });
            
            const result = await response.json();
            console.log('Abandoned game:', gameId, result);
            return result;
        } catch (error) {
            console.error('Failed to abandon game:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a new game on the server
     */
    async createGame(options) {
        // First, check and abandon any previous game
        const savedState = localStorage.getItem('schach_active_game');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                if (state.gameId) {
                    await this.abandonGame(state.gameId);
                }
            } catch (e) {
                // Ignore parse errors
            }
            this.clearGameState();
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/create.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    game_type: options.mode || 'pvp_local',
                    player_color: options.playerColor || 'white',
                    ai_difficulty: options.difficulty || null,
                    time_control: options.timeControl || null,
                    increment: options.increment || 0
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentGameId = result.game_id;
                this.moveNumber = 0;
                this.gameOptions = options;
                
                // Save state immediately
                this.saveGameState();
                
                console.log('Game created with ID:', this.currentGameId);
            }
            
            return result;
        } catch (error) {
            console.error('Failed to create game:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Save a move to the server
     */
    async saveMove(moveRecord) {
        if (!this.currentGameId) {
            console.warn('No active game to save move to');
            return { success: false, error: 'No active game' };
        }

        this.moveNumber++;
        
        // Update saved state
        this.saveGameState();

        try {
            const response = await fetch(`${this.baseUrl}/move.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    game_id: this.currentGameId,
                    move_number: this.moveNumber,
                    player_color: moveRecord.color,
                    from: moveRecord.from,
                    to: moveRecord.to,
                    piece_type: moveRecord.piece,
                    captured_piece: moveRecord.capture ? moveRecord.capture.type : null,
                    is_check: moveRecord.check || false,
                    is_checkmate: moveRecord.checkmate || false,
                    castling: moveRecord.castling || null,
                    en_passant: moveRecord.enPassant || false,
                    promotion: moveRecord.promotion || null,
                    notation: moveRecord.notation,
                    fen: moveRecord.fen,
                    time_spent: moveRecord.timeSpent || null,
                    white_time_remaining: moveRecord.whiteTimeRemaining || null,
                    black_time_remaining: moveRecord.blackTimeRemaining || null
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                console.error('Failed to save move:', result.error);
            }
            
            return result;
        } catch (error) {
            console.error('Failed to save move:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * End the current game
     */
    async endGame(result, reason) {
        if (!this.currentGameId) {
            console.warn('No active game to end');
            return { success: false, error: 'No active game' };
        }

        try {
            const response = await fetch(`${this.baseUrl}/end.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    game_id: this.currentGameId,
                    result: result,
                    reason: reason
                })
            });

            const responseData = await response.json();
            
            if (responseData.success) {
                console.log('Game ended:', this.currentGameId);
                // Clear saved state when game ends properly
                this.clearGameState();
                this.currentGameId = null;
                this.moveNumber = 0;
                this.gameOptions = null;
            }
            
            return responseData;
        } catch (error) {
            console.error('Failed to end game:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get game data for review
     */
    async getGame(gameId) {
        const id = gameId || this.currentGameId;
        
        if (!id) {
            return { success: false, error: 'No game ID specified' };
        }

        try {
            const response = await fetch(`${this.baseUrl}/get.php?id=${id}`);
            return await response.json();
        } catch (error) {
            console.error('Failed to get game:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send a chat message
     */
    async sendMessage(message, isSystem = false) {
        if (!this.currentGameId) {
            return { success: false, error: 'No active game' };
        }

        try {
            const response = await fetch(`${this.baseUrl}/message.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    game_id: this.currentGameId,
                    message: message,
                    is_system: isSystem
                })
            });

            return await response.json();
        } catch (error) {
            console.error('Failed to send message:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current game ID
     */
    getGameId() {
        return this.currentGameId;
    }

    /**
     * Reset for new game
     */
    reset() {
        this.currentGameId = null;
        this.moveNumber = 0;
        this.gameOptions = null;
        this.clearGameState();
    }

    /**
     * Set game ID (for resuming games)
     */
    setGameId(gameId, moveNumber = 0) {
        this.currentGameId = gameId;
        this.moveNumber = moveNumber;
    }
}

// Create global instance
const gameAPI = new GameAPI();
