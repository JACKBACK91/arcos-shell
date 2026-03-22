# How to Build the ArcOS ISO from Windows

You are on Windows. Here are **three ways** to get a bootable ISO,
from easiest to most control.

---

## Method 1 — GitHub Actions (EASIEST — fully automatic, free)

GitHub will run a cloud Linux machine, build the Electron AppImage,
then run live-build and produce a real bootable `.iso` for you to download.
You don't need to install anything except Git.

### Steps

**1. Create a free GitHub account** (if you don't have one)
→ https://github.com/signup

**2. Create a new repository**
→ https://github.com/new
→ Name it `arcos-shell`, set to Public (or Private), click Create

**3. Upload this project**

Option A — GitHub website (drag and drop):
```
1. Open your new repo on GitHub
2. Click "uploading an existing file"
3. Drag everything inside os-ui-v7/ into the browser window
4. Click "Commit changes"
```

Option B — Git command line (if you have Git installed):
```bash
cd os-ui-v7
git init
git add .
git commit -m "Initial ArcOS commit"
git remote add origin https://github.com/YOURUSERNAME/arcos-shell.git
git push -u origin main
```

**4. Watch it build**
```
→ Go to your repo on GitHub
→ Click the "Actions" tab
→ You'll see "Build ArcOS ISO" running
→ Wait 30–60 minutes
→ Click the finished run → scroll to "Artifacts" → download arcos-iso.zip
→ Unzip → you have arcos-0.7.0-amd64.iso
```

**5. Run the ISO**
→ See "How to run the ISO" section below

---

## Method 2 — WSL2 on Windows (moderate — no VM needed)

WSL2 gives you a real Linux environment inside Windows.

### Setup WSL2 (one-time)
```powershell
# Run in PowerShell as Administrator:
wsl --install -d Ubuntu-22.04
# Restart when prompted
# Set a username and password when Ubuntu opens
```

### Build the ISO
```bash
# Inside Ubuntu WSL2:

# Install tools
sudo apt update
sudo apt install -y live-build debootstrap squashfs-tools xorriso nodejs npm

# Copy the project into WSL (from Windows path)
# Your C: drive is at /mnt/c/ in WSL
cp -r /mnt/c/Users/YourName/Downloads/os-ui-v7 ~/arcos
cd ~/arcos

# Build Electron AppImage
npm install
npm run build:linux
# → creates dist/ArcOS-0.7.0-x64.AppImage

# Copy AppImage into live-build
cp dist/ArcOS-0.7.0-x64.AppImage \
  scripts/iso/live-build-config/config/includes.chroot/opt/arcos/arcos-shell.AppImage

# Stage config files
bash scripts/setup/stage-for-build.sh

# Build the ISO (takes 20-40 min, downloads ~800MB of Debian packages)
cd scripts/iso/live-build-config
sudo lb config
sudo lb build

# ISO is at:
ls -lh live-image-amd64.hybrid.iso
# Copy back to Windows:
cp live-image-amd64.hybrid.iso /mnt/c/Users/YourName/Desktop/arcos.iso
```

---

## Method 3 — VirtualBox Debian VM (most control)

### Setup
1. Download VirtualBox → https://virtualbox.org/wiki/Downloads
2. Download Debian 12 netinst ISO → https://www.debian.org/CD/netinst/
3. Create a new VM: Linux → Debian 64-bit → 4GB RAM → 40GB disk
4. Install Debian (minimal, no desktop environment)
5. Inside the VM, follow the same commands as Method 2

---

## How to run the ISO once you have it

### VirtualBox (Windows — easiest)
```
1. Open VirtualBox → New
2. Name: ArcOS  Type: Linux  Version: Debian 64-bit
3. RAM: 4096 MB
4. Hard disk: skip (or add one if you want to install)
5. Settings → Storage → Controller: IDE → Add optical drive → pick arcos.iso
6. Settings → Display → Video Memory: 128 MB
7. Start → boots ArcOS
```

Login: `user` / `arcos`

### Ventoy USB (boot on real hardware)
```
1. Download Ventoy → https://ventoy.net
2. Install Ventoy on a USB drive (erases it)
3. Copy arcos-0.7.0-amd64.iso to the USB drive
4. Boot your PC from the USB
5. Select ArcOS from the Ventoy menu
```

### Rufus USB (alternative)
```
1. Download Rufus → https://rufus.ie
2. Select your USB drive
3. Select arcos-0.7.0-amd64.iso
4. Leave settings as default → Start
5. Boot from USB
```

---

## What happens when it boots

```
GRUB menu appears
  ↓
"ArcOS Live" option (auto-selected after 5 seconds)
  ↓
Linux kernel loads (~10 seconds)
  ↓
systemd starts services
  ↓
greetd auto-logs in as "user" (no password needed on live boot)
  ↓
arcos-session starts Wayfire compositor
  ↓
ArcOS Electron shell launches
  ↓
Your desktop appears — same UI as the browser prototype
```

---

## Troubleshooting

**"No bootable medium found"**
→ Make sure the ISO is attached to the VM's optical drive, not hard disk

**Black screen after GRUB**
→ In VirtualBox: Settings → Display → Graphics Controller → change to VMSVGA
→ Or try: at GRUB menu, press E → find "quiet" → add "nomodeset" after it

**Shell doesn't start (stuck at terminal)**
→ The AppImage may not have been included in the build
→ Check: GitHub Actions run → look at build log artifact for errors
→ Fallback: type `foot` to open a terminal, then `arcos-shell` manually

**GitHub Actions failing**
→ Check the Actions tab for the error message
→ Most common: electron-builder needs a display — the workflow sets DISPLAY=:99

---

## Quick reference

| What | Where |
|------|-------|
| Build ISO automatically | GitHub Actions → .github/workflows/build-iso.yml |
| ISO output | dist/arcos-0.7.0-amd64.iso (after build) |
| Live-build config | scripts/iso/live-build-config/ |
| Electron config | electron/main.js + package.json |
| Session startup | scripts/setup/arcos-session.sh |
| Login: user | `user` |
| Login: password | `arcos` |
