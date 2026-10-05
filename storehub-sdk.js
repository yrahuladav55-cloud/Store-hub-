/**
 * =========================================================================
 * STORE HUB Project SDK (store.js)
 * Official Client SDK for Store Hub Cloud Hosted Web Projects
 * =========================================================================
 */
(function (global) {
  'use strict';

  let _config = {
    projectId: null,
    appName: 'Store Hub Web Project',
    version: '1.0.0',
    debug: false
  };

  let _initialized = false;
  let _cachedUser = null;
  let _cachedProject = null;

  const StoreHub = {
    /**
     * Initialize StoreHub SDK with application settings
     * @param {Object} options 
     */
    init: function (options) {
      if (!options) options = {};
      _config = Object.assign({}, _config, options);
      _initialized = true;
      if (_config.debug) {
        console.log('[StoreHub SDK] Initialized with config:', _config);
      }
      return this;
    },

    /**
     * Get details of the current web project
     * @returns {Promise<Object>}
     */
    project: async function () {
      if (_cachedProject) return _cachedProject;
      try {
        const id = _config.projectId;
        if (id) {
          const res = await fetch(`/api/projects/${id}`);
          if (res.ok) {
            const data = await res.json();
            _cachedProject = data.project;
            return _cachedProject;
          }
        }
      } catch (err) {
        if (_config.debug) console.warn('[StoreHub SDK] Could not fetch project info:', err);
      }

      // Safe local fallback
      _cachedProject = {
        id: _config.projectId || 'CURRENT_PROJECT',
        name: _config.appName || 'Store Hub Web Project',
        views: 1,
        tier: '5 GB Free Tier',
        sdkVersion: _config.version
      };
      return _cachedProject;
    },

    /**
     * Trigger native or fallback sharing dialog for this project
     * @param {Object} shareOptions { title, text, url }
     */
    share: function (shareOptions) {
      const opts = Object.assign({
        title: _config.appName,
        text: 'Check out this application on Store Hub!',
        url: window.location.href
      }, shareOptions);

      if (navigator.share) {
        return navigator.share(opts).catch(err => {
          if (_config.debug) console.log('Share canceled or failed:', err);
        });
      } else {
        // Fallback: clipboard copy
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(opts.url).then(() => {
            alert('Project link copied to clipboard:\n' + opts.url);
          }).catch(() => {
            prompt('Copy this project link:', opts.url);
          });
        } else {
          prompt('Copy this project link:', opts.url);
        }
      }
    },

    /**
     * Retrieve the currently logged-in Store Hub user info (non-sensitive)
     * @returns {Promise<Object|null>}
     */
    getUser: async function () {
      if (_cachedUser) return _cachedUser;
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          _cachedUser = {
            uid: data.user.uid,
            rmail: data.user.rmail,
            first_name: data.user.first_name,
            last_name: data.user.last_name,
            role: data.user.role
          };
          return _cachedUser;
        }
      } catch (err) {
        if (_config.debug) console.warn('[StoreHub SDK] Guest mode:', err);
      }
      return null;
    },

    /**
     * Helper to ping Store Hub telemetry or trigger custom event
     */
    logEvent: function (eventName, eventData) {
      if (_config.debug) {
        console.log(`[StoreHub SDK Event] ${eventName}:`, eventData);
      }
    }
  };

  // Expose to window / global
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StoreHub;
  } else {
    global.StoreHub = StoreHub;
  }
})(typeof window !== 'undefined' ? window : this);
