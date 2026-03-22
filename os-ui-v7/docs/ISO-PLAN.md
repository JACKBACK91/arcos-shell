# ArcOS — ISO Packaging Plan
**Step 12 — Starter Linux Distribution**

---

> ⚠️ **Status: Planning + Skeleton Phase**
> The scripts in this repo provide the structure and configuration
> needed for ISO generation. Actual ISO creation requires a Debian
> Linux host with `live-build` installed.
> See section 6 for what remains unfinished.

---

## 1. Overview

This document describes how to build a bootable ArcOS ISO using
Debian's `live-build` tool. The result is a live USB image that
boots directly into the ArcOS shell.

**Build host requirement:** Debian 12 or Ubuntu 22.04+

---

## 2. ISO Architecture

```
ArcOS ISO (arcos-0.5.0-amd64.iso)
│
├── ISOLINUX / GRUB2 bootloader
├── Linux kernel 6.6 LTS
├── initrd (live-boot)
├── squashfs filesystem:
│   ├── Debian 12 minimal base
│   ├── Wayland stack (wayfire, wlroots, xwayland)
│   ├── greetd + tuigreet (login manager)
│   ├── ArcOS Shell (Electron AppImage)
│   ├── arcos-session script
│   ├── systemd services
│   └── Default configuration files
└── Casper/live-boot persistence support
```

---

## 3. Build System: live-build

`live-build` is Debian's official tool for creating live images.

### Install on build host
```bash
sudo apt update
sudo apt install live-build debootstrap squashfs-tools xorriso
```

### One-command build (once configured)
```bash
cd scripts/iso/live-build-config
sudo lb build 2>&1 | tee build.log
# Output: live-image-amd64.hybrid.iso
```

---

## 4. live-build Configuration

The config lives in `scripts/iso/live-build-config/`.
See that directory for all files. Key settings:

```
Distribution:    bookworm (Debian 12)
Architecture:    amd64
Binary format:   iso-hybrid (works as USB and DVD)
Bootloader:      grub-efi + isolinux (dual BIOS/UEFI)
Compression:     xz (squashfs)
Hostname:        arcos
Username:        user (password: arcos)
Desktop env:     none (we provide our own)
Extra packages:  wayfire, greetd, fonts-noto, ...
```

---

## 5. Package List

### Base packages (Debian minimal)
```
systemd systemd-sysv dbus udev
linux-image-amd64 firmware-linux-free
grub-efi-amd64 grub-pc-bin isolinux
live-boot live-config
network-manager
pulseaudio pipewire wireplumber
```

### Wayland / graphics stack
```
wayfire wlroots libwlroots-dev
weston xwayland
mesa-vulkan-drivers mesa-utils
libgl1-mesa-dri libgles2-mesa
fonts-noto fonts-noto-color-emoji
```

### ArcOS shell dependencies
```
greetd
libgtk-3-0 libglib2.0-0
libxss1 libgconf-2-4 libxtst6
libnss3 libasound2
# Electron ships its own Chromium — no chromium package needed
```

### Utilities
```
bash sudo vim nano curl wget git
htop neofetch tree file
xdg-utils shared-mime-info
alacritty  # fallback terminal
```

---

## 6. What Remains Unfinished

The following items prevent a real ISO from being generated today.
They are the next milestones for the project:

### 🔲 Blocker 1: Electron AppImage build
- `npm run build` in the project root produces an AppImage
- Requires working `node-pty` (native module compilation)
- The AppImage must be placed in `scripts/iso/live-build-config/config/includes.chroot/opt/arcos/`

### 🔲 Blocker 2: greetd login screen
- A separate `login.html` needs to be created for the lock/login screen
- greetd calls `arcos-greeter` which launches a minimal Electron window
- PAM authentication result is sent back to greetd via IPC

### 🔲 Blocker 3: D-Bus integration
- `npm install dbus-next` + implementing the IPC handlers in `electron/main.js`
- Without this: shutdown/reboot/volume/network are still mocked

### 🔲 Blocker 4: VM testing
- Every ISO build must be tested in QEMU before USB deployment
- See section 8 for VM test instructions

### 🔲 Blocker 5: Hardware driver coverage
- The Debian `firmware-linux-free` package covers open-source firmware
- Non-free Wi-Fi firmware (Intel, Broadcom) needs `firmware-linux-nonfree`
- Decision: include non-free firmware in ISO or not?

### ✅ Done: scripts and configs
- live-build directory structure
- greetd configuration
- systemd service file
- wayfire.ini
- arcos-session startup script
- Package lists
- GRUB config

---

## 7. VM Testing Instructions

### Using QEMU (recommended)
```bash
# Install QEMU on build host
sudo apt install qemu-system-x86 qemu-utils ovmf

# Test with UEFI (ovmf)
qemu-system-x86_64 \
  -bios /usr/share/ovmf/OVMF.fd \
  -cdrom arcos-0.5.0-amd64.iso \
  -m 4096 \
  -cpu host \
  -enable-kvm \
  -vga virtio \
  -display sdl \
  -boot d

# Test with BIOS (legacy)
qemu-system-x86_64 \
  -cdrom arcos-0.5.0-amd64.iso \
  -m 4096 \
  -vga std \
  -boot d
```

### Using VirtualBox
```
1. New VM → Linux → Debian 64-bit
2. RAM: 4096 MB
3. No hard disk needed for live test
4. Settings → Display → Video Memory 128 MB
5. Settings → Storage → Add ISO as optical disk
6. Start → boots ArcOS live
```

### Expected boot sequence
```
GRUB menu (5 sec)
  → ArcOS Live
  → ArcOS Live (failsafe)
  → Boot from hard disk

Kernel boots (10-20 sec)
systemd starts services
greetd presents login
  username: user  password: arcos
greetd launches arcos-session
wayfire compositor starts
ArcOS Electron shell launches
Desktop appears ← success
```

---

## 8. USB Write Instructions (post-ISO)

```bash
# On Linux — identify your USB device first!
lsblk

# Write ISO to USB (replace sdX with your device)
sudo dd if=arcos-0.5.0-amd64.iso of=/dev/sdX bs=4M status=progress oflag=sync

# Or use the safer Ventoy approach:
# 1. Install Ventoy on USB
# 2. Copy ISO to the Ventoy partition
# 3. Boot from USB → select ArcOS from Ventoy menu
```

---

## 9. Installation to Disk (future)

The live ISO does not include an installer yet. Options for v1.0:

| Option | Notes |
|---|---|
| **calamares** | Modern Qt installer, used by many distros |
| **debian-installer** | Traditional, complex but reliable |
| **Custom script** | `debootstrap` + `grub-install` + config copy |

Recommendation: **calamares** — integrates into the Wayland desktop easily.

---

*ArcOS ISO Plan v0.5 — Step 12*
