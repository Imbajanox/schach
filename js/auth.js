/**
 * Authentication Module
 * Handles user registration, login, logout, and session management
 * Chess Game - Schach
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.listeners = [];
        this.apiBase = 'php/auth';
    }
    
    /**
     * Check current session
     */
    async checkSession() {
        try {
            const response = await fetch(`${this.apiBase}/session.php`);
            const data = await response.json();
            
            if (data.success && data.logged_in) {
                this.currentUser = data.user;
                this.notifyListeners('login', this.currentUser);
            } else {
                this.currentUser = null;
                this.notifyListeners('logout', null);
            }
            
            return this.currentUser;
        } catch (error) {
            console.error('Session check failed:', error);
            this.currentUser = null;
            return null;
        }
    }
    
    /**
     * Register a new user
     */
    async register(username, email, password, confirmPassword) {
        try {
            const response = await fetch(`${this.apiBase}/register.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    confirm_password: confirmPassword
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                this.notifyListeners('login', this.currentUser);
            }
            
            return data;
        } catch (error) {
            console.error('Registration failed:', error);
            return {
                success: false,
                errors: { general: 'Network error. Please try again.' }
            };
        }
    }
    
    /**
     * Login user
     */
    async login(identifier, password, rememberMe = false) {
        try {
            const response = await fetch(`${this.apiBase}/login.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identifier,
                    password,
                    remember_me: rememberMe
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                this.notifyListeners('login', this.currentUser);
            }
            
            return data;
        } catch (error) {
            console.error('Login failed:', error);
            return {
                success: false,
                errors: { general: 'Network error. Please try again.' }
            };
        }
    }
    
    /**
     * Logout user
     */
    async logout() {
        try {
            const response = await fetch(`${this.apiBase}/logout.php`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            this.currentUser = null;
            this.notifyListeners('logout', null);
            
            return data;
        } catch (error) {
            console.error('Logout failed:', error);
            // Clear local state anyway
            this.currentUser = null;
            this.notifyListeners('logout', null);
            return { success: true };
        }
    }
    
    /**
     * Get current user profile
     */
    async getProfile(userId = null) {
        try {
            const url = userId ? `php/profile.php?id=${userId}` : 'php/profile.php';
            const response = await fetch(url);
            const data = await response.json();
            
            return data;
        } catch (error) {
            console.error('Get profile failed:', error);
            return {
                success: false,
                errors: { general: 'Network error. Please try again.' }
            };
        }
    }
    
    /**
     * Update user profile
     */
    async updateProfile(profileData) {
        try {
            const response = await fetch('php/profile.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Refresh user data
                await this.checkSession();
            }
            
            return data;
        } catch (error) {
            console.error('Update profile failed:', error);
            return {
                success: false,
                errors: { general: 'Network error. Please try again.' }
            };
        }
    }
    
    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword, confirmPassword) {
        try {
            const response = await fetch(`${this.apiBase}/change-password.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                    confirm_password: confirmPassword
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Change password failed:', error);
            return {
                success: false,
                errors: { general: 'Network error. Please try again.' }
            };
        }
    }
    
    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }
    
    /**
     * Get current user
     */
    getUser() {
        return this.currentUser;
    }
    
    /**
     * Add auth state change listener
     */
    onAuthChange(callback) {
        this.listeners.push(callback);
    }
    
    /**
     * Remove auth state change listener
     */
    offAuthChange(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }
    
    /**
     * Notify listeners of auth state change
     */
    notifyListeners(event, user) {
        this.listeners.forEach(callback => {
            try {
                callback(event, user);
            } catch (error) {
                console.error('Auth listener error:', error);
            }
        });
    }
}

// Create global auth instance
const authManager = new AuthManager();
