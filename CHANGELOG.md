## v1.5.2+ Revision 26
### Notes
The development for this module will be expected to be slower than usual as I'm doing on Master's thesis in my post-graduate studies... But if issues persists I will take issues and fix them as soon as possible, just submit an issue request... PRs are welcome though! 😊

### WebUI
* Add skip legit mounts toggle for auto try umount (userspace)
* Implement Set Stock Kernel Build Date button for Spoof Kernel Uname Section
* Refactor JS codebase
* Fix custom settings toggles and remove redundant scripts in vite config
* Fix keyboard issue on custom open redirect
* Localization
    * New Crowdin translations by GitHub Action
    * update languages xml

### Scripts
* scripts: boot-completed: add skip_legit_mounts option to skip legit mounts from auto try_umount list
    * You could add more legit mounts to exclude on `/data/adb/susfs4ksu/legit_mounts.txt`
* scripts: customize: add user option to reset or keep susfs4ksu settings
* scripts: boot-completed: Refactor custom sus_path and sus_path_loop functions
* scripts: config: set hide_sus_mnts_for_all_or_non_su_procs=1 by default
* scripts: boot-completed: improve susfs version sed matching
* scripts: config: Disable all settings by default
* Revert "scripts: service: use susfs open redirect for hide_vendor_sepolicy hide_compat_matrix and fake_service_list for susfs v2.0.0+"
* scripts: service: Uncomment kstat commands in service.sh
* scripts: service: log bind mounts on hide vendor sepolicy and hide compat matrix
* scripts: customize: add legit_mounts.txt to the persistent dir folder
* scripts/workflow: customize: exclude README.md and LICENSE in the ci module content

### Misc
* Add susfs4ksu shortcut icon