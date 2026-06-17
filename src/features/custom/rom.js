import { toast } from 'kernelsu';
import { run, setupBooleanToggle } from '../../utils.js';
import { config } from '../../core/constants.js';

// custom rom settings
export async function custom_rom_settings(settings) {
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
