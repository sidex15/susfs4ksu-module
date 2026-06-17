import { toast } from 'kernelsu';
import { gsap } from 'gsap';
import { run, versionAtLeast } from '../../utils.js';
import { config } from '../../core/constants.js';

// Unified custom text editor (sus_path, sus_path_loop, sus_maps, sus_mount, try_umount, open_redirect)
export function getCustomEditorFeatures(susfs_features, susfs_versions) {
	const features = [];

	if (susfs_features.includes("CONFIG_KSU_SUSFS_SUS_PATH")) {
		features.push({
			value: "SUS_PATH",
			valueKey: "sus_path_label",
			labelKey: "custom_sus_path_label",
			filePath: `${config}/sus_path.txt`,
			featureName: "SUS_PATH",
		});
	}

	if (versionAtLeast(susfs_versions, 1, 5, 9)) {
		features.push({
			value: "SUS_PATH_LOOP",
			valueKey: "sus_path_loop_label",
			labelKey: "custom_sus_path_loop_label",
			filePath: `${config}/sus_path_loop.txt`,
			featureName: "SUS_PATH_LOOP",
		});
	}

	if (susfs_features.includes("CONFIG_KSU_SUSFS_SUS_MAP")) {
		features.push({
			value: "SUS_MAPS",
			valueKey: "sus_map_label",
			labelKey: "custom_sus_maps_label",
			filePath: `${config}/sus_maps.txt`,
			featureName: "SUS_MAPS",
		});
	}

	if (susfs_features.includes("CONFIG_KSU_SUSFS_SUS_MOUNT") && !versionAtLeast(susfs_versions, 2, 0, 0)) {
		features.push({
			value: "SUS_MOUNT",
			valueKey: "sus_mount_label",
			labelKey: "custom_sus_mount_label",
			filePath: `${config}/sus_mount.txt`,
			featureName: "SUS_MOUNT",
		});
	}

	if (susfs_features.includes("CONFIG_KSU_SUSFS_TRY_UMOUNT") || versionAtLeast(susfs_versions, 2, 0, 0)) {
		features.push({
			value: "TRY_UMOUNT",
			valueKey: "try_umount_label",
			labelKey: "custom_try_umount_label",
			filePath: `${config}/try_umount.txt`,
			featureName: "TRY_UMOUNT",
		});
	}

	if (susfs_features.includes("CONFIG_KSU_SUSFS_OPEN_REDIRECT")) {
		features.push({
			value: "SUS_OPEN_REDIRECT",
			valueKey: "sus_open_redirect_label",
			labelKey: "custom_sus_open_redirect_label",
			filePath: `${config}/sus_open_redirect.txt`,
			featureName: "SUS_OPEN_REDIRECT",
		});
	}

	return features;
}

export async function custom_feature_editor(susfs_features, susfs_versions) {
	const section = document.getElementById("custom_feature_editor_section");
	if (!section) return;

	const featureSelect = document.getElementById("custom_feature_select");
	const featureLabel = document.getElementById("custom_feature_label");
	const loadBtn = document.getElementById("load_custom_feature");
	const editBtn = document.getElementById("edit_custom_feature");
	const saveBtn = document.getElementById("save_custom_feature");
	const textarea = document.getElementById("custom_feature_textarea");
	const mainContainer = document.querySelector('main');

	const availableFeatures = getCustomEditorFeatures(susfs_features, susfs_versions);
	if (availableFeatures.length === 0) {
		section.classList.add("hidden");
		return;
	}

	section.classList.remove("hidden");
	featureSelect.innerHTML = availableFeatures
		.map((feature) => {
			const translatedLabel = window.i18n ? window.i18n.getTranslation(feature.valueKey) : feature.featureName;
			return `<option value="${feature.value}" data-i18n="${feature.valueKey}">${translatedLabel}</option>`;
		})
		.join("");

	const getSelectedFeature = () => {
		const selectedValue = featureSelect.value;
		return availableFeatures.find((feature) => feature.value === selectedValue) || availableFeatures[0];
	};

	const bindSelectedFeature = () => {
		const selected = getSelectedFeature();
		featureLabel.setAttribute("data-i18n", selected.labelKey);
		featureLabel.textContent = window.i18n ? window.i18n.getTranslation(selected.labelKey) : selected.featureName;
		textarea.value = "";

		loadBtn.onclick = async () => {
			const content = await run(`cat ${selected.filePath}`);
			textarea.value = content;
		};

		saveBtn.onclick = async () => {
			const value = textarea.value;
			if (value === '') {
				toast('please press load first!');
				return;
			}
			await run(`echo '${value}' > ${selected.filePath}`);
			toast(`Custom ${selected.featureName} saved!`);
			toast("Reboot to take effect");
		};

		editBtn.onclick = async () => {
			await run(`am start -a android.intent.action.VIEW -t text/plain -d file://${selected.filePath}`);
		};
	};

	featureSelect.onchange = bindSelectedFeature;
	bindSelectedFeature();

	textarea.onfocus = () => {
		mainContainer.style.paddingBottom = '300px';
		textarea.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
	};
	textarea.onblur = () => {
		gsap.to(mainContainer, { duration: 0.5, paddingBottom: '0px', ease: 'power1.out' });
	};
}
