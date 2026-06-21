import { run, versionAtLeast, setupBooleanToggle } from '../../utils.js';
import { config, susfs_bin } from '../../core/constants.js';

// Custom toggles
export async function custom_toggles(settings, susfs_versions) {
	const custom_settings = settings;
	const emulate_vold_app_data_sus_path_loop_checkbox = document.getElementById("emulate_vold_app_data_sus_path_loop_checkbox");
	const emulate_vold_app_data_sus_path_loop = document.getElementById("emulate_vold_app_data_sus_path_loop");
	let is_avc_log_spoofing_enabled = true;

	// Check AVC log spoofing support
	try {
		await run(`${susfs_bin} enable_avc_log_spoofing ${custom_settings.avc_log_spoofing}`);
	} catch (error) {
		console.error("Error enabling AVC log spoofing:", error);
		is_avc_log_spoofing_enabled = false;
	}

	// Simple boolean toggles — set initial state and wire up handlers
	const simpleToggles = [
		{ id: "hide_gapps", key: "hide_gapps" },
		{ id: "hide_revanced", key: "hide_revanced" },
		{ id: "spoof_cmdline", key: "spoof_cmdline" },
		{ id: "hide_ksu_loop", key: "hide_loops" },
		{ id: "force_hide_lsposed", key: "force_hide_lsposed" },
	];

	for (const { id, key } of simpleToggles) {
		const el = document.getElementById(id);
		console.log(key, custom_settings[key])
		el.checked = custom_settings[key] === 1 ? "checked" : false;
		setupBooleanToggle(el, custom_settings, key, `${config}/config.sh`);
	}

	// Emulate vold app data — disabled on older versions
	const emulate_vold_app_data = document.getElementById("emulate_vold_app_data");
	if (!versionAtLeast(susfs_versions, 1, 5, 9)) {
		emulate_vold_app_data.checked = false;
		emulate_vold_app_data.disabled = true;
	} else {
		emulate_vold_app_data.checked = custom_settings.emulate_vold_app_data >= 1 ? "checked" : false;
		if (custom_settings.emulate_vold_app_data >= 1 && versionAtLeast(susfs_versions, 2, 0, 0)) {
			emulate_vold_app_data_sus_path_loop_checkbox.classList.remove("hidden");
			emulate_vold_app_data_sus_path_loop.checked = custom_settings.emulate_vold_app_data === 2 ? "checked" : false;
		}
		setupBooleanToggle(emulate_vold_app_data, custom_settings, "emulate_vold_app_data", `${config}/config.sh`, {
			onMessage: "Reboot to take effect",
			offMessage: "Reboot to take effect",
			onAction: () => {
				if (versionAtLeast(susfs_versions, 2, 0, 0)) {
					emulate_vold_app_data_sus_path_loop_checkbox.classList.remove("hidden");
					emulate_vold_app_data_sus_path_loop.checked = custom_settings.emulate_vold_app_data === 2 ? "checked" : false;
				}
			},
			offAction: () => {
				if (versionAtLeast(susfs_versions, 2, 0, 0)) {
					emulate_vold_app_data_sus_path_loop_checkbox.classList.add("hidden");
				}
			},
		});
		if (versionAtLeast(susfs_versions, 2, 0, 0)) {
		setupBooleanToggle(emulate_vold_app_data_sus_path_loop, custom_settings, "emulate_vold_app_data", `${config}/config.sh`, { onstate: 2, offstate: 1 });
		}
	}

	// AVC log spoofing — disabled on older versions or unsupported kernels
	const avc_log_spoofing = document.getElementById("avc_log_spoofing");
	if (!versionAtLeast(susfs_versions, 1, 5, 9) || !is_avc_log_spoofing_enabled) {
		avc_log_spoofing.disabled = true;
		avc_log_spoofing.checked = false;
	} else {
		avc_log_spoofing.checked = custom_settings.avc_log_spoofing === 1 ? "checked" : false;
		setupBooleanToggle(avc_log_spoofing, custom_settings, "avc_log_spoofing", `${config}/config.sh`, {
			onMessage: "AVC Log Spoofing on! no need to reboot",
			offMessage: "AVC Log Spoofing off! no need to reboot",
			onAction: () => run(`${susfs_bin} enable_avc_log_spoofing 1`),
			offAction: () => run(`${susfs_bin} enable_avc_log_spoofing 0`),
		});
	}
}
