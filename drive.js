/**
 * =========================================================================
 * STORE HUB Drive JavaScript (drive.js - Standalone Client Version)
 * Google Drive-style file manager, drag-and-drop uploader, previews & actions
 * =========================================================================
 */

const StoreHubDrive = (function () {
  let currentFolderId = null;
  let currentView = 'drive';
  let viewMode = localStorage.getItem('storehub_view_mode') || 'grid';
  let currentFiles = [];
  let currentFolders = [];
  let currentSearch = '';
  let currentSort = 'name';

  let activeItem = null;

  async function init() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view')) currentView = params.get('view');
    if (params.get('folder')) currentFolderId = params.get('folder');

    setupEventListeners();
    setupDropzone();
    updateViewButtons();
    await loadItems();
  }

  function setupEventListeners() {
    const gridBtn = document.getElementById('view-grid-btn');
    const listBtn = document.getElementById('view-list-btn');
    if (gridBtn && listBtn) {
      gridBtn.addEventListener('click', () => setViewMode('grid'));
      listBtn.addEventListener('click', () => setViewMode('list'));
    }

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        loadItems();
      });
    }

    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      let timeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          currentSearch = e.target.value.trim();
          loadItems();
        }, 300);
      });
    }
  }

  function setViewMode(mode) {
    viewMode = mode;
    localStorage.setItem('storehub_view_mode', mode);
    updateViewButtons();
    renderContent();
  }

  function updateViewButtons() {
    const gridBtn = document.getElementById('view-grid-btn');
    const listBtn = document.getElementById('view-list-btn');
    if (gridBtn && listBtn) {
      if (viewMode === 'grid') {
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
      } else {
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
      }
    }
  }

  async function loadItems() {
    const container = document.getElementById('drive-content-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; padding:50px; color:var(--text-muted);">Loading items...</div>';

    try {
      const url = `/api/drive/items?folder_id=${currentFolderId || ''}&view=${currentView}&search=${encodeURIComponent(currentSearch)}&sort=${currentSort}`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = 'login.html';
          return;
        }
        throw new Error('Failed to load drive items');
      }

      const data = await res.json();
      currentFolders = data.folders || [];
      currentFiles = data.files || [];

      if (data.storage) {
        StoreHubApp.updateStorageWidget(data.storage.used, data.storage.quota);
      }

      renderBreadcrumbs(data.breadcrumbs || []);
      renderContent();
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><h3>Unable to load drive</h3><p>${err.message}</p></div>`;
    }
  }

  function renderBreadcrumbs(crumbs) {
    const container = document.getElementById('drive-breadcrumbs');
    if (!container) return;

    let html = `<div class="breadcrumb-item ${!currentFolderId ? 'active' : ''}" onclick="StoreHubDrive.navigateToFolder(null)">My Drive</div>`;

    crumbs.forEach((c, idx) => {
      const isLast = idx === crumbs.length - 1;
      html += `
        <span class="breadcrumb-separator">/</span>
        <div class="breadcrumb-item ${isLast ? 'active' : ''}" onclick="${isLast ? '' : `StoreHubDrive.navigateToFolder('${c.id}')`}">${StoreHubApp.escapeHtml(c.name)}</div>
      `;
    });

    container.innerHTML = html;
  }

  function navigateToFolder(folderId) {
    currentFolderId = folderId;
    currentSearch = '';
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) searchInput.value = '';

    const newUrl = new URL(window.location);
    if (folderId) {
      newUrl.searchParams.set('folder', folderId);
    } else {
      newUrl.searchParams.delete('folder');
    }
    window.history.pushState({}, '', newUrl);

    loadItems();
  }

  function renderContent() {
    const container = document.getElementById('drive-content-container');
    if (!container) return;

    if (currentFolders.length === 0 && currentFiles.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
          <h3>This folder is empty</h3>
          <p>Drag and drop files here, or use the "+ New" button to upload files or create folders.</p>
        </div>
      `;
      return;
    }

    if (viewMode === 'grid') {
      renderGridView(container);
    } else {
      renderListView(container);
    }
  }

  function renderGridView(container) {
    let html = '';

    if (currentFolders.length > 0) {
      html += `<div class="section-title">Folders (${currentFolders.length})</div><div class="items-grid">`;
      currentFolders.forEach(folder => {
        html += `
          <div class="folder-card" onclick="StoreHubDrive.navigateToFolder('${folder.id}')">
            <div class="folder-info">
              <svg class="folder-icon" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>
              <span class="folder-name">${StoreHubApp.escapeHtml(folder.name)}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="star-badge" onclick="event.stopPropagation(); StoreHubDrive.toggleStar('${folder.id}', 'folder')">${folder.is_starred ? '★' : '☆'}</span>
              <button class="icon-btn" style="width:28px;height:28px;" onclick="event.stopPropagation(); StoreHubDrive.openItemMenu(event, '${folder.id}', 'folder', '${encodeURIComponent(folder.name)}')">⋮</button>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    if (currentFiles.length > 0) {
      html += `<div class="section-title">Files (${currentFiles.length})</div><div class="items-grid">`;
      currentFiles.forEach(file => {
        const isImg = file.mime_type && file.mime_type.startsWith('image/');
        const previewUrl = file.data_url || '';

        html += `
          <div class="file-card" onclick="StoreHubDrive.previewFile('${file.id}')">
            <div class="file-thumbnail">
              ${isImg && previewUrl ? `<img src="${previewUrl}" alt="${StoreHubApp.escapeHtml(file.name)}" loading="lazy">` : getFileIcon(file.mime_type, file.name)}
            </div>
            <div class="file-meta">
              <div class="file-title-row">
                <span class="file-name" title="${StoreHubApp.escapeHtml(file.name)}">${StoreHubApp.escapeHtml(file.name)}</span>
                <span class="star-badge" onclick="event.stopPropagation(); StoreHubDrive.toggleStar('${file.id}', 'file')">${file.is_starred ? '★' : '☆'}</span>
              </div>
              <div class="file-details">
                <span>${StoreHubApp.formatBytes(file.size)}</span>
                <button class="icon-btn" style="width:24px;height:24px;border:none;" onclick="event.stopPropagation(); StoreHubDrive.openItemMenu(event, '${file.id}', 'file', '${encodeURIComponent(file.name)}')">⋮</button>
              </div>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    container.innerHTML = html;
  }

  function renderListView(container) {
    let html = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Last Modified</th>
              <th>File Size</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    currentFolders.forEach(folder => {
      html += `
        <tr onclick="StoreHubDrive.navigateToFolder('${folder.id}')" style="cursor:pointer;">
          <td style="display:flex; align-items:center; gap:10px;">
            <svg style="width:20px;height:20px;color:#f59e0b;" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>
            <strong>${StoreHubApp.escapeHtml(folder.name)}</strong>
          </td>
          <td>Me</td>
          <td>${new Date(folder.created_at).toLocaleDateString()}</td>
          <td>—</td>
          <td>
            <button class="btn-secondary" style="padding:4px 8px;font-size:12px;" onclick="event.stopPropagation(); StoreHubDrive.openItemMenu(event, '${folder.id}', 'folder', '${encodeURIComponent(folder.name)}')">Manage</button>
          </td>
        </tr>
      `;
    });

    currentFiles.forEach(file => {
      html += `
        <tr onclick="StoreHubDrive.previewFile('${file.id}')" style="cursor:pointer;">
          <td style="display:flex; align-items:center; gap:10px;">
            ${getFileIcon(file.mime_type, file.name, 20)}
            <span>${StoreHubApp.escapeHtml(file.name)}</span>
          </td>
          <td>Me</td>
          <td>${new Date(file.created_at).toLocaleDateString()}</td>
          <td>${StoreHubApp.formatBytes(file.size)}</td>
          <td>
            <div style="display:flex; gap:6px;" onclick="event.stopPropagation();">
              <button class="btn-secondary" style="padding:4px 8px;font-size:12px;" onclick="StoreHubDrive.openShareModal('${file.id}')">Share</button>
              <button class="btn-secondary" style="padding:4px 8px;font-size:12px;" onclick="StoreHubDrive.downloadFile('${file.id}')">Download</button>
              <button class="icon-btn" style="width:26px;height:26px;" onclick="StoreHubDrive.openItemMenu(event, '${file.id}', 'file', '${encodeURIComponent(file.name)}')">⋮</button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
  }

  function getFileIcon(mime, name = '', size = 40) {
    const s = `style="width:${size}px;height:${size}px;"`;
    if (!mime) mime = '';
    if (mime.includes('image')) return `<svg ${s} fill="none" stroke="#ec4899" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;
    if (mime.includes('video')) return `<svg ${s} fill="none" stroke="#ef4444" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>`;
    if (mime.includes('audio')) return `<svg ${s} fill="none" stroke="#8b5cf6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>`;
    if (mime.includes('pdf')) return `<svg ${s} fill="none" stroke="#dc2626" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`;
    if (mime.includes('zip') || mime.includes('compressed')) return `<svg ${s} fill="none" stroke="#f59e0b" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>`;
    return `<svg ${s} fill="none" stroke="#38bdf8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`;
  }

  function setupDropzone() {
    const dropzone = document.getElementById('drag-drop-area');
    const fileInput = document.getElementById('hidden-file-input');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadFiles(Array.from(e.target.files));
      }
    });

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-active');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        uploadFiles(Array.from(e.dataTransfer.files));
      }
    });
  }

  /**
   * Upload multiple files with progress tracking and real byte storage
   */
  async function uploadFiles(files) {
    const widget = document.getElementById('upload-progress-widget');
    const titleEl = document.getElementById('upload-progress-title');
    const barEl = document.getElementById('upload-progress-bar');
    const statusEl = document.getElementById('upload-progress-status');

    if (widget) widget.style.display = 'block';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (titleEl) titleEl.textContent = `Uploading (${i + 1}/${files.length}): ${file.name}`;

      try {
        await uploadSingleFile(file, (percent) => {
          if (barEl) barEl.style.width = `${percent}%`;
          if (statusEl) statusEl.textContent = `Uploading... ${percent}%`;
        });
      } catch (err) {
        StoreHubApp.showToast(err.message || `Upload failed for ${file.name}`, 'error');
      }
    }

    if (statusEl) statusEl.textContent = 'Upload complete ✓';
    StoreHubApp.showToast('Upload complete ✓', 'success');

    setTimeout(() => {
      if (widget) widget.style.display = 'none';
      loadItems();
    }, 1200);
  }

  function uploadSingleFile(file, onProgress) {
    return new Promise((resolve, reject) => {
      const user = StoreHubApp.getCurrentUser();
      if (!user) return reject(new Error('Please log in first.'));

      // Check storage limit
      const freeSpace = (user.storage_quota || (5 * 1024 * 1024 * 1024)) - (user.storage_used || 0);
      if (file.size > freeSpace) {
        return reject(new Error('Storage limit reached. Delete existing files to free space.'));
      }

      const reader = new FileReader();

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const p = Math.round((e.loaded / e.total) * 90);
          onProgress(p);
        }
      };

      reader.onload = function (e) {
        onProgress(100);
        const dataUrl = e.target.result;

        const db = window.StoreHubStorageEngine.loadDB();
        const activeUser = window.StoreHubStorageEngine.getActiveUser(db);
        if (!activeUser) return reject(new Error('Auth session expired'));

        const newFile = {
          id: 'file_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          owner_uid: activeUser.uid,
          folder_id: currentFolderId,
          name: file.name,
          size: file.size,
          mime_type: file.type || 'application/octet-stream',
          data_url: dataUrl,
          privacy: 'private',
          is_starred: false,
          is_trashed: false,
          created_at: new Date().toISOString()
        };

        db.files.push(newFile);
        activeUser.storage_used = (activeUser.storage_used || 0) + file.size;

        const u = db.users.find(usr => usr.uid === activeUser.uid);
        if (u) u.storage_used = activeUser.storage_used;

        window.StoreHubStorageEngine.saveDB(db);
        resolve(newFile);
      };

      reader.onerror = () => reject(new Error('File reading failed.'));
      reader.readAsDataURL(file);
    });
  }

  async function promptCreateFolder() {
    const name = prompt('Enter new folder name:');
    if (!name || !name.trim()) return;

    try {
      const res = await fetch('/api/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          parent_id: currentFolderId
        })
      });

      const data = await res.json();
      if (res.ok) {
        StoreHubApp.showToast(`Folder "${name}" created`, 'success');
        loadItems();
      } else {
        StoreHubApp.showToast(data.error || 'Failed to create folder', 'error');
      }
    } catch (e) {
      StoreHubApp.showToast('Error creating folder', 'error');
    }
  }

  function openItemMenu(event, id, type, encodedName) {
    const name = decodeURIComponent(encodedName);
    activeItem = { id, type, name };

    const choice = prompt(`Manage ${type}: "${name}"\n\nOptions:\n1. Rename\n2. ${currentView === 'trash' ? 'Restore' : 'Move to Trash'}\n3. ${currentView === 'trash' ? 'Delete Permanently' : 'Share'}\n\nEnter number:`);
    if (choice === '1') {
      promptRename(id, type, name);
    } else if (choice === '2') {
      if (currentView === 'trash') {
        restoreItem(id, type);
      } else {
        trashItem(id, type);
      }
    } else if (choice === '3') {
      if (currentView === 'trash') {
        deletePermanently(id, type);
      } else {
        if (type === 'file') openShareModal(id);
      }
    }
  }

  async function promptRename(id, type, currentName) {
    const newName = prompt(`Rename ${type}:`, currentName);
    if (!newName || !newName.trim() || newName === currentName) return;

    try {
      const res = await fetch('/api/drive/rename', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type, new_name: newName.trim() })
      });
      if (res.ok) {
        StoreHubApp.showToast(`${type} renamed successfully`, 'success');
        loadItems();
      } else {
        StoreHubApp.showToast('Failed to rename item', 'error');
      }
    } catch (e) {
      StoreHubApp.showToast('Error', 'error');
    }
  }

  async function toggleStar(id, type) {
    try {
      const res = await fetch('/api/drive/star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type })
      });
      if (res.ok) {
        loadItems();
      }
    } catch (e) {}
  }

  async function trashItem(id, type) {
    try {
      const res = await fetch('/api/drive/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type })
      });
      if (res.ok) {
        StoreHubApp.showToast('Item moved to trash', 'info');
        loadItems();
      }
    } catch (e) {
      StoreHubApp.showToast('Failed to trash item', 'error');
    }
  }

  async function restoreItem(id, type) {
    try {
      const res = await fetch('/api/drive/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type })
      });
      if (res.ok) {
        StoreHubApp.showToast('File restored ✓', 'success');
        loadItems();
      }
    } catch (e) {
      StoreHubApp.showToast('Failed to restore item', 'error');
    }
  }

  async function deletePermanently(id, type) {
    if (!confirm('Permanently delete this item? This action frees your 5 GB space and cannot be undone.')) return;

    try {
      const res = await fetch(`/api/drive/items/${id}?type=${type}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        StoreHubApp.showToast('Permanently deleted. Space freed.', 'success');
        loadItems();
      }
    } catch (e) {
      StoreHubApp.showToast('Failed to delete item', 'error');
    }
  }

  async function emptyTrash() {
    if (!confirm('Empty all items in Trash permanently?')) return;
    try {
      const res = await fetch('/api/drive/empty-trash', { method: 'POST' });
      if (res.ok) {
        StoreHubApp.showToast('Trash emptied successfully', 'success');
        loadItems();
      }
    } catch (e) {
      StoreHubApp.showToast('Failed to empty trash', 'error');
    }
  }

  function downloadFile(fileId) {
    const file = currentFiles.find(f => f.id === fileId);
    if (!file) return;

    const a = document.createElement('a');
    a.href = file.data_url || 'data:text/plain;charset=utf-8,StoreHub File';
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    StoreHubApp.showToast(`Downloading ${file.name}...`, 'info');
  }

  function previewFile(fileId) {
    const file = currentFiles.find(f => f.id === fileId);
    if (!file) return;

    const modal = document.getElementById('preview-modal');
    const title = document.getElementById('preview-modal-title');
    const body = document.getElementById('preview-modal-body');
    const downloadBtn = document.getElementById('preview-download-btn');

    if (!modal || !body) return;

    title.textContent = file.name;
    downloadBtn.onclick = () => downloadFile(file.id);

    const url = file.data_url || '';
    const mime = file.mime_type || '';

    if (mime.startsWith('image/')) {
      body.innerHTML = `<img src="${url}" style="max-width:100%; max-height:70vh; object-fit:contain; border-radius:8px; display:block; margin:0 auto;">`;
    } else if (mime.startsWith('video/')) {
      body.innerHTML = `<video controls autoplay style="width:100%; max-height:70vh; border-radius:8px;"><source src="${url}" type="${mime}"></video>`;
    } else if (mime.startsWith('audio/')) {
      body.innerHTML = `<div style="text-align:center; padding:40px;"><audio controls autoplay style="width:100%; max-width:400px;"><source src="${url}" type="${mime}"></audio></div>`;
    } else if (mime === 'application/pdf') {
      body.innerHTML = `<iframe src="${url}" style="width:100%; height:70vh; border:none; border-radius:8px;"></iframe>`;
    } else if (mime.includes('text') || mime.includes('json') || mime.includes('javascript') || mime.includes('html')) {
      let content = url.includes('base64,') ? atob(url.split('base64,')[1]) : url;
      body.innerHTML = `<pre style="background:#090d16; color:#38bdf8; padding:16px; border-radius:8px; max-height:70vh; overflow:auto; font-size:13px; font-family:monospace;">${StoreHubApp.escapeHtml(content)}</pre>`;
    } else {
      body.innerHTML = `
        <div style="text-align:center; padding:50px;">
          <p style="color:var(--text-muted); margin-bottom:16px;">Inline preview not supported for this file format.</p>
          <button class="btn-primary" onclick="StoreHubDrive.downloadFile('${file.id}')">Download File</button>
        </div>
      `;
    }

    StoreHubApp.openModal('preview-modal');
  }

  async function openShareModal(fileId) {
    const file = currentFiles.find(f => f.id === fileId);
    if (!file) return;

    const modal = document.getElementById('share-modal');
    const title = document.getElementById('share-modal-title');
    if (!modal) return;

    title.textContent = `Share "${file.name}"`;

    try {
      const res = await fetch(`/api/shares/file/${fileId}`);
      if (res.ok) {
        const data = await res.json();
        renderShareModalContent(file, data);
        StoreHubApp.openModal('share-modal');
      }
    } catch (e) {
      StoreHubApp.showToast('Unable to load sharing settings', 'error');
    }
  }

  function renderShareModalContent(file, shareData) {
    const container = document.getElementById('share-modal-content');
    if (!container) return;

    const publicEnabled = shareData.public_link && shareData.public_link.enabled;
    const publicUrl = shareData.public_link ? window.location.origin + window.location.pathname.replace(/[^\/]+$/, '') + shareData.public_link.url : '';

    container.innerHTML = `
      <div style="margin-bottom:24px;">
        <label class="form-label" style="font-weight:600;">Share with Store Hub User</label>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">Enter an internal R-Mail address (e.g. rahul1234@storage.hub)</p>
        <div style="display:flex; gap:10px;">
          <input type="email" id="share-rmail-input" class="form-input" placeholder="username@storage.hub" style="flex:1;">
          <select id="share-permission-select" class="form-input" style="width:110px;">
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <button class="btn-primary" onclick="StoreHubDrive.submitUserShare('${file.id}')">Share</button>
        </div>
      </div>

      <div style="margin-bottom:24px;">
        <label class="form-label" style="font-weight:600;">General Access & Public Link</label>
        <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-primary); padding:12px; border-radius:8px; border:1px solid var(--border-color);">
          <div>
            <div style="font-weight:600; font-size:14px;">${publicEnabled ? '🌐 Anyone with the link' : '🔒 Restricted (Private)'}</div>
            <div style="font-size:12px; color:var(--text-muted);">${publicEnabled ? 'Anyone with this link can view and download' : 'Only people with Store Hub access can open'}</div>
          </div>
          <button class="btn-secondary" onclick="StoreHubDrive.togglePublicLink('${file.id}', ${!publicEnabled})">
            ${publicEnabled ? 'Disable Public Link' : 'Enable Public Link'}
          </button>
        </div>
        ${publicEnabled ? `
          <div style="display:flex; gap:10px; margin-top:10px;">
            <input type="text" class="form-input" value="${publicUrl}" readonly style="flex:1; font-family:monospace; font-size:12px;">
            <button class="btn-secondary" onclick="navigator.clipboard.writeText('${publicUrl}'); StoreHubApp.showToast('Public link copied to clipboard!', 'success');">Copy Link</button>
          </div>
        ` : ''}
      </div>

      <div>
        <label class="form-label" style="font-weight:600;">People with Access</label>
        <div style="max-height:160px; overflow-y:auto;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-color); font-size:13px;">
            <div><strong>You</strong> (Owner)</div>
            <span style="color:var(--text-muted);">Owner</span>
          </div>
          ${shareData.shares.map(s => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-color); font-size:13px;">
              <div>
                <div><strong>${StoreHubApp.escapeHtml(s.name)}</strong></div>
                <div style="color:var(--text-muted); font-size:11px;">${StoreHubApp.escapeHtml(s.rmail)}</div>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="text-transform:capitalize; font-size:12px; color:var(--accent);">${s.permission}</span>
                <button class="icon-btn" style="width:24px;height:24px;border:none;color:var(--danger);" onclick="StoreHubDrive.revokeShare('${s.id}', '${file.id}')">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  async function submitUserShare(fileId) {
    const rmail = document.getElementById('share-rmail-input').value.trim();
    const permission = document.getElementById('share-permission-select').value;

    if (!rmail) {
      StoreHubApp.showToast('Please enter an R-Mail address', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/shares/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId, rmail, permission })
      });
      const data = await res.json();
      if (res.ok) {
        StoreHubApp.showToast(data.message, 'success');
        openShareModal(fileId);
      } else {
        StoreHubApp.showToast(data.error || 'Failed to share file', 'error');
      }
    } catch (e) {
      StoreHubApp.showToast('Error sharing file', 'error');
    }
  }

  async function togglePublicLink(fileId, enabled) {
    try {
      const res = await fetch('/api/shares/public-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId, enabled })
      });
      const data = await res.json();
      if (res.ok) {
        StoreHubApp.showToast(data.message, 'success');
        openShareModal(fileId);
      }
    } catch (e) {
      StoreHubApp.showToast('Failed to update public link', 'error');
    }
  }

  async function revokeShare(shareId, fileId) {
    try {
      const res = await fetch(`/api/shares/${shareId}`, { method: 'DELETE' });
      if (res.ok) {
        StoreHubApp.showToast('Access revoked', 'info');
        openShareModal(fileId);
      }
    } catch (e) {
      StoreHubApp.showToast('Failed to revoke access', 'error');
    }
  }

  return {
    init,
    loadItems,
    navigateToFolder,
    promptCreateFolder,
    openItemMenu,
    toggleStar,
    downloadFile,
    previewFile,
    openShareModal,
    submitUserShare,
    togglePublicLink,
    revokeShare,
    emptyTrash
  };
})();
