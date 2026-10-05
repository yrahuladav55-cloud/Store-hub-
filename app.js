/**
 * =========================================================================
 * STORE HUB Core Application JavaScript (app.js - Standalone Client Version)
 * Shared utilities, branding loader, theme manager, toasts, and auth helpers
 * =========================================================================
 */

const StoreHubApp = (function () {
  let currentUser = null;
  let currentSettings = {
    website_name: 'STORE HUB',
    theme: 'modern',
    branding_preset: 'Modern',
    accent_color: '#3b82f6'
  };

  /**
   * Initialize Global App State
   */
  async function init() {
    initTheme();
    await loadSettings();
    await checkAuth();
    setupMobileNav();
  }

  /**
   * Load dynamic website branding
   */
  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          currentSettings = data.settings;
          applyBranding(currentSettings);
        }
      }
    } catch (err) {
      console.warn('Failed to load branding settings:', err);
    }
  }

  /**
   * Apply branding (website name, theme preset) across the DOM
   */
  function applyBranding(settings) {
    const name = settings.website_name || 'STORE HUB';
    document.querySelectorAll('.brand-name-text, [data-brand-name]').forEach(el => {
      el.textContent = name;
    });

    if (!document.title.includes('—') && !document.title.includes('-')) {
      document.title = name + ' — Cloud Storage & Web Projects';
    } else {
      const parts = document.title.split(/[-—]/);
      if (parts.length > 1) {
        document.title = `${parts[0].trim()} — ${name}`;
      }
    }

    const root = document.documentElement;
    const classes = Array.from(root.classList).filter(c => c.startsWith('preset-'));
    classes.forEach(c => root.classList.remove(c));

    const presetName = (settings.branding_preset || 'Modern').toLowerCase();
    root.classList.add(`preset-${presetName}`);

    if (settings.accent_color) {
      root.style.setProperty('--accent', settings.accent_color);
    }
  }

  /**
   * Dark / Light mode toggle
   */
  function initTheme() {
    const savedTheme = localStorage.getItem('storehub_theme_mode') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  function toggleThemeMode() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('storehub_theme_mode', next);
    showToast(`Switched to ${next} theme mode`, 'info');
  }

  /**
   * Check Auth state & populate user pill
   */
  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
        updateUserUI(currentUser);
        return currentUser;
      } else {
        currentUser = null;
        updateUserUI(null);
        return null;
      }
    } catch (err) {
      currentUser = null;
      updateUserUI(null);
      return null;
    }
  }

  function updateUserUI(user) {
    const userContainer = document.getElementById('user-profile-widget');
    if (!userContainer) return;

    if (user) {
      const initials = (user.first_name ? user.first_name[0] : 'U') + (user.last_name ? user.last_name[0] : '');
      const isOwner = user.role === 'OWNER';

      userContainer.innerHTML = `
        <div class="user-pill" id="user-menu-trigger" onclick="StoreHubApp.toggleUserDropdown()">
          <div class="user-avatar">${initials.toUpperCase()}</div>
          <span class="user-name-text">${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}</span>
          ${isOwner ? '<span style="font-size:10px; background:#f59e0b; color:#000; padding:2px 6px; border-radius:9999px; font-weight:700;">OWNER</span>' : ''}
          <svg style="width:14px;height:14px;color:var(--text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div id="user-dropdown-menu" style="display:none; position:absolute; top:54px; right:20px; width:220px; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:var(--radius-md); box-shadow:var(--shadow-lg); z-index:100; padding:8px;">
          <div style="padding:8px 12px; border-bottom:1px solid var(--border-color); font-size:12px;">
            <div style="font-weight:600; color:var(--text-primary);">${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}</div>
            <div style="color:var(--text-muted); text-overflow:ellipsis; overflow:hidden;">${escapeHtml(user.rmail)}</div>
            <div style="color:var(--accent); font-family:monospace; margin-top:2px;">UID: ${user.uid}</div>
          </div>
          ${isOwner ? '<a href="owner.html" class="nav-link" style="margin-top:4px;"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Owner Control Center</a>' : ''}
          <div onclick="StoreHubApp.logout()" class="nav-link" style="color:var(--danger); cursor:pointer; margin-top:4px;">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg> Logout
          </div>
        </div>
      `;

      updateStorageWidget(user.storage_used, user.storage_quota);
    } else {
      userContainer.innerHTML = `
        <a href="login.html" class="btn-secondary" style="font-size:0.85rem; padding:6px 14px;">Log In</a>
        <a href="signup.html" class="btn-primary" style="font-size:0.85rem; padding:6px 14px;">Sign Up</a>
      `;
    }
  }

  function toggleUserDropdown() {
    const menu = document.getElementById('user-dropdown-menu');
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
  }

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('user-dropdown-menu');
    const trigger = document.getElementById('user-menu-trigger');
    if (menu && trigger && !trigger.contains(e.target) && !menu.contains(e.target)) {
      menu.style.display = 'none';
    }
  });

  /**
   * Update Storage progress bar in sidebar
   */
  function updateStorageWidget(usedBytes = 0, quotaBytes = 5 * 1024 * 1024 * 1024) {
    const fillEl = document.getElementById('sidebar-storage-fill');
    const textEl = document.getElementById('sidebar-storage-text');
    if (!fillEl || !textEl) return;

    const usedFormatted = formatBytes(usedBytes);
    const quotaFormatted = formatBytes(quotaBytes);
    const percent = Math.min(100, Math.max(0, (usedBytes / quotaBytes) * 100));

    textEl.textContent = `Used: ${usedFormatted} / ${quotaFormatted}`;
    fillEl.style.width = `${percent}%`;

    fillEl.classList.remove('warning', 'danger');
    if (percent > 90) {
      fillEl.classList.add('danger');
    } else if (percent > 70) {
      fillEl.classList.add('warning');
    }
  }

  /**
   * Log out current user
   */
  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    showToast('Logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 400);
  }

  /**
   * Mobile navigation toggle
   */
  function setupMobileNav() {
    const toggleBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });

      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
          sidebar.classList.remove('mobile-open');
        }
      });
    }
  }

  /**
   * Toast Notifications System
   */
  function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = '';
    if (type === 'success') {
      icon = '<svg style="width:20px;height:20px;color:var(--success);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
    } else if (type === 'error') {
      icon = '<svg style="width:20px;height:20px;color:var(--danger);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
    } else if (type === 'warning') {
      icon = '<svg style="width:20px;height:20px;color:var(--warning);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
    } else {
      icon = '<svg style="width:20px;height:20px;color:var(--accent);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    }

    toast.innerHTML = `
      ${icon}
      <span style="flex:1;">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    init,
    loadSettings,
    checkAuth,
    getCurrentUser: () => currentUser,
    getSettings: () => currentSettings,
    toggleThemeMode,
    toggleUserDropdown,
    logout,
    showToast,
    openModal,
    closeModal,
    formatBytes,
    escapeHtml,
    updateStorageWidget
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  StoreHubApp.init();
});
