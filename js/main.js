/**
 * Main Application Entry Point
 * Schach - Chess Game
 */

// Global instances
let board = null;
let game = null;
let ui = null;

// Timer instance
chessTimer = new ChessTimer();

// State
let selectedSquare = null;
let pendingPromotion = null;
let currentGameMode = GAME_MODES.VS_AI;

/**
 * Initialize the application
 */
function init() {
    // Initialize components
    board = new Board('chessboard');
    game = new ChessGame();
    ui = new UI();

    // Setup board callbacks
    board.onSquareClick = handleSquareClick;
    board.onPieceDrop = handlePieceDrop;

    // Setup game callbacks
    game.onMove = handleMove;
    game.onGameOver = handleGameOver;
    game.onCheck = handleCheck;
    game.onTurnChange = handleTurnChange;
    
    // Setup timer callbacks
    setupTimerCallbacks();

    // Setup UI event listeners
    setupEventListeners();
    
    // Setup auth event listeners
    setupAuthEventListeners();
    
    // Check for existing session
    checkAuthSession();

    // Render initial empty board
    board.renderPosition({});
    
    console.log('Schach Chess Game initialized');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Start game button
    ui.elements.startGameBtn?.addEventListener('click', startNewGame);

    // Game mode buttons
    ui.elements.vsAiBtn?.addEventListener('click', () => setGameMode(GAME_MODES.VS_AI));
    ui.elements.vsPlayerLocalBtn?.addEventListener('click', () => setGameMode(GAME_MODES.PVP_LOCAL));
    ui.elements.vsPlayerOnlineBtn?.addEventListener('click', () => setGameMode(GAME_MODES.PVP_ONLINE));
    
    // Roguelike mode button
    const roguelikeBtn = document.getElementById('roguelikeBtn');
    roguelikeBtn?.addEventListener('click', startRoguelikeRun);

    // Color selection buttons
    ui.setupColorButtons();

    // Game controls
    ui.elements.flipBoardBtn?.addEventListener('click', () => board.flip());
    ui.elements.undoBtn?.addEventListener('click', handleUndo);
    ui.elements.redoBtn?.addEventListener('click', handleRedo);
    ui.elements.resignBtn?.addEventListener('click', handleResign);
    ui.elements.drawBtn?.addEventListener('click', handleDrawOffer);
    
    // Hint button
    const hintBtn = document.getElementById('hintBtn');
    hintBtn?.addEventListener('click', handleHint);
    
    // Setup AI callbacks
    setupAICallbacks();
    
    // Modal buttons
    ui.elements.newGameBtn?.addEventListener('click', () => {
        ui.hideGameOverModal();
        startNewGame();
    });
    ui.elements.reviewGameBtn?.addEventListener('click', () => {
        ui.hideGameOverModal();
        openGameReview();
    });
    
    // Roguelike dashboard close button
    const dashboardClose = document.getElementById('roguelikeDashboardClose');
    dashboardClose?.addEventListener('click', () => {
        ui.hideRoguelikeDashboard();
    });
}

/**
 * Setup AI callbacks for thinking indicator
 */
function setupAICallbacks() {
    const thinkingIndicator = document.getElementById('aiThinking');
    
    chessAI.onThinkingStart = () => {
        if (thinkingIndicator) {
            thinkingIndicator.style.display = 'flex';
        }
    };
    
    chessAI.onThinkingEnd = (result) => {
        if (thinkingIndicator) {
            thinkingIndicator.style.display = 'none';
        }
        console.log(`AI evaluated ${result.nodesEvaluated} positions in ${result.thinkingTime}ms`);
    };
}

/**
 * Setup timer callbacks
 */
function setupTimerCallbacks() {
    // Update UI when timer ticks
    chessTimer.onTick = (color, seconds) => {
        ui.updateTimer(color, seconds);
    };
    
    // Handle timeout (player runs out of time)
    chessTimer.onTimeout = (color) => {
        // The player who ran out of time loses
        const winner = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        
        // Stop the game
        game.gameState = GAME_STATES.RESIGNED;
        
        // Trigger game over
        if (game.onGameOver) {
            game.onGameOver({
                state: GAME_STATES.RESIGNED,
                winner: winner,
                reason: 'timeout'
            });
        }
    };
}

/**
 * Set game mode
 */
function setGameMode(mode) {
    currentGameMode = mode;
    ui.setActiveGameMode(mode);
}

/**
 * Start a new game
 */
async function startNewGame() {
    const playerColor = ui.getSelectedColor();
    const difficulty = ui.getSelectedDifficulty();

    // Clear AI cache for new game
    chessAI.clearCache();
    
    // Reset game API (only for non-roguelike modes)
    if (currentGameMode !== GAME_MODES.ROGUELIKE) {
        gameAPI.reset();
    }
    
    // Update opponent display based on difficulty (skip for roguelike)
    if (currentGameMode !== GAME_MODES.ROGUELIKE) {
        updateOpponentDisplay(difficulty);
    }

    // Determine game type for API
    let gameType = 'pvp_local';
    if (currentGameMode === GAME_MODES.VS_AI) {
        gameType = 'vs_ai';
    } else if (currentGameMode === GAME_MODES.PVP_ONLINE) {
        gameType = 'pvp_online';
    } else if (currentGameMode === GAME_MODES.ROGUELIKE) {
        gameType = 'roguelike';
    }

    // Default time control is 10 minutes (600 seconds)
    const defaultTimeControl = 600;
    
    // Create game on server (skip for roguelike)
    let createResult = { success: false };
    if (currentGameMode !== GAME_MODES.ROGUELIKE) {
        createResult = await gameAPI.createGame({
            mode: gameType,
            playerColor: playerColor,
            difficulty: difficulty,
            timeControl: defaultTimeControl
        });
        
        if (!createResult.success) {
            console.warn('Failed to create game on server:', createResult.error);
        }
    }

    // Start the game locally
    const position = game.newGame({
        mode: currentGameMode,
        playerColor: playerColor,
        difficulty: difficulty
    });

    // Render the board
    board.renderPosition(position);
    board.clearSelection();
    board.setOrientation(playerColor);

    // Update UI
    ui.clearMoveHistory();
    ui.updateCapturedPieces({ white: [], black: [] });
    ui.updateTurnIndicator(COLORS.WHITE);
    ui.setGameControlsEnabled(true);
    
    // Reset and start the timer for non-roguelike modes
    if (currentGameMode !== GAME_MODES.ROGUELIKE) {
        // Use server-returned time if available, otherwise use default
        const initialTime = createResult.time_control || defaultTimeControl;
        chessTimer.reset(initialTime);
        chessTimer.start(COLORS.WHITE);
    }

    selectedSquare = null;

    // If playing as black vs AI, make AI move (not in roguelike mode as it's always white)
    if (currentGameMode === GAME_MODES.VS_AI && playerColor === COLORS.BLACK) {
        setTimeout(makeAIMove, 500);
    }
}

/**
 * Handle square click
 */
function handleSquareClick(square) {
    if (game.gameState !== GAME_STATES.ACTIVE && game.gameState !== GAME_STATES.CHECK) {
        return;
    }

    // Check if it's the player's turn (for AI mode)
    if (currentGameMode === GAME_MODES.VS_AI && !game.isPlayerTurn()) {
        return;
    }

    const piece = game.position[square];

    if (selectedSquare) {
        // Try to make a move
        const validMoves = game.getValidMoves(selectedSquare);
        const move = validMoves.find(m => m.to === square);

        if (move) {
            // Check if it's a promotion move
            if (move.promotion) {
                // Show promotion dialog
                pendingPromotion = { from: selectedSquare, to: square };
                ui.showPromotionModal(game.currentTurn, (promotionPiece) => {
                    executeMove(pendingPromotion.from, pendingPromotion.to, promotionPiece);
                    pendingPromotion = null;
                });
            } else {
                executeMove(selectedSquare, square);
            }
            return;
        }

        // Clicking on own piece - change selection
        if (piece && piece.color === game.currentTurn) {
            selectPiece(square);
            return;
        }

        // Invalid move - clear selection
        board.clearSelection();
        selectedSquare = null;
    } else {
        // Select a piece
        if (piece && piece.color === game.currentTurn) {
            selectPiece(square);
        }
    }
}

/**
 * Handle piece drop (drag and drop)
 */
function handlePieceDrop(from, to) {
    if (from === to) return;

    if (game.gameState !== GAME_STATES.ACTIVE && game.gameState !== GAME_STATES.CHECK) {
        board.renderPosition(game.position);
        return;
    }

    if (currentGameMode === GAME_MODES.VS_AI && !game.isPlayerTurn()) {
        board.renderPosition(game.position);
        return;
    }

    const validMoves = game.getValidMoves(from);
    const move = validMoves.find(m => m.to === to);

    if (move) {
        if (move.promotion) {
            pendingPromotion = { from, to };
            ui.showPromotionModal(game.currentTurn, (promotionPiece) => {
                executeMove(pendingPromotion.from, pendingPromotion.to, promotionPiece);
                pendingPromotion = null;
            });
        } else {
            executeMove(from, to);
        }
    } else {
        // Invalid move - restore position
        board.renderPosition(game.position);
    }

    board.clearSelection();
    selectedSquare = null;
}

/**
 * Select a piece
 */
function selectPiece(square) {
    selectedSquare = square;
    board.selectSquare(square);

    const validMoves = game.getValidMoves(square);
    board.highlightValidMoves(validMoves);
}

/**
 * Execute a move
 */
function executeMove(from, to, promotion = null) {
    const move = game.makeMove(from, to, promotion);

    if (move) {
        // Animate the move
        board.animateMove(from, to, () => {
            board.renderPosition(game.position);
            board.highlightLastMove(from, to);

            // Highlight check
            if (game.gameState === GAME_STATES.CHECK) {
                const kingSquare = game.getKingSquare(game.currentTurn);
                board.highlightCheck(kingSquare);
            } else {
                board.highlightCheck(null);
            }
        });
    }

    board.clearSelection();
    selectedSquare = null;
}

/**
 * Handle move callback
 */
function handleMove(move) {
    // Add to move history
    ui.addMoveToHistory(move, game.fullMoveNumber - (move.color === COLORS.BLACK ? 1 : 0));

    // Update captured pieces
    ui.updateCapturedPieces(game.capturedPieces);
    
    // Update undo/redo buttons
    updateUndoRedoButtons();
    
    // Get time information from the timer
    const remainingTimes = chessTimer.getRemainingTimes();
    const timeSpent = chessTimer.getLastMoveTimeSpent();
    
    // Add time data to the move record for saving
    const moveWithTime = {
        ...move,
        timeSpent: timeSpent,
        whiteTimeRemaining: remainingTimes.white,
        blackTimeRemaining: remainingTimes.black
    };
    
    // Save move to server with time information
    gameAPI.saveMove(moveWithTime).catch(err => {
        console.warn('Failed to save move to server:', err);
    });

    // If vs AI or Roguelike and now AI's turn, make AI move
    if ((currentGameMode === GAME_MODES.VS_AI || currentGameMode === GAME_MODES.ROGUELIKE) && !game.isPlayerTurn()) {
        setTimeout(makeAIMove, 500);
    }
}

/**
 * Handle turn change
 */
function handleTurnChange(turn) {
    ui.updateTurnIndicator(turn);
    
    // Switch the timer to the new player's turn
    // Only switch if the timer has been started (game is in progress)
    if (chessTimer.activeColor) {
        chessTimer.start(turn);
    }
}

/**
 * Handle check
 */
function handleCheck(color) {
    ui.updateStatus(`${color === COLORS.WHITE ? 'White' : 'Black'} is in check!`, 'check');
}

/**
 * Handle game over
 */
async function handleGameOver(result) {
    // Stop the timer
    chessTimer.stop();
    
    ui.setGameControlsEnabled(false);
    ui.showGameOverModal(result);

    // Determine result for server
    let serverResult = 'draw';
    if (result.winner === COLORS.WHITE) {
        serverResult = 'white_wins';
    } else if (result.winner === COLORS.BLACK) {
        serverResult = 'black_wins';
    }
    
    // Map reason to server format
    const reasonMap = {
        'checkmate': 'checkmate',
        'resignation': 'resignation',
        'stalemate': 'stalemate',
        'insufficient_material': 'insufficient_material',
        'fifty_move_rule': 'fifty_move_rule',
        'threefold_repetition': 'threefold_repetition',
        'agreement': 'agreement',
        'timeout': 'timeout'
    };
    const serverReason = reasonMap[result.reason] || result.reason;
    
    // End game on server
    await gameAPI.endGame(serverResult, serverReason);

    // Update status
    let statusMessage = '';
    switch (result.state) {
        case GAME_STATES.CHECKMATE:
            statusMessage = `Checkmate! ${result.winner === COLORS.WHITE ? 'White' : 'Black'} wins!`;
            ui.updateStatus(statusMessage, 'checkmate');
            break;
        case GAME_STATES.STALEMATE:
            statusMessage = 'Stalemate! Draw.';
            ui.updateStatus(statusMessage, 'draw');
            break;
        case GAME_STATES.DRAW:
            statusMessage = 'Draw!';
            ui.updateStatus(statusMessage, 'draw');
            break;
        case GAME_STATES.RESIGNED:
            if (result.reason === 'timeout') {
                statusMessage = `${result.winner === COLORS.WHITE ? 'White' : 'Black'} wins on time!`;
            } else {
                statusMessage = `${result.winner === COLORS.WHITE ? 'White' : 'Black'} wins by resignation!`;
            }
            ui.updateStatus(statusMessage, 'resigned');
            break;
    }
}

/**
 * Handle undo
 */
function handleUndo() {
    // In AI mode, undo two moves (player + AI)
    if (currentGameMode === GAME_MODES.VS_AI) {
        game.undo(); // Undo AI move
        game.undo(); // Undo player move
    } else {
        game.undo();
    }

    board.renderPosition(game.position);
    board.clearSelection();
    board.highlightCheck(null);
    
    // Rebuild move history display
    rebuildMoveHistory();
    ui.updateCapturedPieces(game.capturedPieces);
    ui.updateTurnIndicator(game.currentTurn);
    updateUndoRedoButtons();
}

/**
 * Handle redo
 */
function handleRedo() {
    // In AI mode, redo two moves (player + AI)
    if (currentGameMode === GAME_MODES.VS_AI) {
        game.redo(); // Redo player move
        game.redo(); // Redo AI move
    } else {
        game.redo();
    }

    board.renderPosition(game.position);
    board.clearSelection();
    
    // Highlight check if in check
    if (game.gameState === GAME_STATES.CHECK) {
        const kingSquare = game.getKingSquare(game.currentTurn);
        board.highlightCheck(kingSquare);
    } else {
        board.highlightCheck(null);
    }
    
    // Rebuild move history display
    rebuildMoveHistory();
    ui.updateCapturedPieces(game.capturedPieces);
    ui.updateTurnIndicator(game.currentTurn);
    updateUndoRedoButtons();
}

/**
 * Update undo/redo button states
 */
function updateUndoRedoButtons() {
    if (ui.elements.undoBtn) {
        ui.elements.undoBtn.disabled = !game.canUndo();
    }
    if (ui.elements.redoBtn) {
        ui.elements.redoBtn.disabled = !game.canRedo();
    }
}

/**
 * Handle draw offer
 */
function handleDrawOffer() {
    if (currentGameMode === GAME_MODES.VS_AI) {
        // AI never accepts draws on easy/medium, sometimes on hard
        const playerColor = game.playerColor;
        game.offerDraw(playerColor);
        
        // AI response
        setTimeout(() => {
            if (game.aiDifficulty === AI_DIFFICULTIES.HARD && Math.random() < 0.3) {
                // AI sometimes accepts on hard mode
                game.acceptDraw();
            } else {
                game.declineDraw();
                ui.updateStatus('Draw offer declined by computer.', '');
            }
        }, 500);
    } else if (currentGameMode === GAME_MODES.PVP_LOCAL) {
        // In local 2P, show dialog to other player
        const offeredBy = game.currentTurn;
        game.offerDraw(offeredBy);
        
        ui.showDrawOfferModal(
            offeredBy,
            () => {
                game.acceptDraw();
            },
            () => {
                game.declineDraw();
                ui.updateStatus('Draw offer declined.', '');
            }
        );
    }
}

/**
 * Handle resign
 */
async function handleResign() {
    if (confirm('Are you sure you want to resign?')) {
        const resigningColor = game.playerColor;
        game.resign(resigningColor);
        
        // Also send system message
        gameAPI.sendMessage(`${resigningColor === COLORS.WHITE ? 'White' : 'Black'} resigned.`, true);
    }
}

/**
 * Rebuild move history from game history
 */
function rebuildMoveHistory() {
    ui.clearMoveHistory();
    let moveNumber = 1;
    
    for (const move of game.moveHistory) {
        ui.addMoveToHistory(move, moveNumber);
        if (move.color === COLORS.BLACK) {
            moveNumber++;
        }
    }
}

/**
 * Make AI move using the ChessAI engine
 */
async function makeAIMove() {
    if (game.gameState !== GAME_STATES.ACTIVE && game.gameState !== GAME_STATES.CHECK) {
        return;
    }

    // Get best move from AI engine
    const bestMove = await chessAI.getBestMove(
        game.position,
        game.currentTurn,
        game.getGameState(),
        game.aiDifficulty
    );

    if (bestMove) {
        executeMove(bestMove.from, bestMove.to, bestMove.promotion);
    }
}

/**
 * Handle hint request
 */
let currentHint = null;

async function handleHint() {
    if (game.gameState !== GAME_STATES.ACTIVE && game.gameState !== GAME_STATES.CHECK) {
        return;
    }
    
    if (!game.isPlayerTurn()) {
        return;
    }
    
    // Clear previous hint
    clearHintHighlight();
    
    const hintBtn = document.getElementById('hintBtn');
    if (hintBtn) {
        hintBtn.disabled = true;
    }
    
    ui.updateStatus('Calculating best move...', '');
    
    // Get hint from AI
    const hint = await chessAI.getHint(
        game.position,
        game.currentTurn,
        game.getGameState()
    );
    
    if (hintBtn) {
        hintBtn.disabled = false;
    }
    
    if (hint) {
        currentHint = hint;
        highlightHint(hint.from, hint.to);
        ui.updateStatus(`Hint: Move ${hint.from} to ${hint.to}`, 'hint');
    } else {
        ui.updateStatus('No hint available', '');
    }
}

/**
 * Highlight hint squares
 */
function highlightHint(from, to) {
    const fromSquare = document.querySelector(`.square[data-square="${from}"]`);
    const toSquare = document.querySelector(`.square[data-square="${to}"]`);
    
    if (fromSquare) fromSquare.classList.add('hint-from');
    if (toSquare) toSquare.classList.add('hint-to');
    
    // Auto-clear hint after 3 seconds
    setTimeout(clearHintHighlight, 3000);
}

/**
 * Clear hint highlight
 */
function clearHintHighlight() {
    const hintSquares = document.querySelectorAll('.hint-from, .hint-to');
    hintSquares.forEach(sq => {
        sq.classList.remove('hint-from', 'hint-to');
    });
    currentHint = null;
}

/**
 * Update opponent display based on difficulty
 */
function updateOpponentDisplay(difficulty) {
    const opponentName = document.getElementById('opponentName');
    const opponentRating = document.getElementById('opponentRating');
    
    if (currentGameMode === GAME_MODES.VS_AI) {
        if (opponentName) opponentName.textContent = 'Computer';
        if (opponentRating) {
            let level = 'Easy';
            if (difficulty === AI_DIFFICULTIES.MEDIUM) level = 'Medium';
            else if (difficulty === AI_DIFFICULTIES.HARD) level = 'Hard';
            opponentRating.textContent = `Level: ${level}`;
        }
    } else if (currentGameMode === GAME_MODES.PVP_LOCAL) {
        if (opponentName) opponentName.textContent = 'Player 2';
        if (opponentRating) opponentRating.textContent = 'Local';
    }
}

// ========================
// Game Review Functions
// ========================

let reviewMode = false;
let reviewMoves = [];
let reviewCurrentIndex = -1;
let reviewPositions = [];

/**
 * Open game review modal
 */
async function openGameReview() {
    const gameData = await gameAPI.getGame();
    
    if (!gameData.success) {
        // Fall back to local move history
        reviewMoves = game.moveHistory;
        reviewPositions = game.positionHistory;
        reviewCurrentIndex = -1;
        reviewMode = true;
        showReviewModal();
        return;
    }
    
    // Use server data
    reviewMoves = gameData.moves;
    reviewCurrentIndex = -1;
    reviewMode = true;
    
    // Build positions from moves
    reviewPositions = [Utils.deepClone(INITIAL_POSITION)];
    let currentPosition = Utils.deepClone(INITIAL_POSITION);
    let gameState = {
        castlingRights: 'KQkq',
        enPassantSquare: null
    };
    
    for (const move of reviewMoves) {
        const moveObj = {
            from: move.move_from || move.from,
            to: move.move_to || move.to,
            promotion: move.promotion_piece || move.promotion,
            castling: move.is_castling || move.castling,
            enPassant: move.is_en_passant || move.enPassant,
            capture: !!move.captured_piece || !!move.capture
        };
        
        const result = Pieces.makeMove(currentPosition, moveObj.from, moveObj, gameState);
        currentPosition = result.position;
        gameState.enPassantSquare = result.enPassantSquare;
        reviewPositions.push(Utils.deepClone(currentPosition));
    }
    
    showReviewModal(gameData);
}

/**
 * Show review modal
 */
function showReviewModal(gameData = null) {
    const modal = document.getElementById('reviewModal');
    if (!modal) {
        createReviewModal();
    }
    
    // Update review info
    if (gameData && gameData.game) {
        const gameInfo = gameData.game;
        document.getElementById('reviewWhitePlayer').textContent = gameInfo.white_username || 'White';
        document.getElementById('reviewBlackPlayer').textContent = gameInfo.black_username || (gameInfo.game_type === 'vs_ai' ? 'Computer' : 'Black');
        document.getElementById('reviewResult').textContent = formatResult(gameInfo.result, gameInfo.result_reason);
    } else {
        document.getElementById('reviewWhitePlayer').textContent = 'White';
        document.getElementById('reviewBlackPlayer').textContent = currentGameMode === GAME_MODES.VS_AI ? 'Computer' : 'Black';
        document.getElementById('reviewResult').textContent = formatLocalResult();
    }
    
    // Build move list
    updateReviewMoveList();
    
    // Show initial position
    reviewToPosition(0);
    
    document.getElementById('reviewModal').classList.add('active');
}

/**
 * Create review modal if it doesn't exist
 */
function createReviewModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'reviewModal';
    modal.innerHTML = `
        <div class="modal-content review-modal">
            <button class="modal-close" id="reviewModalClose">&times;</button>
            <h2>Game Review</h2>
            <div class="review-container">
                <div class="review-info">
                    <div class="review-players">
                        <span id="reviewWhitePlayer">White</span>
                        <span class="vs">vs</span>
                        <span id="reviewBlackPlayer">Black</span>
                    </div>
                    <div class="review-result" id="reviewResult"></div>
                </div>
                <div class="review-board" id="reviewBoard"></div>
                <div class="review-controls">
                    <button class="btn btn-outline" id="reviewFirst" title="First move">⏮</button>
                    <button class="btn btn-outline" id="reviewPrev" title="Previous move">◀</button>
                    <span class="review-position" id="reviewPosition">Start</span>
                    <button class="btn btn-outline" id="reviewNext" title="Next move">▶</button>
                    <button class="btn btn-outline" id="reviewLast" title="Last move">⏭</button>
                </div>
                <div class="review-moves" id="reviewMoveList"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('reviewModalClose').addEventListener('click', closeReviewModal);
    document.getElementById('reviewFirst').addEventListener('click', () => reviewToPosition(0));
    document.getElementById('reviewPrev').addEventListener('click', () => reviewToPosition(reviewCurrentIndex - 1));
    document.getElementById('reviewNext').addEventListener('click', () => reviewToPosition(reviewCurrentIndex + 1));
    document.getElementById('reviewLast').addEventListener('click', () => reviewToPosition(reviewPositions.length - 1));
    
    // Close on overlay click (with drag protection)
    let reviewModalMouseDownTarget = null;
    modal.addEventListener('mousedown', (e) => {
        reviewModalMouseDownTarget = e.target;
    });
    modal.addEventListener('mouseup', (e) => {
        if (reviewModalMouseDownTarget === modal && e.target === modal) {
            closeReviewModal();
        }
        reviewModalMouseDownTarget = null;
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', handleReviewKeydown);
}

/**
 * Handle keyboard navigation in review
 */
function handleReviewKeydown(e) {
    if (!reviewMode) return;
    
    switch (e.key) {
        case 'ArrowLeft':
            reviewToPosition(reviewCurrentIndex - 1);
            break;
        case 'ArrowRight':
            reviewToPosition(reviewCurrentIndex + 1);
            break;
        case 'Home':
            reviewToPosition(0);
            break;
        case 'End':
            reviewToPosition(reviewPositions.length - 1);
            break;
        case 'Escape':
            closeReviewModal();
            break;
    }
}

/**
 * Navigate to a specific position in review
 */
function reviewToPosition(index) {
    if (index < 0) index = 0;
    if (index >= reviewPositions.length) index = reviewPositions.length - 1;
    
    reviewCurrentIndex = index;
    
    // Render position on review board
    const reviewBoardEl = document.getElementById('reviewBoard');
    if (reviewBoardEl) {
        renderReviewBoard(reviewPositions[index], reviewBoardEl);
    }
    
    // Update position indicator
    const positionEl = document.getElementById('reviewPosition');
    if (positionEl) {
        if (index === 0) {
            positionEl.textContent = 'Start';
        } else {
            const moveNum = Math.ceil(index / 2);
            const color = index % 2 === 1 ? 'W' : 'B';
            positionEl.textContent = `${moveNum}. ${color}`;
        }
    }
    
    // Highlight current move in list
    const moveItems = document.querySelectorAll('.review-move-item');
    moveItems.forEach((item, i) => {
        item.classList.toggle('active', i + 1 === index);
    });
    
    // Highlight last move squares
    if (index > 0 && reviewMoves[index - 1]) {
        const lastMove = reviewMoves[index - 1];
        highlightReviewMove(lastMove.move_from || lastMove.from, lastMove.move_to || lastMove.to);
    }
}

/**
 * Render the review board
 */
function renderReviewBoard(position, container) {
    container.innerHTML = '';
    container.className = 'review-board chessboard';
    
    for (let rank = 7; rank >= 0; rank--) {
        for (let file = 0; file < 8; file++) {
            const square = Utils.toSquare(file, rank);
            const isLight = (file + rank) % 2 === 1;
            
            const squareEl = document.createElement('div');
            squareEl.className = `square ${isLight ? 'light' : 'dark'}`;
            squareEl.dataset.square = square;
            
            const piece = position[square];
            if (piece) {
                const pieceEl = document.createElement('div');
                pieceEl.className = `piece ${piece.color}`;
                pieceEl.textContent = Utils.getPieceSymbol(piece);
                squareEl.appendChild(pieceEl);
            }
            
            container.appendChild(squareEl);
        }
    }
}

/**
 * Highlight last move in review
 */
function highlightReviewMove(from, to) {
    const squares = document.querySelectorAll('#reviewBoard .square');
    squares.forEach(sq => sq.classList.remove('last-move-from', 'last-move-to'));
    
    const fromSq = document.querySelector(`#reviewBoard .square[data-square="${from}"]`);
    const toSq = document.querySelector(`#reviewBoard .square[data-square="${to}"]`);
    
    if (fromSq) fromSq.classList.add('last-move-from');
    if (toSq) toSq.classList.add('last-move-to');
}

/**
 * Update review move list
 */
function updateReviewMoveList() {
    const listEl = document.getElementById('reviewMoveList');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    for (let i = 0; i < reviewMoves.length; i++) {
        const move = reviewMoves[i];
        const notation = move.algebraic_notation || move.notation;
        const isWhite = (move.player_color || move.color) === 'white';
        
        if (isWhite) {
            const moveNum = Math.floor(i / 2) + 1;
            const rowEl = document.createElement('div');
            rowEl.className = 'review-move-row';
            rowEl.innerHTML = `<span class="move-number">${moveNum}.</span>`;
            listEl.appendChild(rowEl);
        }
        
        const rows = listEl.querySelectorAll('.review-move-row');
        const currentRow = rows[rows.length - 1];
        
        const moveEl = document.createElement('span');
        moveEl.className = 'review-move-item';
        moveEl.textContent = notation;
        moveEl.addEventListener('click', () => reviewToPosition(i + 1));
        currentRow.appendChild(moveEl);
    }
}

/**
 * Format game result for display
 */
function formatResult(result, reason) {
    const resultText = result === 'white_wins' ? '1-0' : 
                       result === 'black_wins' ? '0-1' : 
                       result === 'draw' ? '½-½' : '*';
    
    const reasonText = {
        'checkmate': 'Checkmate',
        'resignation': 'Resignation',
        'stalemate': 'Stalemate',
        'insufficient_material': 'Insufficient material',
        'fifty_move_rule': '50-move rule',
        'threefold_repetition': 'Threefold repetition',
        'agreement': 'Agreement',
        'timeout': 'Timeout'
    }[reason] || reason;
    
    return `${resultText} (${reasonText})`;
}

/**
 * Format local game result
 */
function formatLocalResult() {
    const state = game.gameState;
    if (state === GAME_STATES.CHECKMATE) {
        const winner = game.currentTurn === COLORS.WHITE ? '0-1' : '1-0';
        return `${winner} (Checkmate)`;
    } else if (state === GAME_STATES.STALEMATE) {
        return '½-½ (Stalemate)';
    } else if (state === GAME_STATES.DRAW) {
        return '½-½ (Draw)';
    } else if (state === GAME_STATES.RESIGNED) {
        const winner = game.currentTurn === game.playerColor ? '0-1' : '1-0';
        return `${winner} (Resignation)`;
    }
    return '*';
}

/**
 * Close review modal
 */
function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.classList.remove('active');
    }
    reviewMode = false;
    reviewMoves = [];
    reviewPositions = [];
    reviewCurrentIndex = -1;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// ========================
// Authentication Functions
// ========================

/**
 * Check for existing auth session
 */
async function checkAuthSession() {
    const user = await authManager.checkSession();
    if (user) {
        updateUIForLoggedInUser(user);
    }
}

/**
 * Setup auth event listeners
 */
function setupAuthEventListeners() {
    // Auth buttons
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Modal elements
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const editProfileModal = document.getElementById('editProfileModal');
    const changePasswordModal = document.getElementById('changePasswordModal');
    
    // Login button
    loginBtn?.addEventListener('click', () => showModal('loginModal'));
    
    // Register button
    registerBtn?.addEventListener('click', () => showModal('registerModal'));
    
    // Logout button
    logoutBtn?.addEventListener('click', handleLogout);
    
    // User dropdown toggle
    const userDropdownBtn = document.getElementById('userDropdownBtn');
    userDropdownBtn?.addEventListener('click', toggleDropdown);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
    
    // Modal close buttons
    document.getElementById('loginModalClose')?.addEventListener('click', () => hideModal('loginModal'));
    document.getElementById('registerModalClose')?.addEventListener('click', () => hideModal('registerModal'));
    document.getElementById('editProfileModalClose')?.addEventListener('click', () => hideModal('editProfileModal'));
    document.getElementById('changePasswordModalClose')?.addEventListener('click', () => hideModal('changePasswordModal'));
    document.getElementById('promotionModalClose')?.addEventListener('click', () => ui.hidePromotionModal());
    document.getElementById('gameOverModalClose')?.addEventListener('click', () => ui.hideGameOverModal());
    document.getElementById('drawOfferModalClose')?.addEventListener('click', () => ui.hideDrawOfferModal());
    
    // Switch between login and register
    document.getElementById('switchToRegister')?.addEventListener('click', (e) => {
        e.preventDefault();
        hideModal('loginModal');
        showModal('registerModal');
    });
    
    document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        hideModal('registerModal');
        showModal('loginModal');
    });
    
    // Login form submit
    document.getElementById('loginForm')?.addEventListener('submit', handleLoginSubmit);
    
    // Register form submit
    document.getElementById('registerForm')?.addEventListener('submit', handleRegisterSubmit);
    
    // Edit profile form submit
    document.getElementById('editProfileForm')?.addEventListener('submit', handleEditProfileSubmit);
    
    // Change password form submit
    document.getElementById('changePasswordForm')?.addEventListener('submit', handleChangePasswordSubmit);
    
    // Close modals when clicking outside
    // Track mousedown and mouseup to prevent closing on drag
    const setupModalOutsideClick = (modal) => {
        if (!modal) return;
        
        let mouseDownTarget = null;
        
        modal.addEventListener('mousedown', (e) => {
            mouseDownTarget = e.target;
        });
        
        modal.addEventListener('mouseup', (e) => {
            // Only close if both mousedown and mouseup happened on the modal backdrop
            if (mouseDownTarget === modal && e.target === modal) {
                modal.classList.remove('active');
            }
            mouseDownTarget = null;
        });
    };
    
    [loginModal, registerModal, editProfileModal, changePasswordModal].forEach(setupModalOutsideClick);
    
    // Listen for auth state changes
    authManager.onAuthChange((event, user) => {
        if (event === 'login') {
            updateUIForLoggedInUser(user);
        } else if (event === 'logout') {
            updateUIForGuest();
        }
    });
}

/**
 * Toggle user dropdown
 */
function toggleDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown?.classList.toggle('active');
}

/**
 * Hide user dropdown
 */
function hideDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown?.classList.remove('active');
}

/**
 * Show modal by ID
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Hide modal by ID
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        // Clear form errors
        const errors = modal.querySelectorAll('.error-message');
        errors.forEach(err => err.textContent = '');
        // Clear general error
        const generalError = modal.querySelector('.general-error');
        if (generalError) {
            generalError.textContent = '';
            generalError.classList.remove('visible');
        }
    }
}

/**
 * Handle login form submit
 */
async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('loginSubmitBtn');
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Clear previous errors
    clearFormErrors('loginForm');
    
    // Show loading
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    const result = await authManager.login(identifier, password, rememberMe);
    
    // Hide loading
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
    
    if (result.success) {
        hideModal('loginModal');
        document.getElementById('loginForm').reset();
    } else {
        showFormErrors('login', result.errors);
    }
}

/**
 * Handle register form submit
 */
async function handleRegisterSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('registerSubmitBtn');
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    // Clear previous errors
    clearFormErrors('registerForm');
    
    // Show loading
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    const result = await authManager.register(username, email, password, confirmPassword);
    
    // Hide loading
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
    
    if (result.success) {
        hideModal('registerModal');
        document.getElementById('registerForm').reset();
    } else {
        showFormErrors('register', result.errors);
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    hideDropdown();
    await authManager.logout();
}

/**
 * Handle edit profile submit
 */
async function handleEditProfileSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('editEmail').value.trim();
    
    if (!email) {
        showFormErrors('editProfile', { email: 'Email is required' });
        return;
    }
    
    const result = await authManager.updateProfile({ email });
    
    if (result.success) {
        hideModal('editProfileModal');
        alert('Profile updated successfully!');
    } else {
        showFormErrors('editProfile', result.errors);
    }
}

/**
 * Handle change password submit
 */
async function handleChangePasswordSubmit(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    clearFormErrors('changePasswordForm');
    
    if (newPassword !== confirmPassword) {
        showFormErrors('changePassword', { confirm_password: 'Passwords do not match' });
        return;
    }
    
    const result = await authManager.changePassword(currentPassword, newPassword, confirmPassword);
    
    if (result.success) {
        hideModal('changePasswordModal');
        document.getElementById('changePasswordForm').reset();
        alert('Password changed successfully!');
    } else {
        showFormErrors('changePassword', result.errors);
    }
}

/**
 * Clear form errors
 */
function clearFormErrors(formId) {
    const form = document.getElementById(formId);
    if (form) {
        const errors = form.querySelectorAll('.error-message');
        errors.forEach(err => err.textContent = '');
    }
}

/**
 * Show form errors
 */
function showFormErrors(prefix, errors) {
    if (!errors) return;
    
    for (const [field, message] of Object.entries(errors)) {
        if (field === 'general') {
            const generalError = document.getElementById(`${prefix}GeneralError`);
            if (generalError) {
                generalError.textContent = message;
                generalError.classList.add('visible');
            }
        } else {
            // Map field names
            let fieldId = field;
            if (field === 'identifier') fieldId = 'Identifier';
            else if (field === 'confirm_password') fieldId = 'ConfirmPassword';
            else if (field === 'current_password') fieldId = 'currentPassword';
            else if (field === 'new_password') fieldId = 'newPassword';
            else fieldId = field.charAt(0).toUpperCase() + field.slice(1);
            
            const errorEl = document.getElementById(`${prefix}${fieldId}Error`);
            if (errorEl) {
                errorEl.textContent = message;
            }
        }
    }
}

/**
 * Update UI for logged in user
 */
function updateUIForLoggedInUser(user) {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const headerUsername = document.getElementById('headerUsername');
    const headerRating = document.getElementById('headerRating');
    const headerAvatar = document.getElementById('userAvatar');
    const playerName = document.querySelector('.player-info.bottom .player-name');
    const playerRating = document.querySelector('.player-info.bottom .player-rating');
    const playerAvatar = document.querySelector('.player-info.bottom .player-avatar');
    
    // Hide login/register buttons
    if (authButtons) authButtons.style.display = 'none';
    
    // Show user info
    if (userInfo) userInfo.style.display = 'flex';
    
    // Update header
    if (headerUsername) headerUsername.textContent = user.username;
    if (headerRating) headerRating.textContent = `ELO: ${user.elo_rating || 1200}`;
    
    // Update header avatar
    if (headerAvatar) {
        if (user.avatar) {
            headerAvatar.innerHTML = `<img src="${user.avatar}" alt="Avatar">`;
        } else {
            headerAvatar.innerHTML = '👤';
        }
    }
    
    // Update player info on board
    if (playerName) playerName.textContent = user.username;
    if (playerRating) playerRating.textContent = `ELO: ${user.elo_rating || 1200}`;
    
    // Update player avatar on board
    if (playerAvatar) {
        if (user.avatar) {
            playerAvatar.innerHTML = `<img src="${user.avatar}" alt="Avatar">`;
        } else {
            playerAvatar.innerHTML = '👤';
        }
    }
}

/**
 * Update UI for guest
 */
function updateUIForGuest() {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const playerName = document.querySelector('.player-info.bottom .player-name');
    const playerRating = document.querySelector('.player-info.bottom .player-rating');
    
    // Show login/register buttons
    if (authButtons) authButtons.style.display = 'flex';
    
    // Hide user info
    if (userInfo) userInfo.style.display = 'none';
    
    // Reset player info on board
    if (playerName) playerName.textContent = 'You';
    if (playerRating) playerRating.textContent = 'Guest';
}

// ============================================
// Roguelike Mode Functions
// ============================================

/**
 * Start roguelike mode - show dashboard first
 */
async function startRoguelikeRun() {
    // Check authentication
    if (!isAuthenticated) {
        auth.showModal('login');
        ui.updateStatus('Please login to play Roguelike mode', 'warning');
        return;
    }
    
    console.log('[Roguelike] Opening dashboard...');
    
    try {
        // Fetch player stats for dashboard
        const response = await fetch('php/roguelike/get-stats.php', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        let stats = { totalRuns: 0, victories: 0, highestZone: 0 };
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                stats = {
                    totalRuns: result.data.total_runs || 0,
                    victories: result.data.total_victories || 0,
                    highestZone: result.data.highest_zone_reached || 0
                };
            }
        }
        
        // Show dashboard with start callback
        ui.showRoguelikeDashboard(stats, initializeRoguelikeRun);
        
    } catch (error) {
        console.error('[Roguelike] Error loading stats:', error);
        // Show dashboard anyway with default stats
        ui.showRoguelikeDashboard({ totalRuns: 0, victories: 0, highestZone: 0 }, initializeRoguelikeRun);
    }
}

/**
 * Initialize a new roguelike run after dashboard
 */
async function initializeRoguelikeRun() {
    console.log('[Roguelike] Initializing new run...');
    
    try {
        // Call backend to create run
        const response = await fetch('php/roguelike/start-run.php', {
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
        game.currentZone = result.data.currentZone || 1;
        game.currentEncounter = result.data.currentEncounter || 1;
        game.gold = result.data.gold || 0;
        game.pieceUpgrades = {};
        game.artifacts = [];
        
        // Setup callbacks
        game.onGameOver = handleRoguelikeGameOver;
        
        // Set game mode and start first encounter
        currentGameMode = GAME_MODES.ROGUELIKE;
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
    
    // Ensure game mode is set correctly
    currentGameMode = GAME_MODES.ROGUELIKE;
    
    // Show HUD
    ui.toggleRoguelikeHUD(true);
    ui.updateRoguelikeHUD({
        zone: game.currentZone,
        encounter: game.currentEncounter,
        gold: game.gold,
        pieceUpgrades: game.pieceUpgrades,
        artifacts: game.artifacts
    });
    
    // Use the standard startNewGame() method with roguelike mode set
    startNewGame();
    
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
        
        // Generate upgrade options (for MVP, use same upgrades)
        const availableUpgrades = [
            ROGUELIKE_UPGRADES.SCHILDTRAEGER,
            ROGUELIKE_UPGRADES.ZEITUMKEHR
        ];
        
        // Randomly pick 2 upgrades
        const upgradeOptions = [];
        const upgradePool = [...availableUpgrades];
        for (let i = 0; i < Math.min(2, upgradePool.length); i++) {
            const index = Math.floor(Math.random() * upgradePool.length);
            upgradeOptions.push(upgradePool.splice(index, 1)[0]);
        }
        
        // Show upgrade selection modal
        ui.showUpgradeModal(upgradeOptions, async (selectedUpgrade) => {
            console.log('[Roguelike] Player selected:', selectedUpgrade.name);
            
            if (selectedUpgrade.type === 'piece_stat' || selectedUpgrade.type === 'ability') {
                // ============================================
                // Piece Upgrade - Let player select which piece
                // ============================================
                ui.updateStatus(`Click a ${selectedUpgrade.targetPiece} to upgrade`, 'highlight');
                
                // Temporarily override square click handler with error handling
                const originalHandler = board.onSquareClick;
                const restoreHandler = () => {
                    board.onSquareClick = originalHandler;
                };
                
                board.onSquareClick = (square) => {
                    try {
                        const piece = game.position[square];
                        
                        if (piece && piece.type === selectedUpgrade.targetPiece && piece.color === game.playerColor) {
                            // Valid selection
                            const success = game.applyUpgrade(selectedUpgrade.id, square);
                            
                            if (success) {
                                ui.updateStatus(`${selectedUpgrade.name} applied to ${square}!`, 'success');
                                restoreHandler();  // Restore handler
                                
                                // Visual feedback
                                board.highlightSquare(square, 'selected');
                                setTimeout(() => {
                                    board.clearHighlights();
                                    proceedToNextEncounter();
                                }, 1500);
                            } else {
                                ui.updateStatus('Failed to apply upgrade', 'error');
                                restoreHandler();  // Restore handler even on failure
                            }
                        } else {
                            ui.updateStatus(`Select a ${selectedUpgrade.targetPiece}`, 'warning');
                        }
                    } catch (error) {
                        console.error('[Roguelike] Error applying upgrade:', error);
                        ui.updateStatus('Error applying upgrade', 'error');
                        restoreHandler();  // Always restore handler
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
    
    // Update HUD before starting next encounter
    ui.updateRoguelikeHUD({
        zone: game.currentZone,
        encounter: game.currentEncounter,
        gold: game.gold,
        pieceUpgrades: game.pieceUpgrades,
        artifacts: game.artifacts
    });
    
    // Start next encounter
    setTimeout(() => startRoguelikeEncounter(), 1500);
}

/**
 * End the roguelike run (save to database)
 */
async function endRoguelikeRun(victory) {
    console.log(`[Roguelike] Ending run - Victory: ${victory}`);
    
    try {
        const response = await fetch('php/roguelike/end-run.php', {
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
        
        // Prepare result data for modal
        const gameOverData = {
            victory: victory,
            zone: game.currentZone,
            gold: game.gold,
            score: result.data?.score || 0,
            message: victory 
                ? `🎉 You completed all ${game.maxZones} zones!` 
                : `You were defeated in Zone ${game.currentZone}.`
        };
        
        // Show roguelike-specific game over modal
        ui.showRoguelikeGameOver(
            gameOverData,
            () => {
                // New run callback
                game.roguelikeMode = false;
                startRoguelikeRun();
            },
            () => {
                // Dashboard callback
                game.roguelikeMode = false;
                startRoguelikeRun();
            }
        );
        
    } catch (error) {
        console.error('[Roguelike] Error ending run:', error);
        ui.updateStatus('Failed to save run results', 'error');
    }
}
