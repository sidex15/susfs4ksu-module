## v1.5.2+ Revision 21
### WebUI
* Introduce custom sus_path_loop section for latest v1.5.9+
* Add checkbox for uname version and build date in Spoof Uname section
* Use hide_sus_mnts_for_all_procs config instead of creating /data/adb/susfs_umount_for_zygote_iso_service
* Implement AVC Log Spoofing toggle for v1.5.9+
* Add Emulate Vold App Data Emulation Toggle v1.5.8+
* Add capability to disable webui binary update if disable_webui_bin_update=1
* Fix toast messages in custom settings   
* Localization:
  * Fix Various translations (@mehu3dhokia, @Alohaa666, @ziomek3120)
### Scripts
* scripts: boot-completed: introduce custom sus_path_loop configuration for latest v1.5.9+
* scripts: customize: add sus_path_loop.txt
* scripts: config: add disable_webui_bin_update config
* scripts: boot-completed/config: implement vold app data emulation
* scripts: post-fs-data/config: implement avc log spoofing feature
* scripts: post-fs-data/config: implement umount for zygote isolated service config
* scripts: customize/boot-completed: improve search for the SuSpicious module
* scripts: boot-completed: tighten search for LH_SUS_MOUNT and LH_TRY_UMOUNT_PATH string
* scripts: add 'susfs:' search string in susfs logs
* scripts: boot-completed: use susfsd for checking susfs version
* scripts: boot-completed: wait for /sdcard/Android/data (@backslashxx)
* scripts: boot-completed: wait for decrypt before sus_path (@backslashxx)
* scripts: post-fs-data: follow the rules of GitHub Community guidelines.
### Misc
* selinux: allow netd rule for bindhosts susfs open redirect mode
* sepolicy: allow zygote apk_data_file dir
* sepolicy: add rule for sus_path_loop
* config: update sus_path.txt

## Note: If you have a problem with YouTube/YouTube Music Revanced not working after updating this module, you should disable the umount toggle in the YouTube app, or see issue [here](https://github.com/sidex15/susfs4ksu-module/issues/160)