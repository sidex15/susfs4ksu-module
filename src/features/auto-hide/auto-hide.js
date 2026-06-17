import { toast } from 'kernelsu';
import { run, versionAtLeast } from '../../utils.js';
import { config, susfs_bin } from '../../core/constants.js';

//Auto hide settings
export async function auto_hide_settings(settings, susfs_features, susfs_versions) {
	const auto_mount = document.getElementById("auto_mount");
	const auto_bind = document.getElementById("auto_bind");
	const auto_umount_bind = document.getElementById("auto_umount_bind");
	const auto_try_umount = document.getElementById("auto_try_umount");
	const skip_legit_mounts = document.getElementById("skip_legit_mounts");
	const try_umount_zygote = document.getElementById("try_umount_zygote");
	const hide_sus_mnts_for_all_or_non_su_procs = document.getElementById("hide_sus_mnts_for_all_or_non_su_procs");
	const turn_off_after_boot_completed = document.getElementById("turn_off_after_boot_completed");
	const umount_for_zygote_iso_service = document.getElementById("umount_for_zygote_iso_service");
	const auto_mount_toggle = document.getElementById("auto_mount_toggle");
	const auto_bind_toggle = document.getElementById("auto_bind_toggle");
	const auto_umount_bind_toggle = document.getElementById("auto_umount_bind_toggle");
	const auto_try_umount_toggle = document.getElementById("auto_try_umount_toggle");
	const skip_legit_mounts_checkbox = document.getElementById("skip_legit_mounts_checkbox");
	const try_umount_zygote_toggle = document.getElementById("try_umount_zygote_toggle");
	const hide_sus_mnts_for_all_or_non_su_procs_toggle = document.getElementById("hide_sus_mnts_for_all_or_non_su_procs_toggle");
	const turn_off_after_boot_completed_checkbox = document.getElementById("turn_off_after_boot_completed_checkbox");
	const umount_for_zygote_iso_service_toggle = document.getElementById("umount_for_zygote_iso_service_toggle");
	var is_no_auto_mount = await run(`[ -f data/adb/susfs_no_auto_add_sus_ksu_default_mount ] && echo true || echo false`);
	var is_no_auto_bind = await run(`[ -f data/adb/susfs_no_auto_add_sus_bind_mount ] && echo true || echo false`);
	var is_no_auto_umount_bind = await run(`[ -f data/adb/susfs_no_auto_add_try_umount_for_bind_mount ] && echo true || echo false`);
	var is_try_umount_zygote = await run(`[ -f data/adb/susfs_umount_for_zygote_system_process ] && echo true || echo false`);
	var custom_settings = settings;

	if(is_no_auto_mount=="true"){
		auto_mount.checked=false;
	}
	if(is_no_auto_bind=="true"){
		auto_bind.checked=false;
	}
	if(is_no_auto_umount_bind=="true"){
		auto_umount_bind.checked=false;
	}
	else{
		auto_umount_bind.checked="checked";
		if (custom_settings.auto_try_umount==true && susfs_features.includes("CONFIG_KSU_SUSFS_AUTO_ADD_TRY_UMOUNT_FOR_BIND_MOUNT")){
			await run(`sed -i 's/auto_try_umount=.*/auto_try_umount=0/' ${config}/config.sh`);
			auto_try_umount.checked=false;
			custom_settings.auto_try_umount=false;
		}
	}
	if(custom_settings.auto_try_umount==true){
		auto_try_umount.checked="checked";
		if (is_no_auto_umount_bind=="false" && susfs_features.includes("CONFIG_KSU_SUSFS_AUTO_ADD_TRY_UMOUNT_FOR_BIND_MOUNT")){
			await run(`touch data/adb/susfs_no_auto_add_try_umount_for_bind_mount`);
			is_no_auto_umount_bind="true";
			auto_umount_bind.checked=false;
		}
		skip_legit_mounts_checkbox.classList.remove("hidden");
	}
	else{
		auto_try_umount.checked=false;
	}
	if(custom_settings.skip_legit_mounts==true){
		skip_legit_mounts.checked="checked";
	}
	else{
		skip_legit_mounts.checked=false;
	}
	if(is_try_umount_zygote=="false"){
		try_umount_zygote.checked=false;
	}
	if (versionAtLeast(susfs_versions, 1, 5, 7)) {
		hide_sus_mnts_for_all_or_non_su_procs_toggle.classList.remove("hidden");
		if (custom_settings.hide_sus_mnts_for_all_or_non_su_procs==1){
			turn_off_after_boot_completed_checkbox.classList.remove("hidden");
			hide_sus_mnts_for_all_or_non_su_procs.checked="checked";
			turn_off_after_boot_completed.checked=false;
		}
		else if (custom_settings.hide_sus_mnts_for_all_or_non_su_procs==2){
			turn_off_after_boot_completed_checkbox.classList.remove("hidden");
			hide_sus_mnts_for_all_or_non_su_procs.checked="checked";
			turn_off_after_boot_completed.checked="checked";
		}
		else{
			hide_sus_mnts_for_all_or_non_su_procs.checked=false;
			turn_off_after_boot_completed.checked=false;

		}
	}
	else{
		hide_sus_mnts_for_all_or_non_su_procs.checked=false;
	}
	if (versionAtLeast(susfs_versions, 1, 5, 8) && (await run(`${susfs_bin} umount_for_zygote_iso_service ${custom_settings.umount_for_zygote_iso_service} > /dev/null 2>&1 && echo true || echo false`)) === "true") {
		umount_for_zygote_iso_service_toggle.classList.remove("hidden");
		if (custom_settings.umount_for_zygote_iso_service==true){
			umount_for_zygote_iso_service.checked="checked";
		}
		else{
			umount_for_zygote_iso_service.checked=false;
		}
	}
	else{
		umount_for_zygote_iso_service.checked=false;
	}
	if(susfs_features.includes("CONFIG_KSU_SUSFS_AUTO_ADD_SUS_KSU_DEFAULT_MOUNT")){
		auto_mount_toggle.classList.remove("hidden");
	}
	if(susfs_features.includes("CONFIG_KSU_SUSFS_AUTO_ADD_SUS_BIND_MOUNT")){
		auto_bind_toggle.classList.remove("hidden");
	}
	if(susfs_features.includes("CONFIG_KSU_SUSFS_AUTO_ADD_TRY_UMOUNT_FOR_BIND_MOUNT")){
		auto_umount_bind_toggle.classList.remove("hidden");
	}
	if(susfs_features.includes("CONFIG_KSU_SUSFS_TRY_UMOUNT")){
		try_umount_zygote_toggle.classList.remove("hidden");
	}
	if (versionAtLeast(susfs_versions, 1, 5, 5)) {
		auto_try_umount_toggle.classList.remove("hidden");
	}

	auto_mount.addEventListener("click",async function(){
		is_no_auto_mount = await run(`[ -f data/adb/susfs_no_auto_add_sus_ksu_default_mount ] && echo true || echo false`);
		if (is_no_auto_mount=="true"){
			await run(`rm -f data/adb/susfs_no_auto_add_sus_ksu_default_mount`);
			is_no_auto_mount="false";
			toast("Reboot to take effect");
		}
		else{
			await run(`touch data/adb/susfs_no_auto_add_sus_ksu_default_mount`);
			is_no_auto_mount="true";
			toast("Reboot to take effect");
		}
	});

	auto_bind.addEventListener("click",async function(){
		is_no_auto_bind = await run(`[ -f data/adb/susfs_no_auto_add_sus_bind_mount ] && echo true || echo false`);
		if (is_no_auto_bind=="true"){
			await run(`rm -f data/adb/susfs_no_auto_add_sus_bind_mount`);
			is_no_auto_bind="false";
			toast("Reboot to take effect");
		}
		else{
			await run(`touch data/adb/susfs_no_auto_add_sus_bind_mount`);
			is_no_auto_bind="true";
			toast("Reboot to take effect");
		}
	});

	auto_umount_bind.addEventListener("click",async function(){
		is_no_auto_umount_bind = await run(`[ -f data/adb/susfs_no_auto_add_try_umount_for_bind_mount ] && echo true || echo false`);
		if (is_no_auto_umount_bind=="true"){
			await run(`rm -f data/adb/susfs_no_auto_add_try_umount_for_bind_mount`);
			is_no_auto_umount_bind="false";
			// disable auto try umount (userspace) if it's enabled
			if (custom_settings.auto_try_umount==1){
				await run(`sed -i 's/auto_try_umount=.*/auto_try_umount=0/' ${config}/config.sh`);
				auto_try_umount.checked=false;
				custom_settings.auto_try_umount=false;
				toast("Auto try umount (userspace) disabled as auto umount for bind mount is enabled");
			}
			toast("Reboot to take effect");
		}
		else{
			await run(`touch data/adb/susfs_no_auto_add_try_umount_for_bind_mount`);
			is_no_auto_umount_bind="true";
			toast("Reboot to take effect");
		}
	});

	auto_try_umount.addEventListener("click",async function(){
		if (custom_settings.auto_try_umount==1){
			await run(`sed -i 's/auto_try_umount=.*/auto_try_umount=0/' ${config}/config.sh`);
			custom_settings.auto_try_umount=0;
			auto_try_umount.checked=false;
			skip_legit_mounts_checkbox.classList.add("hidden");
			toast("Reboot to take effect");
		}
		else{
			await run(`sed -i 's/auto_try_umount=.*/auto_try_umount=1/' ${config}/config.sh`);
			custom_settings.auto_try_umount=1;
			skip_legit_mounts_checkbox.classList.remove("hidden");
			// disable auto umount for bind mount if it's enabled
			if (susfs_features.includes("CONFIG_KSU_SUSFS_AUTO_ADD_TRY_UMOUNT_FOR_BIND_MOUNT") && is_no_auto_umount_bind=="false"){
				await run(`touch data/adb/susfs_no_auto_add_try_umount_for_bind_mount`);
				is_no_auto_umount_bind="true";
				auto_umount_bind.checked=false;
				toast("Auto umount for bind mount disabled as auto try umount (userspace) is enabled");
			}
			toast("Reboot to take effect");
		}
	});

	skip_legit_mounts_checkbox.addEventListener("click",async function(){
		if (custom_settings.skip_legit_mounts==true){
			await run(`sed -i 's/skip_legit_mounts=.*/skip_legit_mounts=0/' ${config}/config.sh`);
			custom_settings.skip_legit_mounts=false;
			toast("Reboot to take effect");
		}
		else{
			await run(`sed -i 's/skip_legit_mounts=.*/skip_legit_mounts=1/' ${config}/config.sh`);
			custom_settings.skip_legit_mounts=true;
			toast("Reboot to take effect");
		}
	});

	try_umount_zygote.addEventListener("click",async function(){
		is_try_umount_zygote = await run(`[ -f data/adb/susfs_umount_for_zygote_system_process ] && echo true || echo false`);
		if (is_try_umount_zygote=="true"){
			await run(`rm -f data/adb/susfs_umount_for_zygote_system_process`);
			is_try_umount_zygote="false";
			toast("Reboot to take effect");
		}
		else{
			await run(`touch data/adb/susfs_umount_for_zygote_system_process`);
			is_try_umount_zygote="true";
			toast("Reboot to take effect");
		}
	});

	umount_for_zygote_iso_service.addEventListener("click",async function(){
		if (custom_settings.umount_for_zygote_iso_service==true){
			await run(`sed -i 's/umount_for_zygote_iso_service=.*/umount_for_zygote_iso_service=0/' ${config}/config.sh`);
			await run(`${susfs_bin} umount_for_zygote_iso_service 0`);
			custom_settings.umount_for_zygote_iso_service=false;
			toast("Try umount for zygote isolation service disabled! No need to reboot");
		}
		else{
			await run(`sed -i 's/umount_for_zygote_iso_service=.*/umount_for_zygote_iso_service=1/' ${config}/config.sh`);
			await run(`${susfs_bin} umount_for_zygote_iso_service 1`);
			custom_settings.umount_for_zygote_iso_service=true;
			toast("Try umount for zygote isolation service enabled! No need to reboot");
		}
	});

	hide_sus_mnts_for_all_or_non_su_procs.addEventListener("click",async function(){
		if (custom_settings.hide_sus_mnts_for_all_or_non_su_procs>=1){
			await run(`sed -i 's/hide_sus_mnts_for_all_or_non_su_procs=.*/hide_sus_mnts_for_all_or_non_su_procs=0/' ${config}/config.sh`);
			await run(`${susfs_bin} hide_sus_mnts_for_all_procs 0 >/dev/null || ${susfs_bin} hide_sus_mnts_for_non_su_procs 0 >/dev/null`);
			custom_settings.hide_sus_mnts_for_all_or_non_su_procs=0;
			toast("Hide SUS mounts for all/non-su processes disabled! No need to reboot");
			hide_sus_mnts_for_all_or_non_su_procs.checked=false;
			turn_off_after_boot_completed.checked=false;
			turn_off_after_boot_completed_checkbox.classList.add("hidden");
		}
		else{
			await run(`sed -i 's/hide_sus_mnts_for_all_or_non_su_procs=.*/hide_sus_mnts_for_all_or_non_su_procs=1/' ${config}/config.sh`);
			await run(`${susfs_bin} hide_sus_mnts_for_all_procs 1 >/dev/null || ${susfs_bin} hide_sus_mnts_for_non_su_procs 1 >/dev/null`);
			custom_settings.hide_sus_mnts_for_all_or_non_su_procs=1;
			toast("Hide SUS mounts for all/non-su processes enabled! No need to reboot");
			hide_sus_mnts_for_all_or_non_su_procs.checked="checked";
			turn_off_after_boot_completed_checkbox.classList.remove("hidden");
		}
	});

	turn_off_after_boot_completed.addEventListener("click",async function(){
		if (custom_settings.hide_sus_mnts_for_all_or_non_su_procs==2){
			await run(`sed -i 's/hide_sus_mnts_for_all_or_non_su_procs=.*/hide_sus_mnts_for_all_or_non_su_procs=1/' ${config}/config.sh`);
			custom_settings.hide_sus_mnts_for_all_or_non_su_procs=1;
			toast("Reboot to take effect");
			turn_off_after_boot_completed.checked=false;
		}
		else{
			await run(`sed -i 's/hide_sus_mnts_for_all_or_non_su_procs=.*/hide_sus_mnts_for_all_or_non_su_procs=2/' ${config}/config.sh`);
			custom_settings.hide_sus_mnts_for_all_or_non_su_procs=2;
			toast("Reboot to take effect");
			turn_off_after_boot_completed.checked="checked";
			turn_off_after_boot_completed_checkbox.classList.remove("hidden");
		}
	});
}
