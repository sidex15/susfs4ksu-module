(() => {
  if (window.susfsPriorityUIStarted) return;
  window.susfsPriorityUIStarted = true;
  const script = '/data/adb/modules/susfs4ksu/priority-uid-filter.sh';
  const bound = new WeakSet();
  let serial = 0;
  function exec(action) {
    return new Promise((resolve, reject) => {
      if (!window.ksu || typeof window.ksu.exec !== 'function') { reject(new Error('KernelSU WebUI root bridge unavailable')); return; }
      const name = 'susfsPriorityCallback' + (++serial);
      const timer = setTimeout(() => { delete window[name]; reject(new Error('Operation timed out; reopen this page to refresh status')); }, 60000);
      window[name] = (code, stdout, stderr) => { clearTimeout(timer); delete window[name]; resolve({code: Number(code), text: String(stdout || '') + String(stderr || '')}); };
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
    return {configured: /^Configured: enabled$/m.test(result.text), kernel: /^Kernel support: available$/m.test(result.text), helper: /^Companion command: available$/m.test(result.text), details: result.text};
  }
  function custom(view) {
    const group = view.querySelector('section .stats');
    if (!group) return;
    let row = group.querySelector('.uid-priority-control');
    if (!row) {
      row = document.createElement('div'); row.className = 'form-control uid-priority-control';
      row.innerHTML = '<label class="label cursor-pointer"><span class="text-white text-base">UID Priority Filter</span><input type="checkbox" class="toggle toggle-md toggle-primary" aria-label="UID Priority Filter" disabled></label>';
      group.appendChild(row);
    }
    const toggle = row.querySelector('input');
    if (bound.has(toggle)) return;
    bound.add(toggle);
    async function refresh() { const state = await status(); toggle.checked = state.configured; toggle.disabled = !state.configured && !(state.kernel && state.helper); toggle.title = state.details; }
    toggle.addEventListener('change', async () => {
      const action = toggle.checked ? 'enable' : 'disable'; toggle.disabled = true;
      try {
        const result = await exec(action); await refresh();
        if (result.code !== 0) notify(result.text || 'UID filter application failed');
        else notify(action === 'enable' ? 'UID Priority Filter applied' : 'UID Priority Filter disabled for future boots. Reboot to remove the applied filter.');
      } catch (error) { toggle.disabled = true; toggle.title = error.message; notify(error.message); }
    });
    refresh().catch(error => { toggle.disabled = true; toggle.title = error.message; });
  }
  function features(view) {
    const anchor = view.querySelector('#status_sus_path');
    if (!anchor) return;
    const group = anchor.parentElement.parentElement;
    let row = group.querySelector('.uid-priority-feature');
    if (!row) {
      row = document.createElement('div'); row.className = 'flex justify-between items-center py-2 px-2 uid-priority-feature';
      row.innerHTML = '<span class="text-white text-base">Priority UID Filter</span><div class="badge badge-warning text-sm ml-4">Unknown</div>'; group.appendChild(row);
    }
    if (bound.has(row)) return;
    bound.add(row);
    const badge = row.querySelector('.badge');
    status().then(state => { badge.textContent = state.kernel ? 'Enabled' : 'Disabled'; badge.className = 'badge ' + (state.kernel ? 'badge-success' : 'badge-error') + ' text-sm ml-4'; badge.title = state.details; }).catch(error => { badge.textContent = 'Unknown'; badge.title = error.message; });
  }
  function recommendations(view) {
    if (view.querySelector('#recommended-umount-settings')) return;
    const logs = view.querySelector('#susfs_log');
    const panel = logs && logs.closest('.stats');
    if (!panel || !panel.parentElement) return;
    const card = document.createElement('aside');
    card.id = 'recommended-umount-settings';
    card.className = 'stats flex flex-col divide-x-0 divide-y-0 bg-cyan-100/20 dark:bg-black/20 mt-5 border-2 p-4 border-white backdrop-blur-[2.5px] min-w-full sm:min-w-[400px]';
    card.setAttribute('aria-labelledby', 'recommended-umount-heading');
    card.style.cssText = 'white-space:normal;overflow-wrap:anywhere;box-sizing:border-box;';
    card.innerHTML = '<h2 id="recommended-umount-heading" class="text-white text-xl mb-3">Recommended Umount settings</h2><p class="text-white text-base font-amongus2" style="line-height:1.6;white-space:normal;">App not working? Turn off &quot;Umount modules&quot; for that app in KernelSU Manager, or disable &quot;Umount modules by default&quot;.</p><div class="flex justify-center"><button type="button" class="btn btn-md btn-outline text-base border-white mt-2 text-white font-amongus2" aria-haspopup="dialog" aria-controls="recommended-umount-dialog">What does it mean?</button></div>';
    panel.parentElement.insertBefore(card, panel);
    const button = card.querySelector('button');
    button.addEventListener('click', () => {
      let dialog = document.getElementById('recommended-umount-dialog');
      if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'recommended-umount-dialog';
        dialog.className = 'font-amongus2 font-bold';
        dialog.setAttribute('aria-labelledby', 'recommended-umount-dialog-heading');
        dialog.style.cssText = 'position:fixed;inset:0;margin:auto;width:calc(100% - 32px);max-width:520px;max-height:85vh;padding:0;border:2px solid white;border-radius:16px;background:#111;color:white;z-index:2147483647;overflow:hidden;text-transform:none;box-sizing:border-box;';
        dialog.innerHTML = '<div style="display:flex;flex-direction:column;max-height:calc(85vh - 4px);"><h2 id="recommended-umount-dialog-heading" class="text-xl" style="padding:16px;margin:0;flex-shrink:0;">What does it mean?</h2><div class="text-base" style="padding:0 16px 16px;overflow-y:auto;overscroll-behavior:contain;line-height:1.6;white-space:normal;overflow-wrap:anywhere;">' +
          '<p style="margin-bottom:12px;">If an app crashes, refuses to open, or stops working with module unmounting enabled, try one of these compatibility options:</p>' +
          '<ol style="list-style:decimal;padding-left:22px;margin-bottom:12px;"><li>For the affected app only (preferred): open its App Profile in KernelSU Manager, select a custom profile, and turn off &quot;Umount modules&quot;.</li><li>For all apps using the default profile: open KernelSU Manager settings and turn off &quot;Umount modules by default&quot;.</li></ol>' +
          '<p style="margin-bottom:12px;">Force-stop and reopen the affected app after changing its profile. Reboot if the change does not take effect.</p>' +
          '<p style="margin-bottom:12px;color:#fcd34d;">Compatibility trade-off: disabling module unmounting can expose module mounts or modifications to apps. Prefer a per-app exception when possible. This is a troubleshooting option, not a guarantee that every app will work.</p>' +
          '<p style="margin-bottom:12px;">Keep &quot;Hide SUS mounts for all/non-su processes&quot; enabled, with &quot;Turn off at boot-completed&quot; unchecked. That SUSFS control is separate from KernelSU app-profile unmounting.</p>' +
          '<p style="border:1px solid #94a3b8;border-radius:8px;padding:10px;color:#cbd5e1;">Manager setting status: Not available in this WebUI. Check KernelSU Manager for the current value. No setting has been changed by this card.</p></div><form method="dialog" style="padding:12px 16px;border-top:1px solid #475569;flex-shrink:0;display:flex;justify-content:center;"><button type="submit" class="btn btn-md btn-outline text-base border-white text-white font-amongus2" autofocus>Close</button></form></div>';
        document.body.appendChild(dialog);
      }
      if (!dialog.open) dialog.showModal();
    });
  }
  function mount() {
    document.querySelectorAll('[id^="status_"]').forEach(badge => {
      const row = badge.parentElement;
      if (!row || !row.querySelector('span')) return;
      const deprecated = /deprecated/i.test(badge.textContent) || !!badge.querySelector('[data-i18n="deprecated_label"]');
      if (deprecated && !row.hidden) { row.hidden = true; row.style.setProperty('display', 'none', 'important'); row.dataset.priorityDeprecated = '1'; }
      else if (!deprecated && row.dataset.priorityDeprecated === '1') { row.hidden = false; row.style.removeProperty('display'); delete row.dataset.priorityDeprecated; }
    });
    document.querySelectorAll('[data-router-view]').forEach(view => {
      if (view.getAttribute('data-router-view') === 'home') recommendations(view);
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
