(() => {
  if (window.susfsPriorityUIStarted) return;
  window.susfsPriorityUIStarted = true;
  const script = '/data/adb/modules/susfs4ksu/priority-uid-filter.sh';
  const bound = new WeakSet();
  let serial = 0;
  function exec(action) {
    return new Promise((resolve, reject) => {
      if (!window.ksu || typeof window.ksu.exec !== 'function') {
        reject(new Error('KernelSU WebUI root bridge unavailable'));
        return;
      }
      const name = 'susfsPriorityCallback' + (++serial);
      const timer = setTimeout(() => { delete window[name]; reject(new Error('Operation timed out; reopen this page to refresh status')); }, 60000);
      window[name] = (code, stdout, stderr) => {
        clearTimeout(timer);
        delete window[name];
        resolve({code: Number(code), text: String(stdout || '') + String(stderr || '')});
      };
      try { window.ksu.exec('sh ' + script + ' ' + action, '{}', name); }
      catch (error) { clearTimeout(timer); delete window[name]; reject(error); }
    });
  }
  function notify(text) {
    if (window.ksu && typeof window.ksu.toast === 'function') window.ksu.toast(text);
    else window.alert(text);
  }
  async function status() {
    const result = await exec('status');
    if (result.code !== 0) throw new Error(result.text || 'Cannot read UID filter status');
    return {
      configured: /^Configured: enabled$/m.test(result.text),
      kernel: /^Kernel support: available$/m.test(result.text),
      helper: /^Companion command: available$/m.test(result.text),
      details: result.text
    };
  }
  function custom(view) {
    const group = view.querySelector('section .stats');
    if (!group) return;
    let row = group.querySelector('.uid-priority-control');
    if (!row) {
      row = document.createElement('div');
      row.className = 'form-control uid-priority-control';
      row.innerHTML = '<label class="label cursor-pointer"><span class="text-white text-base">UID Priority Filter</span><input type="checkbox" class="toggle toggle-md toggle-primary" aria-label="UID Priority Filter" disabled></label>';
      group.appendChild(row);
    }
    const toggle = row.querySelector('input');
    if (bound.has(toggle)) return;
    bound.add(toggle);
    async function refresh() {
      const state = await status();
      toggle.checked = state.configured;
      toggle.disabled = !state.configured && !(state.kernel && state.helper);
      toggle.title = state.details;
    }
    toggle.addEventListener('change', async () => {
      const action = toggle.checked ? 'enable' : 'disable';
      toggle.disabled = true;
      try {
        const result = await exec(action);
        await refresh();
        if (result.code !== 0) notify(result.text || 'UID filter application failed');
        else notify(action === 'enable' ? 'UID Priority Filter applied' : 'UID Priority Filter disabled for future boots. Reboot to remove the applied filter.');
      } catch (error) {
        toggle.disabled = true;
        toggle.title = error.message;
        notify(error.message);
      }
    });
    refresh().catch(error => { toggle.disabled = true; toggle.title = error.message; });
  }
  function features(view) {
    const anchor = view.querySelector('#status_sus_path');
    if (!anchor) return;
    const group = anchor.parentElement.parentElement;
    let row = group.querySelector('.uid-priority-feature');
    if (!row) {
      row = document.createElement('div');
      row.className = 'flex justify-between items-center py-2 px-2 uid-priority-feature';
      row.innerHTML = '<span class="text-white text-base">Priority UID Filter</span><div class="badge badge-warning text-sm ml-4">Unknown</div>';
      group.appendChild(row);
    }
    if (bound.has(row)) return;
    bound.add(row);
    const badge = row.querySelector('.badge');
    status().then(state => {
      badge.textContent = state.kernel ? 'Enabled' : 'Disabled';
      badge.className = 'badge ' + (state.kernel ? 'badge-success' : 'badge-error') + ' text-sm ml-4';
      badge.title = state.details;
    }).catch(error => { badge.textContent = 'Unknown'; badge.title = error.message; });
  }
  function mount() {
    document.querySelectorAll('[id^="status_"]').forEach(badge => {
      const row = badge.parentElement;
      if (!row || !row.querySelector('span')) return;
      const deprecated = /deprecated/i.test(badge.textContent) || !!badge.querySelector('[data-i18n="deprecated_label"]');
      if (deprecated && !row.hidden) {
        row.hidden = true;
        row.style.setProperty('display', 'none', 'important');
        row.dataset.priorityDeprecated = '1';
      } else if (!deprecated && row.dataset.priorityDeprecated === '1') {
        row.hidden = false;
        row.style.removeProperty('display');
        delete row.dataset.priorityDeprecated;
      }
    });
    document.querySelectorAll('[data-router-view]').forEach(view => {
      if (view.getAttribute('data-router-view') === 'custom') custom(view);
      if (view.querySelector('#status_sus_path')) features(view);
    });
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
