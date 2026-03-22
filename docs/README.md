# ArcOS Desktop Shell — v0.6.0-dev
**All 12 Prototype Steps Complete**

A Windows 11-inspired desktop shell prototype in HTML/CSS/JS,
wrapped in Electron for real desktop use, with full Linux/Wayland
deployment plans and an ISO packaging skeleton.

---

## Run in browser (zero install)

Unzip and open `index.html` in any modern browser. Works from `file://` with no server needed.

---

## Run with Electron

```bash
cd os-ui-v6
npm install     # downloads Electron (~120 MB, one-time)
npm start       # launches ArcOS as a frameless desktop window
npm run dev     # same, with DevTools open
```

Build distributable:
```bash
npm run build        # → dist/*.AppImage + *.deb  (Linux)
npm run build:win    # → dist/*.exe
```

Requires Node.js 20+.

---

## Install on Linux (developer mode)

```bash
chmod +x scripts/setup/install-arcos.sh
./scripts/setup/install-arcos.sh
# Installs wayfire, greetd, config files, and launch scripts
# On next boot: greetd shows ArcOS login
```

---

## Project structure

```
os-ui-v6/
├── index.html                  Desktop shell HTML
├── css/                        Fluent/Mica styles (6 files)
├── js/
│   ├── shell.js                Window manager + app registry
│   ├── notifications.js        Notification system
│   ├── init.js                 Boot sequence
│   └── apps/                   8 app modules
├── electron/
│   ├── main.js                 Electron main + IPC stubs
│   └── preload.js              Secure contextBridge
├── linux/                      Step 11 — Linux configs
│   ├── greetd/config.toml      Login manager
│   ├── wayfire/wayfire.ini      Compositor
│   ├── systemd/                Service + session target
│   ├── dbus/org.arcos.Shell.xml D-Bus interface (planned)
│   └── desktop-entries/        .desktop files
├── scripts/                    Step 12 — ISO + setup
│   ├── iso/
│   │   ├── build-iso.sh        Full ISO builder
│   │   ├── test-vm.sh          QEMU test launcher
│   │   └── live-build-config/  Debian live-build config
│   └── setup/
│       ├── install-arcos.sh    Dev install script
│       └── arcos-session.sh    Session startup
├── docs/
│   ├── README.md               This file
│   ├── MIGRATION-NOTES.md      Step 8: browser→Linux map
│   ├── LINUX-PLAN.md           Step 11: Linux base plan
│   └── ISO-PLAN.md             Step 12: ISO packaging plan
├── assets/icons/               Add icon.png 256×256 for builds
└── package.json                Electron + build config
```

---

## Steps delivered

| # | What was built |
|---|----------------|
| 1 | Desktop mockup — layout, taskbar, icons, clock |
| 2 | Window open/close/drag, taskbar buttons |
| 3 | Minimise/maximise/snap/z-order, show desktop |
| 4 | File Explorer — sidebar, virtual FS, grid+list, nav |
| 5 | Settings — localStorage prefs, live wallpaper + accent |
| 6 | `Shell.register()` app registry, modular file structure |
| 7 | Polish — animations, hover lifts, notification centre |
| 8 | SHELL-CORE/BROWSER-ONLY annotations, Linux migration map |
| 9 | Electron wrapper — frameless window, IPC, preload |
| 10 | About app, dedicated notification system with badge |
| **11** | **Linux plan — Debian base, Wayfire, greetd, D-Bus, systemd** |
| **12** | **ISO skeleton — live-build config, hooks, build + test scripts** |

---

## Apps

| App | Status |
|-----|--------|
| File Explorer | ✅ Virtual FS, nav history, grid/list, search |
| Notepad | ✅ Word count, toolbar |
| Terminal | ✅ 15+ commands, history, neofetch |
| Settings | ✅ 8 pages, live prefs via localStorage |
| Calculator | ✅ Full arithmetic |
| Browser | ✅ Mockup |
| About ArcOS | ✅ Runtime detect, step progress |
| Store / Mail / Photos / Music / Calendar / Maps | 🔲 Placeholder |

---

## Linux deployment

```
greetd → arcos-session → Wayfire + ArcOS (Electron)
```

Build the ISO (requires Debian 12 host with live-build):
```bash
sudo scripts/iso/build-iso.sh     # → arcos-0.6.0-amd64.iso
./scripts/iso/test-vm.sh          # → QEMU test
```

**Blockers before first real boot:**
1. `npm run build` → AppImage (needs node-pty native compile)
2. greetd login screen HTML
3. D-Bus IPC (`dbus-next` npm package + handlers)
4. VM validation

See `docs/ISO-PLAN.md` for the full checklist.

---

## Key shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Close Start / Notification Centre |
| `Alt+F4` | Close focused window |
| `Ctrl+D` | Show/hide desktop |

---

*ArcOS v0.6.0-dev — prototype complete, Linux deployment in progress*
