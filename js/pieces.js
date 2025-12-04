/**
 * Chess Piece Movement Logic
 * Schach - Chess Game
 */

const Pieces = {
    /**
     * Get all valid moves for a piece at a given position
     */
    getValidMoves(position, square, includeSpecialMoves = true, gameState = null) {
        const piece = position[square];
        if (!piece) return [];

        let moves = [];

        switch (piece.type) {
            case PIECE_TYPES.PAWN:
                moves = this.getPawnMoves(position, square, piece.color, gameState);
                break;
            case PIECE_TYPES.KNIGHT:
                moves = this.getKnightMoves(position, square, piece.color);
                break;
            case PIECE_TYPES.BISHOP:
                moves = this.getSlidingMoves(position, square, piece.color, 'bishop');
                break;
            case PIECE_TYPES.ROOK:
                moves = this.getSlidingMoves(position, square, piece.color, 'rook');
                break;
            case PIECE_TYPES.QUEEN:
                moves = this.getSlidingMoves(position, square, piece.color, 'queen');
                break;
            case PIECE_TYPES.KING:
                moves = this.getKingMoves(position, square, piece.color, includeSpecialMoves, gameState);
                break;
        }

        return moves;
    },

    /**
     * Get pawn moves
     */
    getPawnMoves(position, square, color, gameState) {
        const moves = [];
        const coords = Utils.parseSquare(square);
        if (!coords) return moves;

        const direction = color === COLORS.WHITE ? 1 : -1;
        const startRank = color === COLORS.WHITE ? 1 : 6;
        const promotionRank = color === COLORS.WHITE ? 7 : 0;

        // Forward move
        const oneForward = Utils.toSquare(coords.file, coords.rank + direction);
        if (oneForward && !position[oneForward]) {
            if (coords.rank + direction === promotionRank) {
                // Promotion moves
                moves.push({ to: oneForward, promotion: PIECE_TYPES.QUEEN });
                moves.push({ to: oneForward, promotion: PIECE_TYPES.ROOK });
                moves.push({ to: oneForward, promotion: PIECE_TYPES.BISHOP });
                moves.push({ to: oneForward, promotion: PIECE_TYPES.KNIGHT });
            } else {
                moves.push({ to: oneForward });
            }

            // Two squares forward from starting position
            if (coords.rank === startRank) {
                const twoForward = Utils.toSquare(coords.file, coords.rank + 2 * direction);
                if (twoForward && !position[twoForward]) {
                    moves.push({ to: twoForward });
                }
            }
        }

        // Captures (diagonal)
        for (const fileOffset of [-1, 1]) {
            const captureSquare = Utils.toSquare(coords.file + fileOffset, coords.rank + direction);
            if (captureSquare) {
                const target = position[captureSquare];
                if (target && target.color !== color) {
                    if (coords.rank + direction === promotionRank) {
                        moves.push({ to: captureSquare, capture: true, promotion: PIECE_TYPES.QUEEN });
                        moves.push({ to: captureSquare, capture: true, promotion: PIECE_TYPES.ROOK });
                        moves.push({ to: captureSquare, capture: true, promotion: PIECE_TYPES.BISHOP });
                        moves.push({ to: captureSquare, capture: true, promotion: PIECE_TYPES.KNIGHT });
                    } else {
                        moves.push({ to: captureSquare, capture: true });
                    }
                }

                // En passant
                if (gameState && gameState.enPassantSquare === captureSquare) {
                    moves.push({ to: captureSquare, capture: true, enPassant: true });
                }
            }
        }

        return moves;
    },

    /**
     * Get knight moves
     */
    getKnightMoves(position, square, color) {
        const moves = [];
        const coords = Utils.parseSquare(square);
        if (!coords) return moves;

        for (const offset of KNIGHT_MOVES) {
            const newFile = coords.file + offset.file;
            const newRank = coords.rank + offset.rank;
            
            if (Utils.isValidSquare(newFile, newRank)) {
                const targetSquare = Utils.toSquare(newFile, newRank);
                const target = position[targetSquare];
                
                if (!target || target.color !== color) {
                    moves.push({ 
                        to: targetSquare, 
                        capture: target && target.color !== color 
                    });
                }
            }
        }

        return moves;
    },

    /**
     * Get sliding piece moves (bishop, rook, queen)
     */
    getSlidingMoves(position, square, color, pieceType) {
        const moves = [];
        const coords = Utils.parseSquare(square);
        if (!coords) return moves;

        let directions = [];
        
        if (pieceType === 'bishop' || pieceType === 'queen') {
            directions.push(
                DIRECTIONS.NORTH_EAST,
                DIRECTIONS.NORTH_WEST,
                DIRECTIONS.SOUTH_EAST,
                DIRECTIONS.SOUTH_WEST
            );
        }
        
        if (pieceType === 'rook' || pieceType === 'queen') {
            directions.push(
                DIRECTIONS.NORTH,
                DIRECTIONS.SOUTH,
                DIRECTIONS.EAST,
                DIRECTIONS.WEST
            );
        }

        for (const dir of directions) {
            let newFile = coords.file + dir.file;
            let newRank = coords.rank + dir.rank;

            while (Utils.isValidSquare(newFile, newRank)) {
                const targetSquare = Utils.toSquare(newFile, newRank);
                const target = position[targetSquare];

                if (!target) {
                    moves.push({ to: targetSquare });
                } else if (target.color !== color) {
                    moves.push({ to: targetSquare, capture: true });
                    break;
                } else {
                    break;
                }

                newFile += dir.file;
                newRank += dir.rank;
            }
        }

        return moves;
    },

    /**
     * Get king moves
     */
    getKingMoves(position, square, color, includeSpecialMoves, gameState) {
        const moves = [];
        const coords = Utils.parseSquare(square);
        if (!coords) return moves;

        // Normal king moves (one square in any direction)
        const allDirections = Object.values(DIRECTIONS);
        
        for (const dir of allDirections) {
            const newFile = coords.file + dir.file;
            const newRank = coords.rank + dir.rank;

            if (Utils.isValidSquare(newFile, newRank)) {
                const targetSquare = Utils.toSquare(newFile, newRank);
                const target = position[targetSquare];

                if (!target || target.color !== color) {
                    moves.push({ 
                        to: targetSquare, 
                        capture: target && target.color !== color 
                    });
                }
            }
        }

        // Castling
        if (includeSpecialMoves && gameState) {
            const castlingMoves = this.getCastlingMoves(position, color, gameState);
            moves.push(...castlingMoves);
        }

        return moves;
    },

    /**
     * Get castling moves
     */
    getCastlingMoves(position, color, gameState) {
        const moves = [];
        
        if (!gameState || !gameState.castlingRights) return moves;
        
        const rank = color === COLORS.WHITE ? '1' : '8';
        const kingSquare = 'e' + rank;
        
        // Check if king is in check (can't castle out of check)
        if (this.isSquareAttacked(position, kingSquare, Utils.oppositeColor(color))) {
            return moves;
        }

        // Kingside castling
        const kingsideRight = color === COLORS.WHITE ? 'K' : 'k';
        if (gameState.castlingRights.includes(kingsideRight)) {
            const f = 'f' + rank;
            const g = 'g' + rank;
            
            if (!position[f] && !position[g]) {
                // Check if squares are attacked
                if (!this.isSquareAttacked(position, f, Utils.oppositeColor(color)) &&
                    !this.isSquareAttacked(position, g, Utils.oppositeColor(color))) {
                    moves.push({ to: g, castling: 'kingside' });
                }
            }
        }

        // Queenside castling
        const queensideRight = color === COLORS.WHITE ? 'Q' : 'q';
        if (gameState.castlingRights.includes(queensideRight)) {
            const b = 'b' + rank;
            const c = 'c' + rank;
            const d = 'd' + rank;
            
            if (!position[b] && !position[c] && !position[d]) {
                // Check if squares are attacked (king passes through c and d)
                if (!this.isSquareAttacked(position, c, Utils.oppositeColor(color)) &&
                    !this.isSquareAttacked(position, d, Utils.oppositeColor(color))) {
                    moves.push({ to: c, castling: 'queenside' });
                }
            }
        }

        return moves;
    },

    /**
     * Check if a square is attacked by a color
     */
    isSquareAttacked(position, square, byColor) {
        const coords = Utils.parseSquare(square);
        if (!coords) return false;

        // Check for pawn attacks
        const pawnDirection = byColor === COLORS.WHITE ? -1 : 1;
        for (const fileOffset of [-1, 1]) {
            const pawnSquare = Utils.toSquare(coords.file + fileOffset, coords.rank + pawnDirection);
            if (pawnSquare) {
                const piece = position[pawnSquare];
                if (piece && piece.type === PIECE_TYPES.PAWN && piece.color === byColor) {
                    return true;
                }
            }
        }

        // Check for knight attacks
        for (const offset of KNIGHT_MOVES) {
            const knightSquare = Utils.toSquare(coords.file + offset.file, coords.rank + offset.rank);
            if (knightSquare) {
                const piece = position[knightSquare];
                if (piece && piece.type === PIECE_TYPES.KNIGHT && piece.color === byColor) {
                    return true;
                }
            }
        }

        // Check for king attacks
        for (const dir of Object.values(DIRECTIONS)) {
            const kingSquare = Utils.toSquare(coords.file + dir.file, coords.rank + dir.rank);
            if (kingSquare) {
                const piece = position[kingSquare];
                if (piece && piece.type === PIECE_TYPES.KING && piece.color === byColor) {
                    return true;
                }
            }
        }

        // Check for sliding piece attacks (rook, bishop, queen)
        // Rook/Queen directions
        const rookDirections = [DIRECTIONS.NORTH, DIRECTIONS.SOUTH, DIRECTIONS.EAST, DIRECTIONS.WEST];
        for (const dir of rookDirections) {
            let newFile = coords.file + dir.file;
            let newRank = coords.rank + dir.rank;

            while (Utils.isValidSquare(newFile, newRank)) {
                const targetSquare = Utils.toSquare(newFile, newRank);
                const piece = position[targetSquare];

                if (piece) {
                    if (piece.color === byColor && 
                        (piece.type === PIECE_TYPES.ROOK || piece.type === PIECE_TYPES.QUEEN)) {
                        return true;
                    }
                    break;
                }

                newFile += dir.file;
                newRank += dir.rank;
            }
        }

        // Bishop/Queen directions
        const bishopDirections = [
            DIRECTIONS.NORTH_EAST, DIRECTIONS.NORTH_WEST,
            DIRECTIONS.SOUTH_EAST, DIRECTIONS.SOUTH_WEST
        ];
        for (const dir of bishopDirections) {
            let newFile = coords.file + dir.file;
            let newRank = coords.rank + dir.rank;

            while (Utils.isValidSquare(newFile, newRank)) {
                const targetSquare = Utils.toSquare(newFile, newRank);
                const piece = position[targetSquare];

                if (piece) {
                    if (piece.color === byColor && 
                        (piece.type === PIECE_TYPES.BISHOP || piece.type === PIECE_TYPES.QUEEN)) {
                        return true;
                    }
                    break;
                }

                newFile += dir.file;
                newRank += dir.rank;
            }
        }

        return false;
    },

    /**
     * Find king position for a color
     */
    findKing(position, color) {
        for (const [square, piece] of Object.entries(position)) {
            if (piece.type === PIECE_TYPES.KING && piece.color === color) {
                return square;
            }
        }
        return null;
    },

    /**
     * Check if a color is in check
     */
    isInCheck(position, color) {
        const kingSquare = this.findKing(position, color);
        if (!kingSquare) return false;
        return this.isSquareAttacked(position, kingSquare, Utils.oppositeColor(color));
    },

    /**
     * Get all legal moves for a color (filters out moves that leave king in check)
     */
    getAllLegalMoves(position, color, gameState) {
        const legalMoves = [];

        for (const [square, piece] of Object.entries(position)) {
            if (piece.color !== color) continue;

            const moves = this.getValidMoves(position, square, true, gameState);
            
            for (const move of moves) {
                // Simulate the move
                const newPosition = this.makeMove(position, square, move, gameState);
                
                // Check if king is in check after the move
                if (!this.isInCheck(newPosition.position, color)) {
                    legalMoves.push({
                        from: square,
                        ...move
                    });
                }
            }
        }

        return legalMoves;
    },

    /**
     * Make a move and return new position
     */
    makeMove(position, from, move, gameState) {
        const newPosition = Utils.deepClone(position);
        const piece = newPosition[from];
        
        // Remove piece from origin
        delete newPosition[from];
        
        // Handle en passant capture
        if (move.enPassant) {
            const captureRank = piece.color === COLORS.WHITE ? 
                String(parseInt(move.to[1]) - 1) : 
                String(parseInt(move.to[1]) + 1);
            const captureSquare = move.to[0] + captureRank;
            delete newPosition[captureSquare];
        }
        
        // Handle promotion
        if (move.promotion) {
            newPosition[move.to] = { type: move.promotion, color: piece.color };
        } else {
            newPosition[move.to] = piece;
        }
        
        // Handle castling
        if (move.castling) {
            const rank = piece.color === COLORS.WHITE ? '1' : '8';
            if (move.castling === 'kingside') {
                newPosition['f' + rank] = newPosition['h' + rank];
                delete newPosition['h' + rank];
            } else {
                newPosition['d' + rank] = newPosition['a' + rank];
                delete newPosition['a' + rank];
            }
        }

        // Calculate new en passant square
        let enPassantSquare = null;
        if (piece.type === PIECE_TYPES.PAWN) {
            const fromCoords = Utils.parseSquare(from);
            const toCoords = Utils.parseSquare(move.to);
            if (Math.abs(toCoords.rank - fromCoords.rank) === 2) {
                const epRank = piece.color === COLORS.WHITE ? '3' : '6';
                enPassantSquare = from[0] + epRank;
            }
        }

        return {
            position: newPosition,
            enPassantSquare,
            capturedPiece: move.capture ? position[move.to] : null
        };
    }
};
