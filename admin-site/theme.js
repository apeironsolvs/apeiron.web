/**
 * Apeiron Solutions — Unified Theme Engine (Admin Portal)
 * Manages Light / Dark mode persistence, zero-FOUC initialization,
 * cross-tab synchronization, and interactive theme toggles.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'apeiron_theme';

  function getSavedTheme() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    return 'dark'; // Dark theme is default for Apeiron
  }

  function applyTheme(theme, skipEvent) {
    if (theme !== 'light' && theme !== 'dark') theme = 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;

    var metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'light' ? '#F4F6F9' : '#06080a');
    }

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}

    updateToggles(theme);

    if (!skipEvent && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent('apeiron:theme-change', { detail: { theme: theme } }));
      } catch (e) {}
    }
  }

  function updateToggles(theme) {
    var toggles = document.querySelectorAll('.theme-toggle, [data-theme-toggle]');
    var isLight = theme === 'light';
    var label = isLight ? 'Switch to dark theme' : 'Switch to light theme';

    for (var i = 0; i < toggles.length; i++) {
      var btn = toggles[i];
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
      if (isLight) {
        btn.classList.add('is-light');
      } else {
        btn.classList.remove('is-light');
      }
    }
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    return next;
  }

  // Immediately apply saved or default theme to documentElement (Zero FOUC)
  applyTheme(getSavedTheme(), true);

  // Synchronize across open browser tabs / windows
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY && e.newValue && (e.newValue === 'light' || e.newValue === 'dark')) {
      applyTheme(e.newValue, false);
    }
  });

  function initToggles() {
    updateToggles(document.documentElement.getAttribute('data-theme') || 'dark');
    document.addEventListener('click', function (e) {
      var target = e.target;
      var btn = target.closest ? target.closest('.theme-toggle, [data-theme-toggle]') : null;
      if (btn) {
        e.preventDefault();
        toggleTheme();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToggles);
  } else {
    initToggles();
  }

  window.ApeironTheme = {
    get: function () {
      return document.documentElement.getAttribute('data-theme') || 'dark';
    },
    set: function (theme) {
      applyTheme(theme);
    },
    toggle: toggleTheme,
    updateUI: function () {
      updateToggles(this.get());
    }
  };
})();
