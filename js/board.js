/**
 * Chessboard Rendering
 * Schach - Chess Game
 */

class Board {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.squares = {};
        this.selectedSquare = null;
        this.validMoves = [];
        this.isFlipped = false;
        this.onSquareClick = null;
        this.onPieceDragStart = null;
        this.onPieceDrop = null;
        
        this.draggedPiece = null;
        this.dragGhost = null;
        
        this.init();
    }

    /**
     * Initialize the board
     */
    init() {
        this.createSquares();
        this.setupDragAndDrop();
    }

    /**
     * Create board squares
     */
    createSquares() {
        this.container.innerHTML = '';
        this.squares = {};

        for (let rankIndex = 7; rankIndex >= 0; rankIndex--) {
            for (let fileIndex = 0; fileIndex <= 7; fileIndex++) {
                const square = document.createElement('div');
                const squareName = Utils.toSquare(fileIndex, rankIndex);
                const color = Utils.getSquareColor(fileIndex, rankIndex);
                
                square.className = `square ${color}`;
                square.dataset.square = squareName;
                
                // Add coordinates on edge squares
                if (fileIndex === 0) {
                    const rankLabel = document.createElement('span');
                    rankLabel.className = 'coord-rank';
                    rankLabel.textContent = RANKS[rankIndex];
                    square.appendChild(rankLabel);
                }
                if (rankIndex === 0) {
                    const fileLabel = document.createElement('span');
                    fileLabel.className = 'coord-file';
                    fileLabel.textContent = FILES[fileIndex];
                    square.appendChild(fileLabel);
                }

                // Click handler
                square.addEventListener('click', (e) => this.handleSquareClick(squareName, e));
                
                this.squares[squareName] = square;
                this.container.appendChild(square);
            }
        }
    }

    /**
     * Setup drag and drop
     */
    setupDragAndDrop() {
        document.addEventListener('mousemove', (e) => this.handleDrag(e));
        document.addEventListener('mouseup', (e) => this.handleDragEnd(e));
        document.addEventListener('touchmove', (e) => this.handleDrag(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleDragEnd(e));
    }

    /**
     * Handle square click
     */
    handleSquareClick(square, event) {
        if (this.onSquareClick) {
            this.onSquareClick(square);
        }
    }

    /**
     * Handle drag start
     */
    handleDragStart(square, event) {
        const pieceElement = this.squares[square].querySelector('.piece');
        if (!pieceElement) return;

        event.preventDefault();
        
        this.draggedPiece = {
            square: square,
            element: pieceElement
        };

        // Create ghost element
        this.dragGhost = document.createElement('div');
        this.dragGhost.className = `piece-ghost ${pieceElement.classList.contains('white') ? 'white' : 'black'}`;
        this.dragGhost.innerHTML = pieceElement.innerHTML;
        this.dragGhost.style.color = pieceElement.style.color || 
            (pieceElement.classList.contains('white') ? '#ffffff' : '#1a1a1a');
        document.body.appendChild(this.dragGhost);

        // Position ghost
        const pos = event.type.startsWith('touch') ? 
            { x: event.touches[0].clientX, y: event.touches[0].clientY } :
            { x: event.clientX, y: event.clientY };
        this.dragGhost.style.left = pos.x + 'px';
        this.dragGhost.style.top = pos.y + 'px';

        // Hide original piece
        pieceElement.classList.add('dragging');
        pieceElement.style.opacity = '0.3';

        // Trigger selection
        if (this.onSquareClick) {
            this.onSquareClick(square);
        }

        if (this.onPieceDragStart) {
            this.onPieceDragStart(square);
        }
    }

    /**
     * Handle drag
     */
    handleDrag(event) {
        if (!this.dragGhost) return;

        event.preventDefault();

        const pos = event.type.startsWith('touch') ? 
            { x: event.touches[0].clientX, y: event.touches[0].clientY } :
            { x: event.clientX, y: event.clientY };
        
        this.dragGhost.style.left = pos.x + 'px';
        this.dragGhost.style.top = pos.y + 'px';
    }

    /**
     * Handle drag end
     */
    handleDragEnd(event) {
        if (!this.draggedPiece) return;

        // Restore original piece visibility
        this.draggedPiece.element.classList.remove('dragging');
        this.draggedPiece.element.style.opacity = '1';

        // Remove ghost
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }

        // Find target square
        const pos = event.type.startsWith('touch') ?
            (event.changedTouches ? { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY } : null) :
            { x: event.clientX, y: event.clientY };

        if (pos) {
            const targetElement = document.elementFromPoint(pos.x, pos.y);
            const targetSquare = targetElement?.closest('.square');

            if (targetSquare && this.onPieceDrop) {
                this.onPieceDrop(this.draggedPiece.square, targetSquare.dataset.square);
            }
        }

        this.draggedPiece = null;
    }

    /**
     * Render pieces on the board
     */
    renderPosition(position) {
        // Clear all pieces
        for (const square of Object.values(this.squares)) {
            const piece = square.querySelector('.piece');
            if (piece) piece.remove();
        }

        // Place pieces
        for (const [squareName, piece] of Object.entries(position)) {
            this.placePiece(squareName, piece);
        }
    }

    /**
     * Place a piece on a square
     */
    placePiece(squareName, piece) {
        const square = this.squares[squareName];
        if (!square) return;

        const pieceElement = document.createElement('div');
        pieceElement.className = `piece ${piece.color}`;
        pieceElement.innerHTML = PIECE_FONTAWESOME[piece.color][piece.type];
        pieceElement.dataset.type = piece.type;
        pieceElement.dataset.color = piece.color;

        // Drag handlers
        pieceElement.addEventListener('mousedown', (e) => this.handleDragStart(squareName, e));
        pieceElement.addEventListener('touchstart', (e) => this.handleDragStart(squareName, e), { passive: false });

        square.appendChild(pieceElement);
    }

    /**
     * Select a square
     */
    selectSquare(squareName) {
        // Clear previous selection
        this.clearSelection();
        
        if (squareName && this.squares[squareName]) {
            this.selectedSquare = squareName;
            this.squares[squareName].classList.add('selected');
        }
    }

    /**
     * Clear selection
     */
    clearSelection() {
        if (this.selectedSquare && this.squares[this.selectedSquare]) {
            this.squares[this.selectedSquare].classList.remove('selected');
        }
        this.selectedSquare = null;
        this.clearHighlights();
    }

    /**
     * Highlight valid moves
     */
    highlightValidMoves(moves) {
        this.clearHighlights();
        this.validMoves = moves;

        for (const move of moves) {
            const square = this.squares[move.to];
            if (square) {
                if (move.capture) {
                    square.classList.add('capture-move');
                } else {
                    square.classList.add('valid-move');
                }
            }
        }
    }

    /**
     * Clear highlights
     */
    clearHighlights() {
        for (const square of Object.values(this.squares)) {
            square.classList.remove('valid-move', 'capture-move');
        }
        this.validMoves = [];
    }

    /**
     * Highlight last move
     */
    highlightLastMove(from, to) {
        // Clear previous last move highlights
        for (const square of Object.values(this.squares)) {
            square.classList.remove('last-move');
        }

        if (from && this.squares[from]) {
            this.squares[from].classList.add('last-move');
        }
        if (to && this.squares[to]) {
            this.squares[to].classList.add('last-move');
        }
    }

    /**
     * Highlight check
     */
    highlightCheck(kingSquare) {
        // Clear previous check highlight
        for (const square of Object.values(this.squares)) {
            square.classList.remove('check');
        }

        if (kingSquare && this.squares[kingSquare]) {
            this.squares[kingSquare].classList.add('check');
        }
    }

    /**
     * Flip the board
     */
    flip() {
        this.isFlipped = !this.isFlipped;
        this.container.classList.toggle('flipped', this.isFlipped);
        
        // Update coordinate labels
        const filesContainer = document.querySelector('.coordinates-files');
        const ranksContainer = document.querySelector('.coordinates-ranks');
        
        if (filesContainer) {
            const files = this.isFlipped ? [...FILES].reverse() : FILES;
            filesContainer.innerHTML = files.map(f => `<span>${f}</span>`).join('');
        }
        
        if (ranksContainer) {
            const ranks = this.isFlipped ? RANKS : [...RANKS].reverse();
            ranksContainer.innerHTML = ranks.map(r => `<span>${r}</span>`).join('');
        }
    }

    /**
     * Set board orientation
     */
    setOrientation(color) {
        const shouldFlip = color === COLORS.BLACK;
        if (this.isFlipped !== shouldFlip) {
            this.flip();
        }
    }

    /**
     * Animate piece movement
     */
    animateMove(from, to, callback) {
        const fromSquare = this.squares[from];
        const toSquare = this.squares[to];
        const piece = fromSquare?.querySelector('.piece');

        if (!piece || !fromSquare || !toSquare) {
            if (callback) callback();
            return;
        }

        const fromRect = fromSquare.getBoundingClientRect();
        const toRect = toSquare.getBoundingClientRect();
        
        const deltaX = toRect.left - fromRect.left;
        const deltaY = toRect.top - fromRect.top;

        piece.style.transition = 'transform 0.15s ease-out';
        piece.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        piece.style.zIndex = '100';

        setTimeout(() => {
            piece.style.transition = '';
            piece.style.transform = '';
            piece.style.zIndex = '';
            if (callback) callback();
        }, 150);
    }
}
