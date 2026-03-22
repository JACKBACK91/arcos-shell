/* apps/notes.js */
Shell.register('notes', {
  title:'Notepad', icon:'📝', w:540, h:420,
  build(body) {
    body.innerHTML = `
      <div class="notes-ribbon">
        <button class="rb-btn" onclick="document.execCommand('bold')"><b>B</b></button>
        <button class="rb-btn" onclick="document.execCommand('italic')"><i>I</i></button>
        <button class="rb-btn" onclick="document.execCommand('underline')"><u>U</u></button>
        <div class="rb-sep"></div>
        <button class="rb-btn">Font ▾</button>
        <button class="rb-btn">12 ▾</button>
        <div class="rb-sep"></div>
        <button class="rb-btn" onclick="Shell.toast('💾','Saved','Document saved successfully')">💾 Save</button>
        <button class="rb-btn" onclick="Shell.toast('🖨️','Print','Sending to printer…')">🖨️ Print</button>
      </div>
      <textarea class="notes-ta" id="notes-content" placeholder="Start typing…">Welcome to Windows 11!

All apps now use a central app registry (Shell.register).
Each app is its own JS module in /js/apps/.

Window controls:
  ─  Minimise       □  Maximise / Snap (hover □ for layouts)
  ✕  Close          Double-click titlebar to maximise

Settings (⚙️) changes are saved to localStorage and apply live:
  • Wallpaper themes    • Accent colours
  • Taskbar alignment   • Transparency toggle
  • Search pill         • App labels</textarea>
      <div class="notes-status">
        <span id="notes-wordcount">Words: 0</span>
        <span>UTF-8</span>
      </div>`;

    const ta  = body.querySelector('#notes-content');
    const wc  = body.querySelector('#notes-wordcount');
    function updateCount() {
      const words = ta.value.trim().split(/\s+/).filter(Boolean).length;
      wc.textContent = `Words: ${words}  ·  Ln ${ta.value.substr(0, ta.selectionStart).split('\n').length}`;
    }
    ta.addEventListener('input', updateCount);
    ta.addEventListener('click', updateCount);
    ta.addEventListener('keyup', updateCount);
    updateCount();
  }
});
