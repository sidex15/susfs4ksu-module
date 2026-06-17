import { toast } from 'kernelsu';
import { run } from '../../utils.js';
import { moddir } from '../../core/constants.js';

// reset susfs
export function susfs_reset(){
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
