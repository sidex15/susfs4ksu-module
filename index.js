import { exec, toast } from 'kernelsu';
import Highway from '@dogstudio/highway';
import { gsap } from 'gsap';
import Fade from './fade.js';
import './space.js';

//module location
const tmpfolder="/data/adb/ksu/susfs4ksu"
const moddir="/data/adb/modules/susfs4ksu"
const config="/data/adb/susfs4ksu"
const susfs_bin="/data/adb/ksu/bin/ksu_susfs"
const settings = catToObject(await run(`cat ${config}/config.sh`));
//susfs_version
var susfs_version = await run(`grep version= ${moddir}/module.prop | cut -d '=' -f 2`);
var susfs_version_decimal=parseFloat(susfs_version.replace(/[v.]/g,""));
const susfs_version_tag = document.getElementById("susfs_version");
susfs_version_tag.innerHTML=susfs_version

//susfs stats and kernel version
var is_log_empty=await run (`[ -s ${tmpfolder}/logs/susfs.log ] && echo false || echo true`);
var susfs_stats = catToObject(await run(`cat ${tmpfolder}/susfs_stats.txt`));
const kernel_variant = await run(`${susfs_bin} show variant`);
if (is_log_empty=="true"){
	susfs_stats = catToObject(await run(`cat ${tmpfolder}/susfs_stats1.txt`));
	toast("susfs_stats.txt is empty/missing. Showed Stats from module script");
}

function catToObject(cat){
	// Convert the string content to an object
	const obj = cat
	.split('\n')                    // Split into lines
	.filter(line => line.includes('='))  // Filter valid lines
	.reduce((acc, line) => {
		const [key, value] = line.split('=').map(str => str.trim());
		acc[key] = Number(value); // Map values
		return acc;
	}, {});

	return obj
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
	auto_hide_settings();
}

//highway transition
const H = new Highway.Core({
	transitions: {
		default: Fade
	}
});

//execute again after the transition ends
H.on('NAVIGATE_END', async ({ to, from, trigger, location }) => {
	const settings = catToObject(await run(`cat ${config}/config.sh`));
	var currentPath = window.location.pathname;
    // Add specific script initializations here
    if (currentPath === '/index.html') {
		console.log("in index");
        keyboard_pop();
		set_uname(settings);
		susfs_log_toggle(settings);
		if (susfs_version_decimal>=154) auto_hide_settings();
		sus_su_toggle(settings);
    } else if (currentPath === '/custom.html') {
		//console.log("in custom");
		custom_toggles(settings);
		custom_sus_mount();
		custom_try_umount();
		custom_sus_path();
    }
});


//run function
async function run(cmd) {
	const { errno, stdout, stderr } = await exec(cmd);
	if (errno != 0) {
		toast(`stderr: ${stderr}`);
		return undefined;
	} else {
		return stdout;
	}
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

async function auto_hide_settings() {
	const auto_mount = document.getElementById("auto_mount");
	const auto_bind = document.getElementById("auto_bind");
	const auto_umount_bind = document.getElementById("auto_umount_bind");
	const try_umount_zygote = document.getElementById("try_umount_zygote");
	var is_auto_mount = await run(`[ -f data/adb/susfs_no_auto_add_sus_ksu_default_mount ] && echo true || echo false`);
	var is_auto_bind = await run(`[ -f data/adb/susfs_no_auto_add_sus_bind_mount ] && echo true || echo false`);
	var is_auto_umount_bind = await run(`[ -f data/adb/susfs_no_auto_add_try_umount_for_bind_mount ] && echo true || echo false`);
	var is_try_umount_zygote = await run(`[ -f data/adb/susfs_umount_for_zygote_system_process ] && echo true || echo false`);

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

	auto_mount.addEventListener("click",async function(){

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

}

//sus_su for 1.5.2
/*async function sus_su_radio() {
	const sus_su_0 = document.getElementById("sus_su_0");
	const sus_su_1 = document.getElementById("sus_su_1");
	const sus_su_2 = document.getElementById("sus_su_2");
	const enable_sus_su_1 = document.getElementById("enable_sus_su_1");
	const enable_sus_su_2 = document.getElementById("enable_sus_su_2");
	var is_sus_su_mode_1 = await run(`if grep -q '^enable_sus_su_mode_1$' ${moddir}/post-fs-data.sh; then echo true; else echo false; fi;`);
	var is_sus_su_mode_2 = await run(`if grep -q '^sus_su_2$' ${moddir}/service.sh; then echo true; else echo false; fi;`);
	var is_sus_su_mode = await run(`cat ${moddir}/sus_su_mode`);
	//toast(`sus_su on boot: ${is_sus_su_mode_1}`);
	//toast(`sus_su: ${is_sus_su_enable}`);
	if(is_sus_su_mode=='1'){
		sus_su_0.checked=false
		sus_su_1.checked="checked"
		sus_su_2.checked=false
	}
	else if(is_sus_su_mode=='2'){
		sus_su_0.checked=false
		sus_su_1.checked=false
		sus_su_2.checked="checked"
	}
	else if(is_sus_su_mode=='0'){
		sus_su_0.checked="checked"
		sus_su_1.checked=false
		sus_su_2.checked=false
	}

	if(is_sus_su_mode_1=="true"){
		sus_su_1.removeAttribute("disabled");
		enable_sus_su_1.setAttribute("checked","checked");
	}
	else{
		sus_su_1.setAttribute("disabled","");
		enable_sus_su_1.removeAttribute("checked");
	}
	if (is_sus_su_mode_2=="false"){
		enable_sus_su_2.removeAttribute("checked");
	}
	
	enable_sus_su_1.addEventListener("click", async function(){
		if (enable_sus_su_1.hasAttribute("checked")){
			console.log("false")
			enable_sus_su_1.removeAttribute("checked");
			toast("Reboot to take effect");
			run(`sed -i 's/^enable_sus_su_mode_1$/#enable_sus_su_mode_1/' ${moddir}/service.sh`);
		}
		else{
			console.log("true")
			enable_sus_su_1.setAttribute("checked","checked");
			toast("Reboot to take effect");
			run(`sed -i 's/^#enable_sus_su_mode_1$/enable_sus_su_mode_1/' ${moddir}/service.sh`);
		}
	});
	enable_sus_su_2.addEventListener("click", async function(){
		if (enable_sus_su_2.hasAttribute("checked")){
			console.log("false")
			enable_sus_su_2.removeAttribute("checked");
			toast("Reboot to take effect");
			run(`sed -i 's/^sus_su_2$/#sus_su_2/' ${moddir}/service.sh`);
		}
		else{
			console.log("true")
			enable_sus_su_2.setAttribute("checked","checked");
			toast("Reboot to take effect");
			run(`sed -i 's/^#sus_su_2$/sus_su_2/' ${moddir}/service.sh`);	
		}
	});
}*/


//Toast function
/*function showToast(msg){
	const sustoast = document.getElementById('toast');
	sustoast.textContent = msg;

	// Show and animate the toast
	sustoast.classList.remove('opacity-0','hidden');

	// Hide the toast after 3 seconds
	setTimeout(() => {
		sustoast.classList.add('opacity-0');
		
		// Completely hide after animation
		setTimeout(() => {
			sustoast.classList.add('hidden');
		}, 300); // Match the duration of the transition
	}, 3000);
}*/

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

	// Convert the string content to an object
	const custom_settings = settings;

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
		var sus_uname=document.getElementById("sus_uname");
		if (sus_uname.value.includes(' ')) {
			toast('Spaces are not allowed in the input!');
		} 
		else {
			if(sus_uname.value==''){
				console.log("default kernel version");
				run(`${susfs_bin} set_uname 'default' 'default'`)
				run(`echo default > ${config}/kernelversion.txt`)
				document.getElementById("kernel_version").innerHTML= await run(`uname -a | cut -d' ' -f3-`);
				set_uname.blur();
			}
			else{
				console.log(`sets to ${sus_uname.value}`);
				run(`${susfs_bin} set_uname '${sus_uname.value}' 'default'`)
				run(`echo ${sus_uname.value} > ${config}/kernelversion.txt`)
				document.getElementById("kernel_version").innerHTML= await run(`uname -a | cut -d' ' -f3-`);
				sus_uname.value='';
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
			modalMessage.textContent = `Setting this on may cause a bootloop or instability if spoofed incorrectly. Are you sure you want to enable post-fs-data execution?`;
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
	const hide_custom_rom = document.getElementById("hide_custom_rom");
	const more_custom_rom = document.getElementById("more_custom_rom");
	const hide_gapps = document.getElementById("hide_gapps");
	const hide_revanced = document.getElementById("hide_revanced");
	const spoof_cmdline = document.getElementById("spoof_cmdline");
	const hide_ksu_loop = document.getElementById("hide_ksu_loop");
	const force_hide_lsposed = document.getElementById("force_hide_lsposed");
	const hide_vendor_sepolicy = document.getElementById("hide_vendor_sepolicy");
	const hide_compat_matrix = document.getElementById("hide_compat_matrix");
	const fake_service_list = document.getElementById("fake_service_list");
	//var config_sh = await run(`cat ${config}/config.sh`);

	// Convert the string content to an object
	const custom_settings = settings;

	// Set initial state first
	if (custom_settings.hide_cusrom==true){
		hide_custom_rom.checked="checked";
		more_custom_rom.classList.remove("hidden");
	}
	else{
		hide_custom_rom.checked=false
		more_custom_rom.classList.add("hidden");
	}
	if (custom_settings.hide_vendor_sepolicy==true) hide_vendor_sepolicy.checked="checked";
	else hide_vendor_sepolicy.checked=false;
	if (custom_settings.hide_compat_matrix==true) hide_compat_matrix.checked="checked";
	else hide_compat_matrix.checked=false;
	if (custom_settings.fake_service_list==true) fake_service_list.checked="checked";
	else fake_service_list.checked=false;
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

	// custom rom toggle
	hide_custom_rom.addEventListener("click",async function (){
		//var vendor_sepolicy_toggle = await run(`grep -q 'hide_cusrom=1' ${config}/config.sh && echo true || echo false`);
		const more_custom_rom = document.getElementById("more_custom_rom");
		if (custom_settings.hide_cusrom==true){
			run(`sed -i 's/hide_cusrom=1/hide_cusrom=0/' ${config}/config.sh`)
			custom_settings.hide_cusrom=false
			more_custom_rom.classList.add("hidden");
			toast("Reboot to take effect");
		}
		else {
			//if (await run(`grep -q 'hide_cusrom' ${config}/config.sh && echo true || echo false`)=="false") run(`echo 'hide_cusrom=1' >> ${config}/config.sh`)
			/*else*/ run (`sed -i 's/hide_cusrom=0/hide_cusrom=1/' ${config}/config.sh`)
			custom_settings.hide_cusrom=true
			more_custom_rom.classList.remove("hidden");
			toast("Reboot to take effect");
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

//Keyboard
function keyboard_pop(){
const inputBox = document.getElementById('sus_uname');
const mainContainer = document.querySelector('main');

inputBox.addEventListener('focus', () => {
    // Add padding to prevent the keyboard from obscuring content
    mainContainer.style.paddingBottom = '350px'; // Adjust padding value based on need
    inputBox.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
});

inputBox.addEventListener('blur', () => {
    // Remove the padding when the input loses focus
    mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
	setTimeout(() => {
		mainContainer.style.paddingBottom = '0px';
	}, 500);
	
});
}

//susfsstats();
set_uname(settings);
keyboard_pop();
susfs_log_toggle(settings);