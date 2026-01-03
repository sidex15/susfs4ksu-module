## v1.5.2+ Revision 24
## Happy new year everyone! 🎉🎆 First Revision of 2026!
### WebUI
* add support for susfs v2.0.0+
* implement userspace auto try_umount feature (v1.5.5+)
    * This is a userspace approach to the auto_try_umount instead of the kernel-level auto try_umount
    * for susfs v2.0.0+ it uses ksud kernel umount feature if susfs try_umount is deprecated
* set values to false when the feature toggle is greyed out (susfs feature not supported)
* use new versioning system
* hide custom sus path if feature not in kernel
* hide custom sus_mount and custom try_umount under certain conditions
* add KSU module list in send logs
* deprecate susfsd
* remove susfsd when checking the kernel variant
* fix sus_su on boot toggle
* Localization:
    * Update Various translations (@mehu3dhokia, @DogancanYr, @Neebe3289)

### Scripts
* scripts: boot-completed: implement userspace auto try_umount feature
* scripts: boot-completed: use ksud kernel umount on custom try_umount if susfs try_umount is disabled/deprecated (KernelSU v2.0+)
* scripts: boot-completed: execute ksud umount enable first before executing ksud kernel umount
* scripts: boot-completed: improve if statement on auto_try_umount (userspace) feature
* scripts: boot-completed/sepolicy: Add ksud kernel unmount for revanced mounts
* scripts: boot-completed: count 'try_umount (KSUD)' logs to susfs_stats.txt
* scripts: boot-completed: move enable ksud umount feature to the bottom before susfs logging
* scripts: boot-completed: Fallback to older susfs mount IDs if no mounts found within 500k range
* scripts: boot-completed: update grep pattern to match mount IDs starting with 1, 3, or 5 (100000-199999, 300000-399999, 500000-599999)
* scripts: boot-completed: Automatically disable and skip userspace auto try umount if susfs_no_auto_add_try_umount_for_bind_mount file does not exist for susfs v1.5.5-v1.5.12
* scripts: boot-completed: fix logical error on hide sus mounts for all processes
* scripts: service: always disable and never check  sus_su when the susfs version is v2.0.0+
* scripts: remove old kernel_ver variable
* scripts: boot-completed: Update version check to include v2.x.x on set_sdcard_root_path and set_android_data_root_path
* scripts: rework versioning system
* scripts: deprecate susfsd
* scripts: customize: don't install sus_su and susfsd if the susfs version is on v2.0.0+
* scripts: Hide "lineage" from /vendor/etc/selinux/vendor_file_contexts (#193) (@gavdoc38)
* scripts: post-fs-data: use ksu_susfs show enabled_features to check if susfs is supported
* scripts: customize/binaries: appropriately check susfs implementation by checking KernelSU version

### [Binaries](https://github.com/sidex15/susfs4ksu-binaries)
* local-binaries: add susfs v2.0.0 local binary
* cloud-binaries: add support for v2.0.0+
* cloud-binaries: add new branch for new versioning system

### Notes
* Sorry for the very late update :( I was very busy for my Master studies and testing susfs v2.0.0 on non-gki
* I just wanna thank to all [susfs4ksu module CI](https://github.com/sidex15/susfs4ksu-module/actions) testers there for testing the new features and bug hunting my module 🫡