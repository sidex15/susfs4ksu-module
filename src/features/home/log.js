import { toast } from 'kernelsu';
import { run } from '../../utils.js';
import { config } from '../../core/constants.js';

//susfs log toggle
export async function susfs_log_toggle(settings) {
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
