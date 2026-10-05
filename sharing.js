/**
 * =========================================================================
 * STORE HUB Sharing JavaScript (sharing.js - Standalone Client Version)
 * Manages "Shared with me", "Shared by me", and public link downloads
 * =========================================================================
 */

const StoreHubSharing = (function () {
  let activeTab = 'with_me';

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('s');
    if (token) {
      document.getElementById('public-link-shell').style.display = 'block';
      document.getElementById('standard-shell').style.display = 'none';
      return loadPublicFileView(token);
    } else {
      document.getElementById('standard-shell').style.display = 'flex';
      document.getElementById('public-link-shell').style.display = 'none';
    }

    if (params.get('tab') === 'by_me') {
      activeTab = 'by_me';
      const tabWithMe = document.getElementById('tab-shared-with-me');
      const tabByMe = document.getElementById('tab-shared-by-me');
      if (tabWithMe && tabByMe) {
        tabByMe.classList.add('active');
        tabWithMe.classList.remove('active');
      }
    }

    setupTabs();
    await loadSharedItems();
  }

  function setupTabs() {
    const tabWithMe = document.getElementById('tab-shared-with-me');
    const tabByMe = document.getElementById('tab-shared-by-me');

    if (tabWithMe && tabByMe) {
      tabWithMe.addEventListener('click', () => {
        activeTab = 'with_me';
        tabWithMe.classList.add('active');
        tabByMe.classList.remove('active');
        loadSharedItems();
      });

      tabByMe.addEventListener('click', () => {
        activeTab = 'by_me';
        tabByMe.classList.add('active');
        tabWithMe.classList.remove('active');
        loadSharedItems();
      });
    }
  }

  async function loadSharedItems() {
    const container = document.getElementById('shared-list-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">Loading shared items...</div>';

    try {
      const res = await fetch(`/api/shares/list?type=${activeTab}`);
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = 'login.html';
          return;
        }
        throw new Error('Failed to load shared items');
      }

      const data = await res.json();
      renderSharedList(container, data.items || []);
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
    }
  }

  function renderSharedList(container, items) {
    if (items.length === 0) {
      const emptyMsg = activeTab === 'with_me'
        ? 'No files have been shared with your R-Mail address yet.'
        : 'You have not shared any files with other Store Hub users yet.';
      container.innerHTML = `
        <div class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          <h3>Nothing shared</h3>
          <p>${emptyMsg}</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>${activeTab === 'with_me' ? 'Shared By' : 'Shared With'}</th>
              <th>Permission</th>
              <th>Shared Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    items.forEach(item => {
      const file = item.file;
      const targetUser = activeTab === 'with_me' ? item.owner : item.shared_with;

      html += `
        <tr>
          <td>
            <div style="font-weight:600; color:var(--text-primary);">${StoreHubApp.escapeHtml(file.name)}</div>
            <div style="font-size:11px; color:var(--text-muted);">${StoreHubApp.formatBytes(file.size)}</div>
          </td>
          <td>
            <div>${StoreHubApp.escapeHtml(targetUser.name)}</div>
            <div style="font-size:11px; color:var(--text-muted);">${StoreHubApp.escapeHtml(targetUser.rmail)}</div>
          </td>
          <td>
            <span style="display:inline-block; padding:3px 8px; border-radius:9999px; font-size:11px; font-weight:600; background:${item.permission === 'editor' ? 'rgba(59,130,246,0.15)' : 'rgba(156,163,175,0.15)'}; color:${item.permission === 'editor' ? 'var(--accent)' : 'var(--text-muted)'}; text-transform:uppercase;">
              ${item.permission}
            </span>
          </td>
          <td>${new Date(item.shared_at).toLocaleDateString()}</td>
          <td>
            <div style="display:flex; gap:8px;">
              <button class="btn-secondary" style="padding:4px 8px; font-size:12px;" onclick="StoreHubDrive.downloadFile('${file.id}')">Download</button>
              ${activeTab === 'by_me' ? `
                <button class="btn-danger" style="padding:4px 8px; font-size:12px;" onclick="StoreHubSharing.revokeShare('${item.share_id}')">Revoke</button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
  }

  async function revokeShare(shareId) {
    if (!confirm('Revoke access to this file?')) return;
    try {
      const res = await fetch(`/api/shares/${shareId}`, { method: 'DELETE' });
      if (res.ok) {
        StoreHubApp.showToast('Access revoked', 'success');
        loadSharedItems();
      }
    } catch (e) {
      StoreHubApp.showToast('Failed to revoke access', 'error');
    }
  }

  async function loadPublicFileView(token) {
    const card = document.getElementById('public-file-card');
    if (!card) return;

    card.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">Fetching file information...</div>';

    try {
      const res = await fetch(`/api/shares/public/${token}`);
      if (!res.ok) {
        throw new Error('This public link is invalid or has been disabled by the owner.');
      }

      const data = await res.json();
      const file = data.file;

      card.innerHTML = `
        <div style="text-align:center; margin-bottom:24px;">
          <div style="display:inline-flex; align-items:center; justify-content:center; width:64px; height:64px; border-radius:16px; background:rgba(59,130,246,0.15); color:var(--accent); margin-bottom:16px;">
            <svg style="width:36px;height:36px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
          </div>
          <h2 style="font-size:1.4rem; margin-bottom:6px;">${StoreHubApp.escapeHtml(file.name)}</h2>
          <p style="color:var(--text-muted); font-size:0.9rem;">Uploaded by ${StoreHubApp.escapeHtml(data.owner.name)} • ${StoreHubApp.formatBytes(file.size)}</p>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; max-width:300px; margin:0 auto;">
          <button class="btn-primary" style="display:block; text-align:center; padding:12px; font-size:1rem; border:none; cursor:pointer;" onclick="StoreHubDrive.downloadFile('${file.id}')">
            Download File (${StoreHubApp.formatBytes(file.size)})
          </button>
          <a href="index.html" class="btn-secondary" style="display:block; text-align:center; padding:10px; font-size:0.9rem; text-decoration:none;">
            Go to Store Hub Home
          </a>
        </div>
      `;
    } catch (err) {
      card.innerHTML = `
        <div class="empty-state">
          <svg fill="none" stroke="#ef4444" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <h3>Link Inactive</h3>
          <p>${err.message}</p>
          <a href="index.html" class="btn-primary" style="display:inline-block; margin-top:16px;">Go to Store Hub</a>
        </div>
      `;
    }
  }

  return {
    init,
    revokeShare
  };
})();
