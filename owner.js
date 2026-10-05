/**
 * =========================================================================
 * STORE HUB Owner Control Center JavaScript (owner.js - Standalone Client Version)
 * Live system analytics, user management, and dynamic website branding
 * =========================================================================
 */

const StoreHubOwner = (function () {
  async function init() {
    const user = await StoreHubApp.checkAuth();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    if (user.role !== 'OWNER') {
      document.getElementById('owner-main-content').innerHTML = `
        <div class="empty-state">
          <svg fill="none" stroke="#ef4444" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <h2 style="font-size:1.5rem; margin-bottom:8px;">Access Denied</h2>
          <p>The Owner Control Center is restricted to the administrator account (rahul1234@storage.hub).</p>
          <a href="dashboard.html" class="btn-primary" style="display:inline-block; margin-top:16px;">Return to Dashboard</a>
        </div>
      `;
      return;
    }

    await loadOwnerStats();
    await loadUsersList();
    setupBrandingForm();
  }

  async function loadOwnerStats() {
    try {
      const res = await fetch('/api/owner/stats');
      if (!res.ok) throw new Error('Failed to fetch statistics');

      const data = await res.json();
      const stats = data.stats;

      document.getElementById('stat-total-users').textContent = stats.totalUsers || 0;
      document.getElementById('stat-storage-used').textContent = StoreHubApp.formatBytes(stats.totalStorageUsed || 0);
      document.getElementById('stat-total-files').textContent = stats.totalFiles || 0;
      document.getElementById('stat-public-files').textContent = stats.totalPublicFiles || 0;
      document.getElementById('stat-public-projects').textContent = stats.totalPublicProjects || 0;
      document.getElementById('stat-project-views').textContent = stats.totalProjectViews || 0;

      if (stats.settings) {
        const nameInput = document.getElementById('branding-website-name');
        if (nameInput) nameInput.value = stats.settings.website_name || 'STORE HUB';

        const presetSelect = document.getElementById('branding-preset-select');
        if (presetSelect) presetSelect.value = stats.settings.branding_preset || 'Modern';

        const colorInput = document.getElementById('branding-accent-color');
        if (colorInput) colorInput.value = stats.settings.accent_color || '#3b82f6';
      }
    } catch (err) {
      StoreHubApp.showToast(err.message, 'error');
    }
  }

  async function loadUsersList() {
    const tableBody = document.getElementById('owner-users-table-body');
    if (!tableBody) return;

    try {
      const res = await fetch('/api/owner/users');
      if (!res.ok) throw new Error('Failed to load users');

      const data = await res.json();
      const users = data.users || [];

      tableBody.innerHTML = users.map(u => `
        <tr>
          <td><strong style="color:var(--text-primary); font-family:monospace;">${u.uid}</strong></td>
          <td>
            <div style="font-weight:600;">${StoreHubApp.escapeHtml(u.first_name)} ${StoreHubApp.escapeHtml(u.last_name)}</div>
            <div style="font-size:11px; color:var(--text-muted);">${StoreHubApp.escapeHtml(u.rmail)}</div>
          </td>
          <td>
            <span style="display:inline-block; padding:2px 8px; border-radius:9999px; font-size:11px; font-weight:700; background:${u.role === 'OWNER' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.1)'}; color:${u.role === 'OWNER' ? '#f59e0b' : 'var(--accent)'};">
              ${u.role}
            </span>
          </td>
          <td>
            <div>${StoreHubApp.formatBytes(u.storage_used || 0)} / 5 GB</div>
            <div style="width:100px; height:4px; background:rgba(255,255,255,0.1); border-radius:4px; margin-top:4px;">
              <div style="height:100%; width:${Math.min(100, ((u.storage_used || 0) / (5*1024*1024*1024)) * 100)}%; background:var(--accent); border-radius:4px;"></div>
            </div>
          </td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
        </tr>
      `).join('');
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger);">${err.message}</td></tr>`;
    }
  }

  function setupBrandingForm() {
    const form = document.getElementById('branding-settings-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const website_name = document.getElementById('branding-website-name').value.trim();
      const branding_preset = document.getElementById('branding-preset-select').value;
      const accent_color = document.getElementById('branding-accent-color').value;

      const saveBtn = document.getElementById('save-branding-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }

      try {
        const res = await fetch('/api/owner/branding', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            website_name,
            branding_preset,
            accent_color
          })
        });

        const data = await res.json();
        if (res.ok) {
          StoreHubApp.showToast('Website branding updated globally!', 'success');
          await StoreHubApp.loadSettings();
        } else {
          StoreHubApp.showToast(data.error || 'Failed to update branding', 'error');
        }
      } catch (err) {
        StoreHubApp.showToast('Error updating branding', 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Changes';
        }
      }
    });
  }

  return {
    init,
    loadOwnerStats,
    loadUsersList
  };
})();
