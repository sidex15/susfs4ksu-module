import { toast } from 'kernelsu';
import { run } from '../../utils.js';
import { moddir } from '../../core/constants.js';

// SUSFS binary update
export async function susfs_bin_update(susfs_versions, kernel_variant) {
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
