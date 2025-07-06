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
const susfsd="/data/adb/ksu/bin/susfsd";
const settings = catToObject(await run(`cat ${config}/config.sh`));

//susfs version and kernel variant
var susfs_version = await run(`grep version= ${moddir}/module.prop | cut -d '=' -f 2`);
var susfs_version_decimal=parseFloat(susfs_version.replace(/[v.]/g,""));
const susfs_version_tag = document.getElementById("susfs_version");
susfs_version_tag.innerHTML=susfs_version
const susfs_features = await run(`${susfs_bin} show enabled_features || ${susfsd} features`);
const kernel_variant = await run(`${susfsd} variant || ${susfs_bin} show variant`);

//susfs binary check
const susfs_bin_hash= await run(`sha256sum ${susfs_bin} | awk '{print $1}'`);
const susfs_cloud_hash = await run (`curl "https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/main/${susfs_version_decimal.toString()}/${kernel_variant.toLowerCase()}/ksu_susfs_arm64" | sha256sum | awk '{print $1}'`)
const susfs_command = `busybox wget -T 10 --no-check-certificate -qO - "https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/main/${susfs_version_decimal.toString()}/${kernel_variant.toLowerCase()}/ksu_susfs_arm64" | sha256sum | awk '{print $1}'`
//console.log(`SUSFS Version: ${susfs_version_decimal}`);
//console.log(`SUSFS kernel variant: ${kernel_variant.toLowerCase()}`);
//console.log(`SUSFS binary SHA256: ${susfs_bin_hash}`);
//console.log(`SUSFS cloud SHA256: ${susfs_cloud_hash}`);

if (susfs_bin_hash!=susfs_cloud_hash){
	susfs_bin_update(susfs_version_decimal, kernel_variant);
}

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
		set_uname(settings);
		susfs_log_toggle(settings);
		if (susfs_version_decimal>=154) auto_hide_settings(settings,susfs_version_decimal);
		sus_su_toggle(settings);
    } else if (currentPath === '/custom.html') {
		//console.log("in custom");
		custom_toggles(settings);
		custom_rom_settigs(settings);
		custom_sus_mount();
		custom_try_umount();
		custom_sus_path();
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
				toast(`SUSFS binary updated to version ${susfs_version} for ${kernel_variant} kernel variant!`);
			}
			catch (error) {
				toast(`Error updating SUSFS binary: ${error}`);
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
	var is_umount_for_zygote_iso_service = await run(`[ -f data/adb/susfs_umount_for_zygote_iso_service ] && echo true || echo false`);
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
		if (custom_settings.hide_sus_mnts_for_all_procs==1){
		hide_sus_mnts_for_all_procs.checked="checked";
		}
		else{
			hide_sus_mnts_for_all_procs.checked=false;
		}
	}
	if (susfs_version_decimal>=158){
		umount_for_zygote_iso_service.removeAttribute("disabled");
		if (is_umount_for_zygote_iso_service=="true"){
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
		is_umount_for_zygote_iso_service = await run(`[ -f data/adb/susfs_umount_for_zygote_iso_service ] && echo true || echo false`);
		if (is_umount_for_zygote_iso_service=="true"){
			await run(`rm -f data/adb/susfs_umount_for_zygote_iso_service`);
			await run(`${susfs_bin} umount_for_zygote_iso_service 0`);
			is_umount_for_zygote_iso_service=="false";
			toast("Try umount for zygote isolation service disabled! No need to reboot");
		}
		else{
			await run(`touch data/adb/susfs_umount_for_zygote_iso_service`);
			await run(`${susfs_bin} umount_for_zygote_iso_service 1`);
			is_umount_for_zygote_iso_service=="true";
			toast("Try umount for zygote isolation service enabled! No need to reboot");
		}
	});

	hide_sus_mnts_for_all_procs.addEventListener("click",async function(){
		if (custom_settings.hide_sus_mnts_for_all_procs==1){
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
		if (sus_uname.value.includes(' ')) {
			toast('Spaces are not allowed in the input!');
		} 
		else {
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
				document.getElementById("kernel_version").innerHTML= await run(`uname -a | cut -d' ' -f3-`);
				sus_uname.value='';
				sus_uname_build.value='';
				set_uname.blur();
			}
		}
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
	//var config_sh = await run(`cat ${config}/config.sh`);

	// Convert the string content to an object
	const custom_settings = settings;

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
}

async function custom_rom_settigs(settings) {
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
			toast("Custom SUS PATH saved!");
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
			toast("Custom SUS MOUNT saved!");
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
			toast("Custom SUS MOUNT saved!");
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
          statusElement.className = 'badge badge-sm badge-error text-sm ml-4';
          span.textContent = 'Disabled';
          span.setAttribute('data-i18n', 'disabled_label');
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

// Initialize the page
set_uname(settings);
susfs_log_toggle(settings);