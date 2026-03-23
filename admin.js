/* ======== ADMIN PANEL (exact from testfact) ======== */
function showAdminPanel() {
  const panel = el('adminPanel');
  const container = panel ? panel.querySelector('div.bg-white') : null;
  if (panel) { panel.classList.remove('hidden'); panel.style.overflowY = 'auto'; }
  if (container) {
    container.style.maxHeight = '88vh';
    container.style.overflowY = 'auto';
    container.style.WebkitOverflowScrolling = 'touch';
  }
  loadUsersList();
  if (window.adminRefreshInterval) clearInterval(window.adminRefreshInterval);
  window.adminRefreshInterval = setInterval(() => { loadUsersList(); }, 30000);
}
function hideAdminPanel() {
  el('adminPanel').classList.add('hidden');
  if (window.adminRefreshInterval) { clearInterval(window.adminRefreshInterval); window.adminRefreshInterval = null; }
}

async function createUser(username, password) {
  try {
    const days = parseInt(el('userDurationDays').value) || 0;
    const hours = parseInt(el('userDurationHours').value) || 0;
    const minutes = parseInt(el('userDurationMinutes').value) || 0;
    const duration = (days * 1440) + (hours * 60) + minutes;
    if (duration <= 0) { alert('Please set a duration'); return false; }
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password, duration }),
    });
    const data = await response.json();
    if (!response.ok) { alert(data.message || data.error || 'Unknown error'); return false; }
    loadUsersList();
    return true;
  } catch (e) { alert('Network error. Please try again.'); return false; }
}

async function loadUsersList() {
  try {
    const response = await fetch('/api/users', { credentials: 'include' });
    const data = await response.json();
    if (!response.ok) return;
    const usersList = el('usersList');
    usersList.innerHTML = '';

    data.users.forEach(user => {
      const userDiv = document.createElement('div');
      userDiv.className = 'flex justify-between items-center p-3 bg-white rounded-md';
      userDiv.setAttribute('data-user-id', user.id);
      userDiv.setAttribute('data-username', user.username.toLowerCase());

      const statusText = user.isActive ? 'Active' : 'Inactive';
      const statusColor = user.isActive ? 'text-green-600' : 'text-red-600';

      const isOnline = user.lastLogin && user.isActive && (new Date() - new Date(user.lastLogin) < 5 * 60 * 1000);
      const onlineStatusDot = isOnline
        ? '<span class="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" title="Online"></span>'
        : '<span class="inline-block w-2 h-2 bg-gray-400 rounded-full mr-2" title="Offline"></span>';
      const onlineStatusText = isOnline
        ? '<span class="text-xs text-green-600 ml-2">(Online)</span>'
        : '<span class="text-xs text-gray-500 ml-2">(Offline)</span>';

      let extendButton = '', reduceButton = '', editButton = '', extendHourButton = '', reduceHourButton = '';
      if (user.role !== 'admin') {
        extendButton = '<button class="extend-user-days text-white px-2 py-1 rounded-md text-xs mr-1" style="background-color: #10b981 !important; color: white !important; border: 1px solid #059669;" data-username="' + user.username + '" data-id="' + user.id + '" title="Add days">➕ Day</button>';
        reduceButton = '<button class="reduce-user-days text-white px-2 py-1 rounded-md text-xs mr-1" style="background-color: #f59e0b !important; color: white !important; border: 1px solid #d97706;" data-username="' + user.username + '" data-id="' + user.id + '" title="Remove days">➖ Day</button>';
        extendHourButton = '<button class="extend-user-hours text-white px-2 py-1 rounded-md text-xs mr-1" style="background-color: #06b6d4 !important; color: white !important; border: 1px solid #0891b2;" data-username="' + user.username + '" data-id="' + user.id + '" title="Add hours">➕ Hr</button>';
        reduceHourButton = '<button class="reduce-user-hours text-white px-2 py-1 rounded-md text-xs mr-1" style="background-color: #8b5cf6 !important; color: white !important; border: 1px solid #7c3aed;" data-username="' + user.username + '" data-id="' + user.id + '" title="Remove hours">➖ Hr</button>';
        editButton = '<button class="edit-user text-white px-2 py-1 rounded-md text-xs mr-2" style="background-color: #3b82f6 !important; color: white !important; border: 1px solid #2563eb;" data-username="' + user.username + '" data-id="' + user.id + '" data-active="' + user.isActive + '" data-duration="' + (user.durationMinutes || 30) + '">✏️ Edit</button>';
      }

      // Duration text
      let durationText = '';
      const totalMinutes = user.durationMinutes || 30;
      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMins = totalMinutes % 60;
      if (totalHours >= 24) {
        const days = Math.floor(totalHours / 24);
        const hrs = totalHours % 24;
        if (days >= 30) {
          const months = Math.floor(days / 30);
          const rd = days % 30;
          durationText = rd > 0 ? months + ' month' + (months > 1 ? 's' : '') + ' ' + rd + ' day' + (rd > 1 ? 's' : '') : months + ' month' + (months > 1 ? 's' : '');
        } else {
          durationText = hrs > 0 ? days + ' day' + (days > 1 ? 's' : '') + ' ' + hrs + ' hour' + (hrs > 1 ? 's' : '') : days + ' day' + (days > 1 ? 's' : '');
        }
      } else if (totalHours > 0) {
        durationText = remainingMins > 0 ? totalHours + ' hour' + (totalHours > 1 ? 's' : '') + ' ' + remainingMins + ' min' : totalHours + ' hour' + (totalHours > 1 ? 's' : '');
      } else {
        durationText = remainingMins + ' minute' + (remainingMins > 1 ? 's' : '');
      }

      let countdownText = '';
      if (user.expiresAt) {
        const now = new Date();
        const expiry = new Date(user.expiresAt);
        const timeLeft = expiry - now;
        countdownText = timeLeft > 0 ? formatTimeLeft(timeLeft) : 'Expired';
      } else {
        countdownText = durationText + ' (on first login)';
      }

      userDiv.innerHTML =
        '<div class="flex-1">' +
          '<div class="flex items-center justify-between">' +
            '<div class="flex items-center">' + onlineStatusDot + '<span class="font-medium">' + user.username + '</span>' + onlineStatusText + '</div>' +
            '<span class="text-sm ' + statusColor + '">' + statusText + '</span>' +
          '</div>' +
          '<div class="text-xs text-gray-500 mt-1">' +
            'Created: ' + new Date(user.createdAt).toLocaleDateString() +
            (user.lastLogin ? '<br>Last login: ' + new Date(user.lastLogin).toLocaleDateString() + ' ' + new Date(user.lastLogin).toLocaleTimeString() : '<br>Last login: Never') +
            '<br>Duration: ' + durationText +
            '<br>Time left: <span class="countdown-' + user.id + ' font-semibold">' + countdownText + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="flex items-center flex-wrap gap-1">' + editButton + extendButton + reduceButton + extendHourButton + reduceHourButton +
          '<button class="delete-user text-white px-3 py-1 rounded-md text-sm" style="background-color: #ef4444 !important; color: white !important; border: 1px solid #dc2626;" data-username="' + user.username + '" data-id="' + user.id + '">🗑️ Delete</button>' +
        '</div>';
      usersList.appendChild(userDiv);
      if (user.expiresAt && user.isActive) startCountdown(user.id, user.expiresAt);
    });

    // Event handlers
    document.querySelectorAll('.delete-user').forEach(btn => {
      btn.addEventListener('click', async function() {
        const userId = this.getAttribute('data-id');
        const username = this.getAttribute('data-username');
        if (confirm('Delete user ' + username + '?')) await deleteUser(userId);
      });
    });
    document.querySelectorAll('.edit-user').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        openEditUserModal(this.getAttribute('data-id'), this.getAttribute('data-username'));
      });
    });
    document.querySelectorAll('.extend-user-days').forEach(btn => {
      btn.addEventListener('click', async function() {
        const userId = this.getAttribute('data-id');
        const username = this.getAttribute('data-username');
        const days = prompt('Add how many days to ' + username + '\'s account?', '7');
        if (days && !isNaN(days) && days > 0) await extendUserDays(userId, parseInt(days), username);
      });
    });
    document.querySelectorAll('.reduce-user-days').forEach(btn => {
      btn.addEventListener('click', async function() {
        const userId = this.getAttribute('data-id');
        const username = this.getAttribute('data-username');
        const days = prompt('Remove how many days from ' + username + '\'s account?', '1');
        if (days && !isNaN(days) && days > 0) await reduceUserDays(userId, parseInt(days), username);
      });
    });
    document.querySelectorAll('.extend-user-hours').forEach(btn => {
      btn.addEventListener('click', async function() {
        const userId = this.getAttribute('data-id');
        const username = this.getAttribute('data-username');
        const hours = prompt('Add how many hours to ' + username + '\'s account?', '1');
        if (hours && !isNaN(hours) && hours > 0) await extendUserHours(userId, parseInt(hours), username);
      });
    });
    document.querySelectorAll('.reduce-user-hours').forEach(btn => {
      btn.addEventListener('click', async function() {
        const userId = this.getAttribute('data-id');
        const username = this.getAttribute('data-username');
        const hours = prompt('Remove how many hours from ' + username + '\'s account?', '1');
        if (hours && !isNaN(hours) && hours > 0) await reduceUserHours(userId, parseInt(hours), username);
      });
    });

    const customerCount = data.users.filter(u => u.role !== 'admin').length;
    const countEl = el('customerCount');
    if (countEl) countEl.textContent = customerCount;

    const searchInput = el('customerSearchInput');
    if (searchInput) {
      searchInput.removeEventListener('input', filterCustomers);
      searchInput.addEventListener('input', filterCustomers);
    }
  } catch (e) { console.error('Load users error:', e); }
}

async function deleteUser(userId) {
  try {
    const response = await fetch('/api/users/' + userId, { method: 'DELETE', credentials: 'include' });
    const data = await response.json();
    if (!response.ok) { alert(data.message || data.error || 'Unknown error'); return; }
    loadUsersList();
  } catch (e) { alert('Network error.'); }
}

async function deleteAllExpiredUsers() {
  if (!confirm('Are you sure you want to delete ALL expired users? This cannot be undone.')) return;
  try {
    const response = await fetch('/api/users/expired', { method: 'DELETE', credentials: 'include' });
    const data = await response.json();
    if (!response.ok || !data.success) { alert(data.message || data.error || 'Failed'); return; }
    if (data.deletedCount > 0) {
      alert('✅ Deleted ' + data.deletedCount + ' expired user(s):\n\n' + data.deletedUsers.map(u => u.username).join(', '));
    } else { alert('ℹ️ No expired users found.'); }
    loadUsersList();
  } catch (e) { alert('❌ Network error.'); }
}

function startCountdown(userId, expiresAt) {
  const countdownEl = document.querySelector('.countdown-' + userId);
  if (!countdownEl) return;
  const expiryTime = new Date(expiresAt).getTime();
  const update = () => {
    const timeLeft = expiryTime - Date.now();
    if (timeLeft <= 0) {
      countdownEl.textContent = 'Expired';
      countdownEl.classList.add('text-red-600');
      return;
    }
    countdownEl.textContent = formatTimeLeft(timeLeft);
    setTimeout(update, 1000);
  };
  update();
}

async function extendUserDays(userId, days, username) {
  try {
    const response = await fetch('/api/users/' + userId + '/extend', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ days: days }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) { alert(data.message || data.error || 'Failed'); return; }
    loadUsersList();
    alert('✅ ' + data.message + '\n\nNew expiry: ' + new Date(data.newExpiry).toLocaleString());
  } catch (e) { alert('❌ Network error.'); }
}

async function reduceUserDays(userId, days, username) {
  try {
    const response = await fetch('/api/users/' + userId + '/reduce', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ days: days }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      alert(data.message || data.error || 'Failed');
      if (data.suggestion) alert('💡 ' + data.suggestion);
      return;
    }
    loadUsersList();
    if (data.newExpiry) { alert('✅ ' + data.message + '\n\nNew expiry: ' + new Date(data.newExpiry).toLocaleString()); }
    else if (data.newDuration) { alert('✅ ' + data.message + '\n\n' + (data.note || '')); }
    else { alert('✅ ' + data.message); }
  } catch (e) { alert('❌ Network error.'); }
}

async function extendUserHours(userId, hours, username) {
  try {
    const response = await fetch('/api/users/' + userId + '/extend', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ hours: hours }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) { alert(data.message || data.error || 'Failed'); return; }
    loadUsersList();
    alert('✅ ' + data.message + '\n\nNew expiry: ' + new Date(data.newExpiry).toLocaleString());
  } catch (e) { alert('❌ Network error.'); }
}

async function reduceUserHours(userId, hours, username) {
  try {
    const response = await fetch('/api/users/' + userId + '/reduce', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ hours: hours }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      alert(data.message || data.error || 'Failed');
      if (data.suggestion) alert('💡 ' + data.suggestion);
      return;
    }
    loadUsersList();
    if (data.newExpiry) { alert('✅ ' + data.message + '\n\nNew expiry: ' + new Date(data.newExpiry).toLocaleString()); }
    else if (data.newDuration) { alert('✅ ' + data.message + '\n\n' + (data.note || '')); }
    else { alert('✅ ' + data.message); }
  } catch (e) { alert('❌ Network error.'); }
}

function openEditUserModal(userId, username) {
  const modal = el('editUserModal');
  if (!modal) { alert('Error: Edit modal not found.'); return; }
  el('editUserId').value = userId;
  el('editUsername').value = username;
  el('editPassword').value = '';
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}
function closeEditUserModal() {
  const modal = el('editUserModal');
  if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

async function editUser(userId, password) {
  try {
    if (!password || password.trim().length < 6) { alert('Password must be at least 6 characters'); return false; }
    const response = await fetch('/api/users/' + userId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password: password }),
    });
    const data = await response.json();
    if (!response.ok) { alert(data.message || data.error || 'Unknown error'); return false; }
    closeEditUserModal();
    loadUsersList();
    alert('Password updated successfully!');
    return true;
  } catch (e) { alert('Network error.'); return false; }
}

function filterCustomers() {
  const searchInput = el('customerSearchInput');
  if (!searchInput) return;
  const filter = searchInput.value.toLowerCase().trim();
  const usersList = el('usersList');
  if (!usersList) return;
  usersList.querySelectorAll('[data-username]').forEach(div => {
    const username = div.getAttribute('data-username');
    div.style.display = (!filter || (username && username.includes(filter))) ? '' : 'none';
  });
}
