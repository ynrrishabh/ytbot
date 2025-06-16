// DOM Elements
const searchCommand = document.getElementById('searchCommand');
const filterPermission = document.getElementById('filterPermission');
const filterStatus = document.getElementById('filterStatus');
const resetFilters = document.getElementById('resetFilters');
const commandsTable = document.getElementById('commandsTable');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');

// Modal Elements
const addCommandForm = document.getElementById('addCommandForm');
const editCommandForm = document.getElementById('editCommandForm');
const saveCommandBtn = document.getElementById('saveCommandBtn');
const updateCommandBtn = document.getElementById('updateCommandBtn');

// API Configuration
const API_BASE_URL = 'http://localhost:3000';

// Initialize Commands Page
async function initCommandsPage() {
    try {
        // Check authentication
        const user = await checkAuth();
        if (!user) {
            window.location.href = '/frontend/index.html';
            return;
        }

        // Update user info
        updateUserInfo(user);

        // Load commands
        await loadCommands();

        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Failed to initialize commands page:', error);
        showAlert('Failed to load commands. Please try again.', 'danger');
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

// Load Commands
async function loadCommands() {
    try {
        const channelId = getChannelId();
        if (!channelId) return;
        const response = await fetch(`${API_BASE_URL}/commands/${channelId}`, {
            credentials: 'include'
        });
        const commands = await response.json();
        updateCommandsTable(commands);
    } catch (error) {
        console.error('Failed to load commands:', error);
        showAlert('Failed to load commands', 'danger');
    }
}

// Update Commands Table
function updateCommandsTable(commands) {
    commandsTable.innerHTML = commands.map(command => `
        <tr>
            <td>!${command.name}</td>
            <td>${command.response}</td>
            <td>${command.cost} pts</td>
            <td>${command.cooldown}s</td>
            <td>
                <span class="badge bg-${getPermissionBadgeColor(command.permission)}">
                    ${command.permission}
                </span>
            </td>
            <td>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" 
                           ${command.active ? 'checked' : ''}
                           onchange="toggleCommand('${command._id}', this.checked)">
                </div>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-2" 
                        onclick="editCommand('${command._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" 
                        onclick="deleteCommand('${command._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Get Permission Badge Color
function getPermissionBadgeColor(permission) {
    switch (permission) {
        case 'everyone': return 'success';
        case 'subscriber': return 'primary';
        case 'moderator': return 'danger';
        default: return 'secondary';
    }
}

// Toggle Command
async function toggleCommand(commandId, active) {
    try {
        const channelId = getChannelId();
        if (!channelId) return;
        const response = await fetch(`${API_BASE_URL}/commands/${channelId}/${commandId}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ active })
        });
        if (!response.ok) throw new Error('Failed to toggle command');
        showAlert(`Command ${active ? 'activated' : 'deactivated'} successfully`, 'success');
    } catch (error) {
        console.error('Failed to toggle command:', error);
        showAlert('Failed to toggle command', 'danger');
    }
}

// Edit Command
async function editCommand(commandId) {
    try {
        const channelId = getChannelId();
        if (!channelId) return;
        const response = await fetch(`${API_BASE_URL}/commands/${channelId}/${commandId}`, {
            credentials: 'include'
        });
        const command = await response.json();
        
        // Populate edit form
        document.getElementById('editCommandId').value = command._id;
        document.getElementById('editCommandName').value = command.name;
        document.getElementById('editCommandResponse').value = command.response;
        document.getElementById('editCommandCost').value = command.cost;
        document.getElementById('editCommandCooldown').value = command.cooldown;
        document.getElementById('editCommandPermission').value = command.permission;
        
        // Show modal
        new bootstrap.Modal(document.getElementById('editCommandModal')).show();
    } catch (error) {
        console.error('Failed to load command details:', error);
        showAlert('Failed to load command details', 'danger');
    }
}

// Delete Command
async function deleteCommand(commandId) {
    if (!confirm('Are you sure you want to delete this command?')) return;
    
    try {
        const channelId = getChannelId();
        if (!channelId) return;
        const response = await fetch(`${API_BASE_URL}/commands/${channelId}/${commandId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to delete command');
        showAlert('Command deleted successfully', 'success');
        await loadCommands();
    } catch (error) {
        console.error('Failed to delete command:', error);
        showAlert('Failed to delete command', 'danger');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Search and filter
    searchCommand.addEventListener('input', filterCommands);
    filterPermission.addEventListener('change', filterCommands);
    filterStatus.addEventListener('change', filterCommands);
    resetFilters.addEventListener('click', resetCommandFilters);

    // Add command
    saveCommandBtn.addEventListener('click', async () => {
        const formData = {
            name: document.getElementById('commandName').value,
            response: document.getElementById('commandResponse').value,
            cost: parseInt(document.getElementById('commandCost').value),
            cooldown: parseInt(document.getElementById('commandCooldown').value),
            permission: document.getElementById('commandPermission').value
        };
        try {
            const channelId = getChannelId();
            if (!channelId) return;
            const response = await fetch(`${API_BASE_URL}/commands/${channelId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            if (!response.ok) throw new Error('Failed to add command');
            showAlert('Command added successfully', 'success');
            await loadCommands();
        } catch (error) {
            console.error('Failed to add command:', error);
            showAlert('Failed to add command', 'danger');
        }
    });

    // Update command
    updateCommandBtn.addEventListener('click', async () => {
        const commandId = document.getElementById('editCommandId').value;
        const formData = {
            name: document.getElementById('editCommandName').value,
            response: document.getElementById('editCommandResponse').value,
            cost: parseInt(document.getElementById('editCommandCost').value),
            cooldown: parseInt(document.getElementById('editCommandCooldown').value),
            permission: document.getElementById('editCommandPermission').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/commands/${commandId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            if (!response.ok) throw new Error('Failed to update command');
            
            showAlert('Command updated successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editCommandModal')).hide();
            await loadCommands();
        } catch (error) {
            console.error('Failed to update command:', error);
            showAlert('Failed to update command', 'danger');
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

// Filter Commands
function filterCommands() {
    const searchTerm = searchCommand.value.toLowerCase();
    const permissionFilter = filterPermission.value;
    const statusFilter = filterStatus.value;

    const rows = commandsTable.getElementsByTagName('tr');
    for (const row of rows) {
        const commandName = row.cells[0].textContent.toLowerCase();
        const permission = row.cells[4].textContent.trim();
        const status = row.cells[5].querySelector('input').checked;

        const matchesSearch = commandName.includes(searchTerm);
        const matchesPermission = !permissionFilter || permission === permissionFilter;
        const matchesStatus = !statusFilter || 
            (statusFilter === 'active' && status) || 
            (statusFilter === 'inactive' && !status);

        row.style.display = matchesSearch && matchesPermission && matchesStatus ? '' : 'none';
    }
}

// Reset Command Filters
function resetCommandFilters() {
    searchCommand.value = '';
    filterPermission.value = '';
    filterStatus.value = '';
    filterCommands();
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
document.addEventListener('DOMContentLoaded', initCommandsPage); 