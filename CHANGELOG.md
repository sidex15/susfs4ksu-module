## v1.5.2+ Revision 23
### WebUI
* Add Danger Zone section
    * Send Logs
    * Export Config
    * Reset all settings
* Implement Send Logs to SUSFS Developers
    * /sdcard/susfs_logs.tar.gz contains the following:
        1. All of the SUSFS stats and boot/dmesg logs (until boot-completed)
        2. Latest Dmesg Log of SUSFS
        3. Mountinfo and Maps of Zygote64
        4. Mountinfo of PID 1
        5. Dmesg Log of KSU
* Implement Export Config (saved at /sdcard/susfs_settings.tar.gz)
* Implement Reset all settings
* Implement Custom SUS_MAP section
* Redesign Stats Display
* Add 'Edit With' button to use external text editor app on custom sus_path sus_path_loop sus_map sus_mount and try_umount section
* Various responsive design fixes
    * Improved layout for smaller and bigger screens
    * Custom sus_path, sus_path loop, sus_map, sus_mount, and try_umount text box fields are slightly bigger
* Add deprecated label for SUSFS Features that has been deprecated on newer versions
* Fix susfs_version_decimal function
* Localization:
    * Update Various translations (@mehu3dhokia, @luigimak, @Neebe3289)

### Scripts
* scripts: Implement Custom SUS_MAP for late v1.5.12+
* scripts: add susfs_reset.sh

### [Binaries](https://github.com/sidex15/susfs4ksu-binaries)
* cloud-binaries: add v1.5.11 and v1.5.12 binaries to cloud

### Note
Use a rooted code editor of your choice if you use open with button because non-root apps don't have access