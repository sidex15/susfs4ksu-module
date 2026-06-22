import { FileSelector } from '../file_selector/file_selector.js';
import { toast } from 'kernelsu';
import { run, catToObject, parseVersion, versionAtLeast } from '../../utils.js';
import { config } from '../../core/constants.js';
import { sus_su_toggle } from './sus-su.js';
import { set_uname } from './uname.js';
import { susfs_log_toggle } from './log.js';
import { auto_hide_settings } from '../auto-hide/auto-hide.js';
import { export_susfs_config } from './export-logs.js';

export function susfs_import_config(susfs_versions, susfs_features) {
    const fileSelector = new FileSelector();
    fileSelector.appendTo(document.body);
    const importButton = document.getElementById('susfs_import');
    const confirm_import_modal = document.getElementById('confirm_import_modal');
    const import_modal_cancel = document.getElementById('import_modal_cancel');
    const import_modal_confirm = document.getElementById('import_modal_confirm');
    const import_modal_backup = document.getElementById('import_modal_backup');
    importButton.addEventListener('click', async () => {
        fileSelector.getFilePath('tar.gz').then(async (filePath) => {
            if (!filePath) {
                toast('No file selected.');
                return;
            }
            const ifLegitSusfsConfig = await run(`tar -tzf "${filePath}"`);
            console.log(ifLegitSusfsConfig);
            if (!ifLegitSusfsConfig.includes('config.sh')) {
                toast('Selected file is not a valid SUSFS config backup.');
                return;
            }
            confirm_import_modal.showModal();
            import_modal_cancel.addEventListener('click', () => {
                confirm_import_modal.close();
            });
            import_modal_confirm.addEventListener('click', async () => {
                try {
                    await run(`tar -xzf "${filePath}" -C ${config}`);
                    toast('Config imported successfully. Please reboot to apply changes.');
                    const settings = catToObject(await run(`cat ${config}/config.sh`));
                    set_uname(settings);
                    susfs_log_toggle(settings);
                    if (versionAtLeast(susfs_versions, 1, 5, 4)) auto_hide_settings(settings, susfs_features, susfs_versions);
                    sus_su_toggle(settings, susfs_versions);
                } catch (error) {
                    toast('Failed to import config: ' + error.message);
                }
                confirm_import_modal.close();
            });
            import_modal_backup.addEventListener('click', async () => {
                await export_susfs_config();
            });
        });
    });
}