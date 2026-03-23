/* ======== PASSWORD TOGGLE (exact from testfact) ======== */
function togglePasswordVisibility(inputId) {
  enforceSinglePasswordToggle(inputId);
  const input = document.getElementById(inputId);
  const toggleButton = document.querySelector('.password-toggle[data-target="' + inputId + '"]');
  if (!input || !toggleButton) return;
  const isCurrentlyPassword = input.type === 'password';
  const newType = isCurrentlyPassword ? 'text' : 'password';
  input.type = newType;
  setTimeout(() => { if (input.type !== newType) input.setAttribute('type', newType); }, 10);
  input.setAttribute('data-password-visible', isCurrentlyPassword ? 'true' : 'false');
  toggleButton.setAttribute('aria-label', isCurrentlyPassword ? 'Hide password' : 'Show password');
  const openSegments = toggleButton.querySelectorAll('[data-eye-open]');
  const closedSegments = toggleButton.querySelectorAll('[data-eye-closed]');
  if (openSegments.length > 0 && closedSegments.length > 0) {
    const showClosedEye = isCurrentlyPassword;
    openSegments.forEach(s => { s.style.display = showClosedEye ? 'none' : ''; });
    closedSegments.forEach(s => { s.style.display = showClosedEye ? '' : 'none'; });
  }
}

function enforceSinglePasswordToggle(inputId) {
  const wrapper = document.querySelector('[data-password-wrapper="' + inputId + '"]');
  if (!wrapper) return;
  const toggles = wrapper.querySelectorAll('.password-toggle');
  if (toggles.length > 1) toggles.forEach((b, i) => { if (i > 0) b.remove(); });
}

/* ======== LOGIN SYSTEM (exact from testfact) ======== */
function showLoginModal() {
  el('loginModal').classList.remove('hidden');
  if (el('loginError')) el('loginError').classList.add('hidden');
  el('loginUsername').focus();
  updateLoginAttemptsDisplay();
}
function hideLoginModal() {
  el('loginModal').classList.add('hidden');
  clearRateLimitTimer();
}

function updateLoginAttemptsDisplay() {
  const attemptsDiv = el('loginAttempts');
  const countSpan = el('attemptCount');
  const rateDiv = el('rateLimitTimer');
  if (loginAttempts > 0) {
    attemptsDiv.classList.remove('hidden');
    countSpan.textContent = loginAttempts;
    if (loginAttempts >= 5) { rateDiv.classList.remove('hidden'); startRateLimitCountdown(); }
    else { rateDiv.classList.add('hidden'); clearRateLimitTimer(); }
  } else {
    attemptsDiv.classList.add('hidden');
    rateDiv.classList.add('hidden');
    clearRateLimitTimer();
  }
}

function startRateLimitCountdown() {
  clearRateLimitTimer();
  let remaining = 60;
  const span = el('remainingTime');
  const btn = el('loginButton');
  btn.disabled = true;
  btn.textContent = 'Please wait...';
  rateLimitTimer = setInterval(() => {
    remaining--;
    span.textContent = remaining;
    if (remaining <= 0) {
      clearRateLimitTimer();
      btn.disabled = false;
      btn.textContent = 'Login';
      el('rateLimitTimer').classList.add('hidden');
    }
  }, 1000);
}
function clearRateLimitTimer() {
  if (rateLimitTimer) { clearInterval(rateLimitTimer); rateLimitTimer = null; }
}

async function login(username, password) {
  try {
    const deviceId = generateDeviceId();
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password, deviceId }),
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 429) { loginAttempts = 5; updateLoginAttemptsDisplay(); }
      else { loginAttempts++; updateLoginAttemptsDisplay(); }
      el('loginError').textContent = data.error || data.message || 'Login failed';
      el('loginError').classList.remove('hidden');
      return false;
    }
    loginAttempts = 0;
    updateLoginAttemptsDisplay();
    localStorage.setItem('tiktok_username', username);
    hideLoginModal();
    state.user = data.user;

    if (data.user.role === 'admin') {
      showAdminPanel();
      return true;
    } else {
      startPeriodicValidation();
      if (data.user.expiresAt) showTimeLeftNotification(data.user.expiresAt);
      return true;
    }
  } catch (error) {
    loginAttempts++;
    updateLoginAttemptsDisplay();
    el('loginError').textContent = 'Network error. Please try again.';
    el('loginError').classList.remove('hidden');
    return false;
  }
}

/* ======== TIME LEFT NOTIFICATION (exact from testfact) ======== */
function showTimeLeftNotification(expiresAt) {
  if (!expiresAt) return;
  const notification = el('timeLeftNotification');
  const timeDisplay = el('timeLeftDisplay');
  if (!notification || !timeDisplay) return;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const timeLeft = expiry - now;
  if (timeLeft <= 0) { timeDisplay.textContent = 'Expired'; return; }
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  let timeText = '';
  if (days > 0) timeText = days + 'd ' + hours + 'h ' + minutes + 'm ' + seconds + 's';
  else if (hours > 0) timeText = hours + 'h ' + minutes + 'm ' + seconds + 's';
  else if (minutes > 0) timeText = minutes + 'm ' + seconds + 's';
  else timeText = seconds + 's';
  timeDisplay.textContent = timeText;
  notification.classList.remove('hidden');
  setTimeout(() => { notification.style.transform = 'translateX(0)'; notification.style.opacity = '1'; }, 10);
  notification.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); closeTimeLeftNotification(); });
  notification.style.pointerEvents = 'auto';
  const autoClose = setTimeout(() => {
    notification.style.transform = 'translateX(400px)'; notification.style.opacity = '0';
    setTimeout(() => { notification.classList.add('hidden'); notification.style.transform = ''; notification.style.opacity = ''; }, 300);
  }, 8000);
  notification.dataset.timeoutId = autoClose;
}
function closeTimeLeftNotification() {
  const n = el('timeLeftNotification');
  if (n) {
    n.style.transform = 'translateX(400px)'; n.style.opacity = '0';
    setTimeout(() => { n.classList.add('hidden'); n.style.transform = ''; n.style.opacity = ''; }, 300);
  }
}

/* ======== LOGOUT ======== */
async function logout() {
  stopPeriodicValidation();
  try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) {}
  localStorage.removeItem('deviceId');
  localStorage.removeItem('tiktok_username');
  loginAttempts = 0;
  updateLoginAttemptsDisplay();
  state.user = null;
  hideAdminPanel();
  showLoginModal();
}

/* ======== SESSION VALIDATION ======== */
function startPeriodicValidation() {
  if (sessionValidationInterval) return;
  sessionValidationInterval = setInterval(async () => {
    try {
      const response = await fetch('/api/auth/status', { credentials: 'include', signal: AbortSignal.timeout(5000) });
      let data = null;
      try { data = await response.json(); } catch (e) {}
      const unauthenticated = response.status === 401 || response.status === 403 || response.status === 440 || (data && data.authenticated === false);
      if (unauthenticated) { await logout(); return; }
    } catch (e) {}
  }, 10000);
}
function stopPeriodicValidation() {
  if (sessionValidationInterval) { clearInterval(sessionValidationInterval); sessionValidationInterval = null; }
}

/* ======== AUTH STATUS CHECK ======== */
async function checkAuthStatus() {
  try {
    const response = await fetch('/api/auth/status', { credentials: 'include' });
    const data = await response.json();
    if (data.authenticated) {
      state.user = data.user;
      hideLoginModal();
      if (data.user.role === 'admin') {
        stopPeriodicValidation();
        showAdminPanel();
      } else {
        startPeriodicValidation();
      }
      return true;
    }
  } catch (e) {}
  showLoginModal();
  return false;
}

/* ======== INIT PASSWORD TOGGLES ======== */
function initPasswordToggles(ids) {
  ids.forEach(id => {
    enforceSinglePasswordToggle(id);
    const btn = document.querySelector('.password-toggle[data-target="' + id + '"]');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePasswordVisibility(id);
      });
    }
  });
}
