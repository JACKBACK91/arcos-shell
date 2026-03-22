#!/bin/bash
# /usr/local/bin/arcos-session
# ArcOS session startup — launched by greetd

set -e

export XDG_SESSION_TYPE=wayland
export XDG_CURRENT_DESKTOP=arcos
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-1}"
export ELECTRON_OZONE_PLATFORM_HINT=wayland
export GDK_BACKEND=wayland,x11
export QT_QPA_PLATFORM=wayland
export MOZ_ENABLE_WAYLAND=1

# D-Bus session
if [ -z "$DBUS_SESSION_BUS_ADDRESS" ]; then
    eval "$(dbus-launch --sh-syntax)"
    export DBUS_SESSION_BUS_ADDRESS
fi

mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"

# Audio
if command -v pipewire &>/dev/null; then
    pipewire &
    sleep 0.3
    pipewire-pulse &
    wireplumber &
fi

# Wayfire compositor
WAYFIRE_CONFIG="/etc/arcos/wayfire.ini"
[ -f "$HOME/.config/wayfire.ini" ] && WAYFIRE_CONFIG="$HOME/.config/wayfire.ini"

wayfire -c "$WAYFIRE_CONFIG" &
COMP_PID=$!

# Wait for socket
for i in $(seq 1 25); do
    [ -S "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ] && break
    sleep 0.2
done

[ -S "$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ] || {
    echo "[arcos-session] Compositor failed to start, trying X11 fallback..."
    export DISPLAY=:0
    Xorg :0 &
    sleep 1
    openbox &
}

# Launch ArcOS shell
arcos-shell
EXIT=$?

kill $COMP_PID 2>/dev/null || true
wait 2>/dev/null || true
exit $EXIT
