/**
 * electron/main.js — ArcOS Electron Main Process
 * ─────────────────────────────────────────────────
 * Step 9: Wraps the ArcOS shell UI in an Electron
 * window that fills the screen like a real desktop
 * shell. Intended as the bridge toward a Linux
 * kiosk/shell replacement.
 *
 * Run:  cd os-ui-v5 && npm start
 * Build: npm run build
 */

const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let shellWindow = null;

function createShellWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  shellWindow = new BrowserWindow({
    // ── Shell-like window config ──────────────
    width,
    height,
    x: 0,
    y: 0,
    frame:           false,    // No OS titlebar — we draw our own
    titleBarStyle:   'hidden',
    resizable:       true,
    movable:         false,    // Shell doesn't move
    alwaysOnTop:     false,
    fullscreenable:  true,
    kiosk:           false,    // Set true for real kiosk/lock-screen mode
    backgroundColor: '#0d0d1a',

    webPreferences: {
      nodeIntegration:     false,  // Security: no direct Node in renderer
      contextIsolation:    true,   // Security: isolated context
      preload:             path.join(__dirname, 'preload.js'),
      webSecurity:         true,
    },
  });

  // Load the shell UI from local files
  shellWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    shellWindow.webContents.openDevTools({ mode: 'detach' });
  }

  shellWindow.on('closed', () => { shellWindow = null; });

  // ── IPC: Shell → Main process calls ─────────
  // These are the hooks that would eventually call
  // real Linux APIs (systemd, D-Bus, xrandr, etc.)
  // ─────────────────────────────────────────────

  ipcMain.handle('shell:quit', () => {
    // Linux equiv: systemctl poweroff
    app.quit();
  });

  ipcMain.handle('shell:reboot', () => {
    // Linux equiv: systemctl reboot
    console.log('[ArcOS] Reboot requested');
  });

  ipcMain.handle('shell:lock', () => {
    // Linux equiv: loginctl lock-session / swaylock
    console.log('[ArcOS] Lock requested');
  });

  ipcMain.handle('shell:setBrightness', (_, value) => {
    // Linux equiv: echo value > /sys/class/backlight/*/brightness
    console.log('[ArcOS] Brightness →', value);
  });

  ipcMain.handle('shell:setVolume', (_, value) => {
    // Linux equiv: pactl set-sink-volume @DEFAULT_SINK@ value%
    console.log('[ArcOS] Volume →', value);
  });

  ipcMain.handle('shell:getSystemInfo', () => {
    // Linux equiv: read from /etc/os-release, uname, /proc/cpuinfo
    return {
      platform: process.platform,
      arch:     process.arch,
      version:  process.version,
      electron: process.versions.electron,
    };
  });

  ipcMain.handle('shell:notify', (_, { title, body, icon }) => {
    // Linux equiv: D-Bus org.freedesktop.Notifications.Notify
    // Electron has built-in Notification support:
    const { Notification } = require('electron');
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  ipcMain.handle('shell:openExternal', (_, url) => {
    // Open URLs in default system browser
    require('electron').shell.openExternal(url);
  });
}

// ── App lifecycle ─────────────────────────────
app.whenReady().then(() => {
  createShellWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createShellWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
