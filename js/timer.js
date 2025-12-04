/**
 * Chess Timer Controller
 * Schach - Chess Game
 */

class ChessTimer {
    constructor(options = {}) {
        // Default time in seconds (10 minutes)
        this.initialTime = options.initialTime || 600;
        
        // Time remaining for each player (in seconds)
        this.time = {
            [COLORS.WHITE]: this.initialTime,
            [COLORS.BLACK]: this.initialTime
        };
        
        // Current active player's timer
        this.activeColor = null;
        
        // Interval ID for countdown
        this.intervalId = null;
        
        // Is the timer running?
        this.isRunning = false;
        
        // Track time spent on current move (for database storage)
        this.moveStartTime = null;
        this.lastMoveTimeSpent = 0;
        
        // Callbacks
        this.onTick = null;       // Called every second with (color, timeRemaining)
        this.onTimeout = null;    // Called when a player runs out of time
    }

    /**
     * Reset timers to initial time
     */
    reset(initialTime = null) {
        this.stop();
        
        if (initialTime !== null) {
            this.initialTime = initialTime;
        }
        
        this.time = {
            [COLORS.WHITE]: this.initialTime,
            [COLORS.BLACK]: this.initialTime
        };
        
        this.activeColor = null;
        this.moveStartTime = null;
        this.lastMoveTimeSpent = 0;
        
        // Trigger initial display update
        if (this.onTick) {
            this.onTick(COLORS.WHITE, this.time[COLORS.WHITE]);
            this.onTick(COLORS.BLACK, this.time[COLORS.BLACK]);
        }
    }

    /**
     * Start the timer for a specific player
     */
    start(color) {
        // Calculate time spent on the previous move if we're switching players
        if (this.activeColor && this.activeColor !== color && this.moveStartTime) {
            this.lastMoveTimeSpent = Math.floor((Date.now() - this.moveStartTime) / 1000);
        }
        
        this.stop();
        this.activeColor = color;
        this.isRunning = true;
        this.moveStartTime = Date.now();
        
        this.intervalId = setInterval(() => {
            this.tick();
        }, 1000);
    }

    /**
     * Stop the timer
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
    }

    /**
     * Switch timer to the other player
     */
    switchPlayer() {
        if (!this.activeColor) return;
        
        const newColor = this.activeColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        this.start(newColor);
    }

    /**
     * Process one second tick
     */
    tick() {
        if (!this.activeColor || !this.isRunning) return;
        
        this.time[this.activeColor]--;
        
        // Trigger tick callback
        if (this.onTick) {
            this.onTick(this.activeColor, this.time[this.activeColor]);
        }
        
        // Check for timeout
        if (this.time[this.activeColor] <= 0) {
            this.time[this.activeColor] = 0;
            this.stop();
            
            if (this.onTimeout) {
                this.onTimeout(this.activeColor);
            }
        }
    }

    /**
     * Get time remaining for a player
     */
    getTime(color) {
        return this.time[color];
    }

    /**
     * Set time for a player
     */
    setTime(color, seconds) {
        this.time[color] = seconds;
        
        if (this.onTick) {
            this.onTick(color, seconds);
        }
    }

    /**
     * Pause the timer (without resetting active color)
     */
    pause() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
    }

    /**
     * Resume the timer for the active color
     */
    resume() {
        if (this.activeColor && !this.isRunning) {
            this.start(this.activeColor);
        }
    }
    
    /**
     * Get the time spent on the last completed move
     */
    getLastMoveTimeSpent() {
        return this.lastMoveTimeSpent;
    }
    
    /**
     * Get remaining times for both players (for saving to database)
     */
    getRemainingTimes() {
        return {
            white: this.time[COLORS.WHITE],
            black: this.time[COLORS.BLACK]
        };
    }
    
    /**
     * Set remaining times for both players (for loading from database)
     */
    setRemainingTimes(whiteTime, blackTime) {
        this.time[COLORS.WHITE] = whiteTime;
        this.time[COLORS.BLACK] = blackTime;
        
        // Update UI
        if (this.onTick) {
            this.onTick(COLORS.WHITE, whiteTime);
            this.onTick(COLORS.BLACK, blackTime);
        }
    }
}

// Global timer instance (initialized in main.js)
let chessTimer = null;
