import { versionAtLeast } from '../../utils.js';

// Load kernel feature status
export async function loadKernelFeatureStatus(susfs_features, susfs_versions) {
  const features = [
    { id: 'status_sus_path', config: 'CONFIG_KSU_SUSFS_SUS_PATH' },
	{ id: 'status_sus_map', config: 'CONFIG_KSU_SUSFS_SUS_MAP' },
    { id: 'status_sus_mount', config: 'CONFIG_KSU_SUSFS_SUS_MOUNT' },
    { id: 'status_auto_default_mount', config: 'CONFIG_KSU_SUSFS_AUTO_ADD_SUS_KSU_DEFAULT_MOUNT' },
    { id: 'status_auto_bind_mount', config: 'CONFIG_KSU_SUSFS_AUTO_ADD_SUS_BIND_MOUNT' },
    { id: 'status_sus_kstat', config: 'CONFIG_KSU_SUSFS_SUS_KSTAT' },
    { id: 'status_try_umount', config: 'CONFIG_KSU_SUSFS_TRY_UMOUNT' },
    { id: 'status_auto_try_umount_bind', config: 'CONFIG_KSU_SUSFS_AUTO_ADD_TRY_UMOUNT_FOR_BIND_MOUNT' },
    { id: 'status_spoof_uname', config: 'CONFIG_KSU_SUSFS_SPOOF_UNAME' },
    { id: 'status_enable_log', config: 'CONFIG_KSU_SUSFS_ENABLE_LOG' },
    { id: 'status_hide_symbols', config: 'CONFIG_KSU_SUSFS_HIDE_KSU_SUSFS_SYMBOLS' },
    { id: 'status_spoof_cmdline', config: 'CONFIG_KSU_SUSFS_SPOOF_CMDLINE_OR_BOOTCONFIG' },
    { id: 'status_open_redirect', config: 'CONFIG_KSU_SUSFS_OPEN_REDIRECT' },
    { id: 'status_magic_mount', config: 'CONFIG_KSU_SUSFS_HAS_MAGIC_MOUNT' },
	{ id: 'status_overlayfs_auto_kstat', config: 'CONFIG_KSU_SUSFS_SUS_OVERLAYFS' }
  ];

  const deprecated_features = [
	{ id: 'status_overlayfs_auto_kstat', config: 'CONFIG_KSU_SUSFS_SUS_OVERLAYFS', version_main: 1, version_sub: 5, version_patch: 8 },
	{ id: 'status_magic_mount', config: 'CONFIG_KSU_SUSFS_HAS_MAGIC_MOUNT',  version_main: 1, version_sub: 5, version_patch: 11 },
	{ id: 'status_auto_try_umount_bind', config: 'CONFIG_KSU_SUSFS_AUTO_ADD_TRY_UMOUNT_FOR_BIND_MOUNT',  version_main: 2, version_sub: 0, version_patch: 0 },
	{ id: 'status_auto_default_mount', config: 'CONFIG_KSU_SUSFS_AUTO_ADD_SUS_KSU_DEFAULT_MOUNT', version_main: 2, version_sub: 0, version_patch: 0 },
	{ id: 'status_auto_bind_mount', config: 'CONFIG_KSU_SUSFS_AUTO_ADD_SUS_BIND_MOUNT', version_main: 2, version_sub: 0, version_patch: 0 },
	{ id: 'status_try_umount', config: 'CONFIG_KSU_SUSFS_TRY_UMOUNT', version_main: 2, version_sub: 0, version_patch: 0 },
  ];

  for (const feature of features) {
    try {
      // Check if the kernel feature is enabled
      const result = susfs_features.includes(feature.config);
      const statusElement = document.getElementById(feature.id);

      if (statusElement) {
        const span = statusElement.querySelector('span');
        if (result) {
          statusElement.className = 'badge badge-sm badge-success text-sm ml-4';
          span.setAttribute('data-i18n', 'enabled_label');
          span.textContent = window.i18n ? window.i18n.getTranslation('enabled_label') : 'Enabled';
        } else {
			if (deprecated_features.some(df => df.id === feature.id && versionAtLeast(susfs_versions, df.version_main, df.version_sub, df.version_patch))) {
				statusElement.className = 'badge badge-sm badge-secondary text-sm ml-4';
				span.setAttribute('data-i18n', 'deprecated_label');
				span.textContent = window.i18n ? window.i18n.getTranslation('deprecated_label') : 'Deprecated';
			} else {
				statusElement.className = 'badge badge-sm badge-error text-sm ml-4';
				span.setAttribute('data-i18n', 'disabled_label');
				span.textContent = window.i18n ? window.i18n.getTranslation('disabled_label') : 'Disabled';
			}
        }
      }
    } catch (error) {
      // If we can't determine the status, mark as unknown
      const statusElement = document.getElementById(feature.id);
      if (statusElement) {
        const span = statusElement.querySelector('span');
        statusElement.className = 'badge badge-sm badge-warning text-sm ml-4';
        span.setAttribute('data-i18n', 'unknown_label');
        span.textContent = window.i18n ? window.i18n.getTranslation('unknown_label') : 'Unknown';
      }
    }
  }
}
