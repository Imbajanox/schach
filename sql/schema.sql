-- Chess Game Database Schema
-- Database: schach

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS schach CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE schach;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    elo_rating INT DEFAULT 1200,
    is_verified TINYINT(1) DEFAULT 0,
    verification_token VARCHAR(64) DEFAULT NULL,
    reset_token VARCHAR(64) DEFAULT NULL,
    reset_token_expires DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    is_admin TINYINT(1) DEFAULT 0,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_elo (elo_rating)
) ENGINE=InnoDB;

-- User statistics table
CREATE TABLE IF NOT EXISTS user_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    games_played INT DEFAULT 0,
    games_won INT DEFAULT 0,
    games_lost INT DEFAULT 0,
    games_drawn INT DEFAULT 0,
    total_moves INT DEFAULT 0,
    avg_game_duration INT DEFAULT 0,
    longest_win_streak INT DEFAULT 0,
    current_win_streak INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Games table
CREATE TABLE IF NOT EXISTS games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    white_player_id INT DEFAULT NULL,
    black_player_id INT DEFAULT NULL,
    game_type ENUM('pvp_local', 'pvp_online', 'vs_ai') NOT NULL DEFAULT 'pvp_local',
    ai_difficulty ENUM('easy', 'medium', 'hard') DEFAULT NULL,
    time_control INT DEFAULT NULL COMMENT 'Time in seconds, NULL for unlimited',
    increment INT DEFAULT 0 COMMENT 'Increment in seconds',
    status ENUM('waiting', 'active', 'completed', 'abandoned') DEFAULT 'waiting',
    result ENUM('white_wins', 'black_wins', 'draw', 'ongoing') DEFAULT 'ongoing',
    result_reason VARCHAR(50) DEFAULT NULL COMMENT 'checkmate, resignation, timeout, stalemate, etc.',
    fen_initial VARCHAR(100) DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    fen_current VARCHAR(100) DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pgn TEXT DEFAULT NULL,
    game_code VARCHAR(10) DEFAULT NULL UNIQUE COMMENT 'For joining online games',
    white_time_remaining INT DEFAULT NULL,
    black_time_remaining INT DEFAULT NULL,
    current_turn ENUM('white', 'black') DEFAULT 'white',
    move_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    FOREIGN KEY (white_player_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (black_player_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_game_code (game_code),
    INDEX idx_white_player (white_player_id),
    INDEX idx_black_player (black_player_id)
) ENGINE=InnoDB;

-- Moves table
CREATE TABLE IF NOT EXISTS moves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    move_number INT NOT NULL,
    player_color ENUM('white', 'black') NOT NULL,
    move_from VARCHAR(2) NOT NULL COMMENT 'e.g., e2',
    move_to VARCHAR(2) NOT NULL COMMENT 'e.g., e4',
    piece_type ENUM('king', 'queen', 'rook', 'bishop', 'knight', 'pawn') NOT NULL,
    captured_piece ENUM('king', 'queen', 'rook', 'bishop', 'knight', 'pawn') DEFAULT NULL,
    is_check TINYINT(1) DEFAULT 0,
    is_checkmate TINYINT(1) DEFAULT 0,
    is_castling ENUM('kingside', 'queenside') DEFAULT NULL,
    is_en_passant TINYINT(1) DEFAULT 0,
    promotion_piece ENUM('queen', 'rook', 'bishop', 'knight') DEFAULT NULL,
    algebraic_notation VARCHAR(10) NOT NULL COMMENT 'e.g., Nxe4+',
    fen_after VARCHAR(100) NOT NULL,
    time_spent INT DEFAULT NULL COMMENT 'Time spent on move in seconds',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    INDEX idx_game_move (game_id, move_number)
) ENGINE=InnoDB;

-- Sessions table for persistent login
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(64) NOT NULL UNIQUE,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent VARCHAR(255) DEFAULT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (session_token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- Friends table
CREATE TABLE IF NOT EXISTS friends (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_friendship (user_id, friend_id),
    INDEX idx_user_friends (user_id, status)
) ENGINE=InnoDB;

-- Game chat messages
CREATE TABLE IF NOT EXISTS game_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    user_id INT DEFAULT NULL,
    message TEXT NOT NULL,
    is_system TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_game_messages (game_id)
) ENGINE=InnoDB;

-- Insert a guest user for anonymous play
INSERT INTO users (username, email, password_hash, is_verified) 
VALUES ('Guest', 'guest@localhost', '', 1)
ON DUPLICATE KEY UPDATE username = username;
