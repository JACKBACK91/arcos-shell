/* apps/about.js — About ArcOS v7 */
Shell.register('about', {
  title: 'About ArcOS',
  icon:  'ℹ️',
  w: 540, h: 500,
  build(body) {
    body.style.cssText = 'display:flex;flex-direction:column;overflow-y:auto;';
    const inElectron = typeof window.electronAPI !== 'undefined';
    const runtime    = inElectron ? 'Electron 33+' : 'Browser';
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;
        padding:32px 32px 20px;gap:10px;text-align:center;
        background:linear-gradient(to bottom,rgba(0,103,192,0.10),transparent);">
        <div style="font-size:60px;filter:drop-shadow(0 4px 20px rgba(0,103,192,.55))">🖥️</div>
        <div style="font-size:26px;font-weight:700;letter-spacing:-.02em;margin-top:4px">ArcOS</div>
        <div style="font-size:13px;color:var(--text-2)">Desktop Shell — v0.7.0</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:2px">
          <span style="padding:4px 12px;border-radius:20px;background:var(--accent-sub);border:1px solid var(--accent-brd);font-size:11px;font-weight:600;color:var(--accent-hi)">v0.7.0</span>
          <span style="padding:4px 12px;border-radius:20px;background:rgba(255,255,255,0.06);border:1px solid var(--m-stroke);font-size:11px;color:var(--text-2)">Steps 1–12 ✓</span>
          <span style="padding:4px 12px;border-radius:20px;background:${inElectron?'rgba(0,180,100,0.12)':'rgba(255,255,255,0.05)'};border:1px solid ${inElectron?'rgba(0,180,100,0.3)':'var(--m-stroke)'};font-size:11px;color:${inElectron?'#4dcc88':'var(--text-3)'}">
            ${inElectron ? '⚡ Electron' : '🌐 Browser'}
          </span>
        </div>
      </div>
      <div style="padding:0 22px 24px;display:flex;flex-direction:column;gap:5px;">
        ${[
          ['🏗️','Version','v0.7.0 (all 12 steps complete)'],
          ['🌐','Runtime',runtime],
          ['🐧','Target OS','Linux x86_64 — Wayland + Wayfire'],
          ['📦','Shell engine','Electron + HTML/CSS/JS'],
          ['🎨','UI design','Windows 11 Fluent / Mica'],
          ['💾','Config','localStorage → XDG ~/.config/arcos'],
          ['🔐','Login','greetd (auto-login on live ISO)'],
          ['📀','ISO','Debian 12 Bookworm — via live-build'],
          ['⚙️','Build CI','GitHub Actions (free, automatic)'],
        ].map(([ic,k,v]) => `
        <div style="display:flex;align-items:center;gap:12px;padding:9px 12px;
          background:var(--m-card);border:1px solid var(--m-stroke);border-radius:var(--r);">
          <span style="font-size:15px;width:20px;text-align:center">${ic}</span>
          <span style="color:var(--text-2);font-size:11.5px;width:110px;flex-shrink:0">${k}</span>
          <span style="font-size:12px;font-weight:500;color:var(--text)">${v}</span>
        </div>`).join('')}
        <div style="margin-top:8px;padding:12px 14px;background:rgba(0,103,192,0.06);
          border:1px solid var(--accent-brd);border-radius:var(--r);">
          <div style="font-size:11.5px;font-weight:600;color:var(--text);margin-bottom:6px">To build the ISO from Windows:</div>
          <div style="font-size:11px;color:var(--text-2);line-height:1.7">
            1. Push this repo to GitHub<br>
            2. GitHub Actions builds it automatically<br>
            3. Download the ISO from the Actions artifacts tab<br>
            4. Open in VirtualBox or write to USB<br>
            <span style="color:var(--text-3)">See HOW-TO-BUILD-ISO.md for full instructions</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button onclick="Shell.openApp('settings')"
            style="flex:1;padding:9px;border-radius:var(--r);background:var(--accent);border:none;color:#fff;font-family:var(--font);font-size:12px;font-weight:600;cursor:pointer"
            onmouseover="this.style.background='var(--accent-hi)'" onmouseout="this.style.background='var(--accent)'">⚙️ Settings</button>
          <button onclick="Shell.openApp('terminal')"
            style="flex:1;padding:9px;border-radius:var(--r);background:var(--m-card);border:1px solid var(--m-stroke);color:var(--text);font-family:var(--font);font-size:12px;cursor:pointer"
            onmouseover="this.style.background='var(--m-hover)'" onmouseout="this.style.background='var(--m-card)'">🖥️ Terminal</button>
        </div>
      </div>`;
  }
});
