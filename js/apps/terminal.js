/* apps/terminal.js
   SHELL-CORE: Command dispatcher (logic is portable)
   BROWSER-ONLY: DOM rendering, no real process exec
   MOCK: All command output is simulated
   LINUX equiv: Launch xterm/foot/alacritty as child
                process, or use PTY via node-pty in Electron
*/
Shell.register('terminal', {
  title: 'Terminal',
  icon:  '🖥️',
  w: 660, h: 440,
  build(body) {
    const cmdHistory = [];
    let hIdx = -1;

    /* ── MOCK command responses ─────────────────
       Linux equiv: real shell (bash/zsh) via PTY
    ─────────────────────────────────────────────── */
    const CMDS = {
      help: () => [
        '<span style="color:#0af;font-weight:600">ArcOS Shell — available commands</span>',
        '',
        '<span style="color:#0a0">  help      </span> Show this help',
        '<span style="color:#0a0">  ls / dir  </span> List directory contents',
        '<span style="color:#0a0">  pwd       </span> Print working directory',
        '<span style="color:#0a0">  cd [dir]  </span> Change directory (MOCK)',
        '<span style="color:#0a0">  whoami    </span> Current user',
        '<span style="color:#0a0">  hostname  </span> System hostname',
        '<span style="color:#0a0">  uname     </span> OS information',
        '<span style="color:#0a0">  ps        </span> Running processes (MOCK)',
        '<span style="color:#0a0">  top       </span> System resource usage (MOCK)',
        '<span style="color:#0a0">  cat [f]   </span> Print file contents (MOCK)',
        '<span style="color:#0a0">  echo [t]  </span> Print text',
        '<span style="color:#0a0">  date      </span> Current date/time',
        '<span style="color:#0a0">  uptime    </span> System uptime (MOCK)',
        '<span style="color:#0a0">  neofetch  </span> System info graphic',
        '<span style="color:#0a0">  clear     </span> Clear terminal',
      ].join('\n'),

      ls: () =>
        '<span style="color:#55f">Desktop</span>  <span style="color:#55f">Documents</span>  <span style="color:#55f">Downloads</span>  <span style="color:#55f">Music</span>  <span style="color:#55f">Pictures</span>  <span style="color:#55f">Videos</span>\n' +
        '<span style="color:#ccc">notes.txt</span>  <span style="color:#ccc">README.md</span>  <span style="color:#ccc">.bashrc</span>',

      dir: () => [
        '<span style="color:#666">total 48</span>',
        '<span style="color:#55f">drwxr-xr-x</span> 2 user user 4096 Jan  1 00:00 Desktop',
        '<span style="color:#55f">drwxr-xr-x</span> 3 user user 4096 Jan  1 00:00 Documents',
        '<span style="color:#55f">drwxr-xr-x</span> 2 user user 4096 Jan  1 00:00 Downloads',
        '<span style="color:#55f">drwxr-xr-x</span> 2 user user 4096 Jan  1 00:00 Music',
        '<span style="color:#55f">drwxr-xr-x</span> 4 user user 4096 Jan  1 00:00 Pictures',
        '<span style="color:#55f">drwxr-xr-x</span> 2 user user 4096 Jan  1 00:00 Videos',
        '<span style="color:#ccc">-rw-r--r--</span> 1 user user  248 Jan  1 00:00 notes.txt',
        '<span style="color:#ccc">-rw-r--r--</span> 1 user user 1024 Jan  1 00:00 README.md',
      ].join('\n'),

      pwd: () => '<span style="color:#ccc">/home/user</span>',

      whoami: () => '<span style="color:#ccc">user</span>',

      hostname: () => '<span style="color:#ccc">arcos-desktop</span>',

      uname: () => '<span style="color:#ccc">Linux arcos-desktop 6.6.0-arcos #1 SMP x86_64 GNU/Linux</span>',

      date: () => `<span style="color:#ccc">${new Date().toString()}</span>`,

      uptime: () => '<span style="color:#ccc"> 06:42:11 up 2 days, 14:22,  1 user,  load average: 0.42, 0.38, 0.35</span>',

      ps: () => [
        '<span style="color:#0a0">  PID  TTY     TIME CMD</span>',
        '<span style="color:#ccc">    1  ?   00:00:02 systemd</span>',
        '<span style="color:#ccc">  842  ?   00:00:00 arcos-shell</span>',
        '<span style="color:#ccc"> 1024  pts/0 00:00:00 bash</span>',
        '<span style="color:#ccc"> 2048  pts/0 00:00:00 ps</span>',
      ].join('\n'),

      top: () => [
        '<span style="color:#0af">top - ' + new Date().toTimeString().slice(0,8) + ' up 2 days, load: 0.42</span>',
        '<span style="color:#0af">Tasks:</span> <span style="color:#ccc">128 total,   1 running, 127 sleeping</span>',
        '<span style="color:#0af">%Cpu(s):</span> <span style="color:#ccc"> 3.2 us,  1.1 sy,  0.0 ni, 95.1 id</span>',
        '<span style="color:#0af">MiB Mem:</span> <span style="color:#ccc"> 15826.4 total,  8241.2 free,  4208.0 used</span>',
        '',
        '<span style="color:#0a0">  PID USER    PR  NI    VIRT    RES  %CPU  %MEM COMMAND</span>',
        '<span style="color:#ccc"> 1024 user    20   0  624320  48200   2.0   0.3 arcos-shell</span>',
        '<span style="color:#ccc">  842 user    20   0  156800  12400   0.3   0.1 wayfire</span>',
        '<span style="color:#ccc">    1 root    20   0  167296  10240   0.0   0.1 systemd</span>',
      ].join('\n'),

      neofetch: () => [
        '<span style="color:#0af">         ██████████         </span>  <span style="color:#fff;font-weight:600">user</span><span style="color:#666">@</span><span style="color:#fff;font-weight:600">arcos-desktop</span>',
        '<span style="color:#0af">      ████░░░░░░████       </span>  <span style="color:#0af">────────────────────</span>',
        '<span style="color:#0af">    ██░░░░░░░░░░░░██     </span>  <span style="color:#0af">OS:</span>     ArcOS Linux x86_64',
        '<span style="color:#0af">   ██░░░░░░░░░░░░░░██    </span>  <span style="color:#0af">Kernel:</span> 6.6.0-arcos',
        '<span style="color:#0af">  ██░░░░░░░░░░░░░░░░██   </span>  <span style="color:#0af">Shell:</span>  arcos-shell v0.5.0',
        '<span style="color:#0af">  ██░░░░░░░░░░░░░░░░██   </span>  <span style="color:#0af">WM:</span>     ArcOS Compositor',
        '<span style="color:#0af">   ██░░░░░░░░░░░░░░██    </span>  <span style="color:#0af">Theme:</span>  Fluent Dark',
        '<span style="color:#0af">    ██░░░░░░░░░░░░██     </span>  <span style="color:#0af">Memory:</span> 4208 MiB / 15826 MiB',
        '<span style="color:#0af">      ████░░░░░░████       </span>',
        '<span style="color:#0af">         ██████████         </span>  <span style="background:#f00"> </span><span style="background:#fa0"> </span><span style="background:#ff0"> </span><span style="background:#0a0"> </span><span style="background:#00f"> </span><span style="background:#a0f"> </span>',
      ].join('\n'),

      clear: () => null,
    };

    function runCmd(raw) {
      const parts = raw.trim().split(/\s+/);
      const cmd   = parts[0].toLowerCase();
      const args  = parts.slice(1);

      if (cmd === 'clear') return null;
      if (cmd === 'echo')  return `<span style="color:#ccc">${args.join(' ')}</span>`;
      if (cmd === 'cd')    return `<span style="color:#666">[MOCK] cd: changed to /home/user/${args[0]||''}</span>`;
      if (cmd === 'cat') {
        const mocks = {
          'notes.txt':  'Welcome to ArcOS!\nThis is a mock file.',
          'README.md':  '# ArcOS\nDesktop Shell Prototype v0.5.0',
          '.bashrc':    '# ArcOS .bashrc\nexport PATH="$HOME/.local/bin:$PATH"\nalias ll="ls -la"',
        };
        return mocks[args[0]]
          ? `<span style="color:#ccc">${mocks[args[0]].replace(/\n/g,'<br>')}</span>`
          : `<span style="color:#f55">cat: ${args[0]}: No such file or directory</span>`;
      }

      const fn = CMDS[cmd];
      if (fn) return fn();
      return `<span style="color:#f55">arcos-shell: command not found: ${cmd}. Try 'help'.</span>`;
    }

    /* ── Build DOM ──────────────────────────── */
    body.innerHTML = `
      <div class="term-wrap">
        <div class="term-tabs">
          <div class="term-tab active" onclick="">bash</div>
          <div class="term-tab" onclick="Shell.toast('🖥️','Terminal','Open a new tab to start a new session')">+</div>
        </div>
        <div class="term-out" id="tout">
<span style="color:#0af;font-weight:700">ArcOS Terminal</span>  <span style="color:#333">─ bash 5.2.15</span>
<span style="color:#333">Type 'help' for available commands.</span>
<span style="color:#666">Note: All commands are mocked — no real shell access in browser mode.</span>
<span style="color:#666">In Electron/Linux: node-pty provides real PTY access.</span>

</div>
        <div class="term-in-row">
          <span class="term-ps" id="term-ps">user@arcos:~$</span>
          <input class="term-inp" id="tinput" type="text" autocomplete="off" spellcheck="false"/>
        </div>
      </div>`;

    const tout = body.querySelector('#tout');
    const tin  = body.querySelector('#tinput');
    let cwd = '~';

    tin.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (hIdx < cmdHistory.length - 1) hIdx++;
        tin.value = cmdHistory[cmdHistory.length - 1 - hIdx] || '';
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hIdx > 0) hIdx--;
        else { hIdx = -1; tin.value = ''; return; }
        tin.value = cmdHistory[cmdHistory.length - 1 - hIdx] || '';
        return;
      }
      if (e.key !== 'Enter') return;

      const raw = tin.value; tin.value = ''; hIdx = -1;
      if (!raw.trim()) { _appendLine(''); return; }
      cmdHistory.push(raw);

      _appendLine(`<span style="color:#0a0">user@arcos</span><span style="color:#666">:</span><span style="color:#55f">${cwd}</span><span style="color:#666">$</span> <span style="color:#fff">${raw}</span>`);

      if (raw.trim() === 'clear') { tout.innerHTML = ''; return; }

      if (raw.trim().startsWith('cd ')) {
        const dir = raw.trim().split(/\s+/)[1] || '~';
        cwd = dir === '~' ? '~' : (dir.startsWith('/') ? dir : `~/${dir}`);
        document.getElementById('term-ps').textContent = `user@arcos:${cwd}$`;
        return;
      }

      const out = runCmd(raw);
      if (out) _appendLine(out);
      _appendLine('');
      tout.scrollTop = tout.scrollHeight;
    });

    function _appendLine(html) {
      const d = document.createElement('div');
      d.innerHTML = html;
      tout.appendChild(d);
      tout.scrollTop = tout.scrollHeight;
    }

    setTimeout(() => tin.focus(), 60);
  }
});
