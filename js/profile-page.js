/**
 * Profile Page Script
 * Schach - Chess Game
 */

// Chart instances
let winRateChart = null;
let eloChart = null;

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
        
        // Update avatar displays
        updateAvatarDisplay(profile.avatar);
        
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
        
        // Update overview tab stats
        document.getElementById('profileGamesPlayed').textContent = gamesPlayed;
        document.getElementById('profileWins').textContent = wins;
        document.getElementById('profileLosses').textContent = losses;
        document.getElementById('profileDraws').textContent = draws;
        
        // Calculate win rate
        const winRate = gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : 0;
        document.getElementById('profileWinRate').textContent = winRate + '%';
        
        // Current streak (would need to be calculated from game history)
        const currentStreak = profile.current_win_streak || 0;
        document.getElementById('profileCurrentStreak').textContent = currentStreak;
        
        // Update statistics tab (detailed view)
        document.getElementById('statsGamesPlayed').textContent = gamesPlayed;
        document.getElementById('statsWins').textContent = wins;
        document.getElementById('statsLosses').textContent = losses;
        document.getElementById('statsDraws').textContent = draws;
        document.getElementById('statsWinRate').textContent = winRate + '%';
        document.getElementById('statsElo').textContent = profile.elo_rating || 1200;
        document.getElementById('statsStreak').textContent = currentStreak;
        document.getElementById('statsLongestStreak').textContent = profile.longest_win_streak || 0;
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
    
    // Avatar management
    setupAvatarListeners();
    
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
    
    // Tab switching
    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
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
            else if (field === 'confirm_password') fieldId = 'confirmNewPassword';
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

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Update tab buttons
    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update tab content
    const tabContents = document.querySelectorAll('.profile-tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}Tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
        
        // Load graphs when graphs tab is opened
        if (tabName === 'graphs' && (!winRateChart || !eloChart)) {
            loadAndRenderGraphs();
        }
    }
}

/**
 * Load and render performance graphs
 */
async function loadAndRenderGraphs() {
    try {
        const response = await fetch('.//php/profile/stats-history.php');
        const result = await response.json();
        
        if (result.success && result.data) {
            const { winRate, eloHistory, totalGames } = result.data;
            
            // Show no data message if no games played
            if (totalGames === 0) {
                document.getElementById('noDataMessage').style.display = 'flex';
                document.querySelectorAll('.chart-container').forEach(container => {
                    container.style.display = 'none';
                });
                return;
            }
            
            // Render win rate chart
            renderWinRateChart(winRate);
            
            // Render ELO chart
            renderEloChart(eloHistory);
        }
    } catch (error) {
        console.error('Error loading graph data:', error);
    }
}

/**
 * Render win rate chart
 */
function renderWinRateChart(data) {
    const ctx = document.getElementById('winRateChart');
    if (!ctx) return;
    
    // Prepare data
    const labels = data.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const winRates = data.map(d => d.winRate);
    
    // Destroy existing chart if it exists
    if (winRateChart) {
        winRateChart.destroy();
    }
    
    // Create chart
    winRateChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Win Rate (%)',
                data: winRates,
                borderColor: '#81b64c',
                backgroundColor: 'rgba(129, 182, 76, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#bababa',
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            const dataPoint = data[index];
                            return [
                                `Win Rate: ${dataPoint.winRate}%`,
                                `Games: ${dataPoint.games}`,
                                `Wins: ${dataPoint.wins}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#bababa',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#bababa',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

/**
 * Render ELO rating chart
 */
function renderEloChart(data) {
    const ctx = document.getElementById('eloChart');
    if (!ctx) return;
    
    // Prepare data
    const labels = data.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const eloRatings = data.map(d => d.elo);
    
    // Destroy existing chart if it exists
    if (eloChart) {
        eloChart.destroy();
    }
    
    // Create chart
    eloChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'ELO Rating',
                data: eloRatings,
                borderColor: '#769656',
                backgroundColor: 'rgba(118, 150, 86, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#bababa',
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            const dataPoint = data[index];
                            return [
                                `ELO: ${dataPoint.elo}`,
                                `Game #${dataPoint.gameNumber}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: '#bababa'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#bababa',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

/**
 * Setup avatar-related event listeners
 */
function setupAvatarListeners() {
    // Change avatar button
    document.getElementById('changeAvatarBtn')?.addEventListener('click', async () => {
        const avatarOptions = document.getElementById('avatarOptions');
        if (avatarOptions.style.display === 'none') {
            avatarOptions.style.display = 'block';
            // Load default avatars
            await loadDefaultAvatars();
        } else {
            avatarOptions.style.display = 'none';
        }
    });
    
    // Upload avatar button
    document.getElementById('uploadAvatarBtn')?.addEventListener('click', () => {
        document.getElementById('avatarUpload').click();
    });
    
    // Avatar file input change
    document.getElementById('avatarUpload')?.addEventListener('change', handleAvatarUpload);
    
    // Generate identicon button
    document.getElementById('generateIdenticonBtn')?.addEventListener('click', handleGenerateIdenticon);
    
    // Delete avatar button
    document.getElementById('deleteAvatarBtn')?.addEventListener('click', handleDeleteAvatar);
}

/**
 * Load default avatars
 */
async function loadDefaultAvatars() {
    try {
        const response = await fetch('php/avatar.php');
        const result = await response.json();
        
        if (result.success && result.avatars) {
            const grid = document.getElementById('defaultAvatarsGrid');
            grid.innerHTML = '';
            
            result.avatars.forEach(avatar => {
                const option = document.createElement('div');
                option.className = 'default-avatar-option';
                option.innerHTML = `<img src="${avatar.path}" alt="${avatar.name}">`;
                option.addEventListener('click', () => handleSelectDefaultAvatar(avatar.path));
                grid.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load default avatars:', error);
    }
}

/**
 * Handle avatar upload
 */
async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Maximum size is 5MB.');
        return;
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
        return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
        const response = await fetch('php/avatar.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update avatar display
            updateAvatarDisplay(result.avatar);
            // Hide avatar options
            document.getElementById('avatarOptions').style.display = 'none';
            // Reload profile data
            await loadProfileData();
            alert('Avatar uploaded successfully!');
        } else {
            alert(result.errors?.avatar || result.errors?.general || 'Failed to upload avatar');
        }
    } catch (error) {
        console.error('Avatar upload failed:', error);
        alert('Failed to upload avatar. Please try again.');
    }
    
    // Reset file input
    event.target.value = '';
}

/**
 * Handle generate identicon
 */
async function handleGenerateIdenticon() {
    try {
        const response = await fetch('php/avatar.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'select',
                avatar: 'identicon'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateAvatarDisplay(result.avatar);
            document.getElementById('avatarOptions').style.display = 'none';
            await loadProfileData();
            alert('Identicon generated successfully!');
        } else {
            alert(result.errors?.general || 'Failed to generate identicon');
        }
    } catch (error) {
        console.error('Identicon generation failed:', error);
        alert('Failed to generate identicon. Please try again.');
    }
}

/**
 * Handle select default avatar
 */
async function handleSelectDefaultAvatar(avatarPath) {
    try {
        const response = await fetch('php/avatar.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'select',
                avatar: avatarPath
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateAvatarDisplay(result.avatar);
            document.getElementById('avatarOptions').style.display = 'none';
            await loadProfileData();
            alert('Avatar updated successfully!');
        } else {
            alert(result.errors?.general || 'Failed to select avatar');
        }
    } catch (error) {
        console.error('Avatar selection failed:', error);
        alert('Failed to select avatar. Please try again.');
    }
}

/**
 * Handle delete avatar
 */
async function handleDeleteAvatar() {
    if (!confirm('Are you sure you want to remove your avatar?')) {
        return;
    }
    
    try {
        const response = await fetch('php/avatar.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'delete'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateAvatarDisplay(null);
            document.getElementById('avatarOptions').style.display = 'none';
            await loadProfileData();
            alert('Avatar removed successfully!');
        } else {
            alert(result.errors?.general || 'Failed to remove avatar');
        }
    } catch (error) {
        console.error('Avatar deletion failed:', error);
        alert('Failed to remove avatar. Please try again.');
    }
}

/**
 * Update avatar display
 */
function updateAvatarDisplay(avatarPath) {
    // Update in modal preview
    const currentAvatarImg = document.getElementById('currentAvatarImg');
    const currentAvatarPlaceholder = document.getElementById('currentAvatarPlaceholder');
    
    if (avatarPath) {
        currentAvatarImg.src = avatarPath;
        currentAvatarImg.style.display = 'block';
        currentAvatarPlaceholder.style.display = 'none';
    } else {
        currentAvatarImg.style.display = 'none';
        currentAvatarPlaceholder.style.display = 'block';
    }
    
    // Update profile page large avatar
    const profileAvatar = document.getElementById('profileAvatar');
    if (profileAvatar) {
        if (avatarPath) {
            profileAvatar.innerHTML = `<img src="${avatarPath}" alt="Avatar">`;
        } else {
            profileAvatar.innerHTML = '👤';
        }
    }
    
    // Update header avatar
    const headerAvatar = document.getElementById('userAvatar');
    if (headerAvatar) {
        if (avatarPath) {
            headerAvatar.innerHTML = `<img src="${avatarPath}" alt="Avatar">`;
        } else {
            headerAvatar.innerHTML = '👤';
        }
    }
}
