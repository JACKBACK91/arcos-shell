/* ═══════════════════════════════════════════════════════════════
   shell.js  —  ArcOS Desktop Shell  (v5 / Steps 8-10)
   ─────────────────────────────────────────────────────────────
   ARCHITECTURE LAYERS (Step 8)
   ─────────────────────────────────────────────────────────────
   ● SHELL-CORE   Pure window/app management logic. No browser
                  APIs, no DOM-specific tricks beyond querySelector.
                  This section ports cleanly to Electron main-process
                  IPC calls or a Qt/GTK compositor backend.

   ● BROWSER-ONLY Sections marked [BROWSER-ONLY] use browser APIs
                  (localStorage, DOM events, CSS animations) that
                  have no direct Linux equivalent. Each is annotated
                  with what the Linux replacement would be.

   ● MOCK         Data or behaviour that is simulated. Marked [MOCK].
                  Real implementations need D-Bus / procfs / etc.

   LINUX MIGRATION MAP
   ─────────────────────────────────────────────────────────────
   register()      →  Parse /usr/share/applications/*.desktop
   openApp()       →  Fork child process or IPC to compositor
   focusWin()      →  wlr_seat_keyboard_notify_enter (wlroots)
   closeWin()      →  Kill child PID via D-Bus or SIGTERM
   toast()         →  D-Bus org.freedesktop.Notifications.Notify
   toggleStart()   →  Show/hide rofi/wofi launcher overlay
   Prefs/storage   →  XDG ~/.config/arcos/prefs.json (via fs)
   Clock           →  System clock via date(1) or gettimeofday
   Brightness      →  /sys/class/backlight/*/brightness
   Volume          →  PulseAudio/PipeWire D-Bus API
   Network icons   →  NetworkManager D-Bus API
═══════════════════════════════════════════════════════════════ */

const Shell = (() => {

  /* ══════════════════════════════════════════════
     SHELL-CORE: App Registry
     Linux equiv: read .desktop files at startup,
     populate registry with Exec=, Icon=, Name=
  ══════════════════════════════════════════════ */
  const registry = {};

  function register(id, meta) {
    // meta: { title, icon, w, h, build(bodyEl), singleton? }
    registry[id] = { singleton: true, ...meta };
  }

  /* ══════════════════════════════════════════════
     SHELL-CORE: Window State
     Linux equiv: compositor window tree / XCB
     window list, managed per-workspace.
  ══════════════════════════════════════════════ */
  let zTop = 200;
  const wins = {};           // id → { el, min, max, snapped, prevR }
  let allDesktopMin = false;

  /* ── Open / restore ─────────────────────────── */
  function openApp(id) {
    closeStart();
    closeNotifPanel();

    // Restore if already open
    if (wins[id]) {
      const s = wins[id];
      if (s.min) { s.min = false; s.el.classList.remove('minimized'); }
      focusWin(s.el);
      updTapp(id);
      return;
    }

    const app = registry[id];
    if (!app) {
      toast('⚠️', 'Not found', `"${id}" is not a registered app`);
      return;
    }

    // Cascade placement
    const dx   = document.getElementById('desktop');
    const cnt  = Object.keys(wins).length;
    const off  = cnt * 28;
    const dw   = dx.clientWidth;
    const dh   = dx.clientHeight;
    const winW = app.w || 600;
    const winH = app.h || 420;
    const l    = Math.max(80,  Math.min((dw - winW) / 2 + off, dw - winW - 40));
    const t    = Math.max(10,  Math.min((dh - winH) / 2 + off, dh - winH - 40));

    /* BROWSER-ONLY: Window chrome built as DOM element.
       Linux equiv: compositor creates native window frame,
       injects client-side decoration or uses server-side deco. */
    const win = document.createElement('div');
    win.className  = 'window w-open';
    win.id         = 'win-' + id;
    win.dataset.id = id;
    win.style.cssText = `left:${l}px;top:${t}px;width:${winW}px;height:${winH}px`;

    win.innerHTML = _buildChrome(id, app);

    dx.appendChild(win);
    app.build(document.getElementById('wb-' + id));

    wins[id] = { el:win, min:false, max:false, snapped:false, prevR:null };
    focusWin(win);
    _makeDrag(win,   document.getElementById('tb-' + id),  id);
    _makeResize(win, document.getElementById('rsz-' + id), id);
    _addTapp(id);
    win.addEventListener('mousedown', () => focusWin(win), true);
    _updPinState(id);

    // Fire app-open notification hook
    Notifications.onAppOpen(id, app.title);
  }

  /* ── Window chrome HTML ─────────────────────── */
  function _buildChrome(id, app) {
    return `
      <div class="titlebar" id="tb-${id}">
        <div class="tb-app-info">
          <span class="tb-app-icon">${app.icon}</span>
          <span class="tb-app-name">${app.title}</span>
        </div>
        <div class="win-cap-btns">
          <button class="cap-btn cap-min" title="Minimise" onclick="Shell.minWin('${id}')">
            <svg viewBox="0 0 10 10"><line x1="0" y1="5" x2="10" y2="5"/></svg>
          </button>
          <button class="cap-btn cap-max" title="Maximise / Snap" onclick="Shell.maxWin('${id}')">
            <svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" rx="1"/></svg>
            <div class="snap-tip">
              <div class="snap-label">Snap layouts</div>
              <div class="snap-row">
                <div class="snap-cell" style="flex:1;min-width:80px" title="Full"
                     onclick="Shell.snapFull('${id}');event.stopPropagation()"></div>
              </div>
              <div class="snap-row">
                <div class="snap-cell" title="Left half"  onclick="Shell.snapHalf('${id}','left');event.stopPropagation()"></div>
                <div class="snap-cell" title="Right half" onclick="Shell.snapHalf('${id}','right');event.stopPropagation()"></div>
              </div>
              <div class="snap-row">
                <div class="snap-cell" title="Top-left"     onclick="Shell.snapQ('${id}','tl');event.stopPropagation()"></div>
                <div class="snap-cell" title="Top-right"    onclick="Shell.snapQ('${id}','tr');event.stopPropagation()"></div>
              </div>
              <div class="snap-row">
                <div class="snap-cell" title="Bottom-left"  onclick="Shell.snapQ('${id}','bl');event.stopPropagation()"></div>
                <div class="snap-cell" title="Bottom-right" onclick="Shell.snapQ('${id}','br');event.stopPropagation()"></div>
              </div>
            </div>
          </button>
          <button class="cap-btn cap-close" title="Close" onclick="Shell.closeWin('${id}')">
            <svg viewBox="0 0 10 10">
              <line x1="0" y1="0" x2="10" y2="10"/>
              <line x1="10" y1="0" x2="0" y2="10"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="win-body" id="wb-${id}"></div>
      <div class="win-rsz" id="rsz-${id}"></div>`;
  }

  /* ── Focus ──────────────────────────────────── */
  function focusWin(win) {
    document.querySelectorAll('.window').forEach(w => w.classList.remove('focused'));
    win.style.zIndex = ++zTop;
    win.classList.add('focused');
    const id = win.dataset.id;
    document.querySelectorAll('.tapp').forEach(b => b.classList.remove('active'));
    document.getElementById('tapp-' + id)?.classList.add('active');
    _updPinState(id);
  }

  /* ── Close ──────────────────────────────────── */
  function closeWin(id) {
    const s = wins[id]; if (!s) return;
    s.el.classList.add('w-close');
    setTimeout(() => {
      s.el.remove();
      delete wins[id];
      _rmTapp(id);
      _updPinState(id);
    }, 150);
  }

  /* ── Minimise ───────────────────────────────── */
  function minWin(id) {
    const s = wins[id]; if (!s) return;
    s.min = true;
    s.el.classList.add('minimized');
    const visible = Object.values(wins).filter(w => !w.min && w.el !== s.el);
    if (visible.length) {
      const top = visible.reduce((a, b) =>
        parseInt(b.el.style.zIndex||0) > parseInt(a.el.style.zIndex||0) ? b : a);
      focusWin(top.el);
    } else {
      document.querySelectorAll('.tapp').forEach(b => b.classList.remove('active'));
    }
    updTapp(id);
    _updPinState(id);
  }

  /* ── Maximise ───────────────────────────────── */
  function maxWin(id) {
    const s  = wins[id]; if (!s) return;
    const tb = document.getElementById('tb-' + id);
    if (!s.max) {
      s.prevR = { l:s.el.style.left, t:s.el.style.top, w:s.el.style.width, h:s.el.style.height };
      s.el.classList.add('maximized'); s.max = true; s.snapped = false;
      tb.classList.add('no-drag');
    } else {
      s.el.classList.remove('maximized');
      Object.assign(s.el.style, { left:s.prevR.l, top:s.prevR.t, width:s.prevR.w, height:s.prevR.h });
      s.max = false; tb.classList.remove('no-drag');
    }
  }

  /* ── Snap layouts ───────────────────────────── */
  function snapFull(id)        { const s=wins[id]; if(s&&!s.max) maxWin(id); }
  function snapHalf(id, side)  { _snapTo(id, side==='left'?{l:'0',t:'0',w:'50%',h:'100%'}:{l:'50%',t:'0',w:'50%',h:'100%'}); }
  function snapQ(id, q)        { _snapTo(id, {tl:{l:'0',t:'0',w:'50%',h:'50%'},tr:{l:'50%',t:'0',w:'50%',h:'50%'},bl:{l:'0',t:'50%',w:'50%',h:'50%'},br:{l:'50%',t:'50%',w:'50%',h:'50%'}}[q]); }
  function _snapTo(id, r) {
    const s = wins[id]; if (!s) return;
    if (!s.prevR) s.prevR = { l:s.el.style.left, t:s.el.style.top, w:s.el.style.width, h:s.el.style.height };
    s.el.classList.remove('maximized'); s.max = false; s.snapped = true;
    document.getElementById('tb-' + id).classList.remove('no-drag');
    const dw = window.innerWidth;
    const dh = window.innerHeight - _taskbarH();
    const pct = v => v.endsWith('%') ? parseFloat(v)/100 * (v.includes('l')||v==='50%'? dw : dh) : v;
    s.el.style.left   = r.l.endsWith('%') ? (parseFloat(r.l)/100*dw)+'px' : r.l;
    s.el.style.top    = r.t.endsWith('%') ? (parseFloat(r.t)/100*dh)+'px' : r.t;
    s.el.style.width  = r.w.endsWith('%') ? (parseFloat(r.w)/100*dw)+'px' : r.w;
    s.el.style.height = r.h.endsWith('%') ? (parseFloat(r.h)/100*dh)+'px' : r.h;
  }
  function _taskbarH() {
    return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--taskbar-h')) || 48;
  }

  /* BROWSER-ONLY: Double-click titlebar to maximise */
  document.addEventListener('dblclick', e => {
    const tb = e.target.closest('.titlebar');
    if (tb && !tb.classList.contains('no-drag') && !e.target.closest('.win-cap-btns'))
      maxWin(tb.closest('.window').dataset.id);
  });

  /* ══════════════════════════════════════════════
     SHELL-CORE: Drag
     BROWSER-ONLY: mousemove/mousedown events.
     Linux equiv: wlr_seat mouse button grab,
     or GTK drag-window via gtk_window_begin_move_drag.
  ══════════════════════════════════════════════ */
  function _makeDrag(win, handle, id) {
    let sx, sy, ox, oy;
    handle.addEventListener('mousedown', e => {
      if (e.target.closest('.win-cap-btns,.snap-tip')) return;
      if (wins[id]?.max) return;
      sx = e.clientX; sy = e.clientY;
      const r = win.getBoundingClientRect(); ox = r.left; oy = r.top;
      win.style.transition = 'none';
      const move = e => {
        const nx = ox + (e.clientX - sx);
        const ny = oy + (e.clientY - sy);
        win.style.left = Math.max(-win.offsetWidth+80, Math.min(nx, window.innerWidth-80)) + 'px';
        win.style.top  = Math.max(0, Math.min(ny, window.innerHeight - _taskbarH() - 34)) + 'px';
        if (wins[id]?.snapped) {
          wins[id].snapped = false;
          if (wins[id].prevR) { win.style.width=wins[id].prevR.w; win.style.height=wins[id].prevR.h; }
        }
      };
      const up = () => { win.style.transition=''; document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup',   up);
      e.preventDefault();
    });
  }

  /* ══════════════════════════════════════════════
     SHELL-CORE: Resize
     BROWSER-ONLY: mousemove corner drag.
     Linux equiv: wlr_seat resize grab /
     _NET_WM_MOVERESIZE XATOM.
  ══════════════════════════════════════════════ */
  function _makeResize(win, handle, id) {
    let sx, sy, sw, sh;
    handle.addEventListener('mousedown', e => {
      if (wins[id]?.max) return;
      sx=e.clientX; sy=e.clientY; sw=win.offsetWidth; sh=win.offsetHeight;
      const move = e => {
        win.style.width  = Math.max(320, sw+(e.clientX-sx)) + 'px';
        win.style.height = Math.max(200, sh+(e.clientY-sy)) + 'px';
      };
      const up = () => { document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup',   up);
      e.preventDefault();
    });
  }

  /* ══════════════════════════════════════════════
     SHELL-CORE: Taskbar button management
  ══════════════════════════════════════════════ */
  function _addTapp(id) {
    const app = registry[id];
    const bar = document.getElementById('tb-apps');
    const sep = document.getElementById('tb-sep-apps');
    const btn = document.createElement('button');
    btn.className = 'tapp active'; btn.id = 'tapp-'+id;
    btn.innerHTML = `<span>${app.icon}</span><span>${app.title}</span>`;
    btn.title = app.title;
    btn.addEventListener('click', () => {
      const s = wins[id]; if (!s) return;
      if (s.min) { s.min=false; s.el.classList.remove('minimized'); focusWin(s.el); }
      else if (s.el.classList.contains('focused')) { minWin(id); }
      else { focusWin(s.el); }
      updTapp(id);
    });
    bar.appendChild(btn);
    sep.style.display = '';
  }
  function _rmTapp(id) {
    document.getElementById('tapp-'+id)?.remove();
    const bar = document.getElementById('tb-apps');
    const sep = document.getElementById('tb-sep-apps');
    if (!bar.children.length) sep.style.display = 'none';
  }
  function updTapp(id) {
    const s=wins[id]; const btn=document.getElementById('tapp-'+id);
    if (!s||!btn) return;
    btn.classList.toggle('active',       !s.min && s.el.classList.contains('focused'));
    btn.classList.toggle('minimized-app', s.min);
  }
  function _updPinState(id) {
    const btn = document.querySelector(`.tb-pin[data-pin="${id}"]`);
    if (!btn) return;
    const s = wins[id];
    btn.classList.remove('running','focused','minimized-pin');
    if (s) {
      btn.classList.add('running');
      if (!s.min && s.el.classList.contains('focused')) btn.classList.add('focused');
      else if (s.min) btn.classList.add('minimized-pin');
    }
  }
  function pinClick(id) {
    const s = wins[id];
    if (!s) { openApp(id); return; }
    if (s.min) { s.min=false; s.el.classList.remove('minimized'); focusWin(s.el); updTapp(id); }
    else if (s.el.classList.contains('focused')) { minWin(id); }
    else { focusWin(s.el); }
  }

  /* ── Show desktop ───────────────────────────── */
  function toggleShowDesktop() {
    allDesktopMin = !allDesktopMin;
    if (allDesktopMin) {
      Object.keys(wins).forEach(id => { wins[id]._wasMin=wins[id].min; minWin(id); });
    } else {
      Object.keys(wins).forEach(id => {
        const s=wins[id];
        if (!s._wasMin) { s.min=false; s.el.classList.remove('minimized'); }
      });
      const top = Object.values(wins).filter(s=>!s.min)
        .reduce((a,b)=>parseInt(b.el.style.zIndex||0)>parseInt(a.el.style.zIndex||0)?b:a,{el:null});
      if (top.el) focusWin(top.el);
    }
  }

  /* ══════════════════════════════════════════════
     BROWSER-ONLY: Start menu DOM toggle
     Linux equiv: show/hide launcher process
     (rofi -show drun, or custom GTK overlay)
  ══════════════════════════════════════════════ */
  let _smOpen = false;
  function toggleStart() {
    _smOpen = !_smOpen;
    const m=document.getElementById('start-menu');
    const b=document.getElementById('start-btn');
    if (_smOpen) {
      closeNotifPanel();
      m.classList.add('vis'); b.classList.add('open');
      setTimeout(()=>document.getElementById('sm-q').focus(), 50);
    } else closeStart();
  }
  function closeStart() {
    _smOpen = false;
    document.getElementById('start-menu').classList.remove('vis');
    document.getElementById('start-btn').classList.remove('open');
  }
  function smFilter(q) {
    q = q.toLowerCase();
    document.querySelectorAll('#sm-grid .sm-app').forEach(a => {
      const nm = a.querySelector('.sm-nm').textContent.toLowerCase();
      a.style.display = nm.includes(q) ? '' : 'none';
    });
  }

  /* ══════════════════════════════════════════════
     BROWSER-ONLY: Notification panel DOM toggle
     Linux equiv: swaync / mako panel overlay
  ══════════════════════════════════════════════ */
  let _ncOpen = false;
  function toggleNotif() {
    _ncOpen = !_ncOpen;
    if (_ncOpen) { closeStart(); document.getElementById('notif-panel').classList.add('vis'); }
    else closeNotifPanel();
  }
  function closeNotifPanel() {
    _ncOpen=false;
    document.getElementById('notif-panel').classList.remove('vis');
  }
  function clearNotifs() {
    const el = document.getElementById('nc-notifs');
    el.innerHTML = '<div style="color:var(--text-3);font-size:12px;text-align:center;padding:20px 0">No new notifications</div>';
  }

  /* ══════════════════════════════════════════════
     BROWSER-ONLY: Context menu on desktop
     Linux equiv: Compositor right-click hook
  ══════════════════════════════════════════════ */
  document.getElementById('desktop').addEventListener('contextmenu', e => {
    e.preventDefault();
    const m = document.getElementById('ctx-menu');
    m.style.display = 'block';
    m.style.left = Math.min(e.clientX, window.innerWidth  - 210) + 'px';
    m.style.top  = Math.min(e.clientY, window.innerHeight - 250) + 'px';
  });
  document.addEventListener('mousedown', () => hideCtx(), true);
  function hideCtx() { document.getElementById('ctx-menu').style.display = 'none'; }
  function ctxAction(a) {
    hideCtx();
    const M = {
      view:        ['👁️','View','Switched to icon view'],
      sort:        ['↕️','Sorted','Sorted by name'],
      refresh:     ['🔄','Refreshed','Desktop refreshed'],
      'new-folder':['📁','New folder','Created on Desktop'],
      'new-file':  ['📄','New document','Created on Desktop'],
    };
    if (M[a]) toast(...M[a]);
  }

  /* ══════════════════════════════════════════════
     BROWSER-ONLY: Brightness overlay
     MOCK: Real brightness → /sys/class/backlight
  ══════════════════════════════════════════════ */
  function setBrightness(val) {
    const o = document.getElementById('brightness-overlay');
    if (o) o.style.background = `rgba(0,0,0,${(100-val)/100*0.7})`;
  }

  /* ══════════════════════════════════════════════
     SHELL-CORE: Toast dispatcher
     Linux equiv: dbus-send --session
       --dest=org.freedesktop.Notifications
       /org/freedesktop/Notifications
       org.freedesktop.Notifications.Notify
  ══════════════════════════════════════════════ */
  function toast(icon, title, msg, id) {
    Notifications.push({ icon, title, msg, id: id || Date.now() });
  }

  /* ══════════════════════════════════════════════
     BROWSER-ONLY: Click-outside dismissal
  ══════════════════════════════════════════════ */
  document.addEventListener('mousedown', e => {
    if (!e.target.closest('#start-menu,#start-btn,#search-pill')) closeStart();
    if (!e.target.closest('#notif-panel,.tray-cluster,.clock-block')) closeNotifPanel();
  });

  /* BROWSER-ONLY: Desktop icon click selection */
  document.querySelectorAll('.desktop-icon').forEach(ic => {
    ic.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.desktop-icon').forEach(x=>x.classList.remove('selected'));
      ic.classList.add('selected');
    });
  });
  document.getElementById('desktop').addEventListener('click', () =>
    document.querySelectorAll('.desktop-icon').forEach(x=>x.classList.remove('selected')));

  /* ══════════════════════════════════════════════
     BROWSER-ONLY: Clock (JS Date)
     Linux equiv: read system time via date(1),
     or IPC call in Electron to OS clock.
     MOCK: No real timezone support, no NTP sync.
  ══════════════════════════════════════════════ */
  (function tick() {
    const n=new Date(), pad=v=>String(v).padStart(2,'0');
    const DS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const MS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const DL=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const ML=['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('clk-time').textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}`;
    document.getElementById('clk-date').textContent = `${DS[n.getDay()]} ${n.getDate()} ${MS[n.getMonth()]}`;
    const nt=document.getElementById('nc-time'), nd=document.getElementById('nc-date');
    if (nt) nt.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}`;
    if (nd) nd.textContent = `${DL[n.getDay()]}, ${n.getDate()} ${ML[n.getMonth()]}`;
    setTimeout(tick, 10000);
  })();

  /* ── Public API ─────────────────────────────── */
  return {
    register, openApp, closeWin, minWin, maxWin,
    snapFull, snapHalf, snapQ,
    focusWin, updTapp,
    toggleStart, closeStart, smFilter,
    toggleNotif, closeNotifPanel, clearNotifs,
    toggleShowDesktop, pinClick,
    hideCtx, ctxAction,
    setBrightness, toast,
    getWins:     () => wins,
    getRegistry: () => registry,
    isRunning:   id => !!wins[id],
  };

})();
