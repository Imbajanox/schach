/**
 * Utility Functions
 * Schach - Chess Game
 */

const Utils = {
    /**
     * Convert file letter to index (0-7)
     */
    fileToIndex(file) {
        return FILES.indexOf(file);
    },

    /**
     * Convert rank number to index (0-7)
     */
    rankToIndex(rank) {
        return RANKS.indexOf(rank);
    },

    /**
     * Convert index to file letter
     */
    indexToFile(index) {
        return FILES[index];
    },

    /**
     * Convert index to rank number
     */
    indexToRank(index) {
        return RANKS[index];
    },

    /**
     * Parse square notation (e.g., 'e4') to coordinates
     */
    parseSquare(square) {
        if (!square || square.length !== 2) return null;
        const file = square[0];
        const rank = square[1];
        const fileIndex = this.fileToIndex(file);
        const rankIndex = this.rankToIndex(rank);
        if (fileIndex === -1 || rankIndex === -1) return null;
        return { file: fileIndex, rank: rankIndex };
    },

    /**
     * Convert coordinates to square notation
     */
    toSquare(fileIndex, rankIndex) {
        if (fileIndex < 0 || fileIndex > 7 || rankIndex < 0 || rankIndex > 7) {
            return null;
        }
        return this.indexToFile(fileIndex) + this.indexToRank(rankIndex);
    },

    /**
     * Check if coordinates are valid
     */
    isValidSquare(fileIndex, rankIndex) {
        return fileIndex >= 0 && fileIndex <= 7 && rankIndex >= 0 && rankIndex <= 7;
    },

    /**
     * Get square color (light or dark)
     */
    getSquareColor(fileIndex, rankIndex) {
        return (fileIndex + rankIndex) % 2 === 0 ? 'dark' : 'light';
    },

    /**
     * Get opposite color
     */
    oppositeColor(color) {
        return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    },

    /**
     * Get Unicode piece symbol
     */
    getPieceSymbol(piece) {
        if (!piece) return '';
        const symbols = {
            white: {
                king: '♔',
                queen: '♕',
                rook: '♖',
                bishop: '♗',
                knight: '♘',
                pawn: '♙'
            },
            black: {
                king: '♚',
                queen: '♛',
                rook: '♜',
                bishop: '♝',
                knight: '♞',
                pawn: '♟'
            }
        };
        return symbols[piece.color]?.[piece.type] || '';
    },

    /**
     * Deep clone an object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Generate unique ID
     */
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },

    /**
     * Format time in MM:SS
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Convert position to algebraic notation
     */
    toAlgebraic(piece, from, to, capture, check, checkmate, promotion, castling) {
        if (castling === 'kingside') return 'O-O';
        if (castling === 'queenside') return 'O-O-O';

        let notation = '';
        
        // Piece letter (not for pawns)
        if (piece.type !== PIECE_TYPES.PAWN) {
            notation += piece.type.charAt(0).toUpperCase();
            if (piece.type === PIECE_TYPES.KNIGHT) notation = 'N';
        }
        
        // Capture
        if (capture) {
            if (piece.type === PIECE_TYPES.PAWN) {
                notation += from[0]; // File for pawn captures
            }
            notation += 'x';
        }
        
        // Destination
        notation += to;
        
        // Promotion
        if (promotion) {
            notation += '=' + promotion.charAt(0).toUpperCase();
            if (promotion === PIECE_TYPES.KNIGHT) notation = notation.slice(0, -1) + 'N';
        }
        
        // Check/Checkmate
        if (checkmate) notation += '#';
        else if (check) notation += '+';
        
        return notation;
    },

    /**
     * Parse FEN string to position
     */
    parseFEN(fen) {
        const parts = fen.split(' ');
        const position = {};
        const rows = parts[0].split('/');
        
        for (let rankIndex = 7; rankIndex >= 0; rankIndex--) {
            const row = rows[7 - rankIndex];
            let fileIndex = 0;
            
            for (const char of row) {
                if (/\d/.test(char)) {
                    fileIndex += parseInt(char);
                } else {
                    const square = this.toSquare(fileIndex, rankIndex);
                    const color = char === char.toUpperCase() ? COLORS.WHITE : COLORS.BLACK;
                    const pieceChar = char.toLowerCase();
                    
                    const pieceMap = {
                        'k': PIECE_TYPES.KING,
                        'q': PIECE_TYPES.QUEEN,
                        'r': PIECE_TYPES.ROOK,
                        'b': PIECE_TYPES.BISHOP,
                        'n': PIECE_TYPES.KNIGHT,
                        'p': PIECE_TYPES.PAWN
                    };
                    
                    position[square] = {
                        type: pieceMap[pieceChar],
                        color: color
                    };
                    fileIndex++;
                }
            }
        }
        
        return {
            position,
            turn: parts[1] === 'w' ? COLORS.WHITE : COLORS.BLACK,
            castling: parts[2],
            enPassant: parts[3] === '-' ? null : parts[3],
            halfMoveClock: parseInt(parts[4]) || 0,
            fullMoveNumber: parseInt(parts[5]) || 1
        };
    },

    /**
     * Generate FEN string from position
     */
    toFEN(position, turn, castling, enPassant, halfMoveClock, fullMoveNumber) {
        let fen = '';
        
        // Position
        for (let rankIndex = 7; rankIndex >= 0; rankIndex--) {
            let emptyCount = 0;
            
            for (let fileIndex = 0; fileIndex <= 7; fileIndex++) {
                const square = this.toSquare(fileIndex, rankIndex);
                const piece = position[square];
                
                if (piece) {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    
                    const pieceMap = {
                        king: 'k',
                        queen: 'q',
                        rook: 'r',
                        bishop: 'b',
                        knight: 'n',
                        pawn: 'p'
                    };
                    
                    let char = pieceMap[piece.type];
                    if (piece.color === COLORS.WHITE) char = char.toUpperCase();
                    fen += char;
                } else {
                    emptyCount++;
                }
            }
            
            if (emptyCount > 0) fen += emptyCount;
            if (rankIndex > 0) fen += '/';
        }
        
        // Turn
        fen += ' ' + (turn === COLORS.WHITE ? 'w' : 'b');
        
        // Castling
        fen += ' ' + (castling || '-');
        
        // En passant
        fen += ' ' + (enPassant || '-');
        
        // Half move clock
        fen += ' ' + (halfMoveClock || 0);
        
        // Full move number
        fen += ' ' + (fullMoveNumber || 1);
        
        return fen;
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};
