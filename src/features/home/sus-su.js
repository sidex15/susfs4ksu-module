import { exec, toast } from 'kernelsu';
import { run, versionAtLeast } from '../../utils.js';
import { config, susfs_bin } from '../../core/constants.js';

//sus_su toggle
export async function sus_su_toggle(settings, susfs_versions) {
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
