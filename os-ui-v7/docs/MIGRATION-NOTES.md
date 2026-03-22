# ArcOS — Linux Migration Notes
**Step 8 — Shell/Browser Separation Analysis**

---

## Overview

This document maps every browser-only feature in the ArcOS shell to its
Linux/native equivalent. The codebase is already split into three tiers:

| Tier | Meaning | Migration effort |
|---|---|---|
| **SHELL-CORE** | Logic that ports cleanly | Low — rename IPC calls |
| **BROWSER-ONLY** | DOM/localStorage/JS Date | Medium — replace with IPC |
| **MOCK** | Fake data (files, processes) | High — requires real daemon |

---

## Recommended Linux Stack

### Display / Session
| Component | Recommendation | Notes |
|---|---|---|
| Display protocol | **Wayland** (primary) | X11 as fallback via XWayland |
| Compositor | **wlroots** (custom) or **Wayfire** | wlroots gives most control |
| Session manager | **greetd + tuigreet** | Lightweight, scriptable |
| Display server fallback | **Xorg + openbox** | For older hardware |

### Shell wrapper
| Option | Use case | Notes |
|---|---|---|
| **Electron 33+** | Dev/prototyping (now) | node-pty for real terminal |
| **Qt WebEngine** | Production shell | QWebEngineView, C++ backend |
| **GTK4 + WebKitGTK** | Lightest weight | Good Wayland support |
| **Tauri** | Rust alternative to Electron | Smaller binary, WebKit |

### Recommended path:
```
Phase 1 (now):    Browser prototype ✅
Phase 2 (next):   Electron + node-pty + real fs
Phase 3:          Qt WebEngine / Tauri on Wayland
Phase 4:          Custom wlroots compositor + ISO
```

---

## Feature Migration Map

### Window Manager

| ArcOS (browser) | Linux equivalent |
|---|---|
| `Shell.openApp(id)` | Fork child process; track PID |
| `Shell.closeWin(id)` | `kill(pid, SIGTERM)` or D-Bus |
| `Shell.focusWin()` | `wlr_seat_keyboard_notify_enter()` |
| `Shell.minWin()` | `_NET_WM_STATE_HIDDEN` (X11) or wlroots surface hide |
| `Shell.maxWin()` | `_NET_WM_STATE_MAXIMIZED_*` / wlroots fullscreen |
| CSS `z-index` ordering | Compositor window stack (`wlr_layer_shell`) |
| DOM drag (mousemove) | `wlr_seat` move/resize grab |
| DOM resize corner | `wlr_seat` resize grab |
| Snap layouts | `wlr_output_layout` geometry split |

### Taskbar / Panel

| ArcOS (browser) | Linux equivalent |
|---|---|
| `#taskbar` HTML element | **waybar** or custom GTK/Qt panel |
| Pinned apps (hardcoded) | Parse `~/.config/arcos/pinned.json` |
| Running app list | Subscribe to wayland surface events |
| `.tb-pin.focused` dot | Active window via compositor event |
| Clock (JS `Date()`) | `strftime(3)` or `date(1)` subprocess |

### App Launcher (Start Menu)

| ArcOS (browser) | Linux equivalent |
|---|---|
| Hardcoded `#sm-grid` entries | Scan `/usr/share/applications/*.desktop` |
| `Shell.smFilter()` | Filter parsed `.desktop` `Name=` fields |
| App icons (emoji) | `Icon=` field → `/usr/share/icons/` lookup |
| `Shell.openApp(id)` | `Exec=` field via `g_app_info_launch()` |

### Notifications

| ArcOS (browser) | Linux equivalent |
|---|---|
| `Notifications.push()` | Receive via D-Bus `org.freedesktop.Notifications.Notify` |
| `Notifications.dismiss()` | D-Bus `CloseNotification(uint32 id)` |
| DOM toast render | **mako** / **dunst** / **swaync** daemon |
| Badge counter | StatusNotifierItem / AppIndicator |

### Settings & Preferences

| ArcOS (browser) | Linux equivalent |
|---|---|
| `localStorage` | `~/.config/arcos/prefs.json` (XDG Base Dir) |
| `Prefs.set('wallpaper', x)` | Write to config, notify compositor via IPC |
| Wallpaper CSS class | `swaybg -i /path/to/wallpaper.jpg` |
| Accent colour CSS var | GTK3/4 `gtk.css` override file |
| Brightness slider | Write to `/sys/class/backlight/*/brightness` |
| Volume slider | `pactl set-sink-volume @DEFAULT_SINK@ X%` |

### Terminal

| ArcOS (browser) | Linux equivalent |
|---|---|
| Mock command strings | Real PTY via **node-pty** (Electron) or `forkpty(3)` |
| `runCmd()` dispatcher | Route to `/bin/bash` subprocess |
| Fake directory listing | `opendir(3)` / `readdir(3)` |
| Fake process list | Parse `/proc/*/status` or `ps(1)` |

### File Explorer

| ArcOS (browser) | Linux equivalent |
|---|---|
| `FS` object (hardcoded) | `fs.readdir()` (Electron) or GIO async |
| Navigation state | Real path tracking via `chdir(2)` equivalent |
| File icons (emoji) | MIME type → icon theme lookup |
| File open on dblclick | `xdg-open` / `gio open` |
| Delete, rename, copy | `fs.unlink/rename/cp` or GIO operations |

---

## Files That Port Cleanly (SHELL-CORE)

These files contain no browser-only APIs and can be reused verbatim
in an Electron main process or compiled to a native module:

- `js/shell.js` — window state machine (replace DOM ops with IPC calls)
- `js/notifications.js` — notification queue + dispatcher
- `js/apps/settings.js` — preference logic (replace localStorage)
- `js/apps/explorer.js` — navigation/history logic
- `js/apps/terminal.js` — command dispatcher (replace mock output)

## Files That Are Browser-Only

These files render HTML and will need native equivalents in a full port:

- `css/*.css` — retained as-is in Electron/WebEngine, not in GTK
- `index.html` — retained in Electron/WebEngine shell
- All `build()` functions in app modules — renderer code, keep as-is in Electron

---

## Electron → Linux PTY (real terminal)

```js
// In electron/main.js (Step 9+)
const pty = require('node-pty');

ipcMain.handle('terminal:spawn', (event, cols, rows) => {
  const shell = process.env.SHELL || '/bin/bash';
  const proc  = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols, rows,
    cwd:  process.env.HOME,
    env:  process.env,
  });
  proc.onData(data => event.sender.send('terminal:data', data));
  ipcMain.on('terminal:input', (_, data) => proc.write(data));
  ipcMain.on('terminal:resize', (_, {cols, rows}) => proc.resize(cols, rows));
  return proc.pid;
});
```

---

## ISO Packaging (Steps 11–12 preview)

```
Recommended base:   Debian 12 Bookworm minimal (netinst)
Session:            greetd → arcos-shell (Electron AppImage)
Compositor:         Wayfire or wlroots custom
Build tool:         live-build (Debian) or mkosi
Init system:        systemd
Packaging:          .deb via electron-builder, then ISO via live-build
```

See `docs/ISO-PLAN.md` for the full Step 12 plan (created in Step 12).

---

*Generated: ArcOS Shell v0.5.0 — Step 8*
