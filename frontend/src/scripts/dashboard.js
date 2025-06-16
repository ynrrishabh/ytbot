// DOM Elements
const statusSpinner = document.getElementById('statusSpinner');
const streamStatus = document.getElementById('streamStatus');
const startStreamBtn = document.getElementById('startStreamBtn');
const stopStreamBtn = document.getElementById('stopStreamBtn');
const viewerCount = document.getElementById('viewerCount');
const totalMessages = document.getElementById('totalMessages');
const activeCommands = document.getElementById('activeCommands');
const activityTable = document.getElementById('activityTable');
const topViewersList = document.getElementById('topViewersList');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');

// API Configuration
const API_BASE_URL = 'http://localhost:3000';

// Socket.IO Connection
let socket;

// Initialize Dashboard
async function initDashboard() {
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
            checkStreamStatus(),
            loadViewerStats(),
            loadRecentActivity(),
            loadTopViewers()
        ]);

        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showAlert('Failed to load dashboard. Please try again.', 'danger');
    }
}

// Check Authentication
async function checkAuth() {
    const user = window.app.currentUser && window.app.currentUser();
    if (!user || !user.channelId) return null;
    return user;
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

    socket.on('stream_status', (data) => {
        updateStreamStatus(data);
    });

    socket.on('viewer_update', (data) => {
        updateViewerStats(data);
    });

    socket.on('activity', (data) => {
        addActivityRow(data);
    });
}

// Check Stream Status
async function checkStreamStatus() {
    try {
        const user = await checkAuth();
        if (!user) throw new Error('Not authenticated');
        const response = await fetch(`${API_BASE_URL}/stream/status/${user.channelId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        updateStreamStatus(data);
    } catch (error) {
        console.error('Failed to check stream status:', error);
        showAlert('Failed to check stream status', 'danger');
    }
}

// Update Stream Status
function updateStreamStatus(data) {
    statusSpinner.style.display = 'none';
    streamStatus.textContent = data.isLive ? 'Live' : 'Offline';
    streamStatus.className = data.isLive ? 'text-success' : 'text-danger';
    
    startStreamBtn.disabled = data.isLive;
    stopStreamBtn.disabled = !data.isLive;
}

// Load Viewer Stats
async function loadViewerStats() {
    try {
        const user = await checkAuth();
        if (!user) throw new Error('Not authenticated');
        const response = await fetch(`${API_BASE_URL}/stream/viewers/${user.channelId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        updateViewerStats(data);
    } catch (error) {
        console.error('Failed to load viewer stats:', error);
        showAlert('Failed to load viewer stats', 'danger');
    }
}

// Update Viewer Stats
function updateViewerStats(data) {
    viewerCount.textContent = data.viewerCount;
    totalMessages.textContent = data.totalMessages;
    activeCommands.textContent = data.activeCommands;
}

// Load Recent Activity
async function loadRecentActivity() {
    try {
        const user = await checkAuth();
        if (!user) throw new Error('Not authenticated');
        const response = await fetch(`${API_BASE_URL}/stream/activity/${user.channelId}`, {
            credentials: 'include'
        });
        const activities = await response.json();
        activityTable.innerHTML = '';
        activities.forEach(activity => addActivityRow(activity));
    } catch (error) {
        console.error('Failed to load recent activity:', error);
        showAlert('Failed to load recent activity', 'danger');
    }
}

// Add Activity Row
function addActivityRow(activity) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${new Date(activity.timestamp).toLocaleTimeString()}</td>
        <td>${activity.user}</td>
        <td>${activity.action}</td>
        <td>${activity.details}</td>
    `;
    activityTable.insertBefore(row, activityTable.firstChild);
    if (activityTable.children.length > 10) {
        activityTable.removeChild(activityTable.lastChild);
    }
}

// Load Top Viewers
async function loadTopViewers() {
    try {
        const user = await checkAuth();
        if (!user) throw new Error('Not authenticated');
        const response = await fetch(`${API_BASE_URL}/points/leaderboard/${user.channelId}`, {
            credentials: 'include'
        });
        const viewers = await response.json();
        updateTopViewers(viewers);
    } catch (error) {
        console.error('Failed to load top viewers:', error);
        showAlert('Failed to load top viewers', 'danger');
    }
}

// Update Top Viewers
function updateTopViewers(viewers) {
    topViewersList.innerHTML = viewers.map((viewer, index) => `
        <div class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <span class="badge bg-primary me-2">#${index + 1}</span>
                ${viewer.username}
            </div>
            <span class="badge bg-success">${viewer.points} pts</span>
        </div>
    `).join('');
}

// Setup Event Listeners
function setupEventListeners() {
    startStreamBtn.addEventListener('click', async () => {
        try {
            const user = await checkAuth();
            if (!user) throw new Error('Not authenticated');
            const response = await fetch(`${API_BASE_URL}/stream/start/${user.channelId}`, {
                method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to start stream');
            showAlert('Stream started successfully', 'success');
        } catch (error) {
            console.error('Failed to start stream:', error);
            showAlert('Failed to start stream', 'danger');
        }
    });

    stopStreamBtn.addEventListener('click', async () => {
        try {
            const user = await checkAuth();
            if (!user) throw new Error('Not authenticated');
            const response = await fetch(`${API_BASE_URL}/stream/stop/${user.channelId}`, {
                method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to stop stream');
            showAlert('Stream stopped successfully', 'success');
        } catch (error) {
            console.error('Failed to stop stream:', error);
            showAlert('Failed to stop stream', 'danger');
        }
    });

    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = '/';
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

// --- Status Dots Logic ---
async function updateStatusDots() {
    // 1. Backend Health
    let backendActive = false;
    try {
        const health = await fetch(API_BASE_URL + '/');
        backendActive = health.ok;
    } catch (e) { backendActive = false; }
    const botDot = document.getElementById('botStatusDot');
    botDot.classList.remove('bg-success', 'bg-danger');
    botDot.classList.add(backendActive ? 'bg-success' : 'bg-danger');

    // 2. Simulate channelId (replace with real user.channelId if available)
    const channelId = 'YOUR_CHANNEL_ID'; // TODO: Replace with real channelId from user

    // 3. Bot Mod Status (simulate, or fetch from backend if endpoint exists)
    let isMod = false;
    try {
        // Example: fetch mod status from /stream/settings/:channelId
        const settingsRes = await fetch(`${API_BASE_URL}/stream/settings/${channelId}`);
        if (settingsRes.ok) {
            const settings = await settingsRes.json();
            // Simulate: if settings has a field like botIsMod, use it. Otherwise, set true for demo.
            isMod = settings.botIsMod !== undefined ? settings.botIsMod : true;
        }
    } catch (e) { isMod = false; }
    let modDot = document.getElementById('modStatusDot');
    if (!modDot) {
        // If not present, add it after botStatusDot
        const botDotDiv = botDot.parentElement;
        modDot = document.createElement('span');
        modDot.id = 'modStatusDot';
        modDot.className = 'status-dot bg-danger ms-3';
        botDotDiv.after(document.createElement('div'));
        botDotDiv.nextSibling.appendChild(modDot);
        botDotDiv.nextSibling.appendChild(document.createTextNode(' Bot is Moderator'));
    }
    modDot.classList.remove('bg-success', 'bg-danger');
    modDot.classList.add(isMod ? 'bg-success' : 'bg-danger');

    // 4. Stream Status
    let isLive = false;
    try {
        const streamRes = await fetch(`${API_BASE_URL}/stream/status/${channelId}`);
        if (streamRes.ok) {
            const stream = await streamRes.json();
            isLive = stream.isLive;
        }
    } catch (e) { isLive = false; }
    const streamDot = document.getElementById('streamStatusDot');
    streamDot.classList.remove('bg-success', 'bg-danger');
    streamDot.classList.add(isLive ? 'bg-success' : 'bg-danger');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateStatusDots();
    initDashboard();
}); 