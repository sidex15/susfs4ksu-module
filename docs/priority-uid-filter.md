# Experimental Priority UID Filter

Run the manual Build experimental Priority UID Filter module workflow on v1.5.2+.
Its artifact contains an installable module ZIP with a separately compiled companion helper, a home-page WebUI toggle and a boot-completed hook.
The regular build is unchanged and does not include the hook or bundled companion.

The companion source is pinned to midori01/susfs4ksu revision 65c44a650f0b0d8c79a517fb1a49c24a7cb22b23, a GitHub source copy, not a verified latest GitLab revision.
The original universal helper and updater are retained.
The companion is packaged at the module root so the existing installer does not delete it with tools/.

Install the nested module ZIP, reboot, then open the module WebUI.
The toggle defaults off and persists priority_uid_filter in config.sh.
Enabling applies comma-separated third-party packages immediately and on subsequent boots.
Package installations/removals are refreshed on reboot or by disabling then enabling the toggle; no package-change watcher is installed.
Disabling only prevents subsequent applications: reboot to remove an existing kernel filter. Empty-string clearing is not attempted.

Status reports capability and the last application result for the current boot, not independently measured kernel state or detector success.
Logs: /data/adb/susfs4ksu/priority_uid_filter.log
Manual status: sh /data/adb/modules/susfs4ksu/priority-uid-filter.sh status
The stock Reset All Config action may not immediately clear an already-applied filter; reboot after resetting.
Other modules applying their own priority filters can change kernel state independently.
