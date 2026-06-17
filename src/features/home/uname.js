import { toast } from 'kernelsu';
import { gsap } from 'gsap';
import { run } from '../../utils.js';
import { config, susfs_bin } from '../../core/constants.js';

//set uname function
export async function set_uname(settings) {
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
