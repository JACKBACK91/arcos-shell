/* ═══════════════════════════════════════════════════════════════
   notifications.js  —  ArcOS Notification System  (Step 10)
   ─────────────────────────────────────────────────────────────
   SHELL-CORE: Notification queue, badge counts, history.
   BROWSER-ONLY: DOM toast rendering.
   LINUX equiv: D-Bus org.freedesktop.Notifications daemon.
═══════════════════════════════════════════════════════════════ */

const Notifications = (() => {

  const queue   = [];   // pending
  const history = [];   // all received (capped at 50)
  let   badgeCt = 0;

  /* ── Push a notification ──────────────────────
     Called by Shell.toast() and any app module.
     In Linux: maps to dbus Notify() call received
     by the notification daemon.
  ─────────────────────────────────────────────── */
  function push({ icon, title, msg, id, app, urgency = 'normal', ttl = 4000 }) {
    const notif = { icon, title, msg, id: id || Date.now(), app: app || 'System', urgency, ts: new Date() };
    queue.push(notif);
    history.unshift(notif);
    if (history.length > 50) history.pop();

    _renderToast(notif, ttl);
    _addToPanel(notif);
    _incBadge();
  }

  /* ── App-open hook ────────────────────────────
     Called by Shell when an app is opened.
     Allows apps to send a "ready" notification.
  ─────────────────────────────────────────────── */
  function onAppOpen(id, title) {
    // Only fire for certain apps that warrant a notification
    // (prevents spam on every open)
  }

  /* ── Dismiss by id ────────────────────────────
     Linux equiv: dbus CloseNotification(uint32 id)
  ─────────────────────────────────────────────── */
  function dismiss(id) {
    const idx = queue.findIndex(n => n.id === id);
    if (idx !== -1) queue.splice(idx, 1);
    document.getElementById('tn-' + id)?.remove();
  }

  /* ── Clear all ────────────────────────────────
     Linux equiv: CloseNotification for each active
  ─────────────────────────────────────────────── */
  function clearAll() {
    queue.length = 0;
    badgeCt = 0;
    _updateBadge();
    const el = document.getElementById('nc-notifs');
    if (el) el.innerHTML = '<div style="color:var(--text-3);font-size:12px;text-align:center;padding:20px 0">No new notifications</div>';
  }

  /* ── BROWSER-ONLY: DOM toast ──────────────────
     Linux equiv: rendered by mako/dunst daemon
  ─────────────────────────────────────────────── */
  function _renderToast(n, ttl) {
    const area = document.getElementById('toast-area');
    if (!area) return;

    const t = document.createElement('div');
    t.className = 'toast';
    t.id        = 'tn-' + n.id;
    if (n.urgency === 'critical') t.style.borderColor = 'rgba(220,50,50,0.6)';

    t.innerHTML = `
      <div class="toast-ic">${n.icon}</div>
      <div style="flex:1;min-width:0">
        ${n.app !== 'System' ? `<div style="font-size:10px;color:var(--text-3);margin-bottom:2px">${n.app}</div>` : ''}
        <div class="toast-hd">${n.title}</div>
        <div class="toast-bd">${n.msg}</div>
      </div>
      <button onclick="Notifications.dismiss(${n.id})"
        style="background:transparent;border:none;color:var(--text-3);cursor:pointer;
               font-size:14px;padding:0 0 0 8px;align-self:flex-start;line-height:1;
               transition:color .1s"
        onmouseover="this.style.color='var(--text)'"
        onmouseout="this.style.color='var(--text-3)'">✕</button>`;

    area.appendChild(t);

    // Progress bar
    const bar = document.createElement('div');
    bar.style.cssText = `position:absolute;bottom:0;left:0;height:2px;
      background:var(--accent-hi);border-radius:0 0 var(--r-lg) var(--r-lg);
      width:100%;transition:width linear ${ttl}ms`;
    t.style.position = 'relative';
    t.style.overflow = 'hidden';
    t.appendChild(bar);
    requestAnimationFrame(() => requestAnimationFrame(() => bar.style.width = '0'));

    setTimeout(() => {
      if (!document.getElementById('tn-' + n.id)) return;
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity    = '0';
      t.style.transform  = 'translateX(60px)';
      setTimeout(() => t.remove(), 320);
    }, ttl);
  }

  /* ── BROWSER-ONLY: Add to notification panel ── */
  function _addToPanel(n) {
    const el = document.getElementById('nc-notifs');
    if (!el) return;

    // Clear the "no notifications" placeholder
    if (el.querySelector('[style*="No new"]')) el.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'nc-notif';
    row.innerHTML = `
      <span class="nc-n-ic">${n.icon}</span>
      <div>
        <div class="nc-n-app">${n.app}</div>
        <div class="nc-n-title">${n.title}</div>
        <div class="nc-n-body">${n.msg}</div>
        <div class="nc-n-time">${_relTime(n.ts)}</div>
      </div>`;
    row.addEventListener('click', () => { row.remove(); dismiss(n.id); _decBadge(); });
    el.insertBefore(row, el.firstChild);
  }

  function _relTime(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5)   return 'Just now';
    if (diff < 60)  return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    return `${Math.floor(diff/3600)}h ago`;
  }

  /* ── Badge counter on tray ────────────────────
     MOCK: Real Linux tray badges use StatusNotifierItem
  ─────────────────────────────────────────────── */
  function _incBadge() { badgeCt++; _updateBadge(); }
  function _decBadge() { badgeCt = Math.max(0, badgeCt-1); _updateBadge(); }
  function _updateBadge() {
    let badge = document.getElementById('notif-badge');
    if (badgeCt > 0) {
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'notif-badge';
        badge.style.cssText = `position:absolute;top:6px;right:5px;
          min-width:16px;height:16px;border-radius:8px;
          background:var(--accent);color:#fff;
          font-size:9px;font-weight:700;
          display:flex;align-items:center;justify-content:center;
          padding:0 3px;pointer-events:none;
          border:2px solid rgba(20,20,32,.9);
          animation:badgePop .2s cubic-bezier(.34,1.5,.64,1)`;
        const cluster = document.querySelector('.tray-cluster');
        if (cluster) { cluster.style.position='relative'; cluster.appendChild(badge); }
      }
      badge.textContent = badgeCt > 9 ? '9+' : badgeCt;
    } else {
      badge?.remove();
    }
  }

  /* ── Scheduled system notifications (Step 10) ─
     MOCK: Real ones come from running daemons
  ─────────────────────────────────────────────── */
  function scheduleSystemNotifs() {
    setTimeout(() => push({
      icon:'🛡️', title:'Security', msg:'No threats detected — your system is protected.',
      app:'ArcOS Security',
    }), 6000);
    setTimeout(() => push({
      icon:'🔄', title:'Updates available', msg:'3 system updates are ready to install.',
      app:'ArcOS Updater',
    }), 14000);
    setTimeout(() => push({
      icon:'🔋', title:'Battery', msg:'Plugged in — charging (MOCK: no real battery data)',
      app:'Power Manager', urgency:'low',
    }), 22000);
  }

  return { push, dismiss, clearAll, onAppOpen, scheduleSystemNotifs, getHistory: ()=>[...history] };

})();
