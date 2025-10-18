import { exec, toast } from 'kernelsu';
import Highway from '@dogstudio/highway';
import { gsap } from 'gsap';
import Fade from './fade.js';
import './space.js';
import './i18n.js';
import {show_contributors,show_translators} from './credits.js';

//module location
const tmpfolder="/data/adb/ksu/susfs4ksu"
const moddir="/data/adb/modules/susfs4ksu"
const config="/data/adb/susfs4ksu"
const susfs_bin="/data/adb/ksu/bin/ksu_susfs"
const susfsd="/data/adb/ksu/bin/susfsd"
const settings = catToObject(await run(`cat ${config}/config.sh`));

//susfs version and kernel variant
var susfs_version = await run(`grep version= ${moddir}/module.prop | cut -d '=' -f 2`);
var susfs_version_decimal=await run(`echo "${susfs_version}" | cut -d '-' -f 1 | sed 's/^v//; s/\\.//g'`);
const susfs_version_tag = document.getElementById("susfs_version");
susfs_version_tag.innerHTML=susfs_version
const susfs_features = await run(`${susfs_bin} show enabled_features || ${susfsd} features`);
const kernel_variant = await run(`${susfsd} variant || ${susfs_bin} show variant`);

//susfs features
if (susfs_version_decimal>152){
	const susfs_features_tag = document.getElementById("susfs_kernel_status");
	susfs_features_tag.classList.remove("hidden");
}

if(await run(`[ -f ${tmpfolder}/logs/susfs_active ] && echo true || echo false`)=="false"){
	const susfs_error = document.getElementById("susfs_nos_dialog");
	susfs_error.showModal();
}

//susfs stats and kernel version
var is_log_empty=await run (`[ -s ${tmpfolder}/logs/susfs.log ] && echo false || echo true`);
var susfs_stats = catToObject(await run(`cat ${tmpfolder}/susfs_stats.txt`));
if (is_log_empty=="true"){
	susfs_stats = catToObject(await run(`cat ${tmpfolder}/susfs_stats1.txt`));
	toast("/data/adb/ksu/susfs4ksu/logs/susfs.log is empty/missing.");
	toast("Fallback to stats executed from the module.");
}

// Convert the string content to an object
function catToObject(cat){
    const obj = cat
    .split('\n')                    // Split into lines
    .filter(line => line.includes('='))  // Filter valid lines
    .reduce((acc, line) => {
        const [key, value] = line.split('=').map(str => str.trim());
        
        // Check if value is a quoted string
        if (value.startsWith("'") && value.endsWith("'")) {
            // Handle string values - remove the quotes
            acc[key] = value.substring(1, value.length - 1);
        } else if (value.startsWith('"') && value.endsWith('"')) {
            // Also handle double quotes
            acc[key] = value.substring(1, value.length - 1); 
        } else {
            // Convert to number if it's not a string
            acc[key] = isNaN(Number(value)) ? value : Number(value);
        }
        
        return acc;
    }, {});

    return obj;
}

document.getElementById("sus_path").innerHTML= susfs_stats.sus_path;
document.getElementById("sus_map").innerHTML= susfs_stats.sus_map;
document.getElementById("sus_mount").innerHTML= susfs_stats.sus_mount;
document.getElementById("try_umount").innerHTML= susfs_stats.try_umount;
document.getElementById("kernel_version").innerHTML= await run(`uname -a | cut -d' ' -f3-`);

//toggles
var is_sus_su_exists = settings.sus_su//await run(`[[ -f "${moddir}/sus_su_enabled" || -f "${moddir}/sus_su_mode" ]] && echo true || echo false`);
const sus_su_152 = document.getElementById("sus_su_152");
const sus_su_154 = document.getElementById("sus_su_154");
const sus_su_142 = document.getElementById("sus_su_142");
const sus_su_1 = document.getElementById("sus_su_1");
//toast(`is_sus_su_exists: ${is_sus_su_exists}`);
if (is_sus_su_exists==-1){
	sus_su.removeAttribute("checked");
	sus_su.setAttribute("disabled","");
	enable_sus_su.removeAttribute("checked");
	enable_sus_su.setAttribute("disabled","");
}
else{
	if(susfs_version_decimal>=150){
		if(is_sus_su_exists==1){
			sus_su_1.classList.remove("hidden")
		}
	}
	sus_su_142.classList.remove("hidden")
	sus_su_toggle(settings);
}

//v1.5.4+ auto hide settings
if(susfs_version_decimal>=154){
	sus_su_154.classList.remove("hidden")
	auto_hide_settings(settings,susfs_version_decimal);
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

//execute again after the transition ends
H.on('NAVIGATE_END', async ({ to, from, trigger, location }) => {
	const settings = catToObject(await run(`cat ${config}/config.sh`));
	var currentPath = window.location.pathname;
    // Add specific script initializations here
    if (currentPath === '/index.html') {
		console.log("in index");
		susfs_reset();
		set_uname(settings);
		susfs_log_toggle(settings);
		if (susfs_version_decimal>=154) auto_hide_settings(settings,susfs_version_decimal);
		sus_su_toggle(settings);
    } else if (currentPath === '/custom.html') {
		//console.log("in custom");
		custom_toggles(settings);
		custom_rom_settings(settings);
		custom_sus_mount();
		custom_try_umount();
		custom_sus_path();
		custom_sus_path_loop(susfs_version_decimal);
		custom_sus_maps(susfs_features);
    }
	else if (currentPath === '/status.html') {
		//console.log("in status");
		loadKernelFeatureStatus(susfs_features);
	}
});

//run function
/**
 * Executes a shell command with KernelSU privileges
 * @param {string} command - The shell command to execute
 * @returns {Promise<string>} A promise that resolves with stdout content
 * @throws {Error} If command execution fails with:
 *   - stderr in error message
 */
export async function run(command) {
    return new Promise((resolve, reject) => {
        const callbackName = `exec_callback_${Date.now()}`;
        window[callbackName] = (errno, stdout, stderr) => {
            delete window[callbackName];
            if (errno === 0) {
                resolve(stdout);
            } else {
                console.error(`Error executing command: ${stderr}`);
                reject(stderr);
            }
        };
        try {
            ksu.exec(command, "{}", callbackName);
        } catch (error) {
            console.error(`Execution error: ${error}`);
            reject(error);
        }
    });
}

//susfs binary update
async function susfs_bin_update(susfs_version, kernel_variant) {
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
				await run(`sh ${moddir}/susfs-bin-update.sh ${susfs_version.toString()} ${kernel_variant.toLowerCase()}`);
				susfs_update_dialog.close();
				toast(`SUSFS binary updated to version ${susfs_version} for ${kernel_variant} kernel!`);
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
			if(susfs_version_decimal>=150){
				sus_su_check.sus_su_active=2
				run(`${susfs_bin} sus_su 2`)
				exec(`sed -i 's/sus_su_active=.*/sus_su_active=2/' ${config}/config.sh`)
			}
			else{
				sus_su_check.sus_su_active=1
				run(`${susfs_bin} sus_su 1`)
				exec(`sed -i 's/sus_su_active=.*/sus_su_active=1/' ${config}/config.sh`)
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
		if ((sus_su_check.sus_su==1 || sus_su_check.sus_su==2) && enable_sus_su.checked=="checked"){
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
			if(susfs_version_decimal>=150){
				sus_su_check.sus_su=2
				run(`sed -i 's/sus_su=.*/sus_su=2/' ${config}/config.sh`);
			}
			else {
				sus_su_check.sus_su=1
				run(`sed -i 's/sus_su=.*/sus_su=1/' ${config}/config.sh`);
			}
			enable_sus_su.checked="checked";
			sus_su.removeAttribute("disabled","");
		}
	});
}

//Auto hide settings
async function auto_hide_settings(settings,susfs_version_decimal) {
	const auto_mount = document.getElementById("auto_mount");
	const auto_bind = document.getElementById("auto_bind");
	const auto_umount_bind = document.getElementById("auto_umount_bind");
	const try_umount_zygote = document.getElementById("try_umount_zygote");
	const hide_sus_mnts_for_all_procs = document.getElementById("hide_sus_mnts_for_all_procs");
	const umount_for_zygote_iso_service = document.getElementById("umount_for_zygote_iso_service");
	var is_auto_mount = await run(`[ -f data/adb/susfs_no_auto_add_sus_ksu_default_mount ] && echo true || echo false`);
	var is_auto_bind = await run(`[ -f data/adb/susfs_no_auto_add_sus_bind_mount ] && echo true || echo false`);
	var is_auto_umount_bind = await run(`[ -f data/adb/susfs_no_auto_add_try_umount_for_bind_mount ] && echo true || echo false`);
	var is_try_umount_zygote = await run(`[ -f data/adb/susfs_umount_for_zygote_system_process ] && echo true || echo false`);
	var custom_settings = settings;

	if(is_auto_mount=="true"){
		auto_mount.checked=false;
	}
	if(is_auto_bind=="true"){
		auto_bind.checked=false;
	}
	if(is_auto_umount_bind=="true"){
		auto_umount_bind.checked=false;
	}
	if(is_try_umount_zygote=="false"){
		try_umount_zygote.checked=false;
	}
	if (susfs_version_decimal>=157){
		hide_sus_mnts_for_all_procs.removeAttribute("disabled");
		if (custom_settings.hide_sus_mnts_for_all_procs==true){
		hide_sus_mnts_for_all_procs.checked="checked";
		}
		else{
			hide_sus_mnts_for_all_procs.checked=false;
		}
	}
	if (susfs_version_decimal>=158){
		umount_for_zygote_iso_service.removeAttribute("disabled");
		if (custom_settings.umount_for_zygote_iso_service==true){
			umount_for_zygote_iso_service.checked="checked";
		}
		else{
			umount_for_zygote_iso_service.checked=false;
		}
	}

	auto_mount.addEventListener("click",async function(){
		is_auto_mount = await run(`[ -f data/adb/susfs_no_auto_add_sus_ksu_default_mount ] && echo true || echo false`);
		if (is_auto_mount=="true"){
			await run(`rm -f data/adb/susfs_no_auto_add_sus_ksu_default_mount`);
			is_auto_mount=="false";
			toast("Reboot to take effect");
		}
		else{
			await run(`touch data/adb/susfs_no_auto_add_sus_ksu_default_mount`);
			is_auto_mount=="true"
			toast("Reboot to take effect");
		}
	});

	auto_bind.addEventListener("click",async function(){
		is_auto_bind = await run(`[ -f data/adb/susfs_no_auto_add_sus_bind_mount ] && echo true || echo false`);
		if (is_auto_bind=="true"){
			await run(`rm -f data/adb/susfs_no_auto_add_sus_bind_mount`);
			is_auto_bind=="false";
			toast("Reboot to take effect");
		}
		else{
			await run(`touch data/adb/susfs_no_auto_add_sus_bind_mount`);
			is_auto_bind=="true";
			toast("Reboot to take effect");
		}
	});

	auto_umount_bind.addEventListener("click",async function(){
		is_auto_umount_bind = await run(`[ -f data/adb/susfs_no_auto_add_try_umount_for_bind_mount ] && echo true || echo false`);
		if (is_auto_umount_bind=="true"){
			await run(`rm -f data/adb/susfs_no_auto_add_try_umount_for_bind_mount`);
			is_auto_umount_bind=="false";
			toast("Reboot to take effect");
		}
		else{
			await run(`touch data/adb/susfs_no_auto_add_try_umount_for_bind_mount`);
			is_auto_umount_bind=="true";
			toast("Reboot to take effect");
		}
	});

	try_umount_zygote.addEventListener("click",async function(){
		is_try_umount_zygote = await run(`[ -f data/adb/susfs_umount_for_zygote_system_process ] && echo true || echo false`);
		if (is_try_umount_zygote=="true"){
			await run(`rm -f data/adb/susfs_umount_for_zygote_system_process`);
			is_try_umount_zygote=="false";
			toast("Reboot to take effect");
		}
		else{
			await run(`touch data/adb/susfs_umount_for_zygote_system_process`);
			is_try_umount_zygote=="true";
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

	hide_sus_mnts_for_all_procs.addEventListener("click",async function(){
		if (custom_settings.hide_sus_mnts_for_all_procs==true){
			await run(`sed -i 's/hide_sus_mnts_for_all_procs=.*/hide_sus_mnts_for_all_procs=0/' ${config}/config.sh`);
			await run(`${susfs_bin} hide_sus_mnts_for_all_procs 0`);
			custom_settings.hide_sus_mnts_for_all_procs=0;
			toast("Hide SUS mounts for all processes disabled! No need to reboot");
			hide_sus_mnts_for_all_procs.checked=false;
		}
		else{
			await run(`sed -i 's/hide_sus_mnts_for_all_procs=.*/hide_sus_mnts_for_all_procs=1/' ${config}/config.sh`);
			await run(`${susfs_bin} hide_sus_mnts_for_all_procs 1`);
			custom_settings.hide_sus_mnts_for_all_procs=1;
			toast("Hide SUS mounts for all processes enabled! No need to reboot");
			hide_sus_mnts_for_all_procs.checked="checked";
		}
	});

}

//set uname function
async function set_uname(settings) {
	document.getElementById("kernel_version").innerHTML= await run(`uname -a | cut -d' ' -f3-`);
	const set_uname=document.getElementById("set_uname");
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
		postfsdata_toggle.classList.add("hidden");
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
					document.getElementById("kernel_version").innerHTML= await run(`uname -a | cut -d' ' -f3-`);
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
					document.getElementById("kernel_version").innerHTML= await run(`uname -a | cut -d' ' -f3-`);
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
		document.getElementById("kernel_version").innerHTML= await run(`uname -a | cut -d' ' -f3-`);
		set_uname.blur();
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
			postfsdata_toggle.classList.add("hidden");
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

// custom toggles
async function custom_toggles(settings) {
	const hide_gapps = document.getElementById("hide_gapps");
	const hide_revanced = document.getElementById("hide_revanced");
	const spoof_cmdline = document.getElementById("spoof_cmdline");
	const hide_ksu_loop = document.getElementById("hide_ksu_loop");
	const force_hide_lsposed = document.getElementById("force_hide_lsposed");
	const avc_log_spoofing = document.getElementById("avc_log_spoofing");
	const emulate_vold_app_data = document.getElementById("emulate_vold_app_data");
	var is_avc_log_spoofing_enabled = true;
	//var config_sh = await run(`cat ${config}/config.sh`);

	// Convert the string content to an object
	const custom_settings = settings;

	// Try to see if AVC log spoofing is supported
	try {
		await run(`${susfs_bin} enable_avc_log_spoofing ${custom_settings.avc_log_spoofing}`);
	} catch (error) {
		console.error("Error enabling AVC log spoofing:", error);
		is_avc_log_spoofing_enabled = false;
	}

	if (custom_settings.hide_gapps==true) hide_gapps.checked="checked";
	else hide_gapps.checked=false;
	if (custom_settings.hide_revanced==true) hide_revanced.checked="checked";
	else hide_revanced.checked=false;
	if (custom_settings.spoof_cmdline==true) spoof_cmdline.checked="checked";
	else spoof_cmdline.checked=false;
	if (custom_settings.hide_loops==true) hide_ksu_loop.checked="checked";
	else hide_ksu_loop.checked=false;
	if (custom_settings.force_hide_lsposed==true) force_hide_lsposed.checked="checked";
	else force_hide_lsposed.checked=false;
	if (susfs_version_decimal<157) emulate_vold_app_data.disabled=true;
	else{
		if (custom_settings.emulate_vold_app_data==true) emulate_vold_app_data.checked="checked";
		else emulate_vold_app_data.checked=false;
	}
	if (susfs_version_decimal<159 || !is_avc_log_spoofing_enabled) avc_log_spoofing.disabled=true;
	else{
		if (custom_settings.avc_log_spoofing==true) avc_log_spoofing.checked="checked";
		else avc_log_spoofing.checked=false;
	}
	// gapps toggle
	hide_gapps.addEventListener("click",async function (){
		//var gapps_toggle = await run(`grep -q 'hide_gapps=1' ${config}/config.sh && echo true || echo false`);
		if (custom_settings.hide_gapps==true){
			await run(`sed -i 's/hide_gapps=1/hide_gapps=0/' ${config}/config.sh`)
			custom_settings.hide_gapps=false
			toast("Reboot to take effect");
		}
		else {
			/*if (await run(`grep -q 'hide_gapps' ${config}/config.sh && echo true || echo false`)=="false") run(`echo 'hide_gapps=1' >> ${config}/config.sh`)
			else*/ await run(`sed -i 's/hide_gapps=0/hide_gapps=1/' ${config}/config.sh`)
			custom_settings.hide_gapps==true
			toast("Reboot to take effect");
		}
	});

	// revanced toggle
	hide_revanced.addEventListener("click",async function (){
		//var revanced_toggle = await run(`grep -q 'hide_revanced=1' ${config}/config.sh && echo true || echo false`);
		if (custom_settings.hide_revanced==true){
			await run(`sed -i 's/hide_revanced=1/hide_revanced=0/' ${config}/config.sh`)
			custom_settings.hide_revanced=false
			toast("Reboot to take effect");
		}
		else {
			/*if (await run(`grep -q 'hide_revanced' ${config}/config.sh && echo true || echo false`)=="false") run(`echo 'hide_revanced=1' >> ${config}/config.sh`)
			else*/ await run(`sed -i 's/hide_revanced=0/hide_revanced=1/' ${config}/config.sh`)
			custom_settings.hide_revanced=true
			toast("Reboot to take effect");
		}
	});

	// spoof cmdline toggle
	spoof_cmdline.addEventListener("click",async function (){
		//var cmdline_toggle = await run(`grep -q 'spoof_cmdline=1' ${config}/config.sh && echo true || echo false`);
		if (custom_settings.spoof_cmdline==true){
			await run(`sed -i 's/spoof_cmdline=1/spoof_cmdline=0/' ${config}/config.sh`)
			custom_settings.spoof_cmdline=false
			toast("Reboot to take effect");
		}
		else {
			/*if (await run(`grep -q 'spoof_cmdline' ${config}/config.sh && echo true || echo false`)=="false") run(`echo 'spoof_cmdline=1' >> ${config}/config.sh`)
			else*/ await run(`sed -i 's/spoof_cmdline=0/spoof_cmdline=1/' ${config}/config.sh`)
			custom_settings.spoof_cmdline=true
			toast("Reboot to take effect");
		}
	});

	// hide ksu loop toggle
	hide_ksu_loop.addEventListener("click",async function (){
		//var loops_toggle = await run(`grep -q 'hide_loops=1' ${config}/config.sh && echo true || echo false`);
		if (custom_settings.hide_loops==true){
			await run(`sed -i 's/hide_loops=1/hide_loops=0/' ${config}/config.sh`)
			custom_settings.hide_loops=false
			toast("Reboot to take effect");
		}
		else {
			/*if (await run(`grep -q 'hide_loops' ${config}/config.sh && echo true || echo false`)=="false") run(`echo 'hide_loops=1' >> ${config}/config.sh`)
			else*/ await run(`sed -i 's/hide_loops=0/hide_loops=1/' ${config}/config.sh`)
			custom_settings.hide_loops=true
			toast("Reboot to take effect");
		}
	});

	// force hide lsposed toggle
	force_hide_lsposed.addEventListener("click",async function (){
		//var lsposed_toggle = await run(`grep -q 'force_hide_lsposed=1' ${config}/config.sh && echo true || echo false`);
		if (custom_settings.force_hide_lsposed==true){
			await run(`sed -i 's/force_hide_lsposed=1/force_hide_lsposed=0/' ${config}/config.sh`)
			custom_settings.force_hide_lsposed=false
			toast("Reboot to take effect");
		}
		else {
			/*if (await run(`grep -q 'force_hide_lsposed' ${config}/config.sh && echo true || echo false`)=="false") run(`echo 'force_hide_lsposed=1' >> ${config}/config.sh`)
			else*/ await run(`sed -i 's/force_hide_lsposed=0/force_hide_lsposed=1/' ${config}/config.sh`)
			custom_settings.force_hide_lsposed=true
			toast("Reboot to take effect");
		}
	});

	// avc log spoofing toggle
	avc_log_spoofing.addEventListener("click",async function (){
		//var avc_log_spoofing_toggle = await run(`grep -q 'avc_log_spoofing=1' ${config}/config.sh && echo true || echo false`);
		if (custom_settings.avc_log_spoofing==true){
			await run(`sed -i 's/avc_log_spoofing=.*/avc_log_spoofing=0/' ${config}/config.sh`)
			await run(`${susfs_bin} enable_avc_log_spoofing 0`);
			custom_settings.avc_log_spoofing=false
			toast("AVC Log Spoofing off! no need to reboot");
		}
		else {
			/*if (await run(`grep -q 'avc_log_spoofing' ${config}/config.sh && echo true || echo false`)=="false") run(`echo 'avc_log_spoofing=1' >> ${config}/config.sh`)
			else*/ await run(`sed -i 's/avc_log_spoofing=.*/avc_log_spoofing=1/' ${config}/config.sh`)
			await run(`${susfs_bin} enable_avc_log_spoofing 1`);
			custom_settings.avc_log_spoofing=true
			toast("AVC Log Spoofing on! no need to reboot");
		}
	});

	// emulate vold app data isolation toggle
	emulate_vold_app_data.addEventListener("click",async function (){
		if (custom_settings.emulate_vold_app_data==true){
			await run(`sed -i 's/emulate_vold_app_data=.*/emulate_vold_app_data=0/' ${config}/config.sh`)
			await run(`${susfs_bin} enable_vold_app_data 0`);
			custom_settings.emulate_vold_app_data=false
			toast("Reboot to take effect");
		}
		else {
			await run(`sed -i 's/emulate_vold_app_data=.*/emulate_vold_app_data=1/' ${config}/config.sh`)
			await run(`${susfs_bin} enable_vold_app_data 1`);
			custom_settings.emulate_vold_app_data=true
			toast("Reboot to take effect");
		}
	});
}

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
	const fake_service_list = document.getElementById("fake_service_list");

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
	if (custom_settings.fake_service_list==true) fake_service_list.checked="checked";
	else fake_service_list.checked=false;

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
		// vendor sepolicy toggle
	hide_vendor_sepolicy.addEventListener("click",async function (){
		//var vendor_sepolicy_toggle = await run(`grep -q 'hide_vendor_sepolicy=1' ${config}/config.sh && echo true || echo false`);
		if (custom_settings.hide_vendor_sepolicy==true){
			run(`sed -i 's/hide_vendor_sepolicy=1/hide_vendor_sepolicy=0/' ${config}/config.sh`)
			custom_settings.hide_vendor_sepolicy=false
			toast("Reboot to take effect");
		}
		else {
			//if (await run(`grep -q 'hide_vendor_sepolicy' ${config}/config.sh && echo true || echo false`)=="false") run(`echo 'hide_vendor_sepolicy=1' >> ${config}/config.sh`)
			/*else*/ run (`sed -i 's/hide_vendor_sepolicy=0/hide_vendor_sepolicy=1/' ${config}/config.sh`)
			custom_settings.hide_vendor_sepolicy=true
			toast("Reboot to take effect");
		}
	});

	// compat matrix toggle
	hide_compat_matrix.addEventListener("click",async function (){
		//var compat_matrix_toggle = await run(`grep -q 'hide_compat_matrix=1' ${config}/config.sh && echo true || echo false`);
		if (custom_settings.hide_compat_matrix==true){
			run(`sed -i 's/hide_compat_matrix=1/hide_compat_matrix=0/' ${config}/config.sh`)
			custom_settings.hide_compat_matrix=false
			toast("Reboot to take effect");
		}
		else {
			/*if (await run(`grep -q 'hide_compat_matrix' ${config}/config.sh && echo true || echo false`)=="false") run(`echo 'hide_compat_matrix=1' >> ${config}/config.sh`)
			else*/ run (`sed -i 's/hide_compat_matrix=0/hide_compat_matrix=1/' ${config}/config.sh`)
			custom_settings.hide_compat_matrix=true
			toast("Reboot to take effect");
		}
	});

	// fake service list toggle
	fake_service_list.addEventListener("click",async function (){
		//var fake_service_list_toggle = await run(`grep -q 'fake_service_list=1' ${config}/config.sh && echo true || echo false`);
		if (custom_settings.fake_service_list==true){
			run(`sed -i 's/fake_service_list=1/fake_service_list=0/' ${config}/config.sh`)
			custom_settings.fake_service_list=false
			toast("Reboot to take effect");
		}
		else {
			/*if (await run(`grep -q 'fake_service_list' ${config}/config.sh && echo true || echo false`)=="false") run(`echo 'fake_service_list=1' >> ${config}/config.sh`)
			else*/ run (`sed -i 's/fake_service_list=0/fake_service_list=1/' ${config}/config.sh`)
			custom_settings.fake_service_list=true
			toast("Reboot to take effect");
		}
	});
}

// custom sus path
async function custom_sus_path(){
	const load_sus_path = document.getElementById("load_sus_path");
	const sus_path_area = document.getElementById("custom_sus_path");
	const save_sus_path = document.getElementById("save_sus_path");

	// Load the custom SUS PATH
	load_sus_path.addEventListener("click",async ()=>{
		sus_path_area.innerHTML=await run(`cat ${config}/sus_path.txt`);
	})

	// Save the custom SUS PATH
	save_sus_path.addEventListener("click",async ()=>{
		var save_sus_path_val=sus_path_area.value;
		//console.log(save_sus_path_val);
		// Check if the input is empty
		if (save_sus_path_val=='') {
			toast('please press load first!');
		} 
		else{
			await run(`echo '${save_sus_path_val}' > ${config}/sus_path.txt`);
			toast("Custom SUS_PATH saved!");
			toast("Reboot to take effect");
		}
	})
}

// custom sus path loop
async function custom_sus_path_loop(susfs_version_decimal){
	const load_sus_path_loop = document.getElementById("load_sus_path_loop");
	const sus_path_loop_area = document.getElementById("custom_sus_path_loop");
	const save_sus_path_loop = document.getElementById("save_sus_path_loop");
	const sus_path_loop_section = document.getElementById("sus_path_loop_section");

	// Check if the susfs version is 1.5.9 or higher
	if (susfs_version_decimal > 158) {
		sus_path_loop_section.classList.remove("hidden");
	}
	else {
		return;
	}
	// Load the custom SUS PATH
	load_sus_path_loop.addEventListener("click",async ()=>{
		sus_path_loop_area.innerHTML=await run(`cat ${config}/sus_path_loop.txt`);
	})

	// Save the custom SUS PATH
	save_sus_path_loop.addEventListener("click",async ()=>{
		var save_sus_path_loop_val=sus_path_loop_area.value;
		//console.log(save_sus_path_val);
		// Check if the input is empty
		if (save_sus_path_loop_val=='') {
			toast('please press load first!');
		} 
		else{
			await run(`echo '${save_sus_path_loop_val}' > ${config}/sus_path_loop.txt`);
			toast("Custom SUS_PATH_LOOP saved!");
			toast("Reboot to take effect");
		}
	})
}

// custom sus maps
async function custom_sus_maps(susfs_features){
	const sus_maps_section = document.getElementById("sus_maps_section");
	const load_sus_maps = document.getElementById("load_sus_maps");
	const sus_maps_area = document.getElementById("custom_sus_maps");
	const save_sus_maps = document.getElementById("save_sus_maps");

	// check if sus_maps is enabled in kernel
	if (susfs_features.includes("CONFIG_KSU_SUSFS_SUS_MAP")) {
		sus_maps_section.classList.remove("hidden");
	}
	else {
		return;
	}

	// Load the custom SUS MAPS
	load_sus_maps.addEventListener("click",async ()=>{
		sus_maps_area.innerHTML=await run(`cat ${config}/sus_maps.txt`);
	})

	// Save the custom SUS MAPS
	save_sus_maps.addEventListener("click",async ()=>{
		var save_sus_maps_val=sus_maps_area.value;
		// Check if the input is empty
		if (save_sus_maps_val=='') {
			toast('please press load first!');
		}
		else{
			await run(`echo '${save_sus_maps_val}' > ${config}/sus_maps.txt`);
			toast("Custom SUS_MAPS saved!");
			toast("Reboot to take effect");
		}
	})
}

// custom sus mount
async function custom_sus_mount(){
	const load_sus_mount = document.getElementById("load_sus_mount");
	const sus_mount_area = document.getElementById("custom_sus_mount");
	const save_sus_mount = document.getElementById("save_sus_mount");
	//const mainContainer = document.querySelector('main');

	// Load the custom SUS MOUNT
	load_sus_mount.addEventListener("click",async ()=>{
		sus_mount_area.innerHTML=await run(`cat ${config}/sus_mount.txt`);
	})

	// Save the custom SUS MOUNT
	save_sus_mount.addEventListener("click",async ()=>{
		var save_sus_mount_val=sus_mount_area.value;
		// Check if the input is empty
		if (save_sus_mount_val=='') {
			toast('please press load first!');
		} 
		else{
			await run(`echo '${save_sus_mount_val}' > ${config}/sus_mount.txt`);
			toast("Custom SUS_MOUNT saved!");
			toast("Reboot to take effect");
		}
	})
}

// custom try umount
async function custom_try_umount(){
	const load_try_umount = document.getElementById("load_try_umount");
	const try_umount_area = document.getElementById("custom_try_umount");
	const save_try_umount = document.getElementById("save_try_umount");
	const mainContainer = document.querySelector('main');

	// Load the custom SUS MOUNT
	load_try_umount.addEventListener("click",async ()=>{
		try_umount_area.innerHTML=await run(`cat ${config}/try_umount.txt`);
	})

	// Save the custom SUS MOUNT
	save_try_umount.addEventListener("click",async ()=>{
		var save_try_umount_val=try_umount_area.value;
		
		// Check if the input is empty
		if (save_try_umount_val=='') {
			toast('please press load first!');
		} 
		else{
			await run(`echo '${save_try_umount_val}' > ${config}/try_umount.txt`);
			toast("Custom TRY_UMOUNT saved!");
			toast("Reboot to take effect");
		}
	})

	//Keyboard
	try_umount_area.addEventListener('focus', () => {
		// Add padding to prevent the keyboard from obscuring content
		mainContainer.style.paddingBottom = '300px'; // Adjust padding value based on need
		try_umount_area.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
	});
	
	// Remove padding when the input loses focus
	try_umount_area.addEventListener('blur', () => {
		// Remove the padding when the input loses focus
		//mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
		/*setTimeout(() => {
			mainContainer.style.paddingBottom = '0px';
		}, 500);*/
		gsap.to(mainContainer, { 
			duration: 0.5, 
			paddingBottom: '0px', 
			ease: 'power1.out' 
		});
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
	{ id: 'status_overlayfs_auto_kstat', config: 'CONFIG_KSU_SUSFS_SUS_OVERLAYFS', version: 158 },
	{ id: 'status_magic_mount', config: 'CONFIG_KSU_SUSFS_HAS_MAGIC_MOUNT', version: 1511 },
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
          span.textContent = 'Enabled';
          span.setAttribute('data-i18n', 'enabled_label');
        } else {
			if (deprecated_features.some(df => df.id === feature.id && susfs_version_decimal >= df.version)) {
				statusElement.className = 'badge badge-sm badge-secondary text-sm ml-4';
				span.textContent = 'Deprecated';
				span.setAttribute('data-i18n', 'deprecated_label');
			} else {
				statusElement.className = 'badge badge-sm badge-error text-sm ml-4';
				span.textContent = 'Disabled';
				span.setAttribute('data-i18n', 'disabled_label');
			}
        }
      }
    } catch (error) {
      // If we can't determine the status, mark as unknown
      const statusElement = document.getElementById(feature.id);
      if (statusElement) {
        const span = statusElement.querySelector('span');
        statusElement.className = 'badge badge-sm badge-warning text-sm ml-4';
        span.textContent = 'Unknown';
        span.setAttribute('data-i18n', 'unknown_label');
      }
    }
  }
}

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

function susfs_send_logs(){
	const susfs_send_logs_btn = document.getElementById('susfs_send_logs');
	susfs_send_logs_btn.addEventListener('click', async function(event) {
		try {
		await run(`cat /proc/$(pidof zygote64)/mountinfo > /data/adb/ksu/susfs4ksu/zygote64_mountinfo.txt`);
		await run(`cat /proc/$(pidof zygote64)/maps > /data/adb/ksu/susfs4ksu/zygote64_maps.txt`);
		await run(`cat /proc/1/mountinfo > /data/adb/ksu/susfs4ksu/pid1_mountinfo.txt`);
		await run(`cp /data/adb/ksu/log/dmesg.log /data/adb/ksu/susfs4ksu/dmesg.log`);
		await run(`dmesg | grep susfs > /data/adb/ksu/susfs4ksu/latest_dmesg_susfs.log`);
		await run(`tar -C /data/adb/ksu/susfs4ksu/ -czvf /sdcard/susfs_logs.tar.gz .`);
		toast("Logs saved to /sdcard/susfs_logs.tar.gz");
		await run(`am start -a android.intent.action.SEND -t '*/*' -c android.intent.category.DEFAULT --eu android.intent.extra.STREAM 'file:///sdcard/susfs_logs.tar.gz'`);
		} catch (error) {
			toast("Failed to prepare logs: " + error.message);
		}
	});
}

// Initialize the page
susfs_send_logs();
susfs_reset();
set_uname(settings);
susfs_log_toggle(settings);

// Susfs binary check and update
if (settings.disable_webui_bin_update==false) {
	const susfs_check=await run (`sh ${moddir}/susfs-bin-check.sh ${susfs_version_decimal.toString()} ${kernel_variant.toLowerCase()}`)
	if (susfs_check=="mismatch"){
		susfs_bin_update(susfs_version_decimal, kernel_variant);
	}
}