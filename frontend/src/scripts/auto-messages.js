// Basic structure for Auto Messages page

document.addEventListener('DOMContentLoaded', () => {
    // TODO: Implement loading, adding, editing, and deleting auto messages
    // For now, just log to show the script is running
    console.log('Auto Messages page loaded.');
});

async function checkAuth() {
    // TEMPORARY BYPASS FOR LOCAL TESTING
    return { username: "testuser" };
}

// Auto Messages CRUD logic

const API_BASE_URL = 'http://localhost:3000';

const messagesTable = document.getElementById('messagesTable');
const addMessageForm = document.getElementById('addMessageForm');
const editMessageForm = document.getElementById('editMessageForm');
const saveMessageBtn = document.getElementById('saveMessageBtn');
const updateMessageBtn = document.getElementById('updateMessageBtn');

// Replace channelId with dynamic value from window.app.currentUser().channelId
function getChannelId() {
    const user = window.app.currentUser && window.app.currentUser();
    return user && user.channelId;
}

// Load all auto messages
async function loadMessages() {
    const channelId = getChannelId();
    if (!channelId) return;
    try {
        const res = await fetch(`${API_BASE_URL}/auto-messages/${channelId}`, { credentials: 'include' });
        const messages = await res.json();
        renderMessages(messages);
    } catch (e) {
        messagesTable.innerHTML = '<tr><td colspan="6">Failed to load messages</td></tr>';
    }
}

// Render messages in table
function renderMessages(messages) {
    messagesTable.innerHTML = messages.map(msg => `
        <tr>
            <td>${msg.message}</td>
            <td>${msg.triggerType || 'interval'}</td>
            <td>${msg.interval ? msg.interval + ' min' : msg.viewerThreshold ? msg.viewerThreshold + ' viewers' : msg.keyword || '-'}</td>
            <td>${msg.lastSent ? new Date(msg.lastSent).toLocaleString() : '-'}</td>
            <td><span class="badge ${msg.isActive ? 'bg-success' : 'bg-secondary'}">${msg.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary me-1" onclick="editMessage('${msg._id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger me-1" onclick="deleteMessage('${msg._id}')"><i class="fas fa-trash"></i></button>
                <button class="btn btn-sm btn-warning" onclick="toggleMessage('${msg._id}')">${msg.isActive ? 'Disable' : 'Enable'}</button>
            </td>
        </tr>
    `).join('');
}

// Add new message
saveMessageBtn.onclick = async () => {
    const message = document.getElementById('messageText').value;
    const triggerType = document.getElementById('triggerType').value;
    const interval = triggerType === 'interval' ? parseInt(document.getElementById('intervalMinutes').value) : undefined;
    const viewerThreshold = triggerType === 'viewer' ? parseInt(document.getElementById('viewerThreshold').value) : undefined;
    const keyword = triggerType === 'keyword' ? document.getElementById('keyword').value : undefined;
    if (!message || (triggerType === 'interval' && !interval)) return;
    const channelId = getChannelId();
    await fetch(`${API_BASE_URL}/auto-messages/${channelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message, triggerType, interval, viewerThreshold, keyword })
    });
    document.getElementById('addMessageModal').querySelector('.btn-close').click();
    addMessageForm.reset();
    loadMessages();
};

// Edit message (populate modal)
window.editMessage = async (id) => {
    const channelId = getChannelId();
    if (!channelId) return;
    const res = await fetch(`${API_BASE_URL}/auto-messages/${channelId}/${id}`, { credentials: 'include' });
    const msg = await res.json();
    document.getElementById('editMessageId').value = msg._id;
    document.getElementById('editMessageText').value = msg.message;
    document.getElementById('editTriggerType').value = msg.triggerType || 'interval';
    document.getElementById('editIntervalMinutes').value = msg.interval || '';
    document.getElementById('editViewerThreshold').value = msg.viewerThreshold || '';
    document.getElementById('editKeyword').value = msg.keyword || '';
    // Show/hide condition fields
    showEditConditionFields(msg.triggerType || 'interval');
    new bootstrap.Modal(document.getElementById('editMessageModal')).show();
};

// Update message
updateMessageBtn.onclick = async () => {
    const id = document.getElementById('editMessageId').value;
    const message = document.getElementById('editMessageText').value;
    const triggerType = document.getElementById('editTriggerType').value;
    const interval = triggerType === 'interval' ? parseInt(document.getElementById('editIntervalMinutes').value) : undefined;
    const viewerThreshold = triggerType === 'viewer' ? parseInt(document.getElementById('editViewerThreshold').value) : undefined;
    const keyword = triggerType === 'keyword' ? document.getElementById('editKeyword').value : undefined;
    const channelId = getChannelId();
    await fetch(`${API_BASE_URL}/auto-messages/${channelId}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message, triggerType, interval, viewerThreshold, keyword })
    });
    document.getElementById('editMessageModal').querySelector('.btn-close').click();
    loadMessages();
};

// Delete message
window.deleteMessage = async (id) => {
    if (!confirm('Delete this auto message?')) return;
    const channelId = getChannelId();
    await fetch(`${API_BASE_URL}/auto-messages/${channelId}/${id}`, {
        method: 'DELETE',
        credentials: 'include'
    });
    loadMessages();
};

// Toggle message active/inactive
window.toggleMessage = async (id) => {
    const channelId = getChannelId();
    await fetch(`${API_BASE_URL}/auto-messages/${channelId}/${id}/toggle`, {
        method: 'PATCH',
        credentials: 'include'
    });
    loadMessages();
};

// Show/hide condition fields in add/edit modals
function showAddConditionFields(type) {
    document.getElementById('intervalCondition').style.display = type === 'interval' ? '' : 'none';
    document.getElementById('viewerCondition').style.display = type === 'viewer' ? '' : 'none';
    document.getElementById('keywordCondition').style.display = type === 'keyword' ? '' : 'none';
}
document.getElementById('triggerType').onchange = e => showAddConditionFields(e.target.value);

function showEditConditionFields(type) {
    document.getElementById('editIntervalCondition').style.display = type === 'interval' ? '' : 'none';
    document.getElementById('editViewerCondition').style.display = type === 'viewer' ? '' : 'none';
    document.getElementById('editKeywordCondition').style.display = type === 'keyword' ? '' : 'none';
}
document.getElementById('editTriggerType').onchange = e => showEditConditionFields(e.target.value);

// Initial load
loadMessages(); 