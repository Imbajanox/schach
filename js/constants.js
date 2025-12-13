/**
 * Chess Game Constants
 * Schach - Chess Game
 */

// Piece types
const PIECE_TYPES = {
    KING: 'king',
    QUEEN: 'queen',
    ROOK: 'rook',
    BISHOP: 'bishop',
    KNIGHT: 'knight',
    PAWN: 'pawn'
};

// Colors
const COLORS = {
    WHITE: 'white',
    BLACK: 'black'
};

// Unicode chess pieces
const PIECE_UNICODE = {
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

const PIECE_FONTAWESOME = {
    white: {
        king: '<i class="fa-regular fa-chess-king"></i>',
        queen: '<i class="fa-regular fa-chess-queen"></i>',
        rook: '<i class="fa-regular fa-chess-rook"></i>',
        bishop: '<i class="fa-regular fa-chess-bishop"></i>',
        knight: '<i class="fa-regular fa-chess-knight"></i>',
        pawn: '<i class="fa-regular fa-chess-pawn"></i>'
    },
    black: {
        king: '<i class="fa-solid fa-chess-king"></i>',
        queen: '<i class="fa-solid fa-chess-queen"></i>',
        rook: '<i class="fa-solid fa-chess-rook"></i>',
        bishop: '<i class="fa-solid fa-chess-bishop"></i>',
        knight: '<i class="fa-solid fa-chess-knight"></i>',
        pawn: '<i class="fa-solid fa-chess-pawn"></i>'
    }
};

// Piece values for evaluation
const PIECE_VALUES = {
    king: 0, // King is invaluable
    queen: 9,
    rook: 5,
    bishop: 3,
    knight: 3,
    pawn: 1
};

// Board files (columns)
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// Board ranks (rows)
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

// Initial board setup (FEN notation positions)
const INITIAL_POSITION = {
    // Black pieces (row 8)
    'a8': { type: PIECE_TYPES.ROOK, color: COLORS.BLACK },
    'b8': { type: PIECE_TYPES.KNIGHT, color: COLORS.BLACK },
    'c8': { type: PIECE_TYPES.BISHOP, color: COLORS.BLACK },
    'd8': { type: PIECE_TYPES.QUEEN, color: COLORS.BLACK },
    'e8': { type: PIECE_TYPES.KING, color: COLORS.BLACK },
    'f8': { type: PIECE_TYPES.BISHOP, color: COLORS.BLACK },
    'g8': { type: PIECE_TYPES.KNIGHT, color: COLORS.BLACK },
    'h8': { type: PIECE_TYPES.ROOK, color: COLORS.BLACK },
    // Black pawns (row 7)
    'a7': { type: PIECE_TYPES.PAWN, color: COLORS.BLACK },
    'b7': { type: PIECE_TYPES.PAWN, color: COLORS.BLACK },
    'c7': { type: PIECE_TYPES.PAWN, color: COLORS.BLACK },
    'd7': { type: PIECE_TYPES.PAWN, color: COLORS.BLACK },
    'e7': { type: PIECE_TYPES.PAWN, color: COLORS.BLACK },
    'f7': { type: PIECE_TYPES.PAWN, color: COLORS.BLACK },
    'g7': { type: PIECE_TYPES.PAWN, color: COLORS.BLACK },
    'h7': { type: PIECE_TYPES.PAWN, color: COLORS.BLACK },
    // White pawns (row 2)
    'a2': { type: PIECE_TYPES.PAWN, color: COLORS.WHITE },
    'b2': { type: PIECE_TYPES.PAWN, color: COLORS.WHITE },
    'c2': { type: PIECE_TYPES.PAWN, color: COLORS.WHITE },
    'd2': { type: PIECE_TYPES.PAWN, color: COLORS.WHITE },
    'e2': { type: PIECE_TYPES.PAWN, color: COLORS.WHITE },
    'f2': { type: PIECE_TYPES.PAWN, color: COLORS.WHITE },
    'g2': { type: PIECE_TYPES.PAWN, color: COLORS.WHITE },
    'h2': { type: PIECE_TYPES.PAWN, color: COLORS.WHITE },
    // White pieces (row 1)
    'a1': { type: PIECE_TYPES.ROOK, color: COLORS.WHITE },
    'b1': { type: PIECE_TYPES.KNIGHT, color: COLORS.WHITE },
    'c1': { type: PIECE_TYPES.BISHOP, color: COLORS.WHITE },
    'd1': { type: PIECE_TYPES.QUEEN, color: COLORS.WHITE },
    'e1': { type: PIECE_TYPES.KING, color: COLORS.WHITE },
    'f1': { type: PIECE_TYPES.BISHOP, color: COLORS.WHITE },
    'g1': { type: PIECE_TYPES.KNIGHT, color: COLORS.WHITE },
    'h1': { type: PIECE_TYPES.ROOK, color: COLORS.WHITE }
};

// Game states
const GAME_STATES = {
    NOT_STARTED: 'not_started',
    ACTIVE: 'active',
    CHECK: 'check',
    CHECKMATE: 'checkmate',
    STALEMATE: 'stalemate',
    DRAW: 'draw',
    RESIGNED: 'resigned'
};

// Game modes
const GAME_MODES = {
    VS_AI: 'vs_ai',
    PVP_LOCAL: 'pvp_local',
    PVP_ONLINE: 'pvp_online',
    ROGUELIKE: 'roguelike'
};

// AI difficulties
const AI_DIFFICULTIES = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
};

// Direction vectors for piece movement
const DIRECTIONS = {
    // Straight directions
    NORTH: { file: 0, rank: 1 },
    SOUTH: { file: 0, rank: -1 },
    EAST: { file: 1, rank: 0 },
    WEST: { file: -1, rank: 0 },
    // Diagonal directions
    NORTH_EAST: { file: 1, rank: 1 },
    NORTH_WEST: { file: -1, rank: 1 },
    SOUTH_EAST: { file: 1, rank: -1 },
    SOUTH_WEST: { file: -1, rank: -1 }
};

// Knight move offsets
const KNIGHT_MOVES = [
    { file: 1, rank: 2 },
    { file: 2, rank: 1 },
    { file: 2, rank: -1 },
    { file: 1, rank: -2 },
    { file: -1, rank: -2 },
    { file: -2, rank: -1 },
    { file: -2, rank: 1 },
    { file: -1, rank: 2 }
];

// Castling info
const CASTLING = {
    WHITE_KINGSIDE: { king: { from: 'e1', to: 'g1' }, rook: { from: 'h1', to: 'f1' } },
    WHITE_QUEENSIDE: { king: { from: 'e1', to: 'c1' }, rook: { from: 'a1', to: 'd1' } },
    BLACK_KINGSIDE: { king: { from: 'e8', to: 'g8' }, rook: { from: 'h8', to: 'f8' } },
    BLACK_QUEENSIDE: { king: { from: 'e8', to: 'c8' }, rook: { from: 'a8', to: 'd8' } }
};

// ============================================
// Roguelike Mode Constants
// ============================================

// Roguelike upgrade definitions
const ROGUELIKE_UPGRADES = {
    // PHASE 1: MVP Upgrade - Schildträger (Shield Bearer)
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
