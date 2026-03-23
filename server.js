const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'wallet-demo-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function seedData() {
  ensureDataDir();
  const usersData = readJson(USERS_FILE, { users: [] });
  const users = Array.isArray(usersData.users) ? usersData.users : [];
  let changed = false;

  let admin = users.find((u) => String(u.username).toLowerCase() === 'admin');
  if (!admin) {
    users.push({
      id: 'admin-1', username: 'admin', password: 'crazzyadmin123', role: 'admin',
      isActive: true, durationMinutes: 0, createdAt: new Date().toISOString(), lastLogin: null, expiresAt: null
    });
    changed = true;
  } else {
    admin.password = 'crazzyadmin123';
    admin.role = 'admin';
    admin.isActive = true;
    changed = true;
  }

  if (!users.some((u) => String(u.username).toLowerCase() === 'demo')) {
    users.push({
      id: 'demo-1', username: 'demo', password: 'demo123', role: 'user',
      isActive: true, durationMinutes: 1440, createdAt: new Date().toISOString(), lastLogin: null, expiresAt: null
    });
    changed = true;
  }

  if (changed) writeJson(USERS_FILE, { users });

  const profilesData = readJson(PROFILES_FILE, { profiles: {} });
  if (!profilesData.profiles || typeof profilesData.profiles !== 'object') {
    writeJson(PROFILES_FILE, { profiles: {} });
  }
}

seedData();

function getUsers() {
  const data = readJson(USERS_FILE, { users: [] });
  return Array.isArray(data.users) ? data.users : [];
}

function saveUsers(users) {
  writeJson(USERS_FILE, { users });
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

function findUserById(id) {
  return getUsers().find((u) => u.id === id);
}

function findUserByUsername(username) {
  const target = String(username || '').trim().toLowerCase();
  return getUsers().find((u) => String(u.username).trim().toLowerCase() === target);
}

function minutesToMs(minutes) {
  return Number(minutes || 0) * 60 * 1000;
}

function isExpired(user) {
  return !!(user && user.expiresAt && new Date(user.expiresAt).getTime() <= Date.now());
}

function enforceUserActive(user) {
  if (!user) return { ok: false, status: 401, message: 'Invalid session' };
  if (!user.isActive) return { ok: false, status: 403, message: 'Account inactive' };
  if (user.role !== 'admin' && isExpired(user)) return { ok: false, status: 440, message: 'Account expired' };
  return { ok: true };
}

function requireAuth(req, res, next) {
  const user = findUserById(req.session.userId);
  const check = enforceUserActive(user);
  if (!check.ok) {
    req.session.destroy(() => {});
    return res.status(check.status).json({ authenticated: false, error: check.message });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = findUserById(req.session.userId);
  const check = enforceUserActive(user);
  if (!check.ok) {
    req.session.destroy(() => {});
    return res.status(check.status).json({ authenticated: false, error: check.message });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  req.user = user;
  next();
}

function loadProfilesMap() {
  const data = readJson(PROFILES_FILE, { profiles: {} });
  return data.profiles || {};
}

function formatFollowers(seed) {
  const hash = crypto.createHash('sha1').update(seed).digest('hex');
  const base = parseInt(hash.slice(0, 8), 16);
  if (base % 5 === 0) return `${(base % 900 + 100).toLocaleString('en-US')}K`;
  return `${((base % 9000) / 100 + 10).toFixed(1)}M`;
}

function titleCaseHandle(handle) {
  return String(handle || '')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeHandle(username) {
  return String(username || '').trim().replace(/^@+/, '').toLowerCase();
}

function isValidHandle(clean) {
  return /^[a-z0-9._]{2,24}$/i.test(clean);
}

function buildProfile(username) {
  const clean = normalizeHandle(username);
  if (!isValidHandle(clean)) return null;
  const profiles = loadProfilesMap();
  const preset = profiles[clean] || {};
  return {
    username: clean,
    nickname: preset.nickname || titleCaseHandle(clean),
    followers: preset.followers || formatFollowers(clean),
    avatar: preset.avatar || `/api/tiktok/avatar?seed=${encodeURIComponent(clean)}`
  };
}

function extractJsonAfter(label, html) {
  const idx = html.indexOf(label);
  if (idx === -1) return null;
  const start = html.indexOf('{', idx);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

function decodeHtml(text) {
  return String(text || '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');
}

function findFirstObjectWithKeys(input, keys) {
  const seen = new Set();
  const stack = [input];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object') continue;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const hasAll = keys.every((k) => Object.prototype.hasOwnProperty.call(cur, k));
    if (hasAll) return cur;
    if (Array.isArray(cur)) stack.push(...cur);
    else stack.push(...Object.values(cur));
  }
  return null;
}

function parseFollowerCount(raw) {
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return `${num}`;
}

async function fetchTikTokLiveProfile(username) {
  const clean = normalizeHandle(username);
  if (!isValidHandle(clean)) return { ok: false, error: 'Enter a valid TikTok username' };
  const url = `https://www.tiktok.com/@${clean}`;
  let response;
  try {
    response = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
        accept: 'text/html,application/xhtml+xml'
      },
      redirect: 'follow'
    });
  } catch {
    return { ok: false, error: 'Could not reach TikTok right now' };
  }

  if (!response.ok) {
    return { ok: false, error: response.status === 404 ? 'TikTok username not found' : 'TikTok lookup failed' };
  }

  const finalUrl = response.url || url;
  const finalMatch = finalUrl.match(/tiktok\.com\/@([^/?#]+)/i);
  if (finalMatch && normalizeHandle(finalMatch[1]) !== clean) {
    return { ok: false, error: 'No exact TikTok username match found' };
  }

  const html = await response.text();
  const metaTitle = decodeHtml((html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || [])[1]);
  const metaImage = decodeHtml((html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || [])[1]);
  const titleHandle = normalizeHandle((metaTitle.match(/@([A-Za-z0-9._]+)/) || [])[1]);
  if (titleHandle && titleHandle !== clean) {
    return { ok: false, error: 'No exact TikTok username match found' };
  }

  let parsed = null;
  for (const label of ['__UNIVERSAL_DATA_FOR_REHYDRATION__', 'SIGI_STATE', '__DEFAULT_SCOPE__']) {
    const jsonText = extractJsonAfter(label, html);
    if (!jsonText) continue;
    try {
      parsed = JSON.parse(jsonText);
      break;
    } catch {
      // keep trying
    }
  }

  let userObj = null;
  let statsObj = null;
  if (parsed) {
    userObj = findFirstObjectWithKeys(parsed, ['uniqueId']) || findFirstObjectWithKeys(parsed, ['unique_id']);
    statsObj = findFirstObjectWithKeys(parsed, ['followerCount']) || findFirstObjectWithKeys(parsed, ['follower_count']);
  }

  const uniqueId = normalizeHandle(userObj?.uniqueId || userObj?.unique_id || clean);
  if (uniqueId !== clean) {
    return { ok: false, error: 'No exact TikTok username match found' };
  }

  const nickname = userObj?.nickname || userObj?.nickName || metaTitle.replace(/\s*@[^@]+.*$/, '').trim() || titleCaseHandle(clean);
  const avatar = userObj?.avatarLarger || userObj?.avatarMedium || userObj?.avatarThumb || userObj?.avatar_url || metaImage || `/api/tiktok/avatar?seed=${encodeURIComponent(clean)}`;
  const followerCount = statsObj?.followerCount || statsObj?.follower_count || null;
  const followers = parseFollowerCount(followerCount) || buildProfile(clean).followers;

  return {
    ok: true,
    data: {
      username: clean,
      nickname,
      followers,
      avatar
    },
    source: 'tiktok-live'
  };
}

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = findUserByUsername(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  if (!user.isActive) {
    return res.status(403).json({ error: 'Account inactive' });
  }
  if (user.role !== 'admin') {
    if (!user.expiresAt && Number(user.durationMinutes || 0) > 0) {
      user.expiresAt = new Date(Date.now() + minutesToMs(user.durationMinutes)).toISOString();
    }
    if (isExpired(user)) {
      user.isActive = false;
      saveUsers(getUsers().map((u) => u.id === user.id ? user : u));
      return res.status(440).json({ error: 'Account expired' });
    }
  }
  user.lastLogin = new Date().toISOString();
  saveUsers(getUsers().map((u) => u.id === user.id ? user : u));
  req.session.userId = user.id;
  res.json({ success: true, user: sanitizeUser(user) });
});

app.get('/api/auth/status', (req, res) => {
  const user = findUserById(req.session.userId);
  const check = enforceUserActive(user);
  if (!check.ok) {
    req.session.destroy(() => {});
    return res.status(check.status === 440 ? 401 : check.status).json({ authenticated: false, error: check.message });
  }
  res.json({ authenticated: true, user: sanitizeUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

app.get('/api/users', requireAdmin, (req, res) => {
  res.json({ users: getUsers().map(sanitizeUser) });
});

app.post('/api/users', requireAdmin, (req, res) => {
  const { username, password, duration } = req.body || {};
  const clean = String(username || '').trim();
  if (!/^[a-zA-Z0-9._]{2,24}$/.test(clean)) {
    return res.status(400).json({ error: 'Username must be 2-24 chars and use only letters, numbers, dot, underscore' });
  }
  if (String(password || '').length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (findUserByUsername(clean)) {
    return res.status(409).json({ error: 'Username already exists' });
  }
  const users = getUsers();
  const user = {
    id: crypto.randomUUID(),
    username: clean,
    password: String(password),
    role: 'user',
    isActive: true,
    durationMinutes: Math.max(1, Number(duration || 30)),
    createdAt: new Date().toISOString(),
    lastLogin: null,
    expiresAt: null
  };
  users.push(user);
  saveUsers(users);
  res.json({ success: true, user: sanitizeUser(user) });
});

app.patch('/api/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const password = String(req.body?.password || '');
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  users[idx].password = password;
  saveUsers(users);
  res.json({ success: true, user: sanitizeUser(users[idx]) });
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const users = getUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') return res.status(400).json({ error: 'Admin user cannot be deleted' });
  saveUsers(users.filter((u) => u.id !== id));
  res.json({ success: true });
});

app.delete('/api/users/expired', requireAdmin, (req, res) => {
  const users = getUsers();
  const deletedUsers = users.filter((u) => u.role !== 'admin' && isExpired(u));
  const kept = users.filter((u) => !(u.role !== 'admin' && isExpired(u)));
  saveUsers(kept);
  res.json({ success: true, deletedCount: deletedUsers.length, deletedUsers: deletedUsers.map(sanitizeUser) });
});

function adjustUserTime(user, deltaMinutes) {
  const copy = { ...user };
  if (copy.role === 'admin') return { ok: false, status: 400, message: 'Admin duration cannot be changed' };
  if (copy.expiresAt) {
    const current = new Date(copy.expiresAt).getTime();
    const next = current + minutesToMs(deltaMinutes);
    if (next <= Date.now()) {
      copy.expiresAt = new Date(Date.now() - 1000).toISOString();
      copy.isActive = false;
      return { ok: true, user: copy, message: 'User has expired after time reduction', newExpiry: copy.expiresAt };
    }
    copy.expiresAt = new Date(next).toISOString();
    copy.isActive = true;
    return { ok: true, user: copy, message: deltaMinutes >= 0 ? 'Time extended successfully' : 'Time reduced successfully', newExpiry: copy.expiresAt };
  }
  const newDuration = Math.max(1, Number(copy.durationMinutes || 0) + deltaMinutes);
  copy.durationMinutes = newDuration;
  return { ok: true, user: copy, message: 'Duration updated successfully', newDuration, note: 'This user has not logged in yet, so only the starting duration was updated.' };
}

app.patch('/api/users/:id/extend', requireAdmin, (req, res) => {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const minutes = (Number(req.body?.days || 0) * 1440) + (Number(req.body?.hours || 0) * 60);
  if (minutes <= 0) return res.status(400).json({ error: 'A positive days or hours value is required' });
  const result = adjustUserTime(users[idx], minutes);
  if (!result.ok) return res.status(result.status || 400).json({ error: result.message });
  users[idx] = result.user;
  saveUsers(users);
  res.json({ success: true, message: result.message, newExpiry: result.newExpiry, newDuration: result.newDuration, note: result.note });
});

app.patch('/api/users/:id/reduce', requireAdmin, (req, res) => {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const minutes = (Number(req.body?.days || 0) * 1440) + (Number(req.body?.hours || 0) * 60);
  if (minutes <= 0) return res.status(400).json({ error: 'A positive days or hours value is required' });
  const result = adjustUserTime(users[idx], -minutes);
  if (!result.ok) return res.status(result.status || 400).json({ error: result.message, suggestion: result.suggestion });
  users[idx] = result.user;
  saveUsers(users);
  res.json({ success: true, message: result.message, newExpiry: result.newExpiry, newDuration: result.newDuration, note: result.note });
});

app.get('/api/tiktok/profile/:username', async (req, res) => {
  const clean = normalizeHandle(req.params.username);
  if (!isValidHandle(clean)) return res.status(400).json({ error: 'Enter a valid TikTok username' });

  const live = await fetchTikTokLiveProfile(clean);
  if (live.ok) return res.json({ success: true, data: live.data, source: live.source });

  const presetMap = loadProfilesMap();
  if (presetMap[clean]) {
    return res.json({ success: true, data: buildProfile(clean), source: 'local-fallback-profile' });
  }

  return res.status(404).json({
    error: live.error || 'TikTok username not found',
    fallbackAvatar: `/api/tiktok/avatar?seed=${encodeURIComponent(clean)}`
  });
});

app.get('/api/tiktok/avatar', (req, res) => {
  const seed = String(req.query.url || req.query.seed || 'tiktok').replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24) || 'tiktok';
  const initials = seed.replace(/[._-]+/g, ' ').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || 'TT';
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="${seed}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#25F4EE"/>
        <stop offset="50%" stop-color="#111111"/>
        <stop offset="100%" stop-color="#FE2C55"/>
      </linearGradient>
    </defs>
    <rect width="256" height="256" rx="128" fill="url(#g)"/>
    <circle cx="128" cy="108" r="42" fill="rgba(255,255,255,0.92)"/>
    <rect x="60" y="156" width="136" height="54" rx="27" fill="rgba(255,255,255,0.92)"/>
    <text x="128" y="236" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${initials}</text>
  </svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});

app.use(express.static(ROOT));

app.get('*', (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TikTok Wallet Demo running on http://localhost:${PORT}`);
});
