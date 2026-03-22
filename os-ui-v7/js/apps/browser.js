/* apps/browser.js */
Shell.register('browser', {
  title:'Microsoft Edge', icon:'🌐', w:800, h:540,
  build(body) {
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;flex:1;overflow:hidden">
        <div class="brw-tab-bar">
          <div class="brw-tab active">🌐 New Tab</div>
          <div class="brw-tab">📰 MSN</div>
          <button class="brw-newtab">+</button>
        </div>
        <div class="brw-nav">
          <button class="nbtn">←</button>
          <button class="nbtn">→</button>
          <button class="nbtn">↻</button>
          <input class="brw-url" type="text" value="edge://newtab"
            onkeydown="if(event.key==='Enter')Shell.toast('🌐','Navigating','→ '+this.value)"/>
          <button class="nbtn">⭐</button>
          <button class="nbtn">⋯</button>
        </div>
        <div class="brw-body">
          <div style="font-size:13px;color:var(--text-2)">Good day, User</div>
          <div style="font-size:28px;font-weight:700;letter-spacing:-.02em">Microsoft Edge</div>
          <input style="width:400px;max-width:90%;padding:10px 18px;border-radius:22px;
            border:1px solid var(--m-stroke2);background:rgba(255,255,255,.07);
            color:var(--text);font-family:var(--font);font-size:13px;outline:none;
            transition:border-color .15s,background .15s"
            placeholder="🔍 Search the web or enter a URL"
            onfocus="this.style.borderColor='var(--accent-brd)';this.style.background='rgba(0,103,192,.09)'"
            onblur="this.style.borderColor='';this.style.background=''"
            onkeydown="if(event.key==='Enter')Shell.toast('🌐','Searching…',this.value)"/>
          <div class="brw-tiles">
            ${[['🔍','Google'],['📺','YouTube'],['📰','News'],['🛍️','Amazon'],
               ['📧','Outlook'],['💼','LinkedIn'],['☁️','OneDrive'],['🎮','Xbox']].map(([e,l])=>
              `<div class="brw-tile"><span style="font-size:22px">${e}</span>
               <span style="font-size:11px;color:var(--text-2)">${l}</span></div>`).join('')}
          </div>
        </div>
      </div>`;
  }
});
