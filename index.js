import { toast } from 'kernelsu';
import Highway from '@dogstudio/highway';
import Fade from './fade.js';
import './space.js';
import './i18n.js';
import { show_contributors, show_translators } from './credits.js';
import { run, catToObject, parseVersion, versionAtLeast } from './src/utils.js';
import { tmpfolder, moddir, config, susfs_bin } from './src/core/constants.js';

// Home page features
import { sus_su_toggle } from './src/features/home/sus-su.js';
import { set_uname } from './src/features/home/uname.js';
import { susfs_log_toggle } from './src/features/home/log.js';
import { susfs_reset } from './src/features/home/reset.js';
import { susfs_export_config, susfs_send_logs } from './src/features/home/export-logs.js';
import { susfs_bin_update } from './src/features/home/bin-update.js';
import { auto_hide_settings } from './src/features/auto-hide/auto-hide.js';
import { susfs_import_config } from './src/features/home/import-config.js';

// Custom page features
import { custom_toggles } from './src/features/custom/toggles.js';
import { custom_rom_settings } from './src/features/custom/rom.js';
import { custom_feature_editor } from './src/features/custom/feature-editor.js';
import { custom_kstat_editor } from './src/features/custom/kstat.js';

// Status page features
import { loadKernelFeatureStatus } from './src/features/status/feature-status.js';

const settings = catToObject(await run(`cat ${config}/config.sh`));

// SUSFS version and kernel variant — parse in JS instead of 4 shell calls
const susfs_version = await run(`grep version= ${moddir}/module.prop | cut -d '=' -f 2`);
const susfs_versions = parseVersion(susfs_version);
document.getElementById("susfs_version").innerHTML = susfs_version;
const susfs_features = await run(`${susfs_bin} show enabled_features`);
const kernel_variant = await run(`${susfs_bin} show variant`);

// SUSFS features
if (versionAtLeast(susfs_versions, 1, 5, 3)) {
	document.getElementById("susfs_kernel_status").classList.remove("hidden");
}

if (await run(`[ -f ${tmpfolder}/logs/susfs_active ] && echo true || echo false`) === "false") {
	document.getElementById("susfs_nos_dialog").showModal();
}

// SUSFS stats and kernel version
const is_log_empty = await run(`[ -s ${tmpfolder}/logs/susfs.log ] && echo false || echo true`);
let susfs_stats = catToObject(await run(`cat ${tmpfolder}/susfs_stats.txt`));
if (is_log_empty === "true") {
	susfs_stats = catToObject(await run(`cat ${tmpfolder}/susfs_stats1.txt`));
	toast("/data/adb/ksu/susfs4ksu/logs/susfs.log is empty/missing.");
	toast("Fallback to stats executed from the module.");
}

document.getElementById("sus_path").innerHTML= susfs_stats.sus_path;
document.getElementById("sus_map").innerHTML= susfs_stats.sus_map;
document.getElementById("sus_mount").innerHTML= susfs_stats.sus_mount;
document.getElementById("try_umount").innerHTML= susfs_stats.try_umount;
document.getElementById("kernel_version").innerHTML= await run(`uname -r + uname -v`);

// Toggles
const is_sus_su_exists = settings.sus_su;
const sus_su_152 = document.getElementById("sus_su_152");
const sus_su_154 = document.getElementById("sus_su_154");
const sus_su_142 = document.getElementById("sus_su_142");
const sus_su_1 = document.getElementById("sus_su_1");

if (is_sus_su_exists === -1) {
	sus_su.removeAttribute("checked");
	sus_su.setAttribute("disabled", "");
	enable_sus_su.removeAttribute("checked");
	enable_sus_su.setAttribute("disabled", "");
} else {
	if (versionAtLeast(susfs_versions, 1, 5, 0) && is_sus_su_exists === 1) {
		sus_su_1.classList.remove("hidden");
	}
	sus_su_142.classList.remove("hidden");
	sus_su_toggle(settings, susfs_versions);
}

// v1.5.4+ auto hide settings
if (versionAtLeast(susfs_versions, 1, 5, 4)) {
	sus_su_154.classList.remove("hidden");
	auto_hide_settings(settings, susfs_features, susfs_versions);
}

//highway transition
const H = new Highway.Core({
	transitions: {
		default: Fade
	}
});

H.on('NAVIGATE_IN', async ({ to, from, trigger, location }) => {
	// Apply translations to new page content
	var currentPath = window.location.pathname;
    if (window.i18n) {
        // Re-apply translations to the new DOM elements
        const currentLang = window.i18n.getCurrentLanguage();
        window.i18n.applyTranslationsToNewContent(to.view);
    }
    // Add specific script initializations here
    if (currentPath === '/credits.html') {
		show_contributors();
		show_translators();
	}
});

// Re-initialize after page transition
H.on('NAVIGATE_END', async ({ to, from, trigger, location }) => {
	const settings = catToObject(await run(`cat ${config}/config.sh`));
	const currentPath = window.location.pathname;

	if (currentPath === '/index.html') {
		susfs_reset();
		susfs_export_config();
		susfs_send_logs();
		susfs_import_config(susfs_versions, susfs_features);
		set_uname(settings);
		susfs_log_toggle(settings);
		if (versionAtLeast(susfs_versions, 1, 5, 4)) auto_hide_settings(settings, susfs_features, susfs_versions);
		sus_su_toggle(settings, susfs_versions);
	} else if (currentPath === '/custom.html') {
		custom_toggles(settings, susfs_versions);
		custom_rom_settings(settings);
		custom_feature_editor(susfs_features, susfs_versions);
		custom_kstat_editor();
	} else if (currentPath === '/status.html') {
		loadKernelFeatureStatus(susfs_features, susfs_versions);
	}
});

// Initialize the page
susfs_send_logs();
susfs_export_config();
susfs_reset();
susfs_import_config(susfs_versions, susfs_features);
set_uname(settings);
susfs_log_toggle(settings);

// Susfs binary check and update
if (settings.disable_webui_bin_update==false) {
	const susfs_check=await run (`sh ${moddir}/susfs-bin-check.sh ${susfs_versions.main.toString()} ${susfs_versions.sub.toString()} ${susfs_versions.patch.toString()} ${kernel_variant.toLowerCase()}`)
	if (susfs_check=="mismatch"){
		susfs_bin_update(susfs_versions, kernel_variant);
	}

}
