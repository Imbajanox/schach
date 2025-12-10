/**
 * Chess AI Engine
 * Implements minimax with alpha-beta pruning, position evaluation, and opening book
 * Schach - Chess Game
 */

class ChessAI {
    constructor() {
        this.maxDepth = 3;
        this.nodesEvaluated = 0;
        this.thinkingStartTime = 0;
        this.isThinking = false;
        this.searchAborted = false;
        this.maxThinkTime = 5000; // Max 5 seconds for thinking
        
        // Callbacks
        this.onThinkingStart = null;
        this.onThinkingEnd = null;
        this.onThinkingProgress = null;
        
        // Transposition table for caching
        this.transpositionTable = new Map();
        this.maxTableSize = 50000;
        
        // Killer moves (quiet moves that caused beta cutoff)
        this.killerMoves = [];
        for (let i = 0; i < 20; i++) {
            this.killerMoves[i] = [null, null];
        }
        
        // History heuristic table
        this.historyTable = {};
        
        // Piece-square tables for positional evaluation
        this.initPieceSquareTables();
        
        // Opening book
        this.initOpeningBook();
    }
    
    /**
     * Initialize piece-square tables for positional evaluation
     * Values encourage good piece placement
     */
    initPieceSquareTables() {
        // Pawn table - encourage center pawns and advancement
        this.pawnTable = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [5,  5, 10, 25, 25, 10,  5,  5],
            [0,  0,  0, 20, 20,  0,  0,  0],
            [5, -5,-10,  0,  0,-10, -5,  5],
            [5, 10, 10,-20,-20, 10, 10,  5],
            [0,  0,  0,  0,  0,  0,  0,  0]
        ];
        
        // Knight table - encourage center and avoid edges
        this.knightTable = [
            [-50,-40,-30,-30,-30,-30,-40,-50],
            [-40,-20,  0,  0,  0,  0,-20,-40],
            [-30,  0, 10, 15, 15, 10,  0,-30],
            [-30,  5, 15, 20, 20, 15,  5,-30],
            [-30,  0, 15, 20, 20, 15,  0,-30],
            [-30,  5, 10, 15, 15, 10,  5,-30],
            [-40,-20,  0,  5,  5,  0,-20,-40],
            [-50,-40,-30,-30,-30,-30,-40,-50]
        ];
        
        // Bishop table - encourage diagonals and avoid corners
        this.bishopTable = [
            [-20,-10,-10,-10,-10,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5, 10, 10,  5,  0,-10],
            [-10,  5,  5, 10, 10,  5,  5,-10],
            [-10,  0, 10, 10, 10, 10,  0,-10],
            [-10, 10, 10, 10, 10, 10, 10,-10],
            [-10,  5,  0,  0,  0,  0,  5,-10],
            [-20,-10,-10,-10,-10,-10,-10,-20]
        ];
        
        // Rook table - encourage 7th rank and open files
        this.rookTable = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [5, 10, 10, 10, 10, 10, 10,  5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [0,  0,  0,  5,  5,  0,  0,  0]
        ];
        
        // Queen table - encourage center but not early development
        this.queenTable = [
            [-20,-10,-10, -5, -5,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5,  5,  5,  5,  0,-10],
            [-5,  0,  5,  5,  5,  5,  0, -5],
            [0,  0,  5,  5,  5,  5,  0, -5],
            [-10,  5,  5,  5,  5,  5,  0,-10],
            [-10,  0,  5,  0,  0,  0,  0,-10],
            [-20,-10,-10, -5, -5,-10,-10,-20]
        ];
        
        // King middle game - encourage castling, avoid center
        this.kingMiddleTable = [
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-20,-30,-30,-40,-40,-30,-30,-20],
            [-10,-20,-20,-20,-20,-20,-20,-10],
            [20, 20,  0,  0,  0,  0, 20, 20],
            [20, 30, 10,  0,  0, 10, 30, 20]
        ];
        
        // King end game - encourage center
        this.kingEndTable = [
            [-50,-40,-30,-20,-20,-30,-40,-50],
            [-30,-20,-10,  0,  0,-10,-20,-30],
            [-30,-10, 20, 30, 30, 20,-10,-30],
            [-30,-10, 30, 40, 40, 30,-10,-30],
            [-30,-10, 30, 40, 40, 30,-10,-30],
            [-30,-10, 20, 30, 30, 20,-10,-30],
            [-30,-30,  0,  0,  0,  0,-30,-30],
            [-50,-30,-30,-30,-30,-30,-30,-50]
        ];
    }
    
    /**
     * Initialize opening book with common chess openings
     */
    initOpeningBook() {
        this.openingBook = {
            // Starting position
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': [
                { from: 'e2', to: 'e4', weight: 40 },  // King's Pawn
                { from: 'd2', to: 'd4', weight: 35 },  // Queen's Pawn
                { from: 'c2', to: 'c4', weight: 15 },  // English
                { from: 'g1', to: 'f3', weight: 10 }   // Reti
            ],
            
            // After 1. e4
            'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': [
                { from: 'e7', to: 'e5', weight: 35 },  // Open Game
                { from: 'c7', to: 'c5', weight: 30 },  // Sicilian
                { from: 'e7', to: 'e6', weight: 20 },  // French
                { from: 'c7', to: 'c6', weight: 15 }   // Caro-Kann
            ],
            
            // After 1. e4 e5
            'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
                { from: 'g1', to: 'f3', weight: 60 },  // King's Knight
                { from: 'f1', to: 'c4', weight: 25 },  // Bishop's Opening
                { from: 'f2', to: 'f4', weight: 15 }   // King's Gambit
            ],
            
            // After 1. e4 e5 2. Nf3
            'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': [
                { from: 'b8', to: 'c6', weight: 70 },  // Knight defense
                { from: 'g8', to: 'f6', weight: 20 },  // Petrov
                { from: 'd7', to: 'd6', weight: 10 }   // Philidor
            ],
            
            // Italian Game setup
            'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': [
                { from: 'f1', to: 'c4', weight: 50 },  // Italian
                { from: 'f1', to: 'b5', weight: 40 },  // Ruy Lopez
                { from: 'd2', to: 'd4', weight: 10 }   // Scotch
            ],
            
            // After 1. d4
            'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -': [
                { from: 'd7', to: 'd5', weight: 40 },  // Queen's Pawn Game
                { from: 'g8', to: 'f6', weight: 35 },  // Indian Defense
                { from: 'e7', to: 'e6', weight: 15 },  // Dutch-like
                { from: 'f7', to: 'f5', weight: 10 }   // Dutch
            ],
            
            // After 1. d4 d5
            'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': [
                { from: 'c2', to: 'c4', weight: 60 },  // Queen's Gambit
                { from: 'g1', to: 'f3', weight: 25 },  // Colle
                { from: 'c1', to: 'f4', weight: 15 }   // London
            ],
            
            // After 1. d4 Nf6
            'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': [
                { from: 'c2', to: 'c4', weight: 50 },  // Main line
                { from: 'g1', to: 'f3', weight: 30 },  // Indian systems
                { from: 'c1', to: 'f4', weight: 20 }   // London
            ],
            
            // Sicilian - Open
            'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': [
                { from: 'g1', to: 'f3', weight: 50 },  // Open Sicilian
                { from: 'b1', to: 'c3', weight: 25 },  // Closed Sicilian
                { from: 'c2', to: 'c3', weight: 25 }   // Alapin
            ]
        };
    }
    
    /**
     * Get best move using AI
     */
    async getBestMove(position, color, gameState, difficulty = 'medium') {
        this.isThinking = true;
        this.searchAborted = false;
        this.thinkingStartTime = Date.now();
        this.nodesEvaluated = 0;
        
        // Reset killer moves
        for (let i = 0; i < 20; i++) {
            this.killerMoves[i] = [null, null];
        }
        
        if (this.onThinkingStart) {
            this.onThinkingStart();
        }
        
        // Set depth and time limit based on difficulty
        switch (difficulty) {
            case AI_DIFFICULTIES.EASY:
                this.maxDepth = 2;
                this.maxThinkTime = 1000;
                break;
            case AI_DIFFICULTIES.MEDIUM:
                this.maxDepth = 3;
                this.maxThinkTime = 3000;
                break;
            case AI_DIFFICULTIES.HARD:
                this.maxDepth = 4;
                this.maxThinkTime = 5000;
                break;
            default:
                this.maxDepth = 3;
                this.maxThinkTime = 3000;
        }
        
        let bestMove = null;
        
        // Try opening book first
        const bookMove = this.getBookMove(position, color, gameState);
        if (bookMove) {
            bestMove = bookMove;
        } else {
            // Use iterative deepening with alpha-beta
            bestMove = await this.iterativeDeepening(position, color, gameState, difficulty);
        }
        
        const thinkingTime = Date.now() - this.thinkingStartTime;
        this.isThinking = false;
        
        if (this.onThinkingEnd) {
            this.onThinkingEnd({
                move: bestMove,
                nodesEvaluated: this.nodesEvaluated,
                thinkingTime
            });
        }
        
        // Add minimum thinking time for realism
        const minThinkTime = difficulty === AI_DIFFICULTIES.EASY ? 200 : 
                             difficulty === AI_DIFFICULTIES.MEDIUM ? 300 : 500;
        if (thinkingTime < minThinkTime) {
            await this.delay(minThinkTime - thinkingTime);
        }
        
        return bestMove;
    }
    
    /**
     * Get a move from the opening book if available
     */
    getBookMove(position, color, gameState) {
        const fen = Utils.toFEN(position, color, gameState.castlingRights, gameState.enPassantSquare, 0, 1);
        const fenKey = fen.split(' ').slice(0, 4).join(' ');
        
        const bookMoves = this.openingBook[fenKey];
        if (!bookMoves || bookMoves.length === 0) {
            return null;
        }
        
        // Weight-based random selection
        const totalWeight = bookMoves.reduce((sum, m) => sum + m.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const bookMove of bookMoves) {
            random -= bookMove.weight;
            if (random <= 0) {
                // Validate the move is legal
                const legalMoves = Pieces.getAllLegalMoves(position, color, gameState);
                const validMove = legalMoves.find(m => 
                    m.from === bookMove.from && m.to === bookMove.to
                );
                if (validMove) {
                    return validMove;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Iterative deepening search - finds best move at each depth
     */
    async iterativeDeepening(position, color, gameState, difficulty) {
        const legalMoves = Pieces.getAllLegalMoves(position, color, gameState);
        
        if (legalMoves.length === 0) {
            return null;
        }
        
        if (legalMoves.length === 1) {
            return legalMoves[0];
        }
        
        // Order moves for better pruning
        this.orderMoves(legalMoves, position, false, 0);
        
        let bestMove = legalMoves[0];
        let bestScore = -Infinity;
        
        // Iterative deepening
        for (let depth = 1; depth <= this.maxDepth; depth++) {
            // Check time limit
            if (Date.now() - this.thinkingStartTime > this.maxThinkTime) {
                break;
            }
            
            let currentBestMove = null;
            let currentBestScore = -Infinity;
            let alpha = -Infinity;
            const beta = Infinity;
            
            for (const move of legalMoves) {
                // Check time limit during search
                if (Date.now() - this.thinkingStartTime > this.maxThinkTime) {
                    this.searchAborted = true;
                    break;
                }
                
                const result = Pieces.makeMove(position, move.from, move, gameState);
                const newGameState = {
                    ...gameState,
                    enPassantSquare: result.enPassantSquare
                };
                
                const score = -this.alphaBeta(
                    result.position, 
                    Utils.oppositeColor(color), 
                    newGameState,
                    depth - 1, 
                    -beta, 
                    -alpha
                );
                
                if (score > currentBestScore) {
                    currentBestScore = score;
                    currentBestMove = move;
                }
                
                alpha = Math.max(alpha, score);
            }
            
            // Only update best move if search completed at this depth
            if (!this.searchAborted && currentBestMove) {
                bestMove = currentBestMove;
                bestScore = currentBestScore;
                
                // Reorder moves: put best move first for next iteration
                const bestIndex = legalMoves.indexOf(currentBestMove);
                if (bestIndex > 0) {
                    legalMoves.splice(bestIndex, 1);
                    legalMoves.unshift(currentBestMove);
                }
            }
            
            // Allow UI update between depths
            await this.delay(0);
        }
        
        // Add some randomness on easy mode
        if (difficulty === AI_DIFFICULTIES.EASY && Math.random() < 0.3) {
            const randomIndex = Math.floor(Math.random() * Math.min(3, legalMoves.length));
            return legalMoves[randomIndex];
        }
        
        return bestMove;
    }
    
    /**
     * Alpha-beta pruning search with optimizations
     */
    alphaBeta(position, color, gameState, depth, alpha, beta) {
        // Time check every 1000 nodes
        if (this.nodesEvaluated % 1000 === 0) {
            if (Date.now() - this.thinkingStartTime > this.maxThinkTime) {
                this.searchAborted = true;
                return 0;
            }
        }
        
        if (this.searchAborted) {
            return 0;
        }
        
        this.nodesEvaluated++;
        
        // Check transposition table
        const posKey = this.getPositionKey(position, color);
        const cached = this.transpositionTable.get(posKey);
        if (cached && cached.depth >= depth) {
            if (cached.flag === 'exact') return cached.score;
            if (cached.flag === 'lower' && cached.score > alpha) alpha = cached.score;
            if (cached.flag === 'upper' && cached.score < beta) beta = cached.score;
            if (alpha >= beta) return cached.score;
        }
        
        // Terminal node check - use quick check detection first
        const isInCheck = Pieces.isInCheck(position, color);
        const legalMoves = Pieces.getAllLegalMoves(position, color, gameState);
        
        if (legalMoves.length === 0) {
            if (isInCheck) {
                return -100000 + (this.maxDepth - depth); // Checkmate
            }
            return 0; // Stalemate
        }
        
        if (depth === 0) {
            return this.quiescenceSearch(position, color, gameState, alpha, beta, 2);
        }
        
        // Order moves for better pruning
        this.orderMoves(legalMoves, position, false, depth);
        
        let bestScore = -Infinity;
        let bestMove = null;
        let flag = 'upper';
        
        for (let i = 0; i < legalMoves.length; i++) {
            const move = legalMoves[i];
            const result = Pieces.makeMove(position, move.from, move, gameState);
            const newGameState = {
                ...gameState,
                enPassantSquare: result.enPassantSquare
            };
            
            let score;
            
            // Late Move Reduction: search later moves at reduced depth
            if (i >= 4 && depth >= 3 && !move.capture && !isInCheck) {
                // Search with reduced depth first
                score = -this.alphaBeta(
                    result.position, 
                    Utils.oppositeColor(color), 
                    newGameState,
                    depth - 2, 
                    -beta, 
                    -alpha
                );
                
                // Re-search at full depth if it looks promising
                if (score > alpha) {
                    score = -this.alphaBeta(
                        result.position, 
                        Utils.oppositeColor(color), 
                        newGameState,
                        depth - 1, 
                        -beta, 
                        -alpha
                    );
                }
            } else {
                score = -this.alphaBeta(
                    result.position, 
                    Utils.oppositeColor(color), 
                    newGameState,
                    depth - 1, 
                    -beta, 
                    -alpha
                );
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
            
            if (score > alpha) {
                alpha = score;
                flag = 'exact';
            }
            
            if (alpha >= beta) {
                // Store killer move for move ordering
                if (!move.capture && depth < 20) {
                    this.killerMoves[depth][1] = this.killerMoves[depth][0];
                    this.killerMoves[depth][0] = move;
                }
                flag = 'lower';
                break;
            }
        }
        
        // Store in transposition table
        if (this.transpositionTable.size < this.maxTableSize && !this.searchAborted) {
            this.transpositionTable.set(posKey, { score: bestScore, depth, flag, bestMove });
        }
        
        return bestScore;
    }
    
    /**
     * Quiescence search - search only captures to avoid horizon effect
     */
    quiescenceSearch(position, color, gameState, alpha, beta, depth) {
        if (this.searchAborted) return 0;
        
        this.nodesEvaluated++;
        
        const standPat = this.evaluatePositionFast(position, color);
        
        if (depth === 0) {
            return standPat;
        }
        
        if (standPat >= beta) {
            return beta;
        }
        
        // Delta pruning: if we're way behind, don't bother searching captures
        const DELTA = 900; // Queen value
        if (standPat + DELTA < alpha) {
            return alpha;
        }
        
        if (alpha < standPat) {
            alpha = standPat;
        }
        
        // Get only capture moves
        const allMoves = Pieces.getAllLegalMoves(position, color, gameState);
        const captures = allMoves.filter(m => m.capture);
        
        if (captures.length === 0) {
            return standPat;
        }
        
        // Order captures by MVV-LVA
        this.orderMoves(captures, position, true, 0);
        
        for (const move of captures) {
            // SEE pruning: skip captures that are likely bad
            const capturedPiece = position[move.to];
            const attackingPiece = position[move.from];
            if (capturedPiece && attackingPiece) {
                const gain = this.getPieceValue(capturedPiece.type);
                // Skip if capturing a low value piece with a high value one (likely bad)
                if (gain < this.getPieceValue(attackingPiece.type) - 200 && standPat + gain < alpha) {
                    continue;
                }
            }
            
            const result = Pieces.makeMove(position, move.from, move, gameState);
            const score = -this.quiescenceSearch(
                result.position,
                Utils.oppositeColor(color),
                gameState,
                -beta,
                -alpha,
                depth - 1
            );
            
            if (score >= beta) {
                return beta;
            }
            
            if (score > alpha) {
                alpha = score;
            }
        }
        
        return alpha;
    }
    
    /**
     * Order moves for better alpha-beta pruning
     * MVV-LVA: Most Valuable Victim - Least Valuable Attacker
     */
    orderMoves(moves, position, capturesOnly = false, depth = 0) {
        const pieceValues = {
            [PIECE_TYPES.QUEEN]: 900,
            [PIECE_TYPES.ROOK]: 500,
            [PIECE_TYPES.BISHOP]: 330,
            [PIECE_TYPES.KNIGHT]: 320,
            [PIECE_TYPES.PAWN]: 100,
            [PIECE_TYPES.KING]: 20000
        };
        
        const killer1 = depth < 20 ? this.killerMoves[depth][0] : null;
        const killer2 = depth < 20 ? this.killerMoves[depth][1] : null;
        
        moves.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;
            
            // Captures first (MVV-LVA)
            if (a.capture) {
                const victimA = position[a.to];
                const attackerA = position[a.from];
                if (victimA && attackerA) {
                    scoreA += 10000 + pieceValues[victimA.type] * 10 - pieceValues[attackerA.type];
                }
            }
            
            if (b.capture) {
                const victimB = position[b.to];
                const attackerB = position[b.from];
                if (victimB && attackerB) {
                    scoreB += 10000 + pieceValues[victimB.type] * 10 - pieceValues[attackerB.type];
                }
            }
            
            // Promotions (very high priority)
            if (a.promotion) scoreA += 9000 + pieceValues[a.promotion];
            if (b.promotion) scoreB += 9000 + pieceValues[b.promotion];
            
            // Killer moves (moves that caused cutoff at same depth)
            if (!a.capture && killer1 && a.from === killer1.from && a.to === killer1.to) scoreA += 8000;
            if (!a.capture && killer2 && a.from === killer2.from && a.to === killer2.to) scoreA += 7000;
            if (!b.capture && killer1 && b.from === killer1.from && b.to === killer1.to) scoreB += 8000;
            if (!b.capture && killer2 && b.from === killer2.from && b.to === killer2.to) scoreB += 7000;
            
            // Center control for non-captures
            if (!capturesOnly && !a.capture && !b.capture) {
                const centerSquares = ['d4', 'd5', 'e4', 'e5'];
                if (centerSquares.includes(a.to)) scoreA += 50;
                if (centerSquares.includes(b.to)) scoreB += 50;
            }
            
            return scoreB - scoreA;
        });
    }
    
    /**
     * Evaluate position score for a color
     */
    evaluatePosition(position, color) {
        let score = 0;
        
        // Count material and piece-square bonuses
        const pieces = { white: [], black: [] };
        let totalMaterial = 0;
        
        for (const [square, piece] of Object.entries(position)) {
            const file = Utils.fileToIndex(square[0]);
            const rank = Utils.rankToIndex(square[1]);
            
            // Material value
            let pieceValue = this.getPieceValue(piece.type);
            totalMaterial += pieceValue;
            
            // Piece-square table bonus
            pieceValue += this.getPieceSquareBonus(piece, file, rank, totalMaterial);
            
            if (piece.color === color) {
                score += pieceValue;
            } else {
                score -= pieceValue;
            }
            
            pieces[piece.color].push({ piece, square, file, rank });
        }
        
        // Pawn structure evaluation
        score += this.evaluatePawnStructure(position, color, pieces);
        
        // King safety
        score += this.evaluateKingSafety(position, color, pieces);
        
        // Mobility
        score += this.evaluateMobility(position, color) * 10;
        
        // Bishop pair bonus
        const colorBishops = pieces[color].filter(p => p.piece.type === PIECE_TYPES.BISHOP);
        if (colorBishops.length >= 2) {
            score += 50;
        }
        
        // Rook on open file bonus
        score += this.evaluateRookPlacement(position, color, pieces);
        
        return score;
    }
    
    /**
     * Get base piece value
     */
    getPieceValue(type) {
        const values = {
            [PIECE_TYPES.PAWN]: 100,
            [PIECE_TYPES.KNIGHT]: 320,
            [PIECE_TYPES.BISHOP]: 330,
            [PIECE_TYPES.ROOK]: 500,
            [PIECE_TYPES.QUEEN]: 900,
            [PIECE_TYPES.KING]: 20000
        };
        return values[type] || 0;
    }
    
    /**
     * Get piece-square bonus
     */
    getPieceSquareBonus(piece, file, rank, totalMaterial) {
        let table;
        
        // Flip rank for black pieces
        const r = piece.color === COLORS.WHITE ? 7 - rank : rank;
        const f = piece.color === COLORS.WHITE ? file : 7 - file;
        
        switch (piece.type) {
            case PIECE_TYPES.PAWN:
                table = this.pawnTable;
                break;
            case PIECE_TYPES.KNIGHT:
                table = this.knightTable;
                break;
            case PIECE_TYPES.BISHOP:
                table = this.bishopTable;
                break;
            case PIECE_TYPES.ROOK:
                table = this.rookTable;
                break;
            case PIECE_TYPES.QUEEN:
                table = this.queenTable;
                break;
            case PIECE_TYPES.KING:
                // Use endgame table if material is low
                table = totalMaterial < 3000 ? this.kingEndTable : this.kingMiddleTable;
                break;
            default:
                return 0;
        }
        
        return table[r][f];
    }
    
    /**
     * Evaluate pawn structure
     */
    evaluatePawnStructure(position, color, pieces) {
        let score = 0;
        const pawns = pieces[color].filter(p => p.piece.type === PIECE_TYPES.PAWN);
        const opponentPawns = pieces[Utils.oppositeColor(color)]
            .filter(p => p.piece.type === PIECE_TYPES.PAWN);
        
        // Check for doubled pawns
        const fileCount = {};
        for (const p of pawns) {
            fileCount[p.file] = (fileCount[p.file] || 0) + 1;
        }
        for (const file in fileCount) {
            if (fileCount[file] > 1) {
                score -= 20 * (fileCount[file] - 1); // Penalty for doubled pawns
            }
        }
        
        // Check for isolated pawns
        for (const p of pawns) {
            const hasNeighbor = pawns.some(other => 
                Math.abs(other.file - p.file) === 1
            );
            if (!hasNeighbor) {
                score -= 15; // Penalty for isolated pawn
            }
        }
        
        // Passed pawns bonus
        for (const p of pawns) {
            const direction = color === COLORS.WHITE ? 1 : -1;
            const isPassedPawn = !opponentPawns.some(op => {
                return Math.abs(op.file - p.file) <= 1 && 
                       (color === COLORS.WHITE ? op.rank > p.rank : op.rank < p.rank);
            });
            
            if (isPassedPawn) {
                // Bonus increases as pawn advances
                const advancement = color === COLORS.WHITE ? p.rank : 7 - p.rank;
                score += 20 + advancement * 10;
            }
        }
        
        return score;
    }
    
    /**
     * Evaluate king safety
     */
    evaluateKingSafety(position, color, pieces) {
        let score = 0;
        
        const king = pieces[color].find(p => p.piece.type === PIECE_TYPES.KING);
        if (!king) return 0;
        
        // Pawn shield bonus for castled king
        const pawns = pieces[color].filter(p => p.piece.type === PIECE_TYPES.PAWN);
        
        if (color === COLORS.WHITE) {
            // Kingside castle position
            if (king.file >= 5) {
                for (const pawn of pawns) {
                    if (pawn.file >= 5 && pawn.file <= 7 && pawn.rank === 1) {
                        score += 15; // Pawn shield bonus
                    }
                }
            }
            // Queenside castle position
            if (king.file <= 2) {
                for (const pawn of pawns) {
                    if (pawn.file >= 0 && pawn.file <= 2 && pawn.rank === 1) {
                        score += 15;
                    }
                }
            }
        } else {
            // Similar for black
            if (king.file >= 5) {
                for (const pawn of pawns) {
                    if (pawn.file >= 5 && pawn.file <= 7 && pawn.rank === 6) {
                        score += 15;
                    }
                }
            }
            if (king.file <= 2) {
                for (const pawn of pawns) {
                    if (pawn.file >= 0 && pawn.file <= 2 && pawn.rank === 6) {
                        score += 15;
                    }
                }
            }
        }
        
        // Penalty for king in center during middlegame
        if (king.file >= 2 && king.file <= 5 && 
            (color === COLORS.WHITE ? king.rank === 0 : king.rank === 7)) {
            score -= 30;
        }
        
        return score;
    }
    
    /**
     * Evaluate mobility (number of legal moves)
     */
    evaluateMobility(position, color) {
        const moves = Pieces.getAllLegalMoves(position, color, {
            castlingRights: 'KQkq',
            enPassantSquare: null
        });
        
        const opponentMoves = Pieces.getAllLegalMoves(position, Utils.oppositeColor(color), {
            castlingRights: 'KQkq',
            enPassantSquare: null
        });
        
        return moves.length - opponentMoves.length;
    }
    
    /**
     * Evaluate rook placement
     */
    evaluateRookPlacement(position, color, pieces) {
        let score = 0;
        const rooks = pieces[color].filter(p => p.piece.type === PIECE_TYPES.ROOK);
        const allPawns = [
            ...pieces[COLORS.WHITE].filter(p => p.piece.type === PIECE_TYPES.PAWN),
            ...pieces[COLORS.BLACK].filter(p => p.piece.type === PIECE_TYPES.PAWN)
        ];
        
        for (const rook of rooks) {
            // Check if file is open (no pawns)
            const pawnsOnFile = allPawns.filter(p => p.file === rook.file);
            
            if (pawnsOnFile.length === 0) {
                score += 25; // Open file bonus
            } else if (!pawnsOnFile.some(p => p.piece.color === color)) {
                score += 15; // Semi-open file bonus
            }
            
            // 7th rank bonus
            if ((color === COLORS.WHITE && rook.rank === 6) ||
                (color === COLORS.BLACK && rook.rank === 1)) {
                score += 30;
            }
        }
        
        return score;
    }
    
    /**
     * Get hint (best move for player) - uses accurate settings
     */
    async getHint(position, color, gameState) {
        this.isThinking = true;
        this.searchAborted = false;
        this.thinkingStartTime = Date.now();
        this.nodesEvaluated = 0;
        
        // Reset killer moves
        for (let i = 0; i < 20; i++) {
            this.killerMoves[i] = [null, null];
        }
        
        if (this.onThinkingStart) {
            this.onThinkingStart();
        }
        
        // Use medium-depth search for accurate hints (no randomness)
        this.maxDepth = 4; // Deeper search for accuracy
        this.maxThinkTime = 3000; // 3 seconds max
        
        let bestMove = null;
        
        // Try opening book first
        const bookMove = this.getBookMove(position, color, gameState);
        if (bookMove) {
            bestMove = bookMove;
        } else {
            // Use iterative deepening WITHOUT the easy-mode randomness
            bestMove = await this.hintSearch(position, color, gameState);
        }
        
        const thinkingTime = Date.now() - this.thinkingStartTime;
        this.isThinking = false;
        
        if (this.onThinkingEnd) {
            this.onThinkingEnd({
                move: bestMove,
                nodesEvaluated: this.nodesEvaluated,
                thinkingTime
            });
        }
        
        return bestMove;
    }
    
    /**
     * Dedicated hint search - no randomness, focused on finding best move
     */
    async hintSearch(position, color, gameState) {
        const legalMoves = Pieces.getAllLegalMoves(position, color, gameState);
        
        if (legalMoves.length === 0) {
            return null;
        }
        
        if (legalMoves.length === 1) {
            return legalMoves[0];
        }
        
        // Order moves for better pruning
        this.orderMoves(legalMoves, position, false, 0);
        
        let bestMove = legalMoves[0];
        let bestScore = -Infinity;
        
        // First, do a quick safety check - avoid moves that lose material
        const safeMoves = this.filterSafeMoves(legalMoves, position, color, gameState);
        const movesToSearch = safeMoves.length > 0 ? safeMoves : legalMoves;
        
        // Iterative deepening
        for (let depth = 1; depth <= this.maxDepth; depth++) {
            // Check time limit
            if (Date.now() - this.thinkingStartTime > this.maxThinkTime) {
                break;
            }
            
            let currentBestMove = null;
            let currentBestScore = -Infinity;
            let alpha = -Infinity;
            const beta = Infinity;
            
            for (const move of movesToSearch) {
                // Check time limit during search
                if (Date.now() - this.thinkingStartTime > this.maxThinkTime) {
                    this.searchAborted = true;
                    break;
                }
                
                const result = Pieces.makeMove(position, move.from, move, gameState);
                const newGameState = {
                    ...gameState,
                    enPassantSquare: result.enPassantSquare
                };
                
                const score = -this.alphaBeta(
                    result.position, 
                    Utils.oppositeColor(color), 
                    newGameState,
                    depth - 1, 
                    -beta, 
                    -alpha
                );
                
                if (score > currentBestScore) {
                    currentBestScore = score;
                    currentBestMove = move;
                }
                
                alpha = Math.max(alpha, score);
            }
            
            // Only update best move if search completed at this depth
            if (!this.searchAborted && currentBestMove) {
                bestMove = currentBestMove;
                bestScore = currentBestScore;
                
                // Reorder moves: put best move first for next iteration
                const bestIndex = movesToSearch.indexOf(currentBestMove);
                if (bestIndex > 0) {
                    movesToSearch.splice(bestIndex, 1);
                    movesToSearch.unshift(currentBestMove);
                }
            }
            
            // Allow UI update between depths
            await this.delay(0);
        }
        
        return bestMove;
    }
    
    /**
     * Filter out moves that immediately lose material
     */
    filterSafeMoves(moves, position, color, gameState) {
        const safeMoves = [];
        const opponentColor = Utils.oppositeColor(color);
        
        // Add time limit check to prevent hanging
        const filterStartTime = Date.now();
        const maxFilterTime = 1000; // 1 second max for filtering
        
        for (const move of moves) {
            // Check if we're running out of time
            if (Date.now() - filterStartTime > maxFilterTime) {
                // If we've found some safe moves, return them
                // Otherwise return all moves to avoid getting stuck
                return safeMoves.length > 0 ? safeMoves : moves;
            }
            
            const result = Pieces.makeMove(position, move.from, move, gameState);
            const newPosition = result.position;
            
            // Check if the moved piece can be captured
            const movedPiece = newPosition[move.to];
            if (!movedPiece) continue;
            
            const movedPieceValue = this.getPieceValue(movedPiece.type);
            let isSafe = true;
            
            // Check if any opponent piece can capture the moved piece
            const opponentMoves = Pieces.getAllLegalMoves(newPosition, opponentColor, {
                ...gameState,
                enPassantSquare: result.enPassantSquare
            });
            
            for (const oppMove of opponentMoves) {
                if (oppMove.to === move.to) {
                    // Opponent can capture our piece
                    const attackerPiece = newPosition[oppMove.from];
                    const attackerValue = attackerPiece ? this.getPieceValue(attackerPiece.type) : 0;
                    const capturedValue = move.capture ? this.getPieceValue(position[move.to]?.type) : 0;
                    
                    // If we're losing material (piece value - captured value > attacker value)
                    // This is a simplified check - we lose the piece and only got capturedValue
                    if (movedPieceValue > capturedValue + 50) {
                        // Check if the square is defended
                        const isDefended = this.isSquareDefended(newPosition, move.to, color, gameState);
                        if (!isDefended || movedPieceValue > attackerValue + 50) {
                            isSafe = false;
                            break;
                        }
                    }
                }
            }
            
            if (isSafe) {
                safeMoves.push(move);
            }
        }
        
        return safeMoves;
    }
    
    /**
     * Check if a square is defended by the given color
     * Uses efficient attack checking instead of generating all legal moves
     * @param {Object} position - Current board position
     * @param {string} square - Square to check (e.g., 'e4')
     * @param {string} color - Color of defending pieces
     * @param {Object} gameState - Game state (unused - kept for API consistency)
     * @returns {boolean} True if square is defended (can be attacked by) pieces of given color
     * 
     * Note: Uses Pieces.isSquareAttacked() which checks if pieces of the given color
     * can attack the square. This is semantically correct for defense checking:
     * "Can my pieces attack this square?" = "Is this square defended by my pieces?"
     * 
     * gameState is not needed because:
     * - En passant only applies to pawn captures, not square control/defense
     * - Castling doesn't affect whether a square is defended
     * - The attack pattern is determined solely by piece positions
     */
    isSquareDefended(position, square, color, gameState) {
        // Use the efficient isSquareAttacked method instead of getAllLegalMoves
        // This avoids exponential complexity that caused the hint button to hang
        // Old: O(n²) generating all legal moves, New: O(1) checking attack patterns
        return Pieces.isSquareAttacked(position, square, color);
    }
    
    /**
     * Fast position evaluation (material only + basic positional)
     */
    evaluatePositionFast(position, color) {
        let score = 0;
        
        for (const [square, piece] of Object.entries(position)) {
            if (!piece) continue;
            const file = Utils.fileToIndex(square[0]);
            const rank = Utils.rankToIndex(square[1]);
            
            let pieceValue = this.getPieceValue(piece.type);
            
            // Quick positional bonus
            if (piece.type === PIECE_TYPES.PAWN) {
                // Passed pawn and advancement bonus
                const advancement = piece.color === COLORS.WHITE ? rank : 7 - rank;
                pieceValue += advancement * 5;
            } else if (piece.type === PIECE_TYPES.KNIGHT || piece.type === PIECE_TYPES.BISHOP) {
                // Center bonus for minor pieces
                if (file >= 2 && file <= 5 && rank >= 2 && rank <= 5) {
                    pieceValue += 10;
                }
            }
            
            if (piece.color === color) {
                score += pieceValue;
            } else {
                score -= pieceValue;
            }
        }
        
        return score;
    }
    
    /**
     * Generate position key for transposition table
     */
    getPositionKey(position, color) {
        let key = color + ':';
        const squares = Object.keys(position).sort();
        for (const sq of squares) {
            const p = position[sq];
            if (p) {
                key += sq + p.color[0] + p.type[0];
            }
        }
        return key;
    }
    
    /**
     * Clear transposition table and reset search state
     */
    clearCache() {
        this.transpositionTable.clear();
        this.historyTable = {};
        for (let i = 0; i < 20; i++) {
            this.killerMoves[i] = [null, null];
        }
    }
    
    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create global AI instance
const chessAI = new ChessAI();
