/**
 * =========================================================================
 * STORE HUB Web Project System JavaScript (projects.js - Standalone Client Version)
 * Manages Public Projects directory, project IDE editor, sandboxing & publishing
 * =========================================================================
 */

const StoreHubProjects = (function () {
  let activeProjectId = null;
  let currentProject = null;
  let projectFiles = [];
  let activeFileName = 'index.html';
  let isMobilePreview = false;

  async function init() {
    const filename = window.location.pathname.split('/').pop();

    if (filename === 'public-projects.html' || filename === 'public-projects') {
      initPublicProjectsGallery();
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      activeProjectId = id;
      await loadProjectForEditing(id);
    } else {
      loadUserProjectsList();
    }

    setupEditorEvents();
  }

  async function initPublicProjectsGallery() {
    setupGalleryFilters();
    await loadPublicProjects();
  }

  function setupGalleryFilters() {
    const searchInput = document.getElementById('public-search-input');
    if (searchInput) {
      let timeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          loadPublicProjects(e.target.value.trim());
        }, 300);
      });
    }

    document.querySelectorAll('.category-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        const category = e.target.getAttribute('data-category');
        loadPublicProjects('', category);
      });
    });
  }

  async function loadPublicProjects(search = '', category = '') {
    const grid = document.getElementById('public-projects-grid');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; color:var(--text-muted);">Discovering public web projects...</div>';

    try {
      const res = await fetch(`/api/public-projects?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`);
      const data = await res.json();
      const projects = data.projects || [];

      if (projects.length === 0) {
        grid.innerHTML = `
          <div style="grid-column:1/-1;" class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            <h3>No public projects found</h3>
            <p>Be the first to build and publish a web project with Store Hub SDK!</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = projects.map(p => `
        <div class="project-card">
          <div class="project-banner">
            <span class="project-badge-live">
              <span style="display:inline-block;width:6px;height:6px;background:#10b981;border-radius:50%;"></span>
              Live Project
            </span>
            <svg style="width:48px;height:48px;color:rgba(255,255,255,0.4);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
          </div>
          <div class="project-body">
            <h3 class="project-title">${StoreHubApp.escapeHtml(p.name)}</h3>
            <p class="project-desc">${StoreHubApp.escapeHtml(p.description || 'Modern web project created and published on Store Hub.')}</p>
            
            <div class="project-creator-row">
              <div>
                <strong>${StoreHubApp.escapeHtml(p.creator.name)}</strong>
                <div style="font-size:11px; color:var(--text-muted);">${StoreHubApp.escapeHtml(p.creator.rmail)}</div>
              </div>
              <div style="text-align:right;">
                <span style="font-weight:600; color:var(--accent);">${p.views || 0}</span> views
                <div style="font-size:11px;">${new Date(p.created_at).toLocaleDateString()}</div>
              </div>
            </div>

            <div class="project-actions-row">
              <button class="btn-open-project" onclick="StoreHubProjects.openProjectModal('${p.project_url}')">Open Project</button>
              <button class="btn-secondary" style="padding:8px 12px;" onclick="StoreHubProjects.shareProject('${p.name}', '${p.project_url}')">
                <svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
              </button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      grid.innerHTML = `<div style="grid-column:1/-1;" class="empty-state"><h3>Error loading projects</h3><p>${err.message}</p></div>`;
    }
  }

  async function openProjectModal(projectUrlToken) {
    const modal = document.getElementById('project-viewer-modal');
    const iframe = document.getElementById('project-modal-iframe');
    const fullLink = document.getElementById('modal-fullscreen-link');
    if (!modal || !iframe) return;

    try {
      const res = await fetch(`/api/projects/render/${projectUrlToken}`);
      const html = await res.text();
      iframe.srcdoc = html;
      if (fullLink) {
        fullLink.onclick = () => {
          const w = window.open('');
          w.document.write(html);
          w.document.close();
        };
      }
      StoreHubApp.openModal('project-viewer-modal');
    } catch (e) {
      StoreHubApp.showToast('Unable to render project', 'error');
    }
  }

  function shareProject(name, token) {
    const url = window.location.origin + window.location.pathname + '?render=' + token;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      StoreHubApp.showToast(`Link for "${name}" copied to clipboard!`, 'success');
    } else {
      prompt('Copy project link:', url);
    }
  }

  async function loadUserProjectsList() {
    const container = document.getElementById('my-projects-list');
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        const list = data.projects || [];
        if (list.length > 0) {
          activeProjectId = list[0].id;
          loadProjectForEditing(activeProjectId);
        } else {
          if (container) {
            container.innerHTML = `
              <div class="empty-state">
                <h3>No Web Projects</h3>
                <p>Create your first project with index.html, style.css, script.js, and store.js</p>
                <button class="btn-primary" onclick="StoreHubProjects.promptNewProject()">+ Create Web Project</button>
              </div>
            `;
          }
        }
      }
    } catch (e) {}
  }

  async function loadProjectForEditing(projectId) {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        if (res.status === 401) return (window.location.href = 'login.html');
        throw new Error('Project not found');
      }

      const data = await res.json();
      currentProject = data.project;
      projectFiles = data.files || [];

      const nameEl = document.getElementById('editor-project-name');
      if (nameEl) nameEl.textContent = currentProject.name;

      const statusBadge = document.getElementById('editor-project-status');
      if (statusBadge) {
        statusBadge.textContent = currentProject.status === 'published' ? 'Published ✓' : 'Draft';
        statusBadge.style.color = currentProject.status === 'published' ? 'var(--success)' : 'var(--warning)';
      }

      const pubBtn = document.getElementById('publish-toggle-btn');
      if (pubBtn) {
        pubBtn.textContent = currentProject.status === 'published' ? 'Unpublish' : 'Publish Project';
        pubBtn.className = currentProject.status === 'published' ? 'btn-secondary' : 'btn-primary';
      }

      switchEditorTab(activeFileName);
      refreshPreview();
    } catch (err) {
      StoreHubApp.showToast(err.message, 'error');
    }
  }

  function setupEditorEvents() {
    document.querySelectorAll('.editor-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const fileName = tab.getAttribute('data-file');
        switchEditorTab(fileName);
      });
    });

    const textarea = document.getElementById('code-editor-textarea');
    if (textarea) {
      textarea.addEventListener('input', () => {
        saveCurrentFileDebounced();
      });
    }

    const refreshBtn = document.getElementById('preview-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => refreshPreview());
    }

    const deviceBtn = document.getElementById('preview-device-toggle');
    if (deviceBtn) {
      deviceBtn.addEventListener('click', () => {
        isMobilePreview = !isMobilePreview;
        const pane = document.getElementById('preview-iframe-wrapper');
        if (pane) {
          if (isMobilePreview) {
            pane.style.maxWidth = '375px';
            pane.style.margin = '0 auto';
            pane.style.border = '8px solid #1e293b';
            pane.style.borderRadius = '32px';
            deviceBtn.textContent = '📱 Mobile';
          } else {
            pane.style.maxWidth = '100%';
            pane.style.margin = '0';
            pane.style.border = 'none';
            pane.style.borderRadius = '0';
            deviceBtn.textContent = '💻 Desktop';
          }
        }
      });
    }

    const fsBtn = document.getElementById('preview-fullscreen-btn');
    if (fsBtn) {
      fsBtn.addEventListener('click', async () => {
        if (activeProjectId) {
          const res = await fetch(`/api/projects/render/${activeProjectId}`);
          const html = await res.text();
          const w = window.open('');
          w.document.write(html);
          w.document.close();
        }
      });
    }
  }

  function switchEditorTab(fileName) {
    activeFileName = fileName;

    document.querySelectorAll('.editor-tab').forEach(t => {
      if (t.getAttribute('data-file') === fileName) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    const file = projectFiles.find(f => f.file_name === fileName);
    const textarea = document.getElementById('code-editor-textarea');
    if (textarea) {
      textarea.value = file ? file.content : '';
    }
  }

  let saveTimeout = null;
  function saveCurrentFileDebounced() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      const textarea = document.getElementById('code-editor-textarea');
      if (!textarea || !activeProjectId) return;

      const content = textarea.value;

      try {
        const res = await fetch(`/api/projects/${activeProjectId}/files`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_name: activeFileName, content })
        });
        if (res.ok) {
          const f = projectFiles.find(item => item.file_name === activeFileName);
          if (f) f.content = content;
          refreshPreview();
        }
      } catch (e) {}
    }, 500);
  }

  async function refreshPreview() {
    const iframe = document.getElementById('live-preview-iframe');
    if (!iframe || !activeProjectId) return;

    try {
      const res = await fetch(`/api/projects/render/${activeProjectId}?t=${Date.now()}`);
      const html = await res.text();
      iframe.srcdoc = html;
    } catch (e) {}
  }

  async function togglePublish() {
    if (!activeProjectId || !currentProject) return;

    if (currentProject.status === 'published') {
      try {
        const res = await fetch(`/api/projects/${activeProjectId}/unpublish`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          StoreHubApp.showToast('Project unpublished. Moved to private mode.', 'info');
          loadProjectForEditing(activeProjectId);
        }
      } catch (e) {
        StoreHubApp.showToast('Failed to unpublish project', 'error');
      }
    } else {
      try {
        const valRes = await fetch(`/api/projects/${activeProjectId}/validate`);
        const valData = await valRes.json();

        if (!valData.valid) {
          StoreHubApp.showToast(valData.message || 'Cannot publish: missing files', 'error');
          return;
        }

        const pubRes = await fetch(`/api/projects/${activeProjectId}/publish`, { method: 'POST' });
        const pubData = await pubRes.json();
        if (pubRes.ok) {
          StoreHubApp.showToast('Published! Live on Public Projects ✓', 'success');
          loadProjectForEditing(activeProjectId);

          const liveUrl = window.location.origin + window.location.pathname.replace(/[^\/]+$/, '') + `public-projects.html?project=${pubData.project.project_url}`;
          prompt('Project published successfully! Shareable URL:', liveUrl);
        } else {
          StoreHubApp.showToast(pubData.error || 'Project could not be published', 'error');
        }
      } catch (e) {
        StoreHubApp.showToast('Error publishing project', 'error');
      }
    }
  }

  async function promptNewProject() {
    const name = prompt('Enter Web Project Name:');
    if (!name || !name.trim()) return;

    const desc = prompt('Enter Project Description (optional):') || '';

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        StoreHubApp.showToast(`Project "${name}" created!`, 'success');
        window.location.href = `project.html?id=${data.project.id}`;
      } else {
        StoreHubApp.showToast(data.error || 'Failed to create project', 'error');
      }
    } catch (e) {
      StoreHubApp.showToast('Error creating project', 'error');
    }
  }

  return {
    init,
    loadPublicProjects,
    openProjectModal,
    shareProject,
    togglePublish,
    promptNewProject,
    refreshPreview
  };
})();
