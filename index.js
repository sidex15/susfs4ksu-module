import { exec, toast } from 'kernelsu';
import Highway from '@dogstudio/highway';
import { gsap } from 'gsap';
import Fade from './fade.js';
import './space.js';
import './i18n.js';
import { show_contributors, show_translators } from './credits.js';
import { run, catToObject, parseVersion, versionAtLeast, updateConfig, setupTextArea, setupBooleanToggle } from './utils.js';

// Module locations
const tmpfolder = "/data/adb/ksu/susfs4ksu";
const moddir = "/data/adb/modules/susfs4ksu";
const config = "/data/adb/susfs4ksu";
const susfs_bin = "/data/adb/ksu/bin/ksu_susfs";
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
	sus_su_toggle(settings);
}

// v1.5.4+ auto hide settings
if (versionAtLeast(susfs_versions, 1, 5, 4)) {
	sus_su_154.classList.remove("hidden");
	auto_hide_settings(settings, susfs_features);
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
		set_uname(settings);
		susfs_log_toggle(settings);
		if (versionAtLeast(susfs_versions, 1, 5, 4)) auto_hide_settings(settings, susfs_features);
		sus_su_toggle(settings);
	} else if (currentPath === '/custom.html') {
		custom_toggles(settings);
		custom_rom_settings(settings);
		custom_sus_mount();
		custom_try_umount();
		custom_sus_path();
		custom_sus_path_loop(susfs_versions);
		custom_sus_maps(susfs_features);
		custom_sus_open_redirect(susfs_features);
	} else if (currentPath === '/status.html') {
		loadKernelFeatureStatus(susfs_features);
	}
});

// SUSFS binary update
async function susfs_bin_update(susfs_versions, kernel_variant) {
	const susfs_update_dialog = document.getElementById("susfs_update_dialog");
	const susfs_update_btn = document.getElementById("susfs_update_btn");
	const susfs_update = document.getElementById("susfs_update");
	const susfs_updating = document.getElementById("susfs_updating");
	const susfs_update_desc1 = document.getElementById("susfs_update_desc1");
	const susfs_update_desc2 = document.getElementById("susfs_update_desc2");
	const susfs_loading_icon = document.getElementById("susfs_loading_icon");
	const susfs_update_buttons = document.getElementById("susfs_update_buttons");

	susfs_update_dialog.showModal();
	susfs_update_btn.addEventListener("click",async function(){
		susfs_update.classList.add("hidden");
		susfs_update_desc1.classList.add("hidden");
		susfs_update_desc2.classList.add("hidden");
		susfs_update_buttons.classList.add("hidden");
		susfs_loading_icon.classList.remove("hidden");
		susfs_updating.classList.remove("hidden");

		setTimeout(async () => {
			try {
				await run(`sh ${moddir}/susfs-bin-update.sh ${susfs_versions.main.toString()} ${susfs_versions.sub.toString()} ${susfs_versions.patch.toString()} ${kernel_variant.toLowerCase()}`);
				susfs_update_dialog.close();
				toast(`SUSFS binary updated to version v${susfs_versions.main}.${susfs_versions.sub}.${susfs_versions.patch} for ${kernel_variant} kernel!`);
			}
			catch (error) {
				toast(`Error updating SUSFS binary!`);
			}
		}, 500);
	});
}

//sus_su toggle
async function sus_su_toggle(settings) {
	const sus_su = document.getElementById("sus_su");
	const enable_sus_su = document.getElementById("enable_sus_su");
	//const settings = catToObject(await run(`cat ${config}/config.sh`));
	var sus_su_check = settings;
	//toast(`sus_su on boot: ${sus_su_check.sus_su}`);
	//toast(`sus_su: ${sus_su_check.sus_su_active}`);
	if(sus_su_check.sus_su==1 || sus_su_check.sus_su==2){
	sus_su.addEventListener("click",function(){
		if (sus_su_check.sus_su_active==1 || sus_su_check.sus_su_active==2){
			console.log("false")
			sus_su_check.sus_su_active=0
			run(`${susfs_bin} sus_su 0`)
			exec(`sed -i 's/sus_su_active=.*/sus_su_active=0/' ${config}/config.sh`)
			toast("sus su off no need to reboot")
			sus_su.removeAttribute("checked");
		}
		else{
			console.log("true")
			if (versionAtLeast(susfs_versions, 1, 5, 0)) {
				sus_su_check.sus_su_active = 2;
				run(`${susfs_bin} sus_su 2`);
				exec(`sed -i 's/sus_su_active=.*/sus_su_active=2/' ${config}/config.sh`);
			} else {
				sus_su_check.sus_su_active = 1;
				run(`${susfs_bin} sus_su 1`);
				exec(`sed -i 's/sus_su_active=.*/sus_su_active=1/' ${config}/config.sh`);
			}
			toast("sus su on no need to reboot")
			sus_su.setAttribute("checked","checked");
		}
	});
	}
	else{
		sus_su.checked=false;
		enable_sus_su.checked=false;
		sus_su.setAttribute("disabled","");
	}
	if(sus_su_check.sus_su_active==0){
		sus_su.checked=false;
	}
	enable_sus_su.addEventListener("click",async function(){
		if (sus_su_check.sus_su==1 || sus_su_check.sus_su==2){
			console.log("false")
			sus_su_check.sus_su=0
			toast("Reboot to take effect");
			run(`sed -i 's/sus_su=.*/sus_su=0/' ${config}/config.sh`);
			exec(`sed -i 's/sus_su_active=.*/sus_su_active=0/' ${config}/config.sh`)
			enable_sus_su.checked=false;
			sus_su.setAttribute("disabled","");
		}
		else{
			console.log("true")
			toast("Reboot to take effect");
			if (versionAtLeast(susfs_versions, 1, 5, 0)) {
				sus_su_check.sus_su = 2;
				run(`sed -i 's/sus_su=.*/sus_su=2/' ${config}/config.sh`);
			} else {
				sus_su_check.sus_su = 1;
				run(`sed -i 's/sus_su=.*/sus_su=1/' ${config}/config.sh`);
			}
			enable_sus_su.checked="checked";
			sus_su.removeAttribute("disabled","");
		}
	});
}

//Auto hide settings
async function auto_hide_settings(settings,susfs_features) {
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

//set uname function
async function set_uname(settings) {
	document.getElementById("kernel_version").innerHTML= await run(`uname -r + uname -v`);
	const set_uname=document.getElementById("set_uname");
	const set_stock_kernel_build_date=document.getElementById("set_stock_kernel_build_date");
	const spoof_on_boot = document.getElementById('uname-spoof-on-boot');
	const boot_on_postfsdata = document.getElementById('uname-spoof-on-postfsdata');
	const postfsdata_toggle = document.getElementById('uname-at-postfs');
    const modal = document.getElementById('confirm_modal');
    const confirmBtn = document.getElementById('modal_confirm');
    const cancelBtn = document.getElementById('modal_cancel');
    const modalMessage = document.getElementById('modal_message');
	const mainContainer = document.querySelector('main');
	var sus_uname=document.getElementById("sus_uname");
	var sus_uname_build=document.getElementById("sus_uname_build");
	var sus_uname_checkbox=document.getElementById("sus_uname_checkbox");
	var sus_uname_build_checkbox=document.getElementById("sus_uname_build_checkbox");
	var spoofed_kernel_version = document.getElementById("spoofed_kernel_version");
	var spoofed_kernel_build = document.getElementById("spoofed_kernel_build");

	// Convert the string content to an object
	const custom_settings = settings;

	spoofed_kernel_version.innerHTML = custom_settings.kernel_version;
	spoofed_kernel_build.innerHTML = custom_settings.kernel_build;

	if (custom_settings.spoof_uname>0){
		spoof_on_boot.checked="checked"
		postfsdata_toggle.classList.remove("hidden");
	}
	else{
		spoof_on_boot.checked=false
		postfsdata_toggle.classList.remove("hidden");
	}
	if (custom_settings.spoof_uname>1) boot_on_postfsdata.checked="checked";
	else boot_on_postfsdata.checked=false;

	set_uname.addEventListener("click",async function(){
		sus_uname=document.getElementById("sus_uname");
		sus_uname_build=document.getElementById("sus_uname_build");
		sus_uname_checkbox=document.getElementById("sus_uname_checkbox");
		sus_uname_build_checkbox=document.getElementById("sus_uname_build_checkbox");

		if (sus_uname.value.includes(' ')&&sus_uname_checkbox.checked==true) {
				toast('Spaces are not allowed in the input!');
			} 
		else {
			if (sus_uname_checkbox.checked==true && sus_uname_build_checkbox.checked==false){
				if(sus_uname.value==''){
					run(`${susfs_bin} set_uname 'default' '${custom_settings.kernel_build}'`)
					await run(`sed -i 's/kernel_version=.*/kernel_version="default"/' ${config}/config.sh`);
					document.getElementById("kernel_version").innerHTML= await run(`uname -r + uname -v`);
					custom_settings.kernel_version = "default";
					spoofed_kernel_version.innerHTML="default";
					set_uname.blur();
				}
				else{
					run(`${susfs_bin} set_uname '${sus_uname.value}' '${custom_settings.kernel_build}'`)
					await run(`sed -i 's/kernel_version=.*/kernel_version="${sus_uname.value}"/' ${config}/config.sh`);
					custom_settings.kernel_version = sus_uname.value;
					spoofed_kernel_version.innerHTML=sus_uname.value;
					set_uname.blur();
				}
				sus_uname.value='';
			}
			else if (sus_uname_checkbox.checked==false && sus_uname_build_checkbox.checked==true){
				if(sus_uname_build.value==''){
					run(`${susfs_bin} set_uname '${custom_settings.kernel_version}' 'default'`)
					await run(`sed -i 's/kernel_build=.*/kernel_build="default"/' ${config}/config.sh`);
					custom_settings.kernel_build = "default";
					spoofed_kernel_build.innerHTML="default";
					set_uname.blur();
				}
				else{
					run(`${susfs_bin} set_uname '${custom_settings.kernel_version}' '${sus_uname_build.value}'`);
					await run(`sed -i 's/kernel_build=.*/kernel_build="${sus_uname_build.value}"/' ${config}/config.sh`);
					custom_settings.kernel_build = sus_uname_build.value;
					spoofed_kernel_build.innerHTML=sus_uname_build.value;
					set_uname.blur();
				}
				sus_uname_build.value='';
			}
			else if (sus_uname_checkbox.checked==true && sus_uname_build_checkbox.checked==true){
				if(sus_uname.value=='' && sus_uname_build.value==''){
					console.log("default kernel version");
					run(`${susfs_bin} set_uname 'default' 'default'`)
					custom_settings.kernel_version = "default";
					custom_settings.kernel_build = "default";
					await run(`sed -i 's/kernel_version=.*/kernel_version="default"/' ${config}/config.sh`);
					await run(`sed -i 's/kernel_build=.*/kernel_build="default"/' ${config}/config.sh`);
					document.getElementById("kernel_version").innerHTML= await run(`uname -r + uname -v`);
					spoofed_kernel_version.innerHTML="default";
					spoofed_kernel_build.innerHTML="default";
					set_uname.blur();
				}
				else{
					console.log(`sets to ${sus_uname.value}`);
					if(sus_uname_build.value==''){
						custom_settings.kernel_version = sus_uname.value;
						custom_settings.kernel_build = "default";
						run(`${susfs_bin} set_uname '${sus_uname.value}' 'default'`)
						await run(`sed -i 's/kernel_version=.*/kernel_version="${sus_uname.value}"/' ${config}/config.sh`);
						await run(`sed -i 's/kernel_build=.*/kernel_build="default"/' ${config}/config.sh`);
						spoofed_kernel_version.innerHTML=sus_uname.value;
						spoofed_kernel_build.innerHTML="default";
					}
					else if(sus_uname.value==''){
						custom_settings.kernel_version = "default";
						custom_settings.kernel_build = sus_uname_build.value;
						run(`${susfs_bin} set_uname 'default' '${sus_uname_build.value}'`);
						await run(`sed -i 's/kernel_version=.*/kernel_version="default"/' ${config}/config.sh`);
						await run(`sed -i 's/kernel_build=.*/kernel_build="${sus_uname_build.value}"/' ${config}/config.sh`);
						spoofed_kernel_version.innerHTML="default";
						spoofed_kernel_build.innerHTML=sus_uname_build.value;
					}
					else{
						custom_settings.kernel_version = sus_uname.value;
						custom_settings.kernel_build = sus_uname_build.value;
						run(`${susfs_bin} set_uname '${sus_uname.value}' '${sus_uname_build.value}'`);
						await run(`sed -i 's/kernel_version=.*/kernel_version="${sus_uname.value}"/' ${config}/config.sh`);
						await run(`sed -i 's/kernel_build=.*/kernel_build="${sus_uname_build.value}"/' ${config}/config.sh`);
						spoofed_kernel_version.innerHTML=sus_uname.value;
						spoofed_kernel_build.innerHTML=sus_uname_build.value;
					}
				}
				sus_uname.value='';
				sus_uname_build.value='';
			}
		}
		document.getElementById("kernel_version").innerHTML= await run(`uname -r + uname -v`);
		set_uname.blur();
	});

	set_stock_kernel_build_date.addEventListener("click",async function(){
		const stock_build_date = await run(`getprop ro.build.date`);
		run(`${susfs_bin} set_uname '${custom_settings.kernel_version}' '#1 SMP PREEMPT ${stock_build_date}'`);
		await run(`sed -i 's/kernel_build=.*/kernel_build="#1 SMP PREEMPT ${stock_build_date}"/' ${config}/config.sh`);
		custom_settings.kernel_build = `#1 SMP PREEMPT ${stock_build_date}`;
		spoofed_kernel_build.innerHTML=`#1 SMP PREEMPT ${stock_build_date}`;
		document.getElementById("kernel_version").innerHTML= await run(`uname -r + uname -v`);
		set_stock_kernel_build_date.blur();
	});

	spoof_on_boot.addEventListener('change', async function(event) {
		const postfsdata_toggle = document.getElementById('uname-at-postfs');
		event.preventDefault();
		if (custom_settings.spoof_uname<1){
			await run(`sed -i 's/spoof_uname=.*/spoof_uname=1/' ${config}/config.sh`);
			custom_settings.spoof_uname=1;
			toast("Reboot to take effect");
			postfsdata_toggle.classList.remove("hidden");
		}
		else{
			await run(`sed -i 's/spoof_uname=.*/spoof_uname=0/' ${config}/config.sh`);
			custom_settings.spoof_uname=0;
			boot_on_postfsdata.checked = false;
			toast("Reboot to take effect");
			postfsdata_toggle.classList.remove("hidden");
		}
	});

    boot_on_postfsdata.addEventListener('change', async function(event) {
		event.preventDefault();
		if (custom_settings.spoof_uname<2){
			modal.showModal();
		}
		else{
			await run(`sed -i 's/spoof_uname=.*/spoof_uname=1/' ${config}/config.sh`);
		}
    });

    confirmBtn.addEventListener('click', async function() {
		const boot_on_postfsdata = document.getElementById('uname-spoof-on-postfsdata');
        boot_on_postfsdata.checked = "checked";
		await run(`sed -i 's/spoof_uname=.*/spoof_uname=2/' ${config}/config.sh`);
		custom_settings.spoof_uname=2;
		toast("Reboot to take effect");
        modal.close();
    });

    cancelBtn.addEventListener('click', async function() {
		const boot_on_postfsdata = document.getElementById('uname-spoof-on-postfsdata');
        boot_on_postfsdata.checked = false;
        modal.close();
    });

	// Keyboard handling for uname inputs
	sus_uname.addEventListener('focus', () => {
		// Add padding to prevent the keyboard from obscuring content
		mainContainer.style.paddingBottom = '350px';
		sus_uname.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
	});

	sus_uname.addEventListener('blur', (e) => {
		// Check if focus is moving to sus_uname_build
		setTimeout(() => {
			// Only remove padding if focus isn't moving to the other input
			if (document.activeElement !== sus_uname_build) {
				gsap.to(mainContainer, { 
					duration: 0.5, 
					paddingBottom: '0px', 
					ease: 'power1.out' 
				});
			}
		}, 0);
	});

	// Keyboard handling for uname_build input
	sus_uname_build.addEventListener('focus', () => {
		// Add padding to prevent the keyboard from obscuring content
		mainContainer.style.paddingBottom = '350px';
		sus_uname_build.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
	});

	sus_uname_build.addEventListener('blur', (e) => {
		// Check if focus is moving to sus_uname
		setTimeout(() => {
			// Only remove padding if focus isn't moving to the other input
			if (document.activeElement !== sus_uname) {
				gsap.to(mainContainer, { 
					duration: 0.5, 
					paddingBottom: '0px', 
					ease: 'power1.out' 
				});
			}
		}, 0);
	});

}

//susfs log toggle
async function susfs_log_toggle(settings) {
	var susfs_log=document.getElementById("susfs_log");
	//var is_susfs_log_enabled=await run(`grep -q 'enable_log 1' /data/adb/modules/susfs4ksu/service.sh && echo true || echo false`);
	//toast(`is susfs log enabled: ${is_susfs_log_enabled}`);
	//const settings = catToObject(await run(`cat ${config}/config.sh`));
	const is_susfs_log_enabled = settings.susfs_log === 1;
	
	// Set initial state first
	if(is_susfs_log_enabled) {
		susfs_log.setAttribute("checked", "checked");
	} else {
		susfs_log.removeAttribute("checked");
	}
	
	susfs_log.addEventListener("click", async function() {
		if(susfs_log.hasAttribute("checked")) {
			console.log("false");
			toast("Reboot to take effect");
			await run(`sed -i 's/susfs_log=1/susfs_log=0/' ${config}/config.sh`);
			susfs_log.removeAttribute("checked");
		} else {
			console.log("true");
			toast("Reboot to take effect");
			await run(`sed -i 's/susfs_log=0/susfs_log=1/' ${config}/config.sh`);
			susfs_log.setAttribute("checked", "checked");
		}
	});
}

// Custom toggles
async function custom_toggles(settings) {
	const custom_settings = settings;
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
		emulate_vold_app_data.checked = custom_settings.emulate_vold_app_data === 1 ? "checked" : false;
		setupBooleanToggle(emulate_vold_app_data, custom_settings, "emulate_vold_app_data", `${config}/config.sh`);
	}

	// AVC log spoofing — disabled on older versions or unsupported kernels
	const avc_log_spoofing = document.getElementById("avc_log_spoofing");
	if (!versionAtLeast(susfs_versions, 1, 5, 9) || !is_avc_log_spoofing_enabled) {
		avc_log_spoofing.disabled = true;
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

// custom rom settings
async function custom_rom_settings(settings) {
	const hide_custom_rom = document.getElementById("hide_custom_rom");
	const custom_rom_levels = document.getElementById("custom_rom_levels");
	const hide_level= document.getElementById("hide_level");
	const hide_level1 = document.getElementById("hide_level1");
	const hide_level2 = document.getElementById("hide_level2");
	const hide_level3 = document.getElementById("hide_level3");
	const hide_level4 = document.getElementById("hide_level4");
	const hide_level5 = document.getElementById("hide_level5");
	const hide_vendor_sepolicy = document.getElementById("hide_vendor_sepolicy");
	const hide_compat_matrix = document.getElementById("hide_compat_matrix");

	// Convert the string content to an object
	const custom_settings = settings;

	// Set initial state first
	if (custom_settings.hide_cusrom>0){
		hide_custom_rom.checked="checked";
		custom_rom_levels.classList.remove("hidden");
		if (custom_settings.hide_cusrom==1){
			hide_level.value="0";	
			hide_level1.classList.remove("hidden");
		}
		else if (custom_settings.hide_cusrom==2){
			hide_level.value="25";
			hide_level2.classList.remove("hidden");
		}
		else if (custom_settings.hide_cusrom==3){
			hide_level.value="50";
			hide_level3.classList.remove("hidden");
		}
		else if (custom_settings.hide_cusrom==4){
			hide_level.value="75";
			hide_level4.classList.remove("hidden");
		}
		else if (custom_settings.hide_cusrom==5){
			hide_level.value="100";
			hide_level5.classList.remove("hidden");
		}
	}
	else{
		hide_custom_rom.checked=false
		custom_rom_levels.classList.add("hidden");
	}
	if (custom_settings.hide_vendor_sepolicy==true) hide_vendor_sepolicy.checked="checked";
	else hide_vendor_sepolicy.checked=false;
	if (custom_settings.hide_compat_matrix==true) hide_compat_matrix.checked="checked";
	else hide_compat_matrix.checked=false;

	// custom rom toggle
	hide_custom_rom.addEventListener("click",async function (){
		//var vendor_sepolicy_toggle = await run(`grep -q 'hide_cusrom=1' ${config}/config.sh && echo true || echo false`);
		const custom_rom_levels = document.getElementById("custom_rom_levels");
		if (custom_settings.hide_cusrom>0){
			run(`sed -i 's/hide_cusrom=.*/hide_cusrom=0/' ${config}/config.sh`)
			custom_settings.hide_cusrom=0
			custom_rom_levels.classList.add("hidden");
			hide_level1.classList.add("hidden");
			hide_level2.classList.add("hidden");
			hide_level3.classList.add("hidden");
			hide_level4.classList.add("hidden");
			hide_level5.classList.add("hidden");
			toast("Reboot to take effect");
		}
		else {
			run (`sed -i 's/hide_cusrom=.*/hide_cusrom=1/' ${config}/config.sh`)
			hide_level.value="0"
			custom_settings.hide_cusrom=1
			custom_rom_levels.classList.remove("hidden");
			hide_level1.classList.remove("hidden");
			toast("Reboot to take effect");
		}
	});

	hide_level.addEventListener("change",async function (){
		if (hide_level.value=="0"){
			run (`sed -i 's/hide_cusrom=.*/hide_cusrom=1/' ${config}/config.sh`);
			hide_level1.classList.remove("hidden");
			hide_level2.classList.add("hidden");
			hide_level3.classList.add("hidden");
			hide_level4.classList.add("hidden");
			hide_level5.classList.add("hidden");
		}
		else if (hide_level.value=="25"){
			run (`sed -i 's/hide_cusrom=.*/hide_cusrom=2/' ${config}/config.sh`);
			hide_level1.classList.add("hidden");
			hide_level2.classList.remove("hidden");
			hide_level3.classList.add("hidden");
			hide_level4.classList.add("hidden");
			hide_level5.classList.add("hidden");
		}
		else if (hide_level.value=="50"){
			run (`sed -i 's/hide_cusrom=.*/hide_cusrom=3/' ${config}/config.sh`);
			hide_level1.classList.add("hidden");
			hide_level2.classList.add("hidden");
			hide_level3.classList.remove("hidden");
			hide_level4.classList.add("hidden");
			hide_level5.classList.add("hidden");
		}
		else if (hide_level.value=="75"){
			run (`sed -i 's/hide_cusrom=.*/hide_cusrom=4/' ${config}/config.sh`);
			hide_level1.classList.add("hidden");
			hide_level2.classList.add("hidden");
			hide_level3.classList.add("hidden");
			hide_level4.classList.remove("hidden");
			hide_level5.classList.add("hidden");
		}
		else if (hide_level.value=="100"){
			run (`sed -i 's/hide_cusrom=.*/hide_cusrom=5/' ${config}/config.sh`);
			hide_level1.classList.add("hidden");
			hide_level2.classList.add("hidden");
			hide_level3.classList.add("hidden");
			hide_level4.classList.add("hidden");
			hide_level5.classList.remove("hidden");
		}
	});
	// Vendor sepolicy & compat matrix toggles
	hide_vendor_sepolicy.checked = custom_settings.hide_vendor_sepolicy === 1 ? "checked" : false;
	hide_compat_matrix.checked = custom_settings.hide_compat_matrix === 1 ? "checked" : false;
	setupBooleanToggle(hide_vendor_sepolicy, custom_settings, "hide_vendor_sepolicy", `${config}/config.sh`);
	setupBooleanToggle(hide_compat_matrix, custom_settings, "hide_compat_matrix", `${config}/config.sh`);
}

// Custom text area sections (sus_path, sus_path_loop, sus_maps, sus_mount, try_umount, etc.)
async function custom_sus_path() {
	if (!susfs_features.includes("CONFIG_KSU_SUSFS_SUS_PATH")) {
		document.getElementById("sus_path_section").classList.add("hidden");
		return;
	}
	setupTextArea({
		loadBtn: document.getElementById("load_sus_path"),
		saveBtn: document.getElementById("save_sus_path"),
		textarea: document.getElementById("custom_sus_path"),
		filePath: `${config}/sus_path.txt`,
		featureName: "SUS_PATH",
	});
}

async function custom_sus_path_loop() {
	if (!versionAtLeast(susfs_versions, 1, 5, 9)) return;
	document.getElementById("sus_path_loop_section").classList.remove("hidden");
	setupTextArea({
		loadBtn: document.getElementById("load_sus_path_loop"),
		saveBtn: document.getElementById("save_sus_path_loop"),
		textarea: document.getElementById("custom_sus_path_loop"),
		filePath: `${config}/sus_path_loop.txt`,
		featureName: "SUS_PATH_LOOP",
	});
}

async function custom_sus_maps(susfs_features) {
	if (!susfs_features.includes("CONFIG_KSU_SUSFS_SUS_MAP")) return;
	document.getElementById("sus_maps_section").classList.remove("hidden");
	setupTextArea({
		loadBtn: document.getElementById("load_sus_maps"),
		saveBtn: document.getElementById("save_sus_maps"),
		textarea: document.getElementById("custom_sus_maps"),
		filePath: `${config}/sus_maps.txt`,
		featureName: "SUS_MAPS",
	});
}

// Custom SUS mount
async function custom_sus_mount() {
	if (!susfs_features.includes("CONFIG_KSU_SUSFS_SUS_MOUNT") || versionAtLeast(susfs_versions, 2, 0, 0)) {
		document.getElementById("sus_mount_section").classList.add("hidden");
		return;
	}
	setupTextArea({
		loadBtn: document.getElementById("load_sus_mount"),
		saveBtn: document.getElementById("save_sus_mount"),
		textarea: document.getElementById("custom_sus_mount"),
		filePath: `${config}/sus_mount.txt`,
		featureName: "SUS_MOUNT",
	});
}

// Custom try umount
async function custom_try_umount() {
	if (!susfs_features.includes("CONFIG_KSU_SUSFS_TRY_UMOUNT") && !versionAtLeast(susfs_versions, 2, 0, 0)) {
		document.getElementById("try_umount_section").classList.add("hidden");
		return;
	}
	setupTextArea({
		loadBtn: document.getElementById("load_try_umount"),
		saveBtn: document.getElementById("save_try_umount"),
		textarea: document.getElementById("custom_try_umount"),
		filePath: `${config}/try_umount.txt`,
		featureName: "TRY_UMOUNT",
	});
}

// Custom SUS open redirect
async function custom_sus_open_redirect(susfs_features) {
	if (!susfs_features.includes("CONFIG_KSU_SUSFS_OPEN_REDIRECT")) return;
	document.getElementById("sus_open_redirect_section").classList.remove("hidden");

	const sus_open_redirect_area = document.getElementById("custom_sus_open_redirect");
	const mainContainer = document.querySelector('main');

	setupTextArea({
		loadBtn: document.getElementById("load_sus_open_redirect"),
		saveBtn: document.getElementById("save_sus_open_redirect"),
		textarea: sus_open_redirect_area,
		filePath: `${config}/sus_open_redirect.txt`,
		featureName: "SUS_OPEN_REDIRECT",
	});

	// Keyboard handling
	sus_open_redirect_area.addEventListener('focus', () => {
		mainContainer.style.paddingBottom = '300px';
		sus_open_redirect_area.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
	});
	sus_open_redirect_area.addEventListener('blur', () => {
		gsap.to(mainContainer, { duration: 0.5, paddingBottom: '0px', ease: 'power1.out' });
	});
}

// Load kernel feature status
async function loadKernelFeatureStatus(susfs_features) {
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

// reset susfs
function susfs_reset(){
	const susfs_reset_btn = document.getElementById('susfs_reset');
	const confirm_reset_modal = document.getElementById('confirm_reset_modal');
	const reset_modal_confirm = document.getElementById('reset_modal_confirm');
	const reset_modal_cancel = document.getElementById('reset_modal_cancel');

	susfs_reset_btn.addEventListener('click', async function(event) {
		event.preventDefault();
		confirm_reset_modal.showModal();
	});

	reset_modal_cancel.addEventListener('click', async function() {
		confirm_reset_modal.close();
	});

	reset_modal_confirm.addEventListener('click', async function() {
		toast("Resetting...");
		await run(`sh ${moddir}/susfs_reset.sh`);
		confirm_reset_modal.close();
		toast("Reset done! Please reboot");
		await run(`input keyevent 4`);
	});
}

// send logs
function susfs_send_logs(){
	const susfs_send_logs_btn = document.getElementById('susfs_send_logs');
	susfs_send_logs_btn.addEventListener('click', async function(event) {
		try {
		await run(`cat /proc/$(pidof zygote64)/mountinfo > /data/adb/ksu/susfs4ksu/zygote64_mountinfo.txt`);
		await run(`cat /proc/$(pidof zygote64)/maps > /data/adb/ksu/susfs4ksu/zygote64_maps.txt`);
		await run(`cat /proc/1/mountinfo > /data/adb/ksu/susfs4ksu/pid1_mountinfo.txt`);
		await run(`cp /data/adb/ksu/log/dmesg.log /data/adb/ksu/susfs4ksu/dmesg.log`);
		await run(`ksud module list > /data/adb/ksu/susfs4ksu/ksu_module_list.txt`);
		await run(`dmesg | grep susfs > /data/adb/ksu/susfs4ksu/latest_dmesg_susfs.log`);
		await run(`tar -C /data/adb/ksu/susfs4ksu/ -czvf /sdcard/susfs_logs.tar.gz .`);
		toast("Logs saved to /sdcard/susfs_logs.tar.gz");
		await run(`am start -a android.intent.action.SEND -t '*/*' -c android.intent.category.DEFAULT --eu android.intent.extra.STREAM 'file:///sdcard/susfs_logs.tar.gz'`);
		} catch (error) {
			toast("Failed to prepare logs: " + error.message);
		}
	});
}

// export config
function susfs_export_config(){
	const susfs_export_config_btn = document.getElementById('susfs_export');
	susfs_export_config_btn.addEventListener('click', async function(event) {
		try{
			await run(`tar -C /data/adb/susfs4ksu/ -czvf /sdcard/susfs_settings.tar.gz .`);
			toast("Settings exported to /sdcard/susfs_settings.tar.gz");
		}
		catch{
			toast("Failed to export settings");
		}
	});
}

// Initialize the page
susfs_send_logs();
susfs_export_config();
susfs_reset();
set_uname(settings);
susfs_log_toggle(settings);

// Susfs binary check and update
if (settings.disable_webui_bin_update==false) {
	const susfs_check=await run (`sh ${moddir}/susfs-bin-check.sh ${susfs_versions.main.toString()} ${susfs_versions.sub.toString()} ${susfs_versions.patch.toString()} ${kernel_variant.toLowerCase()}`)
	if (susfs_check=="mismatch"){
		susfs_bin_update(susfs_versions, kernel_variant);
	}

}
