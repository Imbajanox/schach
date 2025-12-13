-- Migration: Add Roguelike Mode Tables
-- Version: 002
-- Date: 2025-12-13
-- Description: Creates tables for roguelike chess mode including runs, upgrades, and meta-progression

-- Table: roguelike_runs
-- Stores each roguelike run attempt
CREATE TABLE IF NOT EXISTS roguelike_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    current_zone INT DEFAULT 1,
    current_encounter INT DEFAULT 1,
    gold INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    victory TINYINT(1) DEFAULT 0,
    final_score INT DEFAULT 0,
    run_data JSON DEFAULT NULL COMMENT 'Stores serialized game state',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_active (user_id, is_active),
    INDEX idx_leaderboard (final_score DESC, completed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: roguelike_run_upgrades
-- Stores upgrades acquired during a run
CREATE TABLE IF NOT EXISTS roguelike_run_upgrades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_id INT NOT NULL,
    upgrade_type ENUM('piece_stat', 'artifact', 'ability') NOT NULL,
    upgrade_key VARCHAR(50) NOT NULL COMMENT 'e.g., SCHILDTRAEGER, TELEPORT',
    target_piece ENUM('pawn', 'knight', 'bishop', 'rook', 'queen', 'king') NULL,
    target_square VARCHAR(2) NULL COMMENT 'e.g., e2 for specific piece upgrade',
    upgrade_data JSON NOT NULL COMMENT 'Stores HP, abilities, charges, etc.',
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES roguelike_runs(id) ON DELETE CASCADE,
    INDEX idx_run (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: roguelike_meta_progression
-- Stores persistent meta-progression across runs
CREATE TABLE IF NOT EXISTS roguelike_meta_progression (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    total_runs INT DEFAULT 0,
    total_victories INT DEFAULT 0,
    highest_zone_reached INT DEFAULT 0,
    meta_currency INT DEFAULT 0 COMMENT 'Persistent currency for unlocks',
    unlocked_data JSON DEFAULT '{}' COMMENT 'Classes, starting artifacts, etc.',
    stats_data JSON DEFAULT '{}' COMMENT 'Detailed statistics',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
