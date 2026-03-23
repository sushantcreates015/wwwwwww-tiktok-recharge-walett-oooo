/* ======== SHARED STATE ======== */
const state = {
  user: null,
  transferProfile: null,
  transactions: [],
  totals: { in: 0, out: 0 },
  balance: 9692068,
  upcomingRewards: 2000000,
  serviceFee: 30
};

/* ======== SETTINGS (saved to localStorage) ======== */
const defaultSettings = {
  availableRewards: 9691068,
  upcomingRewards: 2000000,
  autoRemoveAt: true,
  withdrawalName: 'Transfer details',
  transferDetailsTitle: 'Transfer details',
  transferLabel: 'LIVE rewards transfer to TikTok',
  followerSize: 2,
  paymentLoadingEnabled: true,
  paymentAnimationType: 'dots',
  paymentAnimationDuration: 1,
  searchLoadingEnabled: true,
  searchAnimationType: 'classic',
  searchAnimationDuration: 1,
  paymentLoadingColor: 'pink',
  searchLoadingColor: 'pink',
  floatingCardsEnabled: true,
  floatingCardsPosition: 'mid',
  floatingCardsAccent: 'pink',
  floatingCardPrimary: 'Copied @username',
  floatingCardSecondary: 'sent TikTok',
  floatingCardNote: 'Custom floating cards are style-only.',
  manualOverlayEnabled: true,
  manualBubble1Enabled: true,
  manualBubble1Style: 'outline',
  manualBubble1Title: 'Copied @neoh.muhchihdzieh',
  manualBubble1Text: 'I wentyJsnxivov',
  manualBubble1X: 18,
  manualBubble1Y: 64,
  manualBubble2Enabled: true,
  manualBubble2Style: 'dark',
  manualBubble2Title: '@hoquemozammel368',
  manualBubble2Text: 'Moodmoot',
  manualBubble2X: 20,
  manualBubble2Y: 234,
  manualBubble3Enabled: true,
  manualBubble3Style: 'red',
  manualBubble3Title: 'chi • n0nyenwa ✨',
  manualBubble3Text: 'GR',
  manualBubble3X: 24,
  manualBubble3Y: 302,
  manualBubble4Enabled: true,
  manualBubble4Style: 'dark',
  manualBubble4Title: 'AmaxbooBackup',
  manualBubble4Text: 'Grab Me',
  manualBubble4X: 16,
  manualBubble4Y: 372
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('walletSettings'));
    return saved ? Object.assign({}, defaultSettings, saved) : Object.assign({}, defaultSettings);
  } catch(e) { return Object.assign({}, defaultSettings); }
}

function saveSettings(s) {
  localStorage.setItem('walletSettings', JSON.stringify(s));
}

let settings = loadSettings();

let loginAttempts = 0;
let rateLimitTimer = null;
let sessionValidationInterval = null;
let profileTimer = null;

/* ======== HELPERS ======== */
function el(id) { return document.getElementById(id); }

function toMoney(v) {
  return Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d) {
  return new Date(d || Date.now()).toLocaleString("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
  });
}

function parseLooseNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function loadWalletRuntimeState() {
  try {
    const saved = JSON.parse(localStorage.getItem('walletRuntimeState') || '{}');
    return {
      transactions: Array.isArray(saved.transactions) ? saved.transactions : [],
      totals: {
        in: parseLooseNumber(saved?.totals?.in, 0),
        out: parseLooseNumber(saved?.totals?.out, 0),
      }
    };
  } catch (e) {
    return { transactions: [], totals: { in: 0, out: 0 } };
  }
}

function persistWalletRuntimeState() {
  localStorage.setItem('walletRuntimeState', JSON.stringify({
    transactions: state.transactions,
    totals: state.totals,
  }));
}

const runtimeState = loadWalletRuntimeState();
state.transactions = runtimeState.transactions;
state.totals = runtimeState.totals;

function generateDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('deviceId', id);
  }
  return id;
}

function formatTimeLeft(ms) {
  if (ms <= 0) return 'Expired';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 30) {
    const months = Math.floor(days / 30);
    const rd = days % 30;
    return rd > 0 ? months + ' month' + (months > 1 ? 's' : '') + ' ' + rd + ' day' + (rd > 1 ? 's' : '') : months + ' month' + (months > 1 ? 's' : '');
  } else if (days > 0) {
    const rh = hours % 24;
    return rh > 0 ? days + ' day' + (days > 1 ? 's' : '') + ' ' + rh + ' hour' + (rh !== 1 ? 's' : '') : days + ' day' + (days > 1 ? 's' : '');
  } else if (hours > 0) {
    return hours + ' hour' + (hours > 1 ? 's' : '') + ' ' + (minutes % 60) + ' minute' + ((minutes % 60) !== 1 ? 's' : '');
  } else if (minutes > 0) {
    return minutes + ' minute' + (minutes > 1 ? 's' : '') + ' ' + (seconds % 60) + ' second' + ((seconds % 60) !== 1 ? 's' : '');
  }
  return seconds + ' second' + (seconds !== 1 ? 's' : '');
}
