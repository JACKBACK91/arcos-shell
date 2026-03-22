/* apps/settings.js — Settings app
   SHELL-CORE: Preference store/apply logic
   BROWSER-ONLY: localStorage, DOM rendering
   LINUX equiv: XDG ~/.config/arcos/prefs.json
                Apply via IPC to shell daemon
*/
Shell.register('settings', {
  title: 'Settings',
  icon:  '⚙️',
  w: 720, h: 520,
  build: buildSettings,
});

/* ════════════════════════════════════════════
   Prefs — persistent preference store
   BROWSER-ONLY: localStorage
   LINUX equiv: XDG config file / D-Bus
════════════════════════════════════════════ */
const Prefs = (() => {
  const KEY = 'arcos_prefs_v1';
  const defaults = {
    wallpaper:      'bloom',
    accentColor:    '#0067C0',
    transparency:   true,
    taskbarCenter:  true,
    taskbarSearch:  true,
    taskbarLabels:  true,
    animationsOn:   true,
    notifSound:     true,
    fontSize:       'medium',
    username:       'User',
    hostname:       'arcos-desktop',
  };

  function load()  {
    try { const s=localStorage.getItem(KEY); return s ? {...defaults,...JSON.parse(s)} : {...defaults}; }
    catch { return {...defaults}; }
  }
  function save(p) { try { localStorage.setItem(KEY,JSON.stringify(p)); } catch {} }
  function get(k)  { return load()[k]; }
  function set(k,v){ const p=load(); p[k]=v; save(p); applyPref(k,v); }
  function getAll(){ return load(); }

  return { get, set, getAll, defaults };
})();

/* Apply a single pref live to the shell UI */
function applyPref(key, val) {
  const root = document.documentElement;
  if (key === 'wallpaper') {
    const d = document.getElementById('desktop');
    d.className = d.className.replace(/\bwp-\S+/g,'').trim();
    d.classList.add('wp-' + val);
  }
  if (key === 'accentColor') {
    const r=parseInt(val.slice(1,3),16), g=parseInt(val.slice(3,5),16), b=parseInt(val.slice(5,7),16);
    root.style.setProperty('--accent',      val);
    root.style.setProperty('--accent-hi',   _lighten(val,22));
    root.style.setProperty('--accent-sub', `rgba(${r},${g},${b},0.16)`);
    root.style.setProperty('--accent-brd', `rgba(${r},${g},${b},0.45)`);
  }
  if (key === 'taskbarSearch') {
    const p = document.getElementById('search-pill');
    if (p) p.style.display = val ? '' : 'none';
  }
  if (key === 'taskbarLabels') {
    document.querySelectorAll('.tapp span:last-child').forEach(s => s.style.display = val ? '' : 'none');
  }
  if (key === 'taskbarCenter') {
    const c = document.getElementById('tb-center');
    if (c) { c.style.position = val ? '' : 'absolute'; c.style.left = val ? '' : '12px'; c.style.transform = val ? '' : 'none'; }
  }
  if (key === 'username') {
    const u = document.getElementById('sm-username');
    if (u) u.textContent = val;
  }
}

function _lighten(hex, n) {
  let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  r=Math.min(255,r+n);g=Math.min(255,g+n);b=Math.min(255,b+n);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

/* Apply all prefs on page load */
function applyAllPrefs() {
  const p = Prefs.getAll();
  Object.entries(p).forEach(([k,v]) => applyPref(k,v));
  document.getElementById('desktop').classList.add('wp-' + p.wallpaper);
}
document.addEventListener('DOMContentLoaded', applyAllPrefs);
window.Prefs = Prefs;

/* ════════════════════════════════════════════
   Settings App Builder
════════════════════════════════════════════ */
function buildSettings(body) {
  let page = 'Personalisation';

  const NAV = [
    ['🏠','System'],
    ['🎨','Personalisation'],
    ['🖥️','Display'],
    ['📋','Taskbar'],
    ['🔔','Notifications'],
    ['📡','Network'],
    ['🔒','Privacy'],
    ['🪟','About'],
  ];

  /* Page content generators */
  const PAGES = {

    Personalisation: p => `
      <div class="set-page-title">Personalisation</div>

      <div class="set-card" style="flex-direction:column;align-items:flex-start;gap:12px;cursor:default;margin-bottom:10px">
        <div class="set-card-l">
          <span class="set-card-ic">🖼️</span>
          <div><div class="set-card-nm">Wallpaper</div><div class="set-card-ds">Choose a theme for your desktop</div></div>
        </div>
        <div class="wp-grid" style="width:100%">
          ${[
            {id:'bloom',  label:'Bloom',   g:'linear-gradient(135deg,#060e30,#0a0a2a,#12062a)'},
            {id:'sunset', label:'Sunset',  g:'linear-gradient(135deg,#1a0520,#200818,#300820)'},
            {id:'forest', label:'Forest',  g:'linear-gradient(135deg,#030f06,#061208,#0a1a08)'},
            {id:'ocean',  label:'Ocean',   g:'linear-gradient(135deg,#040e1c,#06101e,#0a1830)'},
            {id:'night',  label:'Night',   g:'linear-gradient(135deg,#06060f,#080810,#0c0c18)'},
          ].map(w => `
            <div class="wp-swatch ${p.wallpaper===w.id?'active':''}"
                 style="background:${w.g}"
                 onclick="Prefs.set('wallpaper','${w.id}');buildSettingsPage('Personalisation')">
              <span class="wp-lbl">${w.label}</span>
            </div>`).join('')}
        </div>
      </div>

      <div class="set-card" style="flex-direction:column;align-items:flex-start;gap:10px;cursor:default;margin-bottom:10px">
        <div class="set-card-l">
          <span class="set-card-ic">🎨</span>
          <div><div class="set-card-nm">Accent colour</div><div class="set-card-ds">Applied to windows, buttons, and highlights</div></div>
        </div>
        <div class="accent-grid">
          ${['#0067C0','#0099BC','#00B294','#7A7574','#107C10','#CA5010','#DA3B01','#881798','#C239B3','#E3008C','#FFB900','#E81123'].map(c=>`
          <div class="accent-dot ${p.accentColor===c?'active':''}" style="background:${c}"
               onclick="Prefs.set('accentColor','${c}');buildSettingsPage('Personalisation')" title="${c}"></div>`).join('')}
        </div>
      </div>

      <div class="set-row">
        <div><div class="set-row-label">Transparency effects</div><div class="set-row-sub">Mica and acrylic blur on windows and panels</div></div>
        <button class="set-toggle ${p.transparency?'on':''}" onclick="Prefs.set('transparency',!Prefs.get('transparency'));this.classList.toggle('on')"></button>
      </div>
      <div class="set-row">
        <div><div class="set-row-label">Animation effects</div><div class="set-row-sub">Window open/close animations</div></div>
        <button class="set-toggle ${p.animationsOn?'on':''}" onclick="Prefs.set('animationsOn',!Prefs.get('animationsOn'));this.classList.toggle('on')"></button>
      </div>`,

    Taskbar: p => `
      <div class="set-page-title">Taskbar</div>
      <div class="set-row">
        <div><div class="set-row-label">Taskbar alignment</div><div class="set-row-sub">Position of start button and pinned icons</div></div>
        <select class="set-select" onchange="Prefs.set('taskbarCenter',this.value==='center')">
          <option value="center" ${p.taskbarCenter ?'selected':''}>Centre</option>
          <option value="left"   ${!p.taskbarCenter?'selected':''}>Left</option>
        </select>
      </div>
      <div class="set-row">
        <div><div class="set-row-label">Search pill</div><div class="set-row-sub">Show search button in taskbar</div></div>
        <button class="set-toggle ${p.taskbarSearch?'on':''}" onclick="Prefs.set('taskbarSearch',!Prefs.get('taskbarSearch'));this.classList.toggle('on')"></button>
      </div>
      <div class="set-row">
        <div><div class="set-row-label">App labels</div><div class="set-row-sub">Show app names on running-app buttons</div></div>
        <button class="set-toggle ${p.taskbarLabels?'on':''}" onclick="Prefs.set('taskbarLabels',!Prefs.get('taskbarLabels'));this.classList.toggle('on')"></button>
      </div>`,

    Notifications: p => `
      <div class="set-page-title">Notifications</div>
      <div class="set-row">
        <div><div class="set-row-label">Show notifications</div><div class="set-row-sub">Toast pop-ups in the corner</div></div>
        <button class="set-toggle on" onclick="this.classList.toggle('on')"></button>
      </div>
      <div class="set-row">
        <div><div class="set-row-label">Notification sounds</div><div class="set-row-sub">Play a sound when a notification arrives [MOCK]</div></div>
        <button class="set-toggle ${p.notifSound?'on':''}" onclick="Prefs.set('notifSound',!Prefs.get('notifSound'));this.classList.toggle('on')"></button>
      </div>
      <div style="margin-top:12px">
        <div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:8px">Recent notification history</div>
        ${Notifications.getHistory().slice(0,6).map(n=>`
        <div class="set-card" style="cursor:default;gap:10px">
          <span style="font-size:18px">${n.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;color:var(--text-3)">${n.app}</div>
            <div style="font-size:12.5px;font-weight:600">${n.title}</div>
            <div style="font-size:11.5px;color:var(--text-2)">${n.msg}</div>
          </div>
        </div>`).join('') || '<div style="color:var(--text-3);font-size:12px;padding:12px 0">No notifications yet</div>'}
      </div>`,

    System: p => `
      <div class="set-page-title">System</div>
      ${[
        ['🖥️','Display','Brightness, resolution, night light'],
        ['🔊','Sound','Volume, output and input devices'],
        ['⚡','Power & sleep','Timeout and sleep settings'],
        ['💾','Storage','Disk usage and cleanup'],
        ['📱','Nearby sharing','Share with nearby devices'],
      ].map(([ic,nm,ds])=>`
      <div class="set-card" onclick="Shell.toast('${ic}','${nm}','Opening ${nm}…')">
        <div class="set-card-l"><span class="set-card-ic">${ic}</span>
          <div><div class="set-card-nm">${nm}</div><div class="set-card-ds">${ds}</div></div>
        </div><span class="set-caret">›</span>
      </div>`).join('')}
      <div class="set-row" style="margin-top:8px">
        <div><div class="set-row-label">Text size</div><div class="set-row-sub">Adjust text scaling</div></div>
        <select class="set-select" onchange="Prefs.set('fontSize',this.value)">
          <option value="small"  ${p.fontSize==='small' ?'selected':''}>Small</option>
          <option value="medium" ${p.fontSize==='medium'?'selected':''}>Medium</option>
          <option value="large"  ${p.fontSize==='large' ?'selected':''}>Large</option>
        </select>
      </div>`,

    Display: () => `
      <div class="set-page-title">Display</div>
      <div class="set-row"><div><div class="set-row-label">Resolution</div><div class="set-row-sub">MOCK — real value from xrandr/wlr-randr</div></div>
        <select class="set-select"><option>1920 × 1080</option><option>2560 × 1440</option><option>3840 × 2160</option></select></div>
      <div class="set-row"><div><div class="set-row-label">Refresh rate</div><div class="set-row-sub">MOCK</div></div>
        <select class="set-select"><option>60 Hz</option><option>120 Hz</option><option>144 Hz</option></select></div>
      <div class="set-row"><div><div class="set-row-label">Night light</div><div class="set-row-sub">Reduces blue light in the evening</div></div>
        <button class="set-toggle" onclick="this.classList.toggle('on')"></button></div>`,

    Network: () => `
      <div class="set-page-title">Network &amp; internet</div>
      ${[['📶','Wi-Fi','HomeNetwork-5G · Connected'],['🔵','Bluetooth','2 devices paired'],['🌐','Ethernet','Not connected'],['🔒','VPN','Not connected']].map(([ic,nm,ds])=>`
      <div class="set-card" onclick="Shell.toast('${ic}','${nm}','${ds}')">
        <div class="set-card-l"><span class="set-card-ic">${ic}</span>
          <div><div class="set-card-nm">${nm}</div><div class="set-card-ds">${ds}</div></div>
        </div><span class="set-caret">›</span>
      </div>`).join('')}`,

    Privacy: () => `
      <div class="set-page-title">Privacy &amp; security</div>
      ${[['🔒','Security','No threats — protected'],['📍','Location','On'],['📷','Camera','Apps have access'],['🎙️','Microphone','Apps have access']].map(([ic,nm,ds])=>`
      <div class="set-card" onclick="Shell.toast('${ic}','${nm}','${ds}')">
        <div class="set-card-l"><span class="set-card-ic">${ic}</span>
          <div><div class="set-card-nm">${nm}</div><div class="set-card-ds">${ds}</div></div>
        </div><span class="set-caret">›</span>
      </div>`).join('')}`,

    About: p => `
      <div class="set-page-title">About</div>
      <div style="display:flex;align-items:center;gap:14px;padding:16px;background:var(--accent-sub);border:1px solid var(--accent-brd);border-radius:var(--r);margin-bottom:12px">
        <span style="font-size:32px">🖥️</span>
        <div><div style="font-size:15px;font-weight:700">ArcOS</div>
          <div style="font-size:12px;color:var(--text-2)">Desktop Shell Prototype v0.5.0</div></div>
      </div>
      <div class="set-row">
        <div><div class="set-row-label">Device name</div></div>
        <input type="text" class="set-select" value="${p.hostname}" style="text-align:right"
          onchange="Prefs.set('hostname',this.value)"/>
      </div>
      <div class="set-row">
        <div><div class="set-row-label">Username</div></div>
        <input type="text" class="set-select" value="${p.username}" style="text-align:right"
          onchange="Prefs.set('username',this.value)"/>
      </div>
      ${[['OS','ArcOS Linux (prototype)'],['Shell','arcos-shell v0.5.0'],['Runtime','Browser / Electron'],['Target','Linux x86_64']].map(([k,v])=>`
      <div class="set-row">
        <div><div class="set-row-label">${k}</div></div>
        <div style="font-size:12px;color:var(--text-2)">${v}</div>
      </div>`).join('')}`,
  };

  window.buildSettingsPage = function(pg) {
    page = pg;
    body.querySelectorAll('.set-s-item').forEach(x => x.classList.remove('active'));
    body.querySelector(`.set-s-item[data-page="${pg}"]`)?.classList.add('active');
    const main = body.querySelector('#set-main');
    if (main) main.innerHTML = (PAGES[pg] || PAGES.System)(Prefs.getAll());
  };

  body.innerHTML = `
    <div class="pane-wrap">
      <div class="pane-side set-side">
        <div class="set-s-avatar">
          <div class="set-avatar">👤</div>
          <div>
            <div class="set-avatar-name">${Prefs.get('username')}</div>
            <div class="set-avatar-sub">${Prefs.get('hostname')}</div>
          </div>
        </div>
        ${NAV.map(([ic,lb])=>`
          <div class="set-s-item ${lb===page?'active':''}" data-page="${lb}"
               onclick="buildSettingsPage('${lb}')">
            <span>${ic}</span><span>${lb}</span>
          </div>`).join('')}
      </div>
      <div class="pane-main set-main" id="set-main" style="padding:20px 24px;overflow-y:auto;flex:1"></div>
    </div>`;

  buildSettingsPage(page);
}
