/**
 * Chess Game Logic
 * Schach - Chess Game
 */

class ChessGame {
    constructor() {
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

    /**
     * Start a new game
     */
    newGame(options = {}) {
        this.gameMode = options.mode || GAME_MODES.VS_AI;
        this.playerColor = options.playerColor || COLORS.WHITE;
        this.aiDifficulty = options.difficulty || AI_DIFFICULTIES.EASY;
        
        // Reset game state
        this.position = Utils.deepClone(INITIAL_POSITION);
        this.currentTurn = COLORS.WHITE;
        this.gameState = GAME_STATES.ACTIVE;
        this.castlingRights = 'KQkq';
        this.enPassantSquare = null;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        
        this.moveHistory = [];
        this.positionHistory = [Utils.deepClone(this.position)];
        this.redoStack = [];
        this.capturedPieces = { white: [], black: [] };
        this.drawOffered = false;
        this.drawOfferedBy = null;
        
        // IMPORTANT: Do NOT reset roguelike properties when in roguelike mode
        // These should persist across encounters: pieceUpgrades, artifacts, gold, etc.
        // Only reset these when roguelikeMode is explicitly set to false
        if (!this.roguelikeMode) {
            this.pieceUpgrades = {};
            this.artifacts = [];
        }
        
        return this.position;
    }

    /**
     * Get current game state object
     */
    getGameState() {
        return {
            castlingRights: this.castlingRights,
            enPassantSquare: this.enPassantSquare,
            halfMoveClock: this.halfMoveClock,
            fullMoveNumber: this.fullMoveNumber
        };
    }

    /**
     * Get valid moves for a piece
     */
    getValidMoves(square) {
        const piece = this.position[square];
        if (!piece || piece.color !== this.currentTurn) {
            return [];
        }

        const allMoves = Pieces.getValidMoves(
            this.position, 
            square, 
            true, 
            this.getGameState()
        );

        // Filter out moves that leave king in check
        return allMoves.filter(move => {
            const result = Pieces.makeMove(this.position, square, move, this.getGameState());
            return !Pieces.isInCheck(result.position, this.currentTurn);
        });
    }

    /**
     * Check if a move is valid
     */
    isValidMove(from, to, promotion = null) {
        const validMoves = this.getValidMoves(from);
        return validMoves.some(move => {
            if (move.to !== to) return false;
            if (move.promotion && promotion && move.promotion !== promotion) return false;
            if (move.promotion && !promotion) return move.promotion === PIECE_TYPES.QUEEN; // Default to queen
            return true;
        });
    }

    /**
     * Make a move
     * NOW SUPPORTS: Roguelike upgrades and HP system
     */
    makeMove(from, to, promotion = null) {
        if (this.gameState !== GAME_STATES.ACTIVE && this.gameState !== GAME_STATES.CHECK) {
            return null;
        }

        const piece = this.position[from];
        if (!piece || piece.color !== this.currentTurn) {
            return null;
        }

        const validMoves = this.getValidMoves(from);
        let move = validMoves.find(m => {
            if (m.to !== to) return false;
            if (m.promotion) {
                return promotion ? m.promotion === promotion : m.promotion === PIECE_TYPES.QUEEN;
            }
            return true;
        });

        if (!move) return null;

        // Store state before move
        const previousPosition = Utils.deepClone(this.position);
        const capturedPiece = this.position[to] || (move.enPassant ? this.getEnPassantCapture(to) : null);

        // ============================================
        // NEW: Execute move with upgrade support
        // ============================================
        const result = Pieces.makeMove(
            this.position,
            from,
            move,
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
                    notation: `${from}→${to} (blocked by shield)`,
                    damageDealt: true,
                    remainingHp: result.remainingHp,
                    fen: Utils.toFEN(
                        this.position, 
                        this.currentTurn, 
                        this.castlingRights, 
                        this.enPassantSquare,
                        this.halfMoveClock, 
                        this.fullMoveNumber
                    )
                });
            }
            
            // DON'T switch turns - attacker stays to play
            // This is intentional: when HP is reduced but piece survives, 
            // the attacking player gets another chance to capture or move elsewhere
            // This prevents the HP system from being too powerful
            this.checkGameState();
            return {
                from,
                to,
                damageDealt: true,
                remainingHp: result.remainingHp
            };
        }

        // ============================================
        // Standard move logic continues
        // ============================================
        this.position = result.position;
        
        // Update upgrades if in roguelike mode
        if (result.upgrades) {
            this.pieceUpgrades = result.upgrades;
        }

        // Update game state
        this.updateCastlingRights(from, to, piece);
        this.enPassantSquare = result.enPassantSquare;
        
        // Update move counters
        if (piece.type === PIECE_TYPES.PAWN || move.capture) {
            this.halfMoveClock = 0;
        } else {
            this.halfMoveClock++;
        }
        
        if (this.currentTurn === COLORS.BLACK) {
            this.fullMoveNumber++;
        }

        // Track captured pieces
        if (capturedPiece) {
            this.capturedPieces[capturedPiece.color].push(capturedPiece);
        }

        // Generate algebraic notation
        const opponentColor = Utils.oppositeColor(this.currentTurn);
        const isCheck = Pieces.isInCheck(this.position, opponentColor);
        const opponentMoves = Pieces.getAllLegalMoves(this.position, opponentColor, this.getGameState());
        const isCheckmate = isCheck && opponentMoves.length === 0;

        const algebraicNotation = Utils.toAlgebraic(
            piece, from, to, 
            move.capture, isCheck, isCheckmate, 
            move.promotion, move.castling
        );

        // Create move record
        const moveRecord = {
            from,
            to,
            piece: piece.type,
            color: piece.color,
            capture: capturedPiece,
            promotion: move.promotion,
            castling: move.castling,
            enPassant: move.enPassant,
            check: isCheck,
            checkmate: isCheckmate,
            notation: algebraicNotation,
            fen: Utils.toFEN(
                this.position, 
                opponentColor, 
                this.castlingRights, 
                this.enPassantSquare,
                this.halfMoveClock, 
                this.fullMoveNumber
            )
        };

        this.moveHistory.push(moveRecord);
        this.positionHistory.push(Utils.deepClone(this.position));
        
        // Clear redo stack when a new move is made
        this.redoStack = [];
        
        // Clear any pending draw offer
        this.drawOffered = false;
        this.drawOfferedBy = null;

        // Switch turns
        this.currentTurn = opponentColor;

        // Check game state
        this.checkGameState();

        // Trigger callbacks
        if (this.onMove) {
            this.onMove(moveRecord);
        }

        if (this.onTurnChange) {
            this.onTurnChange(this.currentTurn);
        }

        return moveRecord;
    }

    /**
     * Get en passant captured piece
     */
    getEnPassantCapture(targetSquare) {
        const rank = targetSquare[1] === '6' ? '5' : '4';
        const captureSquare = targetSquare[0] + rank;
        return this.position[captureSquare];
    }

    /**
     * Update castling rights after a move
     */
    updateCastlingRights(from, to, piece) {
        let rights = this.castlingRights;

        // King moves remove all castling rights for that color
        if (piece.type === PIECE_TYPES.KING) {
            if (piece.color === COLORS.WHITE) {
                rights = rights.replace('K', '').replace('Q', '');
            } else {
                rights = rights.replace('k', '').replace('q', '');
            }
        }

        // Rook moves remove castling rights for that side
        if (piece.type === PIECE_TYPES.ROOK) {
            if (from === 'h1') rights = rights.replace('K', '');
            if (from === 'a1') rights = rights.replace('Q', '');
            if (from === 'h8') rights = rights.replace('k', '');
            if (from === 'a8') rights = rights.replace('q', '');
        }

        // Rook captured
        if (to === 'h1') rights = rights.replace('K', '');
        if (to === 'a1') rights = rights.replace('Q', '');
        if (to === 'h8') rights = rights.replace('k', '');
        if (to === 'a8') rights = rights.replace('q', '');

        this.castlingRights = rights || '-';
    }

    /**
     * Check game state (check, checkmate, stalemate, draw)
     */
    checkGameState() {
        const legalMoves = Pieces.getAllLegalMoves(
            this.position, 
            this.currentTurn, 
            this.getGameState()
        );
        const isCheck = Pieces.isInCheck(this.position, this.currentTurn);

        if (legalMoves.length === 0) {
            if (isCheck) {
                this.gameState = GAME_STATES.CHECKMATE;
                if (this.onGameOver) {
                    this.onGameOver({
                        state: GAME_STATES.CHECKMATE,
                        winner: Utils.oppositeColor(this.currentTurn),
                        reason: 'checkmate'
                    });
                }
            } else {
                this.gameState = GAME_STATES.STALEMATE;
                if (this.onGameOver) {
                    this.onGameOver({
                        state: GAME_STATES.STALEMATE,
                        winner: null,
                        reason: 'stalemate'
                    });
                }
            }
        } else if (isCheck) {
            this.gameState = GAME_STATES.CHECK;
            if (this.onCheck) {
                this.onCheck(this.currentTurn);
            }
        } else {
            this.gameState = GAME_STATES.ACTIVE;
        }

        // Check for other draw conditions
        if (this.isInsufficientMaterial()) {
            this.gameState = GAME_STATES.DRAW;
            if (this.onGameOver) {
                this.onGameOver({
                    state: GAME_STATES.DRAW,
                    winner: null,
                    reason: 'insufficient_material'
                });
            }
        }

        if (this.halfMoveClock >= 100) {
            this.gameState = GAME_STATES.DRAW;
            if (this.onGameOver) {
                this.onGameOver({
                    state: GAME_STATES.DRAW,
                    winner: null,
                    reason: 'fifty_move_rule'
                });
            }
        }

        if (this.isThreefoldRepetition()) {
            this.gameState = GAME_STATES.DRAW;
            if (this.onGameOver) {
                this.onGameOver({
                    state: GAME_STATES.DRAW,
                    winner: null,
                    reason: 'threefold_repetition'
                });
            }
        }
    }

    /**
     * Check for insufficient material
     */
    isInsufficientMaterial() {
        const pieces = Object.values(this.position);
        
        // King vs King
        if (pieces.length === 2) return true;
        
        // King and minor piece vs King
        if (pieces.length === 3) {
            const nonKings = pieces.filter(p => p.type !== PIECE_TYPES.KING);
            if (nonKings.length === 1) {
                const piece = nonKings[0];
                if (piece.type === PIECE_TYPES.BISHOP || piece.type === PIECE_TYPES.KNIGHT) {
                    return true;
                }
            }
        }
        
        // King and Bishop vs King and Bishop (same color bishops)
        if (pieces.length === 4) {
            const bishops = pieces.filter(p => p.type === PIECE_TYPES.BISHOP);
            if (bishops.length === 2) {
                // Check if bishops are on same color squares
                const bishopSquares = Object.entries(this.position)
                    .filter(([_, p]) => p.type === PIECE_TYPES.BISHOP)
                    .map(([sq, _]) => sq);
                
                if (bishopSquares.length === 2) {
                    const color1 = Utils.getSquareColor(
                        Utils.fileToIndex(bishopSquares[0][0]),
                        Utils.rankToIndex(bishopSquares[0][1])
                    );
                    const color2 = Utils.getSquareColor(
                        Utils.fileToIndex(bishopSquares[1][0]),
                        Utils.rankToIndex(bishopSquares[1][1])
                    );
                    if (color1 === color2) return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Check for threefold repetition
     */
    isThreefoldRepetition() {
        if (this.positionHistory.length < 5) return false;
        
        const currentFEN = Utils.toFEN(
            this.position, 
            this.currentTurn, 
            this.castlingRights, 
            this.enPassantSquare,
            0, 1 // Ignore move counters for comparison
        ).split(' ').slice(0, 4).join(' ');
        
        let count = 0;
        for (let i = 0; i < this.positionHistory.length; i++) {
            const historicalFEN = Utils.toFEN(
                this.positionHistory[i],
                i % 2 === 0 ? COLORS.WHITE : COLORS.BLACK,
                this.castlingRights,
                null,
                0, 1
            ).split(' ').slice(0, 4).join(' ');
            
            if (currentFEN === historicalFEN) {
                count++;
                if (count >= 3) return true;
            }
        }
        
        return false;
    }

    /**
     * Resign the game
     */
    resign(color) {
        this.gameState = GAME_STATES.RESIGNED;
        if (this.onGameOver) {
            this.onGameOver({
                state: GAME_STATES.RESIGNED,
                winner: Utils.oppositeColor(color),
                reason: 'resignation'
            });
        }
    }

    /**
     * Get current position
     */
    getPosition() {
        return Utils.deepClone(this.position);
    }

    /**
     * Get FEN string
     */
    getFEN() {
        return Utils.toFEN(
            this.position,
            this.currentTurn,
            this.castlingRights,
            this.enPassantSquare,
            this.halfMoveClock,
            this.fullMoveNumber
        );
    }

    /**
     * Load position from FEN
     */
    loadFEN(fen) {
        const parsed = Utils.parseFEN(fen);
        this.position = parsed.position;
        this.currentTurn = parsed.turn;
        this.castlingRights = parsed.castling;
        this.enPassantSquare = parsed.enPassant;
        this.halfMoveClock = parsed.halfMoveClock;
        this.fullMoveNumber = parsed.fullMoveNumber;
        this.gameState = GAME_STATES.ACTIVE;
        
        this.checkGameState();
        
        return this.position;
    }

    /**
     * Undo last move
     */
    undo() {
        if (this.moveHistory.length === 0) return null;
        
        const move = this.moveHistory.pop();
        const position = this.positionHistory.pop();
        
        // Push to redo stack
        this.redoStack.push({
            move: move,
            position: position
        });
        
        // Restore previous position
        this.position = Utils.deepClone(this.positionHistory[this.positionHistory.length - 1]);
        
        // Restore captured piece tracking
        if (move.capture) {
            this.capturedPieces[move.capture.color].pop();
        }
        
        // Switch turns back
        this.currentTurn = Utils.oppositeColor(this.currentTurn);
        
        // Update move counter
        if (this.currentTurn === COLORS.BLACK) {
            this.fullMoveNumber--;
        }
        
        this.gameState = GAME_STATES.ACTIVE;
        this.checkGameState();
        
        return move;
    }

    /**
     * Redo a previously undone move
     */
    redo() {
        if (this.redoStack.length === 0) return null;
        
        const { move, position } = this.redoStack.pop();
        
        // Restore the position
        this.position = Utils.deepClone(position);
        this.positionHistory.push(Utils.deepClone(position));
        this.moveHistory.push(move);
        
        // Restore captured piece tracking
        if (move.capture) {
            this.capturedPieces[move.capture.color].push(move.capture);
        }
        
        // Switch turns
        this.currentTurn = Utils.oppositeColor(this.currentTurn);
        
        // Update move counter
        if (this.currentTurn === COLORS.WHITE) {
            this.fullMoveNumber++;
        }
        
        this.checkGameState();
        
        return move;
    }

    /**
     * Check if undo is available
     */
    canUndo() {
        return this.moveHistory.length > 0;
    }

    /**
     * Check if redo is available
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Offer a draw
     */
    offerDraw(color) {
        if (this.gameState !== GAME_STATES.ACTIVE && this.gameState !== GAME_STATES.CHECK) {
            return false;
        }
        
        this.drawOffered = true;
        this.drawOfferedBy = color;
        
        return true;
    }

    /**
     * Accept draw offer
     */
    acceptDraw() {
        if (!this.drawOffered) return false;
        
        this.gameState = GAME_STATES.DRAW;
        if (this.onGameOver) {
            this.onGameOver({
                state: GAME_STATES.DRAW,
                winner: null,
                reason: 'agreement'
            });
        }
        
        return true;
    }

    /**
     * Decline draw offer
     */
    declineDraw() {
        this.drawOffered = false;
        this.drawOfferedBy = null;
    }

    /**
     * Check if it's the player's turn (for AI games)
     */
    isPlayerTurn() {
        if (this.gameMode === GAME_MODES.PVP_LOCAL) return true;
        return this.currentTurn === this.playerColor;
    }

    /**
     * Get the king square for a color
     */
    getKingSquare(color) {
        return Pieces.findKing(this.position, color);
    }

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
}
