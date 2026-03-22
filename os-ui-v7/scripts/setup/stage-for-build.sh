#!/bin/bash
# scripts/setup/stage-for-build.sh
# Copies all Linux config files into live-build chroot includes
# Run this from the project root before: cd scripts/iso/live-build-config && lb build
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHROOT="$ROOT/scripts/iso/live-build-config/config/includes.chroot"

echo "[stage] Staging Linux config files into live-build chroot..."

# greetd
mkdir -p "$CHROOT/etc/greetd"
cp "$ROOT/linux/greetd/config.toml"   "$CHROOT/etc/greetd/config.toml"

# wayfire
mkdir -p "$CHROOT/etc/arcos"
cp "$ROOT/linux/wayfire/wayfire.ini"   "$CHROOT/etc/arcos/wayfire.ini"

# systemd user services
mkdir -p "$CHROOT/etc/systemd/user"
cp "$ROOT/linux/systemd/arcos-shell.service"   "$CHROOT/etc/systemd/user/"
cp "$ROOT/linux/systemd/arcos-session.target"  "$CHROOT/etc/systemd/user/"

# Wayland session entry
mkdir -p "$CHROOT/usr/share/wayland-sessions"
cat > "$CHROOT/usr/share/wayland-sessions/arcos.desktop" << 'SESSION'
[Desktop Entry]
Name=ArcOS
Comment=ArcOS Desktop Shell
Exec=/usr/local/bin/arcos-session
Type=Application
SESSION

# arcos-session launcher
mkdir -p "$CHROOT/usr/local/bin"
cp "$ROOT/scripts/setup/arcos-session.sh" "$CHROOT/usr/local/bin/arcos-session"
chmod +x "$CHROOT/usr/local/bin/arcos-session"

# Desktop entries
mkdir -p "$CHROOT/usr/share/applications"
cp "$ROOT/linux/desktop-entries/"*.desktop "$CHROOT/usr/share/applications/"

echo "[stage] Done. Now run:"
echo "  cd scripts/iso/live-build-config"
echo "  sudo lb config && sudo lb build"
