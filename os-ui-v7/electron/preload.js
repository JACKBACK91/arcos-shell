/**
 * electron/preload.js — Secure IPC Bridge
 * ─────────────────────────────────────────
 * Exposes a safe, limited API to the renderer
 * (index.html / shell.js) via contextBridge.
 *
 * SECURITY: Only whitelisted calls pass through.
 * The renderer has NO direct Node.js access.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

  // ── Shell actions ────────────────────────────
  quit:          ()      => ipcRenderer.invoke('shell:quit'),
  reboot:        ()      => ipcRenderer.invoke('shell:reboot'),
  lock:          ()      => ipcRenderer.invoke('shell:lock'),

  // ── Hardware (MOCK in browser, real in Electron) ──
  setBrightness: (val)   => ipcRenderer.invoke('shell:setBrightness', val),
  setVolume:     (val)   => ipcRenderer.invoke('shell:setVolume', val),
  getSystemInfo: ()      => ipcRenderer.invoke('shell:getSystemInfo'),

  // ── Notifications (native) ───────────────────
  nativeNotify:  (opts)  => ipcRenderer.invoke('shell:notify', opts),

  // ── Utilities ───────────────────────────────
  openExternal:  (url)   => ipcRenderer.invoke('shell:openExternal', url),

  // ── Platform detection ────────────────────────
  platform: process.platform,
  isElectron: true,
});
