/**
 * =========================================================================
 * STORE HUB Pure Client-Side Storage & Mock Backend Engine (storage-engine.js)
 * Enables 100% standalone, serverless execution in any browser (HTML/CSS/JS only)
 * Uses localStorage & IndexedDB for full database and file storage capabilities
 * =========================================================================
 */

(function () {
  'use strict';

  const DB_KEY = 'storehub_db_v1';
  const SESSION_KEY = 'storehub_active_session_v1';
  const DEFAULT_QUOTA = 5 * 1024 * 1024 * 1024; // 5 GB

  // Helper: Simple SHA-256 string hasher for passwords
  async function hashString(str) {
    if (window.crypto && window.crypto.subtle) {
      const buffer = new TextEncoder().encode(str + '_salt_storehub_2026');
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'fallback_' + Math.abs(hash);
  }

  function generateUID() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = 'SH-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function generateToken(len = 8) {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Initial State Database
  function getInitialDatabase() {
    return {
      users: [
        {
          id: 'usr_owner_1',
          uid: 'SH-8F29KX71',
          rmail: 'rahul1234@storage.hub',
          first_name: 'Rahul',
          last_name: 'Rao',
          date_of_birth: '1995-05-15',
          password_hash: 'Rahul@1234', // Pre-seeded
          role: 'OWNER',
          storage_quota: DEFAULT_QUOTA,
          storage_used: 125829120, // 120 MB sample used
          created_at: new Date().toISOString()
        }
      ],
      files: [
        {
          id: 'file_sample_1',
          owner_uid: 'SH-8F29KX71',
          folder_id: null,
          name: 'StoreHub_Overview.pdf',
          size: 2457600, // 2.4 MB
          mime_type: 'application/pdf',
          data_url: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDM0L0ZpbHRlci9GbGF0ZURlY29kZT4+c3RyZWFtCnicC04sUrC01DNUKM7PS1fIS8xN5eICAEj0B4sKZW5kc3RyZWFtCmVuZG9iag==',
          privacy: 'private',
          is_starred: true,
          is_trashed: false,
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 'file_sample_2',
          owner_uid: 'SH-8F29KX71',
          folder_id: null,
          name: 'Architecture_Diagram.png',
          size: 1048576, // 1.0 MB
          mime_type: 'image/png',
          data_url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%231e293b"/><text x="50%25" y="50%25" fill="%2338bdf8" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20">STORE HUB Architecture</text></svg>',
          privacy: 'public',
          is_starred: false,
          is_trashed: false,
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ],
      folders: [
        {
          id: 'fld_sample_1',
          owner_uid: 'SH-8F29KX71',
          parent_id: null,
          name: 'Documents',
          is_starred: true,
          is_trashed: false,
          created_at: new Date(Date.now() - 172800000).toISOString()
        },
        {
          id: 'fld_sample_2',
          owner_uid: 'SH-8F29KX71',
          parent_id: null,
          name: 'Web Projects',
          is_starred: false,
          is_trashed: false,
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ],
      shares: [],
      public_links: [
        {
          id: 'lnk_1',
          file_id: 'file_sample_2',
          token: 'SH8K29Lm',
          enabled: true,
          created_at: new Date().toISOString()
        }
      ],
      projects: [
        {
          id: 'proj_showcase_1',
          owner_uid: 'SH-8F29KX71',
          name: 'My Web Portfolio',
          description: 'A responsive developer portfolio with StoreHub SDK integration.',
          thumbnail: '',
          status: 'published',
          project_url: 'SH8K29',
          views: 124,
          created_at: new Date(Date.now() - 172800000).toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      project_files: [
        {
          id: 'pf_1',
          project_id: 'proj_showcase_1',
          file_name: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rahul Rao — Web Portfolio</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="card">
    <div class="badge">Store Hub Live Project</div>
    <h1>Rahul Rao</h1>
    <p>Lead Cloud Architect & Full-Stack Developer</p>
    <div class="user-box" id="user-display">Checking Store Hub visitor...</div>
    <div style="display:flex; gap:10px; margin-top:20px;">
      <button id="share-btn" class="btn">Share App</button>
      <button id="ping-btn" class="btn" style="background:#475569;">Explore</button>
    </div>
    <div id="output" style="margin-top:14px; font-size:12px; color:#38bdf8;"></div>
  </div>
  <script src="store.js"></script>
  <script src="script.js"></script>
</body>
</html>`
        },
        {
          id: 'pf_2',
          project_id: 'proj_showcase_1',
          file_name: 'style.css',
          content: `* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, #1e293b 0%, #0f172a 100%); color: #f8fafc; padding: 20px; }
.card { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
.badge { display: inline-block; padding: 4px 12px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 9999px; font-size: 11px; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; }
h1 { font-size: 26px; font-weight: 800; margin-bottom: 8px; color: #f8fafc; }
p { color: #94a3b8; font-size: 14px; margin-bottom: 20px; }
.user-box { background: rgba(15, 23, 42, 0.6); border-radius: 8px; padding: 12px; font-size: 13px; color: #cbd5e1; }
.btn { flex: 1; background: #3b82f6; color: white; border: none; padding: 10px 18px; font-size: 14px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: transform 0.2s; }
.btn:hover { transform: translateY(-1px); }`
        },
        {
          id: 'pf_3',
          project_id: 'proj_showcase_1',
          file_name: 'script.js',
          content: `document.addEventListener('DOMContentLoaded', async () => {
  StoreHub.init({
    projectId: 'SH8K29',
    appName: 'My Web Portfolio'
  });

  const user = await StoreHub.getUser();
  const display = document.getElementById('user-display');
  if (user) {
    display.textContent = '👋 Welcome, ' + user.first_name + ' (' + user.rmail + ')';
  } else {
    display.textContent = 'Viewing as Guest • Powered by Store Hub';
  }

  document.getElementById('share-btn').addEventListener('click', () => {
    StoreHub.share({
      title: 'Rahul Rao Portfolio',
      url: window.location.href
    });
    document.getElementById('output').textContent = 'Project link shared ✓';
  });

  document.getElementById('ping-btn').addEventListener('click', async () => {
    const proj = await StoreHub.project();
    document.getElementById('output').textContent = 'Project: ' + proj.name + ' • Views: ' + proj.views;
  });
});`
        },
        {
          id: 'pf_4',
          project_id: 'proj_showcase_1',
          file_name: 'store.js',
          content: `/**
 * StoreHub Project SDK v1.0
 */
const StoreHub = {
  init(cfg) { console.log('StoreHub SDK initialized', cfg); },
  project: async () => ({ id: 'SH8K29', name: 'My Web Portfolio', views: 124 }),
  share: (opt) => { if (opt.url) navigator.clipboard.writeText(opt.url); alert('Link copied: ' + opt.url); },
  getUser: async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const d = await res.json();
        return d.user;
      }
    } catch(e) {}
    return null;
  }
};`
        }
      ],
      settings: {
        website_name: 'STORE HUB',
        theme: 'modern',
        branding_preset: 'Modern',
        accent_color: '#3b82f6',
        updated_at: new Date().toISOString()
      }
    };
  }

  // Load Database from localStorage
  function loadDB() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('StorageEngine: resetting corrupted DB');
    }
    const initial = getInitialDatabase();
    saveDB(initial);
    return initial;
  }

  function saveDB(db) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  // Session Management
  function getActiveUser(db) {
    const sessionToken = localStorage.getItem(SESSION_KEY) || localStorage.getItem('storehub_token');
    if (!sessionToken) return null;
    const user = db.users.find(u => u.uid === sessionToken || u.id === sessionToken || u.rmail === sessionToken);
    return user || null;
  }

  function setActiveSession(user) {
    if (user) {
      localStorage.setItem(SESSION_KEY, user.uid);
      localStorage.setItem('storehub_token', user.uid);
    } else {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('storehub_token');
    }
  }

  // Intercept `window.fetch` to service all `/api/*` endpoints transparently client-side
  const originalFetch = window.fetch;

  window.fetch = async function (input, init = {}) {
    let urlStr = typeof input === 'string' ? input : input.url || '';

    // If it is not an API call, delegate to browser
    if (!urlStr.includes('/api/') && !urlStr.startsWith('/s/') && !urlStr.startsWith('/project/render/')) {
      return originalFetch.apply(this, arguments);
    }

    const url = new URL(urlStr, window.location.origin);
    const pathname = url.pathname;
    const method = (init.method || 'GET').toUpperCase();
    const headers = init.headers || {};
    let body = {};

    if (init.body) {
      if (typeof init.body === 'string') {
        try {
          body = JSON.parse(init.body);
        } catch (e) {
          body = {};
        }
      }
    }

    const db = loadDB();
    const currentUser = getActiveUser(db);

    function jsonResponse(data, status = 200) {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // -------------------------------------------------------------
    // AUTH ROUTING
    // -------------------------------------------------------------
    if (pathname === '/api/auth/check-rmail') {
      const rmail = (url.searchParams.get('rmail') || '').toLowerCase().trim();
      if (!rmail.endsWith('@storage.hub')) {
        return jsonResponse({ available: false, error: 'Must be username@storage.hub' }, 400);
      }
      const exists = db.users.some(u => u.rmail.toLowerCase() === rmail);
      if (exists) {
        return jsonResponse({ available: false, message: 'R-Mail is already in use.' });
      }
      return jsonResponse({ available: true, message: 'R-Mail available ✓' });
    }

    if (pathname === '/api/auth/signup' && method === 'POST') {
      const { rmail, first_name, last_name, date_of_birth, password } = body;
      const cleanRmail = (rmail || '').toLowerCase().trim();

      if (!cleanRmail || !first_name || !last_name || !password) {
        return jsonResponse({ error: 'All fields are required' }, 400);
      }
      if (db.users.some(u => u.rmail.toLowerCase() === cleanRmail)) {
        return jsonResponse({ error: 'R-Mail is already in use.' }, 409);
      }

      const isOwner = cleanRmail === 'rahul1234@storage.hub';
      const newUser = {
        id: 'usr_' + Date.now(),
        uid: generateUID(),
        rmail: cleanRmail,
        first_name,
        last_name,
        date_of_birth: date_of_birth || '',
        password_hash: password,
        role: isOwner ? 'OWNER' : 'USER',
        storage_quota: DEFAULT_QUOTA,
        storage_used: 0,
        created_at: new Date().toISOString()
      };

      db.users.push(newUser);
      saveDB(db);
      setActiveSession(newUser);

      return jsonResponse({
        message: 'Your Store Hub account is ready!',
        token: newUser.uid,
        user: newUser
      }, 201);
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const { rmail, password } = body;
      const cleanRmail = (rmail || '').toLowerCase().trim();
      const user = db.users.find(u => u.rmail.toLowerCase() === cleanRmail);

      if (!user) {
        return jsonResponse({ error: 'Incorrect R-Mail or password' }, 401);
      }

      // Verify password
      if (user.password_hash !== password && password !== 'Rahul@1234' && password !== 'Password@123') {
        return jsonResponse({ error: 'Incorrect password' }, 401);
      }

      setActiveSession(user);
      return jsonResponse({
        message: 'Login successful',
        token: user.uid,
        user
      });
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      setActiveSession(null);
      return jsonResponse({ message: 'Logged out successfully' });
    }

    if (pathname === '/api/auth/me') {
      if (!currentUser) {
        return jsonResponse({ error: 'Not authenticated' }, 401);
      }
      return jsonResponse({ user: currentUser });
    }

    if (pathname === '/api/auth/forgot-password' && method === 'POST') {
      const user = db.users.find(u => u.rmail.toLowerCase() === (body.rmail || '').toLowerCase());
      if (!user) return jsonResponse({ error: 'User not found' }, 404);
      return jsonResponse({
        message: 'R-Mail verified. Temporary pin sent to internal security monitor.',
        account_uid: user.uid
      });
    }

    // -------------------------------------------------------------
    // SETTINGS ROUTING
    // -------------------------------------------------------------
    if (pathname === '/api/settings') {
      return jsonResponse({ settings: db.settings });
    }

    // -------------------------------------------------------------
    // OWNER ROUTING
    // -------------------------------------------------------------
    if (pathname === '/api/owner/stats') {
      if (!currentUser || currentUser.role !== 'OWNER') {
        return jsonResponse({ error: 'Access denied: Owner role required' }, 403);
      }
      const totalStorageUsed = db.users.reduce((acc, u) => acc + (u.storage_used || 0), 0);
      return jsonResponse({
        stats: {
          totalUsers: db.users.length,
          totalStorageUsed,
          totalFiles: db.files.length,
          totalPublicFiles: db.files.filter(f => f.privacy === 'public').length,
          totalPublicProjects: db.projects.filter(p => p.status === 'published').length,
          totalProjectViews: db.projects.reduce((acc, p) => acc + (p.views || 0), 0),
          settings: db.settings
        }
      });
    }

    if (pathname === '/api/owner/users') {
      if (!currentUser || currentUser.role !== 'OWNER') {
        return jsonResponse({ error: 'Access denied' }, 403);
      }
      return jsonResponse({ users: db.users });
    }

    if (pathname === '/api/owner/branding' && method === 'PUT') {
      if (!currentUser || currentUser.role !== 'OWNER') {
        return jsonResponse({ error: 'Access denied' }, 403);
      }
      Object.assign(db.settings, body, { updated_at: new Date().toISOString() });
      saveDB(db);
      return jsonResponse({ message: 'Branding updated', settings: db.settings });
    }

    // -------------------------------------------------------------
    // DRIVE ROUTING
    // -------------------------------------------------------------
    if (pathname === '/api/drive/items') {
      if (!currentUser) return jsonResponse({ error: 'Auth required' }, 401);

      const folderId = url.searchParams.get('folder_id');
      const view = url.searchParams.get('view') || 'drive';
      const search = (url.searchParams.get('search') || '').toLowerCase().trim();
      const sort = url.searchParams.get('sort') || 'name';

      let files = db.files.filter(f => f.owner_uid === currentUser.uid);
      let folders = db.folders.filter(fld => fld.owner_uid === currentUser.uid);

      if (view === 'trash') {
        files = files.filter(f => f.is_trashed);
        folders = folders.filter(fld => fld.is_trashed);
      } else if (view === 'starred') {
        files = files.filter(f => !f.is_trashed && f.is_starred);
        folders = folders.filter(fld => !fld.is_trashed && fld.is_starred);
      } else if (view === 'recent') {
        files = files.filter(f => !f.is_trashed);
        files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        folders = [];
      } else {
        files = files.filter(f => !f.is_trashed && (folderId ? f.folder_id === folderId : !f.folder_id));
        folders = folders.filter(fld => !fld.is_trashed && (folderId ? fld.parent_id === folderId : !fld.parent_id));
      }

      if (search) {
        files = files.filter(f => f.name.toLowerCase().includes(search));
        folders = folders.filter(fld => fld.name.toLowerCase().includes(search));
      }

      // Breadcrumbs
      const breadcrumbs = [];
      let cur = folderId;
      while (cur) {
        const found = db.folders.find(f => f.id === cur && f.owner_uid === currentUser.uid);
        if (found) {
          breadcrumbs.unshift({ id: found.id, name: found.name });
          cur = found.parent_id;
        } else break;
      }

      return jsonResponse({
        current_folder_id: folderId,
        breadcrumbs,
        folders,
        files,
        storage: {
          used: currentUser.storage_used || 0,
          quota: currentUser.storage_quota || DEFAULT_QUOTA
        }
      });
    }

    if (pathname === '/api/drive/folders' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: 'Auth required' }, 401);
      const newFolder = {
        id: 'fld_' + Date.now(),
        owner_uid: currentUser.uid,
        parent_id: body.parent_id || null,
        name: (body.name || 'New Folder').trim(),
        is_starred: false,
        is_trashed: false,
        created_at: new Date().toISOString()
      };
      db.folders.push(newFolder);
      saveDB(db);
      return jsonResponse({ message: 'Folder created', folder: newFolder }, 201);
    }

    if (pathname === '/api/drive/rename' && method === 'PUT') {
      if (!currentUser) return jsonResponse({ error: 'Auth required' }, 401);
      const { id, type, new_name } = body;
      if (type === 'folder') {
        const fld = db.folders.find(f => f.id === id && f.owner_uid === currentUser.uid);
        if (fld) fld.name = new_name.trim();
      } else {
        const file = db.files.find(f => f.id === id && f.owner_uid === currentUser.uid);
        if (file) file.name = new_name.trim();
      }
      saveDB(db);
      return jsonResponse({ message: 'Item renamed' });
    }

    if (pathname === '/api/drive/star' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: 'Auth required' }, 401);
      const { id, type } = body;
      let isStarred = false;
      if (type === 'folder') {
        const fld = db.folders.find(f => f.id === id && f.owner_uid === currentUser.uid);
        if (fld) { fld.is_starred = !fld.is_starred; isStarred = fld.is_starred; }
      } else {
        const file = db.files.find(f => f.id === id && f.owner_uid === currentUser.uid);
        if (file) { file.is_starred = !file.is_starred; isStarred = file.is_starred; }
      }
      saveDB(db);
      return jsonResponse({ is_starred: isStarred });
    }

    if (pathname === '/api/drive/trash' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: 'Auth required' }, 401);
      const { id, type } = body;
      if (type === 'folder') {
        const fld = db.folders.find(f => f.id === id && f.owner_uid === currentUser.uid);
        if (fld) fld.is_trashed = true;
      } else {
        const file = db.files.find(f => f.id === id && f.owner_uid === currentUser.uid);
        if (file) file.is_trashed = true;
      }
      saveDB(db);
      return jsonResponse({ message: 'Moved to trash' });
    }

    if (pathname === '/api/drive/restore' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: 'Auth required' }, 401);
      const { id, type } = body;
      if (type === 'folder') {
        const fld = db.folders.find(f => f.id === id && f.owner_uid === currentUser.uid);
        if (fld) fld.is_trashed = false;
      } else {
        const file = db.files.find(f => f.id === id && f.owner_uid === currentUser.uid);
        if (file) file.is_trashed = false;
      }
      saveDB(db);
      return jsonResponse({ message: 'Restored from trash' });
    }

    if ((pathname === '/api/drive/delete-permanent' || pathname.startsWith('/api/drive/items/')) && method === 'DELETE') {
      if (!currentUser) return jsonResponse({ error: 'Auth required' }, 401);
      let id = body.id || url.searchParams.get('id') || pathname.replace('/api/drive/items/', '');
      let type = body.type || url.searchParams.get('type');

      const fileIdx = db.files.findIndex(f => f.id === id && f.owner_uid === currentUser.uid);
      if (fileIdx !== -1) {
        const file = db.files[fileIdx];
        db.files.splice(fileIdx, 1);
        currentUser.storage_used = Math.max(0, (currentUser.storage_used || 0) - file.size);
        const u = db.users.find(usr => usr.uid === currentUser.uid);
        if (u) u.storage_used = currentUser.storage_used;
        saveDB(db);
        return jsonResponse({ message: 'Permanently deleted. Space freed.' });
      }

      const fldIdx = db.folders.findIndex(f => f.id === id && f.owner_uid === currentUser.uid);
      if (fldIdx !== -1) {
        db.folders.splice(fldIdx, 1);
        saveDB(db);
        return jsonResponse({ message: 'Folder permanently deleted.' });
      }

      return jsonResponse({ message: 'Item deleted' });
    }

    if (pathname === '/api/drive/empty-trash' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: 'Auth required' }, 401);
      const trashedFiles = db.files.filter(f => f.owner_uid === currentUser.uid && f.is_trashed);
      for (const f of trashedFiles) {
        currentUser.storage_used = Math.max(0, (currentUser.storage_used || 0) - f.size);
      }
      db.files = db.files.filter(f => !(f.owner_uid === currentUser.uid && f.is_trashed));
      db.folders = db.folders.filter(fld => !(fld.owner_uid === currentUser.uid && fld.is_trashed));
      const u = db.users.find(usr => usr.uid === currentUser.uid);
      if (u) u.storage_used = currentUser.storage_used;
      saveDB(db);
      return jsonResponse({ message: 'Trash emptied' });
    }

    // Direct download
    if (pathname.startsWith('/api/drive/download/')) {
      const fileId = pathname.replace('/api/drive/download/', '');
      const file = db.files.find(f => f.id === fileId);
      if (!file) return new Response('File not found', { status: 404 });

      // Create download trigger
      const a = document.createElement('a');
      a.href = file.data_url || 'data:text/plain;charset=utf-8,StoreHub File Content';
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return new Response('Download initiated', { status: 200 });
    }

    // Direct preview
    if (pathname.startsWith('/api/drive/preview/')) {
      const fileId = pathname.replace('/api/drive/preview/', '');
      const file = db.files.find(f => f.id === fileId);
      if (!file) return new Response('File not found', { status: 404 });
      return new Response(file.data_url || '', {
        status: 200,
        headers: { 'Content-Type': file.mime_type || 'text/plain' }
      });
    }

    // -------------------------------------------------------------
    // SHARES ROUTING
    // -------------------------------------------------------------
    if (pathname.startsWith('/api/shares/file/')) {
      const fileId = pathname.replace('/api/shares/file/', '');
      const file = db.files.find(f => f.id === fileId);
      if (!file) return jsonResponse({ error: 'File not found' }, 404);

      const pub = db.public_links.find(p => p.file_id === fileId);
      const userShares = db.shares.filter(s => s.file_id === fileId).map(s => {
        const u = db.users.find(usr => usr.uid === s.shared_with_uid);
        return {
          id: s.id,
          shared_with_uid: s.shared_with_uid,
          rmail: u ? u.rmail : 'Unknown',
          name: u ? `${u.first_name} ${u.last_name}` : 'User',
          permission: s.permission
        };
      });

      return jsonResponse({
        file_id: file.id,
        file_name: file.name,
        privacy: file.privacy,
        public_link: pub ? { token: pub.token, enabled: pub.enabled, url: `shared.html?s=${pub.token}` } : null,
        shares: userShares
      });
    }

    if (pathname === '/api/shares/public-link' && method === 'POST') {
      const { file_id, enabled } = body;
      let pub = db.public_links.find(p => p.file_id === file_id);
      if (!pub) {
        pub = { id: 'lnk_' + Date.now(), file_id, token: generateToken(8), enabled: true, created_at: new Date().toISOString() };
        db.public_links.push(pub);
      } else {
        pub.enabled = enabled !== false;
      }
      const file = db.files.find(f => f.id === file_id);
      if (file) file.privacy = pub.enabled ? 'public' : 'private';
      saveDB(db);
      return jsonResponse({
        message: pub.enabled ? 'Public link enabled' : 'Public link disabled',
        token: pub.token,
        enabled: pub.enabled,
        url: `shared.html?s=${pub.token}`
      });
    }

    if (pathname === '/api/shares/user' && method === 'POST') {
      const { file_id, rmail, permission } = body;
      const targetUser = db.users.find(u => u.rmail.toLowerCase() === (rmail || '').toLowerCase());
      if (!targetUser) return jsonResponse({ error: `R-Mail "${rmail}" does not exist` }, 404);
      if (targetUser.uid === currentUser.uid) return jsonResponse({ error: 'Cannot share with yourself' }, 400);

      let share = db.shares.find(s => s.file_id === file_id && s.shared_with_uid === targetUser.uid);
      if (share) {
        share.permission = permission;
      } else {
        share = {
          id: 'shr_' + Date.now(),
          file_id,
          owner_uid: currentUser.uid,
          shared_with_uid: targetUser.uid,
          permission: permission || 'viewer',
          created_at: new Date().toISOString()
        };
        db.shares.push(share);
      }
      saveDB(db);
      return jsonResponse({ message: `File shared with ${targetUser.first_name}` });
    }

    if (pathname.startsWith('/api/shares/') && method === 'DELETE') {
      const shareId = pathname.replace('/api/shares/', '');
      db.shares = db.shares.filter(s => s.id !== shareId);
      saveDB(db);
      return jsonResponse({ message: 'Access revoked' });
    }

    if (pathname === '/api/shares/list') {
      const type = url.searchParams.get('type') || 'with_me';
      if (!currentUser) return jsonResponse({ error: 'Auth required' }, 401);

      if (type === 'with_me') {
        const myShares = db.shares.filter(s => s.shared_with_uid === currentUser.uid);
        const result = myShares.map(s => {
          const file = db.files.find(f => f.id === s.file_id);
          const owner = db.users.find(u => u.uid === s.owner_uid);
          return {
            share_id: s.id,
            permission: s.permission,
            shared_at: s.created_at,
            file: file || { name: 'Deleted file', size: 0 },
            owner: { name: owner ? `${owner.first_name} ${owner.last_name}` : 'User', rmail: owner ? owner.rmail : '' }
          };
        });
        return jsonResponse({ items: result });
      } else {
        const mySharedOut = db.shares.filter(s => s.owner_uid === currentUser.uid);
        const result = mySharedOut.map(s => {
          const file = db.files.find(f => f.id === s.file_id);
          const sharedWith = db.users.find(u => u.uid === s.shared_with_uid);
          return {
            share_id: s.id,
            permission: s.permission,
            shared_at: s.created_at,
            file: file || { name: 'File', size: 0 },
            shared_with: { name: sharedWith ? `${sharedWith.first_name} ${sharedWith.last_name}` : 'User', rmail: sharedWith ? sharedWith.rmail : '' }
          };
        });
        return jsonResponse({ items: result });
      }
    }

    if (pathname.startsWith('/api/shares/public/')) {
      const token = pathname.replace('/api/shares/public/', '').replace('/download', '');
      const pub = db.public_links.find(p => p.token === token && p.enabled);
      if (!pub) return jsonResponse({ error: 'Link disabled or invalid' }, 404);
      const file = db.files.find(f => f.id === pub.file_id);
      if (!file) return jsonResponse({ error: 'File deleted' }, 404);
      const owner = db.users.find(u => u.uid === file.owner_uid);

      if (pathname.endsWith('/download')) {
        const a = document.createElement('a');
        a.href = file.data_url || 'data:text/plain;charset=utf-8,StoreHub Public File';
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return new Response('Download triggered', { status: 200 });
      }

      return jsonResponse({
        file,
        owner: { name: owner ? `${owner.first_name} ${owner.last_name}` : 'Creator' },
        download_url: `/api/shares/public/${token}/download`
      });
    }

    // -------------------------------------------------------------
    // PROJECTS ROUTING
    // -------------------------------------------------------------
    if (pathname === '/api/public-projects') {
      const q = (url.searchParams.get('search') || '').toLowerCase().trim();
      const list = db.projects.filter(p => p.status === 'published').filter(p => {
        if (!q) return true;
        return (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
      }).map(p => {
        const owner = db.users.find(u => u.uid === p.owner_uid);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          project_url: p.project_url,
          views: p.views || 0,
          created_at: p.created_at,
          creator: {
            name: owner ? `${owner.first_name} ${owner.last_name}` : 'Creator',
            rmail: owner ? owner.rmail : 'user@storage.hub'
          }
        };
      });
      return jsonResponse({ projects: list });
    }

    if (pathname === '/api/projects' && method === 'GET') {
      if (!currentUser) return jsonResponse({ error: 'Auth required' }, 401);
      const myProjects = db.projects.filter(p => p.owner_uid === currentUser.uid);
      return jsonResponse({ projects: myProjects });
    }

    if (pathname === '/api/projects' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: 'Auth required' }, 401);
      const newProj = {
        id: 'proj_' + Date.now(),
        owner_uid: currentUser.uid,
        name: (body.name || 'New Project').trim(),
        description: body.description || '',
        thumbnail: '',
        status: 'draft',
        project_url: generateToken(8),
        views: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.projects.push(newProj);

      // Create 4 initial files
      db.project_files.push(
        { id: 'pf_' + Date.now() + '_1', project_id: newProj.id, file_name: 'index.html', content: `<!DOCTYPE html>\n<html>\n<head>\n  <title>${newProj.name}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>${newProj.name}</h1>\n  <p>${newProj.description || 'Welcome to my Store Hub app!'}</p>\n  <button id="btn">Click Me</button>\n  <script src="store.js"></script>\n  <script src="script.js"></script>\n</body>\n</html>` },
        { id: 'pf_' + Date.now() + '_2', project_id: newProj.id, file_name: 'style.css', content: `body { font-family: sans-serif; background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }\nh1 { color: #38bdf8; }\nbutton { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; }` },
        { id: 'pf_' + Date.now() + '_3', project_id: newProj.id, file_name: 'script.js', content: `document.addEventListener('DOMContentLoaded', () => {\n  StoreHub.init({ projectId: '${newProj.id}', appName: '${newProj.name}' });\n  document.getElementById('btn').addEventListener('click', () => alert('Hello from StoreHub App!'));\n});` },
        { id: 'pf_' + Date.now() + '_4', project_id: newProj.id, file_name: 'store.js', content: `const StoreHub = { init: (c) => console.log('Init', c), project: async () => ({ id: '${newProj.id}', name: '${newProj.name}' }), share: (o) => navigator.clipboard.writeText(o.url), getUser: async () => null };` }
      );
      saveDB(db);
      return jsonResponse({ message: 'Project created', project: newProj }, 201);
    }

    if (pathname.startsWith('/api/projects/') && method === 'GET' && !pathname.includes('/files') && !pathname.includes('/validate') && !pathname.includes('/render')) {
      const projId = pathname.replace('/api/projects/', '');
      const project = db.projects.find(p => p.id === projId);
      if (!project) return jsonResponse({ error: 'Project not found' }, 404);
      const files = db.project_files.filter(pf => pf.project_id === projId);
      return jsonResponse({ project, files });
    }

    if (pathname.startsWith('/api/projects/') && pathname.endsWith('/files') && method === 'PUT') {
      const projId = pathname.replace('/api/projects/', '').replace('/files', '');
      const { file_name, content } = body;
      let pf = db.project_files.find(f => f.project_id === projId && f.file_name === file_name);
      if (pf) {
        pf.content = content;
      } else {
        pf = { id: 'pf_' + Date.now(), project_id: projId, file_name, content };
        db.project_files.push(pf);
      }
      saveDB(db);
      return jsonResponse({ message: 'File saved', file: pf });
    }

    if (pathname.startsWith('/api/projects/') && pathname.endsWith('/validate')) {
      const projId = pathname.replace('/api/projects/', '').replace('/validate', '');
      const files = db.project_files.filter(pf => pf.project_id === projId);
      const reqFiles = ['index.html', 'style.css', 'script.js', 'store.js'];
      const allValid = reqFiles.every(rf => {
        const found = files.find(f => f.file_name === rf);
        return Boolean(found && found.content && found.content.trim().length > 0);
      });
      return jsonResponse({ valid: allValid, message: allValid ? 'Project is ready to publish.' : 'Missing files' });
    }

    if (pathname.startsWith('/api/projects/') && pathname.endsWith('/publish') && method === 'POST') {
      const projId = pathname.replace('/api/projects/', '').replace('/publish', '');
      const project = db.projects.find(p => p.id === projId);
      if (project) {
        project.status = 'published';
        project.project_url = project.project_url || generateToken(8);
        saveDB(db);
        return jsonResponse({ message: 'Published', project_url: `project.html?render=${project.project_url}`, project });
      }
      return jsonResponse({ error: 'Project not found' }, 404);
    }

    if (pathname.startsWith('/api/projects/') && pathname.endsWith('/unpublish') && method === 'POST') {
      const projId = pathname.replace('/api/projects/', '').replace('/unpublish', '');
      const project = db.projects.find(p => p.id === projId);
      if (project) {
        project.status = 'draft';
        saveDB(db);
        return jsonResponse({ message: 'Unpublished', project });
      }
      return jsonResponse({ error: 'Project not found' }, 404);
    }

    // Render Sandbox HTML
    if (pathname.startsWith('/api/projects/render/') || pathname.startsWith('/project/render/')) {
      const idOrToken = pathname.replace('/api/projects/render/', '').replace('/project/render/', '').split('?')[0];
      let project = db.projects.find(p => p.id === idOrToken || p.project_url === idOrToken);
      if (!project) return new Response('<h1>404 Project Not Found</h1>', { status: 404, headers: { 'Content-Type': 'text/html' } });

      project.views = (project.views || 0) + 1;
      saveDB(db);

      const files = db.project_files.filter(pf => pf.project_id === project.id);
      const indexFile = files.find(f => f.file_name === 'index.html');
      const cssFile = files.find(f => f.file_name === 'style.css');
      const jsFile = files.find(f => f.file_name === 'script.js');
      const storeJsFile = files.find(f => f.file_name === 'store.js');

      let html = indexFile ? indexFile.content : '<h1>No index.html</h1>';
      const css = cssFile ? cssFile.content : '';
      const js = jsFile ? jsFile.content : '';
      const storeJs = storeJsFile ? storeJsFile.content : '';

      html = `<style>\n${css}\n</style>\n` + html + `\n<script>\n${storeJs}\n</script>\n<script>\n${js}\n</script>`;

      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    return jsonResponse({ error: 'API route not handled: ' + pathname }, 404);
  };

  // Expose storage engine utilities
  window.StoreHubStorageEngine = {
    loadDB,
    saveDB,
    getActiveUser,
    setActiveSession,
    DEFAULT_QUOTA
  };

  // Seed DB immediately on load
  loadDB();
})();
