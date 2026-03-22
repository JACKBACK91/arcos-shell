# ArcOS Linux Base Plan — Step 11

## Recommended Linux Base: Debian 12 Bookworm (minimal)

Chosen for live-build ISO tooling, .deb packaging (matches electron-builder),
5-year LTS stability, and kernel 6.1+ Wayland/GPU support.

## Recommended Display Stack

  greetd (login) → arcos-session → Wayfire (compositor) + ArcOS Electron (shell overlay)

| Role             | Package          | Notes                                  |
|------------------|------------------|----------------------------------------|
| Login manager    | greetd           | Systemd-compatible                     |
| Compositor       | Wayfire          | wlroots-based, configurable            |
| Shell overlay    | ArcOS Electron   | wlr-layer-shell, Wayland-native        |
| Terminal         | foot             | Wayland-native, fast                   |
| Notifications    | mako             | Wayland notification daemon            |
| Screen lock      | swaylock         | Wayland locker                         |
| Audio            | pipewire+wireplumber | Modern audio stack                 |
| Wallpaper        | swaybg           | Simple image wallpaper                 |
| Network          | NetworkManager   | D-Bus API                              |

## Shell Wrapper Recommendation

Phase 1 (current): Electron + Wayfire
  - Electron runs as a wlr-layer-shell surface on Wayland
  - Launch with: --enable-features=UseOzonePlatform --ozone-platform=wayland
  - node-pty added for real terminal PTY

Phase 2: Electron with full IPC (real fs, real network, real processes)
Phase 3: Qt6 WebEngine — smaller binary, native Qt D-Bus, production-ready

## What Is Needed Before Bootable ISO

Done:
  [x] Shell UI (Steps 1-10)
  [x] Electron wrapper + IPC (Step 9)
  [x] Settings persistence (Step 5)
  [x] Notifications system (Step 10)
  [x] Migration map (Step 8)

Required before ISO:
  [ ] Build Electron AppImage (npm run build)
  [ ] Write arcos-session launch script
  [ ] Configure greetd + Wayfire
  [ ] Real terminal via node-pty
  [ ] Real file browser via Electron fs IPC
  [ ] live-build Debian config (see scripts/iso/)
  [ ] Test in QEMU/VirtualBox VM

Nice to have:
  [ ] Plymouth boot splash
  [ ] Real wallpaper images
  [ ] Papirus icon theme integration
  [ ] GTK theme to match ArcOS colours
  [ ] Hardware detection (GPU, Wi-Fi firmware)

## Boot Sequence

  BIOS/UEFI -> GRUB2 -> Linux kernel 6.1+
  -> systemd -> greetd -> arcos-session
  -> dbus + wayfire + pipewire + mako + swaybg + arcos-shell (Electron)

## VM Testing Plan

1. QEMU/KVM (Linux host) — fastest, Wayland passthrough:
   qemu-system-x86_64 -m 4G -smp 4 -enable-kvm -vga virtio \
     -display gtk,gl=on -cdrom arcos.iso -boot d

2. VirtualBox 7.1+ — easiest cross-platform
   - EFI enabled, 4GB RAM, VMSVGA graphics

3. VMware Workstation Pro 17 — best GPU emulation
