(() => {
  if (window.susfsPriorityUIStarted) return;
  window.susfsPriorityUIStarted = true;
  const script = '/data/adb/modules/susfs4ksu/priority-uid-filter.sh';
  let serial = 0;
  function exec(action) {
    return new Promise((resolve, reject) => {
      if (!window.ksu || typeof window.ksu.exec !== 'function') {
        reject(new Error('KernelSU WebUI root bridge unavailable'));
        return;
      }
      const name = 'susfsPriorityCallback' + (++serial);
      const timer = setTimeout(() => { delete window[name]; reject(new Error('Operation timed out; refresh status before retrying')); }, 60000);
      window[name] = (code, stdout, stderr) => {
        clearTimeout(timer);
        delete window[name];
        resolve({code: Number(code), text: String(stdout || '') + String(stderr || '')});
      };
      try { window.ksu.exec('sh ' + script + ' ' + action, '{}', name); }
      catch (error) { clearTimeout(timer); delete window[name]; reject(error); }
    });
  }
  function addCard(section) {
    if (section.querySelector('.priority-uid-card')) return;
    const card = document.createElement('div');
    card.className = 'priority-uid-card';
    card.style.cssText = 'width:100%;max-width:600px;box-sizing:border-box;margin:16px auto;padding:16px;border:2px solid white;border-radius:16px;color:white;background:#171717;font:14px sans-serif;text-transform:none;position:relative;z-index:40';
    card.innerHTML = '<h3 style="margin:0 0 12px">Priority UID Filter</h3><label style="display:flex;align-items:center;justify-content:space-between;gap:16px"><span>Hide third-party app UIDs</span><input type="checkbox" class="toggle toggle-primary priority-toggle" aria-label="Enable Priority UID Filter" disabled></label><p>Opt-in. Enabling applies now and after boot. Disabling requires a reboot to remove a filter already applied.</p><p class="priority-summary">Checking support and application status...</p><button type="button" class="btn btn-sm priority-refresh">Refresh status</button><pre class="priority-status" style="white-space:pre-wrap;overflow-wrap:anywhere;font:12px monospace"></pre>';
    section.prepend(card);
    const toggle = card.querySelector('.priority-toggle');
    const refresh = card.querySelector('.priority-refresh');
    const output = card.querySelector('.priority-status');
    const summary = card.querySelector('.priority-summary');
    let busy = false;
    async function update() {
      toggle.disabled = true;
      const result = await exec('status');
      output.textContent = result.text;
      const configured = result.text.includes('Configured: enabled');
      const supported = result.text.includes('Kernel support: available') && result.text.includes('Companion command: available');
      const applied = result.text.includes('Last application this boot: applied');
      toggle.checked = configured;
      toggle.disabled = result.code !== 0 || (!configured && !supported);
      summary.textContent = 'Kernel/helper: ' + (supported ? 'available' : 'unavailable') + ' | Setting: ' + (configured ? 'ON' : 'OFF') + ' | Last application: ' + (applied ? 'accepted this boot' : 'not confirmed this boot');
      summary.style.color = configured && applied ? '#74e6a8' : '#ffd479';
    }
    async function operate(action) {
      if (busy) return;
      busy = true;
      toggle.disabled = true;
      refresh.disabled = true;
      try {
        if (action) {
          const result = await exec(action);
          await update();
          output.textContent = result.text + '\n' + output.textContent;
        } else await update();
      } catch (error) {
        output.textContent = error.message;
        summary.textContent = 'Status could not be read. Use Refresh status.';
        summary.style.color = '#ffd479';
        toggle.disabled = true;
      } finally { busy = false; refresh.disabled = false; }
    }
    toggle.addEventListener('change', () => operate(toggle.checked ? 'enable' : 'disable'));
    refresh.addEventListener('click', () => operate());
    operate();
  }
  function mount() {
    document.querySelectorAll('[id^="status_"]').forEach(badge => {
      const row = badge.parentElement;
      if (!row || !row.querySelector('span')) return;
      const deprecated = /deprecated/i.test(badge.textContent);
      if (deprecated && !row.hidden) { row.hidden = true; row.dataset.priorityDeprecated = '1'; }
      else if (!deprecated && row.dataset.priorityDeprecated === '1') { row.hidden = false; delete row.dataset.priorityDeprecated; }
    });
    if (!/(?:\/|^)(?:index|custom|status)\.html$/.test(location.pathname) && !location.pathname.endsWith('/')) return;
    document.querySelectorAll('[data-router-view] section').forEach(addCard);
  }
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; mount(); });
  });
  function start() { mount(); observer.observe(document.body, {childList:true, subtree:true, characterData:true}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
