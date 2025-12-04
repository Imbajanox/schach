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
        this.stop();
        this.activeColor = color;
        this.isRunning = true;
        
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
}

// Global timer instance (initialized in main.js)
let chessTimer = null;
