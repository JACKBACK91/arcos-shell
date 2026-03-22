/* ═══════════════════════════════════════════
   init.js — ArcOS boot sequence (v5)
   Runs after all modules are loaded.
═══════════════════════════════════════════ */
window.addEventListener('load', () => {

  /* ── Apply saved preferences ──────────────── */
  if (typeof applyAllPrefs === 'function') applyAllPrefs();

  /* ── Keyboard shortcuts ───────────────────── */
  document.addEventListener('keydown', e => {
    // Escape closes open menus
    if (e.key === 'Escape') {
      Shell.closeStart();
      Shell.closeNotifPanel();
    }
    // Alt+F4 → close focused window
    if (e.altKey && e.key === 'F4') {
      const f = document.querySelector('.window.focused');
      if (f) Shell.closeWin(f.dataset.id);
      e.preventDefault();
    }
    // Ctrl+D → show/hide desktop
    if (e.ctrlKey && e.key === 'd') {
      Shell.toggleShowDesktop();
      e.preventDefault();
    }
  });

  /* ── Welcome + initial app ────────────────── */
  setTimeout(() => {
    Shell.openApp('notes');
    Notifications.push({
      icon: '⊞',
      title: 'Welcome to ArcOS',
      msg:  'Double-click icons or press the Windows button to open apps.',
      app:  'ArcOS Shell',
    });
  }, 450);

  /* ── Simulated system notifications ──────── */
  Notifications.scheduleSystemNotifs();

  /* ── Electron detection (Step 9) ─────────── */
  if (typeof window.electronAPI !== 'undefined') {
    console.log('[ArcOS] Running in Electron shell');
    // In Electron: IPC listeners would be set up here
    // e.g. window.electronAPI.onShellEvent(handler)
    Notifications.push({
      icon: '⚡',
      title: 'Electron mode',
      msg:  'Running as a desktop app via Electron.',
      app:  'ArcOS Shell',
    });
  }

});
