// DOM Elements
const pointsRate = document.getElementById('pointsRate');
const totalPoints = document.getElementById('totalPoints');
const activeViewers = document.getElementById('activeViewers');
const leaderboardTable = document.getElementById('leaderboardTable');
const pointsHistoryTable = document.getElementById('pointsHistoryTable');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');

// Settings Elements
const pointsSettingsForm = document.getElementById('pointsSettingsForm');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

// API Configuration
const API_BASE_URL = 'http://localhost:3000';

// Socket.IO Connection
let socket;

// Initialize Points Page
async function initPointsPage() {
    try {
        // Check authentication
        const user = await checkAuth();
        if (!user) {
            window.location.href = '/frontend/index.html';
            return;
        }

        // Update user info
        updateUserInfo(user);

        // Initialize Socket.IO
        initSocket();

        // Load initial data
        await Promise.all([
            loadPointsSettings(),
            loadLeaderboard('today'),
            loadPointsHistory()
        ]);

        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Failed to initialize points page:', error);
        showAlert('Failed to load points data. Please try again.', 'danger');
    }
}

// Check Authentication
async function checkAuth() {
    // TEMPORARY BYPASS FOR LOCAL TESTING
    return { username: "testuser" };
}

// Update User Info
function updateUserInfo(user) {
    userAvatar.src = user.profilePicture || '/assets/default-avatar.png';
    userName.textContent = user.displayName;
}

// Initialize Socket.IO
function initSocket() {
    socket = io(API_BASE_URL, {
        withCredentials: true
    });

    socket.on('connect', () => {
        console.log('Socket connected');
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });

    socket.on('points_update', (data) => {
        updatePointsOverview(data);
    });

    socket.on('leaderboard_update', (data) => {
        updateLeaderboardTable(data);
    });

    socket.on('points_history', (data) => {
        addPointsHistoryRow(data);
    });
}

// Load Points Settings
async function loadPointsSettings() {
    try {
        const channelId = getChannelId();
        if (!channelId) return;
        const response = await fetch(`${API_BASE_URL}/points/settings/${channelId}`, {
            credentials: 'include'
        });
        const settings = await response.json();
        updatePointsSettings(settings);
    } catch (error) {
        console.error('Failed to load points settings:', error);
        showAlert('Failed to load points settings', 'danger');
    }
}

// Update Points Settings
function updatePointsSettings(settings) {
    document.getElementById('pointsRateInput').value = settings.pointsRate;
    document.getElementById('messagePointsInput').value = settings.messagePoints;
    document.getElementById('firstMessageBonusInput').value = settings.firstMessageBonus;
    document.getElementById('subscriberBonusInput').value = settings.subscriberBonus;
    document.getElementById('moderatorBonusInput').value = settings.moderatorBonus;
    
    pointsRate.textContent = settings.pointsRate;
}

// Load Leaderboard (now shows only current user's points and rank)
async function loadLeaderboard(period) {
    try {
        // You may need to get channelId from the user or context
        const channelId = getChannelId();
        const response = await fetch(`${API_BASE_URL}/points/leaderboard/${channelId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        updateLeaderboardTable(data.user);
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        showAlert('Failed to load leaderboard', 'danger');
    }
}

// Update Leaderboard Table (show only current user)
function updateLeaderboardTable(user) {
    document.getElementById('userPointsDisplay').innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2">
            <div><strong>Points:</strong> <span class="fs-4">${user.points}</span></div>
            <div><strong>Rank:</strong> <span class="fs-5">${user.rank}</span></div>
        </div>
    `;
}

// Load Points History
async function loadPointsHistory() {
    try {
        const channelId = getChannelId();
        if (!channelId) return;
        const response = await fetch(`${API_BASE_URL}/points/history/${channelId}`, {
            credentials: 'include'
        });
        const history = await response.json();
        updatePointsHistory(history);
    } catch (error) {
        console.error('Failed to load points history:', error);
        showAlert('Failed to load points history', 'danger');
    }
}

// Update Points History
function updatePointsHistory(history) {
    pointsHistoryTable.innerHTML = history.map(entry => `
        <tr>
            <td>${new Date(entry.timestamp).toLocaleString()}</td>
            <td>${entry.username}</td>
            <td>${entry.action}</td>
            <td class="${entry.points >= 0 ? 'text-success' : 'text-danger'}">
                ${entry.points >= 0 ? '+' : ''}${entry.points}
            </td>
            <td>${entry.balance}</td>
        </tr>
    `).join('');
}

// Add Points History Row
function addPointsHistoryRow(entry) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${new Date(entry.timestamp).toLocaleString()}</td>
        <td>${entry.username}</td>
        <td>${entry.action}</td>
        <td class="${entry.points >= 0 ? 'text-success' : 'text-danger'}">
            ${entry.points >= 0 ? '+' : ''}${entry.points}
        </td>
        <td>${entry.balance}</td>
    `;
    pointsHistoryTable.insertBefore(row, pointsHistoryTable.firstChild);
    if (pointsHistoryTable.children.length > 50) {
        pointsHistoryTable.removeChild(pointsHistoryTable.lastChild);
    }
}

// Update Points Overview
function updatePointsOverview(data) {
    totalPoints.textContent = data.totalPoints;
    activeViewers.textContent = data.activeViewers;
}

// Setup Event Listeners
function setupEventListeners() {
    // Leaderboard period buttons
    document.querySelectorAll('[data-period]').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('[data-period]').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            loadLeaderboard(e.target.dataset.period);
        });
    });

    // Save settings
    saveSettingsBtn.addEventListener('click', async () => {
        const formData = {
            pointsRate: parseInt(document.getElementById('pointsRateInput').value),
            messagePoints: parseInt(document.getElementById('messagePointsInput').value),
            firstMessageBonus: parseInt(document.getElementById('firstMessageBonusInput').value),
            subscriberBonus: parseInt(document.getElementById('subscriberBonusInput').value),
            moderatorBonus: parseInt(document.getElementById('moderatorBonusInput').value)
        };

        try {
            const response = await fetch(`${API_BASE_URL}/points/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            if (!response.ok) throw new Error('Failed to update settings');
            
            showAlert('Points settings updated successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('pointsSettingsModal')).hide();
            updatePointsSettings(formData);
        } catch (error) {
            console.error('Failed to update points settings:', error);
            showAlert('Failed to update points settings', 'danger');
        }
    });

    // Logout
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = '/frontend/index.html';
        } catch (error) {
            console.error('Logout failed:', error);
            showAlert('Failed to logout', 'danger');
        }
    });
}

// Show Alert
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('main').insertBefore(alertDiv, document.querySelector('main').firstChild);
    setTimeout(() => alertDiv.remove(), 5000);
}

// Add getChannelId helper
function getChannelId() {
    const user = window.app.currentUser && window.app.currentUser();
    return user && user.channelId;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initPointsPage); 