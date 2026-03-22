/* apps/explorer.js — File Explorer
   SHELL-CORE: Navigation logic, virtual FS model
   BROWSER-ONLY: DOM grid/list rendering
   MOCK: All files are fake — no real disk access
   LINUX equiv: Use GIO/GVfs D-Bus API, or node
                fs module in Electron for real files
*/
Shell.register('explorer', {
  title: 'Files',
  icon:  '📁',
  w: 760, h: 490,
  build: buildExplorer,
});

function buildExplorer(body) {

  /* MOCK: Virtual filesystem
     Linux equiv: GFile / GFileInfo from GIO,
     or fs.readdir() in Electron main process    */
  const FS = {
    'Desktop':   [
      { n:'Projects',       e:'📁', t:'Folder',       s:'—',      d:'Today',        folder:true },
      { n:'Notes.txt',      e:'📝', t:'Text File',    s:'3 KB',   d:'Today' },
      { n:'screenshot.png', e:'🖼️', t:'Image',        s:'1.2 MB', d:'Today' },
    ],
    'Documents': [
      { n:'Work',           e:'📁', t:'Folder',       s:'—',      d:'Yesterday',    folder:true },
      { n:'Personal',       e:'📁', t:'Folder',       s:'—',      d:'2 days ago',   folder:true },
      { n:'Resume.docx',    e:'📄', t:'Word Document', s:'48 KB', d:'3 days ago' },
      { n:'Budget.xlsx',    e:'📊', t:'Spreadsheet',  s:'124 KB', d:'Last week' },
      { n:'README.md',      e:'📋', t:'Markdown',     s:'8 KB',   d:'Last week' },
    ],
    'Downloads': [
      { n:'setup.exe',      e:'⚙️', t:'Application',  s:'85 MB',  d:'Today' },
      { n:'archive.zip',    e:'🗜️', t:'Archive',      s:'450 MB', d:'Yesterday' },
      { n:'video.mp4',      e:'🎬', t:'Video',        s:'1.2 GB', d:'3 days ago' },
      { n:'music.mp3',      e:'🎵', t:'Audio',        s:'8 MB',   d:'Last week' },
    ],
    'Pictures': [
      { n:'Wallpapers',     e:'📁', t:'Folder',       s:'—',      d:'Last month',   folder:true },
      { n:'Screenshots',    e:'📁', t:'Folder',       s:'—',      d:'Yesterday',    folder:true },
      { n:'photo1.jpg',     e:'🖼️', t:'Image',        s:'3.2 MB', d:'Last week' },
      { n:'photo2.jpg',     e:'🖼️', t:'Image',        s:'2.8 MB', d:'Last week' },
    ],
    'Music':    [{ n:'Playlists', e:'📁', t:'Folder', s:'—', d:'Last month', folder:true }, { n:'song1.mp3', e:'🎵', t:'Audio', s:'6 MB', d:'Last week' }],
    'Videos':   [{ n:'clip1.mp4', e:'🎬', t:'Video', s:'340 MB', d:'Last week' }],
    'Projects': [
      { n:'os-ui-v5', e:'📁', t:'Folder', s:'—', d:'Today', folder:true },
      { n:'README.md', e:'📋', t:'Markdown', s:'2 KB', d:'Today' },
    ],
    'Work':     [{ n:'report.docx', e:'📄', t:'Document', s:'32 KB', d:'Yesterday' }],
    'Personal': [{ n:'diary.txt', e:'📝', t:'Text', s:'8 KB', d:'2 days ago' }],
    'Wallpapers':[{ n:'bloom.jpg', e:'🖼️', t:'Image', s:'4 MB', d:'Last month' }, { n:'sunset.jpg', e:'🖼️', t:'Image', s:'3.8 MB', d:'Last month' }],
  };

  const SIDEBAR = [
    { ic:'⭐', lb:'Quick access', open:true, children:[
      { ic:'🖥️', lb:'Desktop' }, { ic:'⬇️', lb:'Downloads' },
      { ic:'📄', lb:'Documents' }, { ic:'🖼️', lb:'Pictures' },
      { ic:'🎵', lb:'Music' }, { ic:'🎬', lb:'Videos' },
    ]},
    { ic:'☁️', lb:'Cloud Drive' },
    { ic:'💻', lb:'This Device', open:false, children:[
      { ic:'🖥️', lb:'Desktop' }, { ic:'📄', lb:'Documents' },
      { ic:'⬇️', lb:'Downloads' }, { ic:'💽', lb:'System (/)' },
    ]},
    { ic:'🗑️', lb:'Bin' },
  ];

  let curPath  = 'Desktop';
  let viewMode = 'grid';
  let selected = null;
  const navHistory = ['Desktop'];
  let navIdx = 0;

  /* ── Sidebar ──────────────────────────────── */
  function renderSidebar(el) {
    el.innerHTML = '';
    SIDEBAR.forEach(group => {
      const sec = document.createElement('div');
      sec.className = 'si-sec';
      const hd = document.createElement('div');
      hd.className = 'si-item';
      const arrow = group.children ? `<span style="margin-left:auto;font-size:11px;opacity:.5;transition:transform .15s;transform:rotate(${group.open?'0':'270'}deg)">▾</span>` : '';
      hd.innerHTML = `<span class="si-ic">${group.ic}</span><span>${group.lb}</span>${arrow}`;
      hd.addEventListener('click', () => {
        navigate(group.lb);
        if (group.children) { group.open = !group.open; renderSidebar(el); }
        setSideActive(hd);
      });
      sec.appendChild(hd);
      if (group.children && group.open) {
        group.children.forEach(child => {
          const row = document.createElement('div');
          row.className = 'si-item' + (child.lb === curPath ? ' active' : '');
          row.style.paddingLeft = '22px';
          row.innerHTML = `<span class="si-ic">${child.ic}</span><span>${child.lb}</span>`;
          row.addEventListener('click', () => { navigate(child.lb); setSideActive(row); });
          sec.appendChild(row);
        });
      }
      el.appendChild(sec);
    });
  }

  function setSideActive(el) {
    body.querySelectorAll('.si-item').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
  }

  /* ── Navigation ───────────────────────────── */
  function navigate(path) {
    curPath = path; selected = null;
    if (navHistory[navIdx] !== path) {
      navHistory.splice(navIdx + 1);
      navHistory.push(path);
      navIdx = navHistory.length - 1;
    }
    renderFiles(); updateTopbar();
  }

  function goBack()    { if (navIdx > 0) { navIdx--; curPath = navHistory[navIdx]; renderFiles(); updateTopbar(); } }
  function goForward() { if (navIdx < navHistory.length - 1) { navIdx++; curPath = navHistory[navIdx]; renderFiles(); updateTopbar(); } }
  function goUp()      { navigate('Desktop'); }

  function updateTopbar() {
    const addrEl = body.querySelector('#exp-addr');
    if (addrEl) addrEl.value = '/home/user/' + curPath;
    const bb = body.querySelector('#btn-back');
    const bf = body.querySelector('#btn-forward');
    if (bb) bb.disabled = navIdx <= 0;
    if (bf) bf.disabled = navIdx >= navHistory.length - 1;
  }

  /* ── File list rendering ──────────────────── */
  function renderFiles() {
    const rawFiles = FS[curPath] || [];
    const q = (body.querySelector('#exp-search')?.value || '').toLowerCase();
    const files = q ? rawFiles.filter(f => f.n.toLowerCase().includes(q)) : rawFiles;
    const content = body.querySelector('#exp-content');
    const status  = body.querySelector('#exp-status-text');

    if (viewMode === 'grid') {
      content.className = 'exp-grid';
      content.innerHTML = files.length
        ? files.map((f, i) => `
          <div class="fi-card" data-idx="${i}" ${f.folder ? `ondblclick="expNavigateTo('${f.n}')"` : ''}>
            <div class="fi-ic">${f.e}</div>
            <div class="fi-nm">${f.n}</div>
          </div>`).join('')
        : '<div style="color:var(--text-3);font-size:12px;padding:24px;grid-column:1/-1;text-align:center">This folder is empty</div>';

      content.querySelectorAll('.fi-card').forEach(c => {
        c.addEventListener('click', e => {
          e.stopPropagation();
          content.querySelectorAll('.fi-card').forEach(x => x.classList.remove('selected'));
          c.classList.add('selected');
          selected = files[parseInt(c.dataset.idx)];
          if (status) status.textContent = `${selected.n}  ·  ${selected.t}  ·  ${selected.s}`;
        });
      });
    } else {
      content.className = 'exp-list';
      content.innerHTML = `
        <div class="exp-list-head">
          <span class="fr-ic"></span>
          <span class="fr-nm col-nm">Name</span>
          <span class="fr-tp col-tp">Type</span>
          <span class="fr-sz col-sz">Size</span>
          <span class="fr-dt col-dt">Modified</span>
        </div>` +
        (files.length
          ? files.map((f, i) => `
            <div class="fr" data-idx="${i}" ${f.folder ? `ondblclick="expNavigateTo('${f.n}')"` : ''}>
              <span class="fr-ic">${f.e}</span>
              <span class="fr-nm">${f.n}</span>
              <span class="fr-tp">${f.t}</span>
              <span class="fr-sz">${f.s}</span>
              <span class="fr-dt">${f.d}</span>
            </div>`).join('')
          : '<div class="fr" style="color:var(--text-3);cursor:default;border:none;justify-content:center">This folder is empty</div>');

      content.querySelectorAll('.fr[data-idx]').forEach(r => {
        r.addEventListener('click', e => {
          e.stopPropagation();
          content.querySelectorAll('.fr').forEach(x => x.classList.remove('selected'));
          r.classList.add('selected');
          selected = files[parseInt(r.dataset.idx)];
          if (status) status.textContent = `${selected.n}  ·  ${selected.t}  ·  ${selected.s}`;
        });
      });
    }

    content.addEventListener('click', () => { content.querySelectorAll('.fi-card,.fr').forEach(c=>c.classList.remove('selected')); selected=null; if(status) status.textContent=`${files.length} item${files.length!==1?'s':''}`; });
    if (status) status.textContent = `${files.length} item${files.length!==1?'s':''}`;
  }

  /* global helpers for inline dblclick */
  window.expNavigateTo = name => navigate(name);

  /* ── Build HTML ───────────────────────────── */
  body.innerHTML = `
    <div class="pane-wrap">
      <div class="pane-side exp-side" id="exp-side"></div>
      <div class="pane-main">
        <div class="exp-cmd">
          <button class="cmd-btn" onclick="Notifications.push({icon:'📁',title:'New Folder',msg:'New folder created in '+document.querySelector('#exp-addr').value,app:'Files'})">
            <span class="cmd-ico">📁</span><span>New</span>
          </button>
          <button class="cmd-btn"><span class="cmd-ico">✂️</span><span>Cut</span></button>
          <button class="cmd-btn"><span class="cmd-ico">📋</span><span>Copy</span></button>
          <button class="cmd-btn"><span class="cmd-ico">📌</span><span>Paste</span></button>
          <button class="cmd-btn"><span class="cmd-ico">🗑️</span><span>Delete</span></button>
          <button class="cmd-btn"><span class="cmd-ico">✏️</span><span>Rename</span></button>
          <div style="flex:1"></div>
          <button class="cmd-btn" id="view-btn" onclick="expToggleView()">
            <span class="cmd-ico" id="view-ico">⊞</span><span>View</span>
          </button>
        </div>
        <div class="exp-topbar">
          <button class="nbtn" id="btn-back"    onclick="expGoBack()"    disabled>←</button>
          <button class="nbtn" id="btn-forward" onclick="expGoFwd()"     disabled>→</button>
          <button class="nbtn"                  onclick="expGoUp()"              >↑</button>
          <button class="nbtn"                  onclick="expRefresh()"           >↻</button>
          <input class="exp-addr" id="exp-addr" type="text" value="/home/user/Desktop"
            onkeydown="if(event.key==='Enter'){const p=this.value.split('/').pop();expNavigateTo(p||'Desktop');}"/>
          <input class="exp-search" id="exp-search" type="text" placeholder="🔍 Search"
            oninput="expRefresh()"/>
        </div>
        <div id="exp-content" class="exp-grid"></div>
        <div class="exp-status">
          <span id="exp-status-text">0 items</span>
          <span style="color:var(--text-3)">${new Date().toLocaleDateString('en-GB')}</span>
        </div>
      </div>
    </div>`;

  renderSidebar(body.querySelector('#exp-side'));
  renderFiles(); updateTopbar();

  window.expGoBack    = goBack;
  window.expGoFwd     = goForward;
  window.expGoUp      = goUp;
  window.expRefresh   = renderFiles;
  window.expToggleView = () => {
    viewMode = viewMode === 'grid' ? 'list' : 'grid';
    document.getElementById('view-ico').textContent = viewMode==='grid' ? '⊞' : '☰';
    renderFiles();
  };
}
