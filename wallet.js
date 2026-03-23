/* ======== PAGE NAVIGATION ======== */
function showPage(pageId) {
  ["rewardsPage", "transferPage", "toolboxPage", "donePage"].forEach((id) => {
    const page = el(id);
    if (!page) return;
    page.classList.remove("hidden");
    page.classList.toggle("active", id === pageId);
  });
}

/* ======== UPDATE REWARDS DISPLAY ======== */
function updateRewardsDisplay() {
  const avail = parseLooseNumber(settings.availableRewards, 0);
  const upcoming = parseLooseNumber(settings.upcomingRewards, 0);
  const totalOut = state.totals.out;
  const currentBalance = avail - totalOut;

  // Big balance
  const whole = Math.floor(Math.max(0, currentBalance));
  const wholeFormatted = whole.toLocaleString('en-US');
  if (el('balanceWhole')) el('balanceWhole').textContent = wholeFormatted;
  if (el('balanceCents')) el('balanceCents').textContent = '.00';

  // Small cards
  if (el('availRewardSmall')) el('availRewardSmall').textContent = 'USD' + toMoney(Math.max(0, currentBalance));
  if (el('upcomingRewardSmall')) el('upcomingRewardSmall').innerHTML =
    '<span style="display:inline-block;width:8px;height:8px;background:#e53935;border-radius:50%;margin-right:4px;"></span>USD' + toMoney(upcoming);

  // Stats
  if (el('inStat')) el('inStat').textContent = 'USD' + toMoney(avail);
  if (el('outStat')) el('outStat').textContent = 'USD' + toMoney(totalOut);

  // Daily limit
  const remain = Math.max(0, currentBalance);
  const remainM = (remain / 1000000).toFixed(1);
  if (el('dailyLimitText')) el('dailyLimitText').textContent = '$' + remainM + 'M/$10.0M';
  if (el('transferDailyLimit')) el('transferDailyLimit').textContent = remainM + ' / 10.0M';
}

/* ======== TRANSACTIONS ======== */
function renderTransactions() {
  const list = el("txList");
  if (!list) return;
  list.innerHTML = "";
  state.transactions.forEach((tx) => {
    const row = document.createElement("div");
    row.className = "tx-row";
    row.innerHTML =
      '<div><div class="tx-name">' + tx.name + '</div><div class="tx-date">' + tx.date + '</div></div>' +
      '<div class="tx-amount">-USD' + toMoney(Math.abs(tx.amount)) + '</div>';
    list.appendChild(row);
  });
  updateRewardsDisplay();
}

/* ======== TRANSFER AMOUNT ======== */
function updateTransferCalc() {
  let raw = String(el('transferAmount').value).replace(/[^0-9.]/g, '');
  // Remove leading zeros (keep '0' if empty)
  raw = raw.replace(/^0+(\d)/, '$1');
  if (el('transferAmount') && el('transferAmount').value !== raw) el('transferAmount').value = raw || '0';
  const amount = Number(raw) || 0;
  const fee = state.serviceFee;
  const estimated = Math.max(0, amount - fee);
  if (el('estimatedAmount')) el('estimatedAmount').textContent = 'USD ' + toMoney(estimated);
  if (el('serviceFeeText')) el('serviceFeeText').textContent = 'USD ' + toMoney(fee);
  // Enable button only if profile found and amount > 0
  if (el('openTransferDetailBtn')) {
    el('openTransferDetailBtn').disabled = !(state.transferProfile && amount > 0);
  }
}

/* ======== TRANSFER SHEET ======== */
function openSheet() {
  el("sheetOverlay").style.display = "block";
  requestAnimationFrame(() => el("transferSheet").classList.add("open"));
}
function closeSheet() {
  el("transferSheet").classList.remove("open");
  setTimeout(() => { el("sheetOverlay").style.display = "none"; }, 350);
}

/* ======== LOADING ======== */
function createSpinner(type) {
  if (type === 'dots') return '<span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>';
  if (type === 'squares') return '<span></span><span></span><span></span><span></span>';
  return '';
}

function showLoading() {
  const container = el('paymentSpinnerContainer');
  const type = settings.paymentAnimationType;
  applySpinnerTheme('payment', settings.paymentLoadingColor);
  container.className = 'payment-spinner-' + type;
  if (type === 'dots' || type === 'squares') {
    container.innerHTML = createSpinner(type);
  } else {
    container.innerHTML = '';
  }
  el("loadingOverlay").style.display = "flex";
}
function hideLoading() {
  el("loadingOverlay").style.display = "none";
}

function getColorTheme(name) {
  const themes = {
    pink: { main: '#ff2d55', alt: '#25f4ee' },
    cyan: { main: '#25f4ee', alt: '#ff2d55' },
    green: { main: '#16a34a', alt: '#86efac' },
    purple: { main: '#8b5cf6', alt: '#c4b5fd' },
    gold: { main: '#f59e0b', alt: '#fde68a' }
  };
  return themes[name] || themes.pink;
}

function applySpinnerTheme(kind, colorName) {
  const theme = getColorTheme(colorName);
  document.documentElement.style.setProperty('--' + kind + '-color-main', theme.main);
  document.documentElement.style.setProperty('--' + kind + '-color-alt', theme.alt);
}

function applyRuntimeThemeSettings() {
  applySpinnerTheme('payment', settings.paymentLoadingColor);
  applySpinnerTheme('search', settings.searchLoadingColor);
  applyFloatingCardsSettings();
  renderManualOverlayBubbles();
}

function getFloatingCardTheme(name) {
  const themes = {
    pink: { main: '#ff2d55', alt: '#25f4ee' },
    cyan: { main: '#25f4ee', alt: '#0ea5e9' },
    gold: { main: '#f59e0b', alt: '#facc15' },
    green: { main: '#10b981', alt: '#86efac' }
  };
  return themes[name] || themes.pink;
}

function applyFloatingCardsSettings() {
  const layer = el('floatingCardsLayer');
  if (!layer) return;
  const theme = getFloatingCardTheme(settings.floatingCardsAccent);
  document.documentElement.style.setProperty('--floating-accent-main', theme.main);
  document.documentElement.style.setProperty('--floating-accent-alt', theme.alt);
  layer.classList.toggle('hidden', !settings.floatingCardsEnabled);
  layer.classList.remove('pos-top', 'pos-mid', 'pos-low');
  layer.classList.add('pos-' + (settings.floatingCardsPosition || 'mid'));
  if (el('floatingCardPrimaryText')) el('floatingCardPrimaryText').textContent = settings.floatingCardPrimary || 'Copied @username';
  if (el('floatingCardSecondaryText')) el('floatingCardSecondaryText').textContent = settings.floatingCardSecondary || 'sent TikTok';
  if (el('floatingCardNoteText')) el('floatingCardNoteText').textContent = settings.floatingCardNote || 'Custom floating cards are style-only.';
}

function getManualBubble(index) {
  return {
    index,
    enabled: !!settings['manualBubble' + index + 'Enabled'],
    style: settings['manualBubble' + index + 'Style'] || 'dark',
    title: settings['manualBubble' + index + 'Title'] || '',
    text: settings['manualBubble' + index + 'Text'] || '',
    x: parseLooseNumber(settings['manualBubble' + index + 'X'], 16),
    y: parseLooseNumber(settings['manualBubble' + index + 'Y'], 80 + ((index - 1) * 72))
  };
}

function getManualBubbleCopyText(bubble) {
  const combined = (bubble.title + ' ' + bubble.text).trim();
  const handleMatch = combined.match(/@[A-Za-z0-9._-]+/);
  return handleMatch ? handleMatch[0] : combined;
}

function showOverlayCopyToast(text) {
  let toast = el('overlayCopyToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'overlayCopyToast';
    toast.className = 'overlay-copy-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = 'Copied ' + text;
  toast.classList.add('show');
  clearTimeout(showOverlayCopyToast._t);
  showOverlayCopyToast._t = setTimeout(() => toast.classList.remove('show'), 1300);
}

async function copyManualBubbleText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
  } catch (e) {}
  showOverlayCopyToast(text);
}

function saveManualBubblePosition(index, x, y) {
  settings['manualBubble' + index + 'X'] = Math.round(x);
  settings['manualBubble' + index + 'Y'] = Math.round(y);
  saveSettings(settings);
}

function attachManualBubbleInteractions(node, bubble, layer) {
  let startX = 0, startY = 0, originX = 0, originY = 0, dragging = false;
  const onMove = (clientX, clientY) => {
    const dx = clientX - startX;
    const dy = clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragging = true;
    const maxX = Math.max(0, layer.clientWidth - node.offsetWidth - 8);
    const maxY = Math.max(0, layer.clientHeight - node.offsetHeight - 8);
    const nextX = Math.max(0, Math.min(maxX, originX + dx));
    const nextY = Math.max(0, Math.min(maxY, originY + dy));
    node.style.left = nextX + 'px';
    node.style.top = nextY + 'px';
    node.dataset.x = String(nextX);
    node.dataset.y = String(nextY);
  };
  const finish = async () => {
    document.removeEventListener('pointermove', moveListener);
    document.removeEventListener('pointerup', upListener);
    node.classList.remove('dragging');
    const finalX = parseLooseNumber(node.dataset.x, bubble.x);
    const finalY = parseLooseNumber(node.dataset.y, bubble.y);
    saveManualBubblePosition(bubble.index, finalX, finalY);
    if (!dragging) {
      await copyManualBubbleText(getManualBubbleCopyText(bubble));
    }
  };
  const moveListener = (ev) => onMove(ev.clientX, ev.clientY);
  const upListener = () => finish();
  node.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    startX = ev.clientX;
    startY = ev.clientY;
    originX = parseLooseNumber(node.dataset.x, bubble.x);
    originY = parseLooseNumber(node.dataset.y, bubble.y);
    dragging = false;
    node.classList.add('dragging');
    node.setPointerCapture?.(ev.pointerId);
    document.addEventListener('pointermove', moveListener);
    document.addEventListener('pointerup', upListener, { once: true });
  });
}

function renderManualOverlayBubbles() {
  const layer = el('overlayBubblesLayer');
  if (!layer) return;
  layer.innerHTML = '';
  layer.classList.toggle('hidden', !settings.manualOverlayEnabled);
  if (!settings.manualOverlayEnabled) return;
  [1,2,3,4].map(getManualBubble).filter(b => b.enabled && (b.title || b.text)).forEach((bubble) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'overlay-bubble overlay-bubble--' + bubble.style;
    item.style.left = bubble.x + 'px';
    item.style.top = bubble.y + 'px';
    item.dataset.x = String(bubble.x);
    item.dataset.y = String(bubble.y);
    item.innerHTML = '<div class="overlay-bubble__title">' + (bubble.title || '&nbsp;') + '</div>' +
      '<div class="overlay-bubble__text">' + (bubble.text || '&nbsp;') + '</div>';
    layer.appendChild(item);
    attachManualBubbleInteractions(item, bubble, layer);
  });
}

function resetManualOverlayPositions(mode) {
  const defaults = {
    1: { x: 18, y: 64 },
    2: { x: 20, y: 234 },
    3: { x: 24, y: 302 },
    4: { x: 16, y: 372 }
  };
  const stacked = {
    1: { x: 18, y: 64 },
    2: { x: 18, y: 132 },
    3: { x: 18, y: 200 },
    4: { x: 18, y: 268 }
  };
  const useMap = mode === 'stack' ? stacked : defaults;
  [1,2,3,4].forEach((i) => {
    settings['manualBubble' + i + 'X'] = useMap[i].x;
    settings['manualBubble' + i + 'Y'] = useMap[i].y;
  });
  saveSettings(settings);
  renderManualOverlayBubbles();
}

/* ======== SEARCH SPINNER ======== */
function setSearchSpinner(type) {
  const card = el('searchLoaderCard');
  const spinner = el('searchSpinner');
  applySpinnerTheme('search', settings.searchLoadingColor);
  if (!card || !spinner) return;
  spinner.className = 'search-spinner-' + type;
  if (type === 'dots' || type === 'squares') {
    spinner.innerHTML = '<span></span><span></span><span></span>';
  } else {
    spinner.innerHTML = '';
  }
}

/* ======== SUCCESS TOAST ======== */
function showSuccessToast(amount, username) {
  const toast = el("successToast");
  if (el('successToastText')) el('successToastText').textContent = toMoney(amount) + ' USD sent to @' + username;
  toast.classList.add("show");
  // Click to dismiss immediately
  const dismiss = () => { toast.classList.remove("show"); toast.removeEventListener('click', dismiss); };
  toast.addEventListener('click', dismiss);
  setTimeout(() => { toast.classList.remove("show"); toast.removeEventListener('click', dismiss); }, 3500);
}

/* ======== TIKTOK PROFILE LOOKUP ======== */
function setTransferLookupStatus(message, tone) {
  const statusEl = el('transferLookupStatus');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = 'mt-2 text-xs ' + (tone || 'text-gray-500');
}

async function lookupProfile(username) {
  const autoRemove = settings.autoRemoveAt;
  const startedAt = Date.now();
  let clean = String(username || "").trim();
  if (autoRemove) clean = clean.replace(/^@+/, "");
  else if (clean.startsWith('@')) clean = clean.substring(1);
  clean = clean.trim();

  if (clean.length < 2) {
    state.transferProfile = null;
    if (el("profilePreview")) el("profilePreview").classList.add('hidden');
    if (el("searchLoaderCard")) el("searchLoaderCard").classList.add('hidden');
    setTransferLookupStatus('Enter at least 2 characters to search for a TikTok profile.', 'text-gray-500');
    updateTransferCalc();
    return;
  }

  if (settings.searchLoadingEnabled && el("searchLoaderCard")) {
    setSearchSpinner(settings.searchAnimationType);
    el("searchLoaderCard").classList.remove('hidden');
  }
  setTransferLookupStatus('Searching for @' + clean.replace(/^@+/, '') + '...', 'text-pink-600');

  try {
    const response = await fetch("/api/tiktok/profile/" + encodeURIComponent(clean), { credentials: "include" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Profile lookup failed');
    const profile = data.data || {};
    const exact = String(profile.username || '').replace(/^@+/, '').toLowerCase();
    if (!exact || exact !== clean.replace(/^@+/, '').toLowerCase()) {
      throw new Error('No exact TikTok username match found');
    }
    const avatarUrl = profile.avatar || profile.avatarUrl || profile.avatar_url || '';
    state.transferProfile = {
      username: profile.username || clean.replace(/^@+/, '').toLowerCase(),
      nickname: profile.nickname || profile.displayName || profile.uniqueId || clean,
      followers: profile.followers || profile.followerCountText || '0',
      avatar: avatarUrl || ('/api/tiktok/avatar?seed=' + encodeURIComponent(exact))
    };
    if (el("profileHandle")) el("profileHandle").textContent = "@" + state.transferProfile.username;
    if (el("profileName")) el("profileName").textContent = state.transferProfile.nickname;
    if (el("profileFollowers")) {
      el("profileFollowers").textContent = state.transferProfile.followers + " followers";
      const sizes = ['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem'];
      el("profileFollowers").style.fontSize = sizes[settings.followerSize - 1] || '0.875rem';
    }
    if (el("profileAvatar")) {
      el("profileAvatar").src = state.transferProfile.avatar;
      el("profileAvatar").onerror = function() { this.onerror = null; this.src = '/api/tiktok/avatar?seed=' + encodeURIComponent(state.transferProfile.username); };
    }
    if (el("profilePreview")) el("profilePreview").classList.remove('hidden');
    setTransferLookupStatus('Found @' + state.transferProfile.username + '. Enter an amount to enable transfer.', 'text-green-600');
    updateTransferCalc();
  } catch (e) {
    state.transferProfile = null;
    if (el("profilePreview")) el("profilePreview").classList.add('hidden');
    if (el("profileAvatar")) el("profileAvatar").src = '/api/tiktok/avatar?seed=' + encodeURIComponent(clean.replace(/^@+/, ''));
    setTransferLookupStatus(e && e.message ? e.message : 'Could not load that TikTok profile. Please try another username.', 'text-red-500');
    updateTransferCalc();
  } finally {
    const minDelay = settings.searchLoadingEnabled ? (Number(settings.searchAnimationDuration || 1) * 1000) : 0;
    const wait = Math.max(0, minDelay - (Date.now() - startedAt));
    setTimeout(() => {
      if (el("searchLoaderCard")) el("searchLoaderCard").classList.add('hidden');
    }, wait);
  }
}

/* ======== TRANSFER FLOW ======== */
function submitTransfer() {
  const raw = String(el('transferAmount').value).replace(/[^0-9.]/g, '');
  const amount = Number(raw) || 0;
  const handle = state.transferProfile ? state.transferProfile.username : '';
  if (!handle || !(amount > 0)) return;

  const fee = state.serviceFee;
  const estimated = Math.max(0, amount - fee);

  // Fill sheet
  if (el('sheetTitle')) el('sheetTitle').textContent = settings.withdrawalName;
  if (el('detailUser')) el('detailUser').textContent = 'TikTok (@' + handle + ')';
  if (el('detailAmount')) el('detailAmount').textContent = toMoney(amount) + ' USD';
  if (el('detailFee')) el('detailFee').textContent = toMoney(fee) + ' USD';
  if (el('detailEstimated')) el('detailEstimated').textContent = toMoney(estimated) + ' USD';

  openSheet();
}

function confirmTransfer() {
  closeSheet();

  const raw = String(el('transferAmount').value).replace(/[^0-9.]/g, '');
  const amount = Number(raw) || 0;
  const handle = state.transferProfile ? state.transferProfile.username : '';
  const fee = state.serviceFee;
  const estimated = Math.max(0, amount - fee);
  const now = formatDate();
  const txId = String(Date.now());

  if (settings.paymentLoadingEnabled) {
    showLoading();
    const duration = (settings.paymentAnimationDuration || 1) * 1000;
    setTimeout(() => {
      hideLoading();
      finishTransfer(amount, handle, fee, estimated, now, txId);
    }, duration);
  } else {
    finishTransfer(amount, handle, fee, estimated, now, txId);
  }
}

function finishTransfer(amount, handle, fee, estimated, now, txId) {
  // Add to transactions
  state.transactions.unshift({
    name: 'Transfer to @' + handle,
    date: now,
    amount: -amount
  });
  state.totals.out += amount;
  persistWalletRuntimeState();

  // Fill done page
  if (el('donePageTitle')) el('donePageTitle').textContent = settings.transferDetailsTitle;
  if (el('doneTransferLabel')) el('doneTransferLabel').textContent = settings.transferLabel;
  if (el('doneAmountBig')) el('doneAmountBig').textContent = toMoney(amount);
  if (el('donePaymentMethod')) el('donePaymentMethod').textContent = 'TikTok(@' + handle + ')';
  if (el('doneServiceFee')) el('doneServiceFee').textContent = toMoney(fee) + ' USD';
  if (el('doneEstimated')) el('doneEstimated').textContent = toMoney(estimated) + ' USD';
  if (el('doneTransferTime')) el('doneTransferTime').textContent = now;
  if (el('doneTransactionId')) el('doneTransactionId').textContent = txId;

  showPage('donePage');
}

/* ======== TOOLBOX SETTINGS ======== */
function initToolboxSettings() {
  if (el('settingAvailableRewards')) el('settingAvailableRewards').value = settings.availableRewards;
  if (el('settingUpcomingRewards')) el('settingUpcomingRewards').value = settings.upcomingRewards;
  if (el('autoRemoveAt')) el('autoRemoveAt').checked = settings.autoRemoveAt;
  if (el('settingWithdrawalName')) el('settingWithdrawalName').value = settings.withdrawalName;
  if (el('settingTransferDetailsTitle')) el('settingTransferDetailsTitle').value = settings.transferDetailsTitle;
  if (el('settingTransferLabel')) el('settingTransferLabel').value = settings.transferLabel;
  if (el('manualOverlayEnabled')) el('manualOverlayEnabled').checked = settings.manualOverlayEnabled;
  [1,2,3,4].forEach((i) => {
    if (el('manualBubble' + i + 'Enabled')) el('manualBubble' + i + 'Enabled').checked = !!settings['manualBubble' + i + 'Enabled'];
    if (el('manualBubble' + i + 'Style')) el('manualBubble' + i + 'Style').value = settings['manualBubble' + i + 'Style'] || 'dark';
    if (el('manualBubble' + i + 'Title')) el('manualBubble' + i + 'Title').value = settings['manualBubble' + i + 'Title'] || '';
    if (el('manualBubble' + i + 'Text')) el('manualBubble' + i + 'Text').value = settings['manualBubble' + i + 'Text'] || '';
  });
  if (el('floatingCardsEnabled')) el('floatingCardsEnabled').checked = settings.floatingCardsEnabled;
  if (el('floatingCardPrimary')) el('floatingCardPrimary').value = settings.floatingCardPrimary;
  if (el('floatingCardSecondary')) el('floatingCardSecondary').value = settings.floatingCardSecondary;
  if (el('floatingCardNote')) el('floatingCardNote').value = settings.floatingCardNote;
  initSelectorGroup('floatingCardsPositionSelector', 'pos', settings.floatingCardsPosition || 'mid');
  initSelectorGroup('floatingCardsAccentSelector', 'accent', settings.floatingCardsAccent || 'pink');

  // Follower size
  initSelectorGroup('followerSizeSelector', 'size', settings.followerSize);
  // Payment animation
  initSelectorGroup('paymentAnimationType', 'type', settings.paymentAnimationType);
  initSelectorGroup('paymentAnimationDuration', 'duration', settings.paymentAnimationDuration);
  if (el('paymentLoadingToggle')) el('paymentLoadingToggle').checked = settings.paymentLoadingEnabled;
  initSelectorGroup('paymentLoadingColor', 'color', settings.paymentLoadingColor || 'pink');
  // Search animation
  initSelectorGroup('searchAnimationType', 'type', settings.searchAnimationType);
  initSelectorGroup('searchAnimationDuration', 'duration', settings.searchAnimationDuration);
  if (el('searchLoadingToggle')) el('searchLoadingToggle').checked = settings.searchLoadingEnabled;
  initSelectorGroup('searchLoadingColor', 'color', settings.searchLoadingColor || 'pink');
}

function initSelectorGroup(containerId, dataAttr, activeValue) {
  const container = el(containerId);
  if (!container) return;
  const buttons = container.querySelectorAll('button[data-' + dataAttr + ']');
  buttons.forEach(btn => {
    const val = btn.getAttribute('data-' + dataAttr);
    const isActive = String(val) === String(activeValue);
    btn.classList.toggle('bg-red-500', isActive);
    btn.classList.toggle('text-white', isActive);
    btn.addEventListener('click', () => {
      container.querySelectorAll('button[data-' + dataAttr + ']').forEach(b => {
        b.classList.remove('bg-red-500', 'text-white');
      });
      btn.classList.add('bg-red-500', 'text-white');
    });
  });
}

function getSelectedValue(containerId, dataAttr) {
  const container = el(containerId);
  if (!container) return null;
  const active = container.querySelector('button.bg-red-500[data-' + dataAttr + ']');
  return active ? active.getAttribute('data-' + dataAttr) : null;
}

function saveToolboxSettings() {
  settings.availableRewards = parseLooseNumber(el('settingAvailableRewards')?.value, 0);
  settings.upcomingRewards = parseLooseNumber(el('settingUpcomingRewards')?.value, 0);
  settings.autoRemoveAt = el('autoRemoveAt')?.checked || false;
  settings.withdrawalName = el('settingWithdrawalName')?.value || 'Transfer details';
  settings.transferDetailsTitle = el('settingTransferDetailsTitle')?.value || 'Transfer details';
  settings.transferLabel = el('settingTransferLabel')?.value || 'LIVE rewards transfer to TikTok';
  settings.manualOverlayEnabled = el('manualOverlayEnabled')?.checked || false;
  [1,2,3,4].forEach((i) => {
    settings['manualBubble' + i + 'Enabled'] = !!(el('manualBubble' + i + 'Enabled')?.checked);
    settings['manualBubble' + i + 'Style'] = el('manualBubble' + i + 'Style')?.value || 'dark';
    settings['manualBubble' + i + 'Title'] = el('manualBubble' + i + 'Title')?.value || '';
    settings['manualBubble' + i + 'Text'] = el('manualBubble' + i + 'Text')?.value || '';
  });
  settings.followerSize = Number(getSelectedValue('followerSizeSelector', 'size')) || 2;
  settings.paymentLoadingEnabled = el('paymentLoadingToggle')?.checked || false;
  settings.paymentAnimationType = getSelectedValue('paymentAnimationType', 'type') || 'dots';
  settings.paymentAnimationDuration = Number(getSelectedValue('paymentAnimationDuration', 'duration')) || 1;
  settings.paymentLoadingColor = getSelectedValue('paymentLoadingColor', 'color') || 'pink';
  settings.searchLoadingEnabled = el('searchLoadingToggle')?.checked || false;
  settings.searchAnimationType = getSelectedValue('searchAnimationType', 'type') || 'classic';
  settings.searchAnimationDuration = Number(getSelectedValue('searchAnimationDuration', 'duration')) || 1;
  settings.searchLoadingColor = getSelectedValue('searchLoadingColor', 'color') || 'pink';
  settings.floatingCardsEnabled = el('floatingCardsEnabled')?.checked || false;
  settings.floatingCardPrimary = el('floatingCardPrimary')?.value || 'Copied @username';
  settings.floatingCardSecondary = el('floatingCardSecondary')?.value || 'sent TikTok';
  settings.floatingCardNote = el('floatingCardNote')?.value || 'Custom floating cards are style-only.';
  settings.floatingCardsPosition = getSelectedValue('floatingCardsPositionSelector', 'pos') || 'mid';
  settings.floatingCardsAccent = getSelectedValue('floatingCardsAccentSelector', 'accent') || 'pink';

  saveSettings(settings);
  applyRuntimeThemeSettings();
  updateRewardsDisplay();
  alert('Settings saved!');
}

/* ======== PREVIEW ANIMATIONS ======== */
function previewPaymentAnimation() {
  const type = getSelectedValue('paymentAnimationType', 'type') || 'dots';
  const dur = Number(getSelectedValue('paymentAnimationDuration', 'duration')) || 1;
  const oldType = settings.paymentAnimationType;
  const oldDur = settings.paymentAnimationDuration;
  settings.paymentAnimationType = type;
  settings.paymentAnimationDuration = dur;
  showLoading();
  setTimeout(() => {
    hideLoading();
    settings.paymentAnimationType = oldType;
    settings.paymentAnimationDuration = oldDur;
  }, dur * 1000);
}

function previewSearchAnimation() {
  const type = getSelectedValue('searchAnimationType', 'type') || 'classic';
  // Briefly show a search spinner overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.85);display:flex;align-items:center;justify-content:center;z-index:100;';
  const spinner = document.createElement('div');
  spinner.className = 'search-spinner-' + type;
  if (type === 'dots' || type === 'squares') {
    spinner.innerHTML = '<span></span><span></span><span></span>';
  }
  overlay.appendChild(spinner);
  document.body.appendChild(overlay);
  const dur = Number(getSelectedValue('searchAnimationDuration', 'duration')) || 1;
  setTimeout(() => overlay.remove(), dur * 1000);
}

/* ======== EVENT BINDINGS ======== */
function bindEvents() {
  // Page navigation
  if (el('goTransferBtn')) el('goTransferBtn').addEventListener('click', () => {
    if (!state.user) { showLoginModal(); return; }
    // Reset transfer page
    if (el('transferUsername')) el('transferUsername').value = '';
    if (el('transferAmount')) el('transferAmount').value = '0';
    state.transferProfile = null;
    if (el('profilePreview')) el('profilePreview').classList.add('hidden');
    if (el('searchLoaderCard')) el('searchLoaderCard').classList.add('hidden');
    setTransferLookupStatus('Enter a TikTok username to load the profile.', 'text-gray-500');
    updateTransferCalc();
    renderManualOverlayBubbles();
    showPage('transferPage');
  });
  if (el('backToRewardsBtn')) el('backToRewardsBtn').addEventListener('click', () => showPage('rewardsPage'));
  if (el('openToolboxBtn')) el('openToolboxBtn').addEventListener('click', () => {
    if (!state.user) { showLoginModal(); return; }
    initToolboxSettings();
    showPage('toolboxPage');
  });
  if (el('toolboxBackBtn')) el('toolboxBackBtn').addEventListener('click', () => showPage('rewardsPage'));
  if (el('openLoginBtn')) el('openLoginBtn').addEventListener('click', showLoginModal);
  if (el('toolboxLogoutBtn')) el('toolboxLogoutBtn').addEventListener('click', () => { if (confirm('Logout?')) logout(); });
  if (el('openAdminPanelBtn')) el('openAdminPanelBtn').addEventListener('click', showAdminPanel);

  // Transfer flow
  if (el('openTransferDetailBtn')) el('openTransferDetailBtn').addEventListener('click', submitTransfer);
  if (el('cancelTransferBtn')) el('cancelTransferBtn').addEventListener('click', closeSheet);
  if (el('sheetOverlay')) el('sheetOverlay').addEventListener('click', closeSheet);
  if (el('confirmTransferBtn')) el('confirmTransferBtn').addEventListener('click', confirmTransfer);

  // Done page back
  if (el('backToRewardsAfterDoneBtn')) el('backToRewardsAfterDoneBtn').addEventListener('click', () => {
    const lastTx = state.transactions[0];
    renderTransactions();
    showPage('rewardsPage');
    if (lastTx) {
      const handle = lastTx.name.replace('Transfer to @', '');
      showSuccessToast(Math.abs(lastTx.amount), handle);
    }
  });
  if (el('doneBackBtn')) el('doneBackBtn').addEventListener('click', () => {
    renderTransactions();
    showPage('rewardsPage');
  });

  // Profile lookup with debounce
  if (el('transferUsername')) el('transferUsername').addEventListener('input', (e) => {
    clearTimeout(profileTimer);
    profileTimer = setTimeout(() => lookupProfile(e.target.value), 450);
  });

  // Transfer amount calculation
  if (el('transferAmount')) el('transferAmount').addEventListener('input', updateTransferCalc);

  // All button
  if (el('allAmountBtn')) el('allAmountBtn').addEventListener('click', () => {
    const avail = parseLooseNumber(settings.availableRewards, 0) - state.totals.out;
    if (el('transferAmount')) el('transferAmount').value = String(Math.max(0, Math.floor(avail)));
    updateTransferCalc();
  });

  // Exchange button (no-op)
  if (el('exchangeBtn')) el('exchangeBtn').addEventListener('click', () => {});

  // Toolbox save
  if (el('saveToolboxSettings')) el('saveToolboxSettings').addEventListener('click', saveToolboxSettings);
  if (el('previewPaymentAnimation')) el('previewPaymentAnimation').addEventListener('click', previewPaymentAnimation);
  if (el('previewSearchAnimation')) el('previewSearchAnimation').addEventListener('click', previewSearchAnimation);
  if (el('manualOverlayResetPositions')) el('manualOverlayResetPositions').addEventListener('click', () => resetManualOverlayPositions('default'));
  if (el('manualOverlaySnapTop')) el('manualOverlaySnapTop').addEventListener('click', () => resetManualOverlayPositions('stack'));

  // Login form
  if (el('loginForm')) el('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = el('loginUsername').value.trim();
    const password = el('loginPassword').value;
    await login(username, password);
  });

  if (el('contactBtn')) el('contactBtn').addEventListener('click', () => {
    el('contactInfo').classList.toggle('hidden');
  });

  // Admin panel
  if (el('createUserForm')) el('createUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = el('newUsername').value.trim();
    const password = el('newPassword').value;
    if (await createUser(username, password)) {
      el('newUsername').value = '';
      el('newPassword').value = '';
      el('userDurationPreset').value = '1440';
      el('userDurationDays').value = '1';
      el('userDurationHours').value = '0';
      el('userDurationMinutes').value = '0';
      alert('User created successfully');
    }
  });

  // Duration preset sync
  if (el('userDurationPreset')) el('userDurationPreset').addEventListener('change', function() {
    var val = this.value;
    if (val === 'custom') return;
    var mins = parseInt(val);
    var d = Math.floor(mins / 1440);
    var h = Math.floor((mins % 1440) / 60);
    var m = mins % 60;
    el('userDurationDays').value = d;
    el('userDurationHours').value = h;
    el('userDurationMinutes').value = m;
  });
  ['userDurationDays','userDurationHours','userDurationMinutes'].forEach(function(id) {
    if (el(id)) el(id).addEventListener('input', function() {
      el('userDurationPreset').value = 'custom';
    });
  });

  if (el('editUserForm')) el('editUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = el('editUserId').value;
    const password = el('editPassword').value;
    if (!password || password.trim().length < 6) { alert('Min 6 characters'); return; }
    await editUser(userId, password);
  });

  if (el('cancelEditUser')) el('cancelEditUser').addEventListener('click', closeEditUserModal);
  if (el('deleteAllExpiredBtn')) el('deleteAllExpiredBtn').addEventListener('click', deleteAllExpiredUsers);
  if (el('adminLogout')) el('adminLogout').addEventListener('click', logout);
  if (el('adminBackToLogin')) el('adminBackToLogin').addEventListener('click', () => {
    hideAdminPanel();
    showLoginModal();
  });

  // Password toggles
  initPasswordToggles(['loginPassword', 'newPassword', 'editPassword']);
}

/* ======== INIT ======== */
bindEvents();
applyRuntimeThemeSettings();
updateRewardsDisplay();
renderTransactions();
setTransferLookupStatus('Enter a TikTok username to load the profile.', 'text-gray-500');
checkAuthStatus();
