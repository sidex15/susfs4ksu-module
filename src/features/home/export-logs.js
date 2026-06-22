import { toast } from 'kernelsu';
import { run } from '../../utils.js';

// send logs
export function susfs_send_logs(){
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
export function susfs_export_config(){
	const susfs_export_config_btn = document.getElementById('susfs_export');
	susfs_export_config_btn.addEventListener('click', async function(event) {
		await export_susfs_config();
	});
}

// export config function
export async function export_susfs_config() {
	try{
		var currentDate = new Date();
		var formattedDate = currentDate.getFullYear() + '-' +
			String(currentDate.getMonth() + 1).padStart(2, '0') + '-' +
			String(currentDate.getDate()).padStart(2, '0') + '_' +
			String(currentDate.getHours()).padStart(2, '0') + '-' +
			String(currentDate.getMinutes()).padStart(2, '0') + '-' +
			String(currentDate.getSeconds()).padStart(2, '0');
		await run(`tar -C /data/adb/susfs4ksu/ -czvf /sdcard/Download/susfs_settings_${formattedDate}.tar.gz .`);
		toast("Settings exported to /sdcard/Download/susfs_settings_" + formattedDate + ".tar.gz");
	}
	catch{
		toast("Failed to export settings");
	}
}