(() => {
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
  function mount() {
    const section = document.querySelector('[data-router-view="home"] section');
    if (!section || section.querySelector('#priority-uid-card')) return;
    const card = document.createElement('div');
    card.id = 'priority-uid-card';
    card.style.cssText = 'width:100%;box-sizing:border-box;margin-top:20px;padding:16px;border:2px solid white;border-radius:12px;color:white;background:#171717;font:14px sans-serif;text-transform:none';
    card.innerHTML = '<h3>Priority UID Filter (experimental)</h3><label><input type="checkbox" id="priority-uid-toggle" disabled> Apply to all third-party apps</label><p>Uses the companion helper. Off by default. Disabling requires a reboot to remove an already-applied filter.</p><button type="button" id="priority-uid-refresh">Refresh status</button><pre id="priority-uid-status" style="white-space:pre-wrap">Checking...</pre>';
    section.appendChild(card);
    const toggle = card.querySelector('#priority-uid-toggle');
    const refresh = card.querySelector('#priority-uid-refresh');
    const output = card.querySelector('#priority-uid-status');
    async function update() {
      toggle.disabled = true;
      try {
        const result = await exec('status');
        output.textContent = result.text;
        toggle.checked = result.text.includes('Configured: enabled');
        toggle.disabled = result.code !== 0 || (!toggle.checked && (!result.text.includes('Kernel support: available') || !result.text.includes('Companion command: available')));
      } catch (error) { output.textContent = error.message; }
    }
    toggle.addEventListener('change', async () => {
      const action = toggle.checked ? 'enable' : 'disable';
      toggle.disabled = true;
      refresh.disabled = true;
      try {
        const result = await exec(action);
        await update();
        output.textContent = result.text + '\n' + output.textContent;
      } catch (error) { output.textContent = error.message; }
      finally { refresh.disabled = false; }
    });
    refresh.addEventListener('click', update);
    update();
  }
  const observer = new MutationObserver(mount);
  function start() { mount(); observer.observe(document.body, {childList:true, subtree:true}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
