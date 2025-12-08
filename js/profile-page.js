/**
 * Profile Page Script
 * Schach - Chess Game
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

/**
 * Initialize the profile page
 */
async function init() {
    // Check for existing auth session
    const user = await authManager.checkSession();
    
    if (!user) {
        // Redirect to main page if not logged in
        window.location.href = 'index.html';
        return;
    }
    
    // Update UI for logged in user
    updateHeaderForLoggedInUser(user);
    
    // Load profile data
    await loadProfileData();
    
    // Setup event listeners
    setupEventListeners();
}

/**
 * Load profile data
 */
async function loadProfileData() {
    const result = await authManager.getProfile();
    
    if (result.success && result.user) {
        const profile = result.user;
        
        // Update profile header
        document.getElementById('profileUsername').textContent = profile.username;
        document.getElementById('profileElo').textContent = profile.elo_rating || 1200;
        document.getElementById('profileEmail').textContent = profile.email || 'Not set';
        
        // Format join date
        if (profile.created_at) {
            const joinDate = new Date(profile.created_at);
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            document.getElementById('profileJoinDate').textContent = joinDate.toLocaleDateString('en-US', options);
        }
        
        // Update statistics
        const gamesPlayed = profile.games_played || 0;
        const wins = profile.games_won || 0;
        const losses = profile.games_lost || 0;
        const draws = profile.games_drawn || 0;
        
        document.getElementById('profileGamesPlayed').textContent = gamesPlayed;
        document.getElementById('profileWins').textContent = wins;
        document.getElementById('profileLosses').textContent = losses;
        document.getElementById('profileDraws').textContent = draws;
        
        // Calculate win rate
        const winRate = gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : 0;
        document.getElementById('profileWinRate').textContent = winRate + '%';
        
        // Current streak (would need to be calculated from game history)
        document.getElementById('profileCurrentStreak').textContent = profile.current_streak || 0;
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Edit profile button
    document.getElementById('editProfileBtn')?.addEventListener('click', () => {
        showModal('editProfileModal');
    });
    
    // Change password button
    document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
        showModal('changePasswordModal');
    });
    
    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    
    // User dropdown toggle
    const userDropdownBtn = document.getElementById('userDropdownBtn');
    userDropdownBtn?.addEventListener('click', toggleDropdown);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
    
    // Modal close buttons
    document.getElementById('editProfileModalClose')?.addEventListener('click', () => hideModal('editProfileModal'));
    document.getElementById('changePasswordModalClose')?.addEventListener('click', () => hideModal('changePasswordModal'));
    
    // Edit profile form submit
    document.getElementById('editProfileForm')?.addEventListener('submit', handleEditProfileSubmit);
    
    // Change password form submit
    document.getElementById('changePasswordForm')?.addEventListener('submit', handleChangePasswordSubmit);
    
    // Close modals when clicking outside (with drag protection)
    const editProfileModal = document.getElementById('editProfileModal');
    const changePasswordModal = document.getElementById('changePasswordModal');
    
    const setupModalOutsideClick = (modal) => {
        if (!modal) return;
        
        let mouseDownTarget = null;
        
        modal.addEventListener('mousedown', (e) => {
            mouseDownTarget = e.target;
        });
        
        modal.addEventListener('mouseup', (e) => {
            if (mouseDownTarget === modal && e.target === modal) {
                modal.classList.remove('active');
            }
            mouseDownTarget = null;
        });
    };
    
    setupModalOutsideClick(editProfileModal);
    setupModalOutsideClick(changePasswordModal);
}

/**
 * Toggle user dropdown
 */
function toggleDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown?.classList.toggle('active');
}

/**
 * Show modal by ID
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Hide modal by ID
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        // Clear form errors
        const errors = modal.querySelectorAll('.error-message');
        errors.forEach(err => err.textContent = '');
        // Clear general error
        const generalError = modal.querySelector('.general-error');
        if (generalError) {
            generalError.textContent = '';
            generalError.classList.remove('visible');
        }
    }
}

/**
 * Handle edit profile submit
 */
async function handleEditProfileSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('editEmail').value.trim();
    
    if (!email) {
        showFormErrors('editProfile', { email: 'Email is required' });
        return;
    }
    
    const result = await authManager.updateProfile({ email });
    
    if (result.success) {
        hideModal('editProfileModal');
        // Reload profile data
        await loadProfileData();
        alert('Profile updated successfully!');
    } else {
        showFormErrors('editProfile', result.errors);
    }
}

/**
 * Handle change password submit
 */
async function handleChangePasswordSubmit(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    clearFormErrors('changePasswordForm');
    
    if (newPassword !== confirmPassword) {
        showFormErrors('changePassword', { confirm_password: 'Passwords do not match' });
        return;
    }
    
    const result = await authManager.changePassword(currentPassword, newPassword, confirmPassword);
    
    if (result.success) {
        hideModal('changePasswordModal');
        document.getElementById('changePasswordForm').reset();
        alert('Password changed successfully!');
    } else {
        showFormErrors('changePassword', result.errors);
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    await authManager.logout();
    window.location.href = 'index.html';
}

/**
 * Clear form errors
 */
function clearFormErrors(formId) {
    const form = document.getElementById(formId);
    if (form) {
        const errors = form.querySelectorAll('.error-message');
        errors.forEach(err => err.textContent = '');
    }
}

/**
 * Show form errors
 */
function showFormErrors(prefix, errors) {
    if (!errors) return;
    
    for (const [field, message] of Object.entries(errors)) {
        if (field === 'general') {
            const generalError = document.getElementById(`${prefix}GeneralError`);
            if (generalError) {
                generalError.textContent = message;
                generalError.classList.add('visible');
            }
        } else {
            // Map field names
            let fieldId = field;
            if (field === 'current_password') fieldId = 'currentPassword';
            else if (field === 'new_password') fieldId = 'newPassword';
            else if (field === 'confirm_password') fieldId = 'ConfirmPassword';
            else fieldId = field.charAt(0).toUpperCase() + field.slice(1);
            
            const errorEl = document.getElementById(`${prefix}${fieldId}Error`);
            if (errorEl) {
                errorEl.textContent = message;
            }
        }
    }
}

/**
 * Update header for logged in user
 */
function updateHeaderForLoggedInUser(user) {
    const authButtons = document.getElementById('authButtons');
    const userInfo = document.getElementById('userInfo');
    const headerUsername = document.getElementById('headerUsername');
    const headerRating = document.getElementById('headerRating');
    
    // Hide login/register buttons
    if (authButtons) authButtons.style.display = 'none';
    
    // Show user info
    if (userInfo) userInfo.style.display = 'flex';
    
    // Update header
    if (headerUsername) headerUsername.textContent = user.username;
    if (headerRating) headerRating.textContent = `ELO: ${user.elo_rating || 1200}`;
}
