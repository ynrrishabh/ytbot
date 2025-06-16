// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const connectBtn = document.getElementById('connectBtn');
const getStartedBtn = document.getElementById('getStartedBtn');
const learnMoreBtn = document.getElementById('learnMoreBtn');

// API Configuration
const API_BASE_URL = 'http://localhost:3000'; // Change this in production

// Authentication State
let isAuthenticated = false;
let currentUser = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupEventListeners();
});

// Check Authentication Status
async function checkAuthStatus() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            isAuthenticated = true;
            currentUser = data.user;
            updateUIForAuthenticatedUser();
        } else {
            localStorage.removeItem('token');
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    loginBtn.addEventListener('click', handleLogin);
    connectBtn.addEventListener('click', handleYouTubeConnect);
    getStartedBtn.addEventListener('click', handleGetStarted);
    learnMoreBtn.addEventListener('click', handleLearnMore);
}

// Handle Login
async function handleLogin() {
    if (isAuthenticated) {
        // Show user menu or profile
        showUserMenu();
    } else {
        // Show login modal
        showLoginModal();
    }
}

// Handle YouTube Connect
async function handleYouTubeConnect() {
    if (!isAuthenticated) {
        showLoginModal();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/youtube/connect`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            window.location.href = data.authUrl;
        } else {
            showAlert('Failed to connect to YouTube', 'danger');
        }
    } catch (error) {
        console.error('YouTube connection failed:', error);
        showAlert('Failed to connect to YouTube', 'danger');
    }
}

// Handle Get Started
function handleGetStarted() {
    if (!isAuthenticated) {
        showLoginModal();
    } else {
        window.location.href = '/dashboard';
    }
}

// Handle Learn More
function handleLearnMore() {
    // Scroll to features section
    document.querySelector('.features-section').scrollIntoView({
        behavior: 'smooth'
    });
}

// Update UI for Authenticated User
function updateUIForAuthenticatedUser() {
    loginBtn.textContent = currentUser.displayName;
    loginBtn.classList.remove('btn-outline-light');
    loginBtn.classList.add('btn-light');
    connectBtn.textContent = 'Connected';
    connectBtn.disabled = true;
}

// Show Login Modal
function showLoginModal() {
    const modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
}

// Show User Menu
function showUserMenu() {
    // Implement user menu dropdown
}

// Show Alert
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('main').prepend(alertDiv);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// API Request Helper
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Socket.IO Connection
function initializeSocket() {
    const socket = io(API_BASE_URL, {
        auth: {
            token: localStorage.getItem('token')
        }
    });

    socket.on('connect', () => {
        console.log('Socket connected');
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
        showAlert('Connection error', 'danger');
    });

    return socket;
}

// Export for use in other modules
window.app = {
    apiRequest,
    showAlert,
    isAuthenticated: () => isAuthenticated,
    currentUser: () => currentUser
}; 