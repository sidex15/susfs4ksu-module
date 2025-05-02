## v1.5.2+ Revision 18
### WebUI
* Localization:
  * Add Arabic Language (Thanks @ZG089)
  * Add Persian Language (Thanks @AlirezaParsi)
  * Add Vietnamese Language (Thanks @Wuang26)
  * Add Russian Language (Thanks @Alohaa666)
  * Various fixes on Chinese language (Thank @YangQi0408 and @mehu3dhokia)
* Add a Dialog when SUSFS is not installed in the kernel
* Reduce Font Size
* Various UI Adjustments
* Rephrase susfs stats toast message
* Disable back handling for MMRL/WebUI-X
* fix blue character and add default yellow character
### Scripts
* scripts: action: implement susfs4ksu userspace tool update script
  * Action button to update susfs4ksu userspace binaries, so no need to reinstall the module when updating your kernel to the newest SUSFS version.
* scripts: customize: add susfsd from KernelSU-Next
* scripts: move mount folder to either /mnt or /mnt/vendor
* scripts: service/utils: remove check_vbmeta_prop function and add missing prop condition to check_reset_prop
* scripts: service/utils: Add ro.boot props if missing using check_missing_match_prop
* scripts: service: convert verifiedboothash value from uppercase to lowercase
* scripts: service/utils: prevent overwriting some ro.boot.vbmeta props using check_missing_prop
* scripts: service/customize: implement persistence on ro.boot.vbmeta.size (Thanks @TeenyAntX)
* scripts: config: make custom settings all disabled by default (Thanks @TeenyAntX)
* scripts: uninstall: add /data/adb/ksu/susfs4ksu
* scripts: service: reset vold app data isolation prop (Thanks @rifsxd)
* scripts: customize: chmod 644 to other scripts

## v1.5.2+ Revision 17
### WebUI
* Add Localization
  * Currently Supported languages:
    * English
    * 中文 (Thanks @ITxiao6666)
    * Indonesia (Thanks @imnathanzero)
    * Português (Thanks @pedroborraz)
    * Türkçe (Thanks @MematiBas42)
    * Español (Thanks UserDeleted74 from telegram)
    * Français (Thanks UserDeleted74 from telegram)
  * If you want to contribute for a translation follow the README and make a pull request.
* Change Main Menu and Custom settings fonts to AmaticSC
* Some UI Adjustments
* Disable all settings under hide custom rom paths when disable
* Declutter Code
### Scripts
* scripts/service/utils: add more vbmeta props
* scripts/service: remove generating susfslogs.txt on the module folder
* scripts: simplify and debloat codes on sus_su on boot.
* scripts/service: correct undefined $i variable in log output statements (Thanks @chisewaguri)
* scripts: move mounting directory to $MODDIR

## v1.5.2+ Revision 16
### WebUI
* Add spoof kernel build for spoof Kernel Uname
* Deprecate SUS_SU error message
* Add Spoof Service List in Custom settings
* objectify sus_su variables in sus_su_toggle
* Refactor and fix sus_su toggle functions
* Do not show sus_su is not available message when the kernel is NON-GKI
### Scripts
* scripts: add kernel build for spoof kernel uname on boot and add spoof variables in config.sh
* scripts/post-fs-data: no need for sus_mount when try_umount Thanks (@backslashxx)
* scripts/boot-completed: no need to delete webroot Thanks (@backslashxx)
* scripts/boot-completed: fix dynamic version to support for ci builds
* scripts/service: fix race conditions on sus_su
* scripts/service: Revert "feat(service.sh): Add final susfs activity check for sus_su=-1"
* scripts/customize: harden remote binary dl logic Thanks (@backslashxx)
* scripts/customize: add generic download function and use it Thanks (@backslashxx)

## v1.5.2+ Revision 15
### WebUI
* Check if it's NON-GKI then it will show that SUS_SU is not supported 
on NON-GKI kernels
* Convert susfs version into a decimal number for checking susfs features
### Scripts
* module: scripts/customize: use internet connection to install/update susfs binaries
  * If there's no internet connection or the binary of that version is not available yet it installs the latest local binaries in the module
  * The source of the susfs binaries are in this repo [susfs4ksu binaries](https://github.com/sidex15/susfs4ksu-binaries)
* scripts/service: check if sus_su is supported when config.sh says it doesn't
* scripts/service: Rename inconsistent variable sus_active to sus_su_active
* scripts/service: Add final susfs activity check for sus_su=-1
* scripts/customize: make unzip quiet ssshhhh

## v1.5.2-v1.5.4 Revision 14
### This fix is for GKI/SUS_SU Enabled SUSFS Users that mistakenly showed `SUSFS Is not available in your kernel` in WebUI
### For GKI/SUS_SU Enabled Users please change to `sus_su=2` in /data/adb/susfs4ksu/config.sh then reboot to see if it persists

### WebUI
* fix susfs logs location and remove susfs_stats is zero condition
### Scripts
* scripts/service: Rework sus_su checks
  * For SUSFS v1.5.3+ it will use the `show enabled_features` feature to check if sus_su is supported or not
  * For SUSFS v1.5.2 will use the traditional check if sus_su throws an error or not
  * Add Check if sus_su is in mode 0
* scripts/boot-completed: use susfs version to check different set cmdline command

### Note
If you want to get newer updates or nightly updates, check the actions tab of [susfs4ksu module Here](https://github.com/sidex15/susfs4ksu-module/actions)

## v1.5.2-v1.5.4 Revision 13
### WebUI
* Implement Auto Hide Settings For SUSFS v1.5.4
  * Auto Hide Default Mounts
  * Auto Hide Bind Mounts
  * Auto Try Umount Bind Mounts
  * Try Umount For Zygote System Process
* move tmpfolder location to /data/adb/ksu/susfs4ksu
* Change 'not supported' to 'not available' in sus_su support to ease up confusion
### Scripts
* Add fake_service_list for custom rom hiding
  * Set fake_service_list=1 in config.sh
  * Not available in WebUI Custom settings yet as it's untested
* module: add SUSFS v1.5.4 userspace binaries
* module: make dynamic install more friendly for continuous integration
* cmdline hw device name spoof (Proof of Concept)
* scripts/service: fake encryption status
* Script/boot-completed: replace hard coded path to mntfolder
* Script/boot-completed: add cmdline compatibility for newer susfs binaries
* scripts: add mntfolder for functions/features that's using mount and sus_mount
* move tmpfolder to /data/adb/susfs4ksu 
* txtfiles: remove redundant /debug_ramdisk
* txtfiles: remove /data/adb/modules on try_umount list
* module: drop META-INF
* scripts/customize: susfs is ksu only
* scripts: remove bashism
* scripts/service: prevent grep to wc -l piping
* module: drop 32-bit arm support

## v1.5.2-v1.5.3 Revision 12
### Highly Recommend to delete `/data/adb/susfs4ksu/config.sh` first before updating to prevent unwanted issues (You only do this once, you don't need to do it again in future versions)
### WebUI
* Introduce spoof kernel version uname on boot
  * also has an option "Execute on post-fs-data" for better hiding (Dangerous if used improperly)
* Deprecate SUS_SU 1 and only use SUS_SU 2
* Change SUS_SU Toggles the same as v1.4.2
* Remove `su -c` in all of run and exec functions to fix some devices that kernel panics when opening the webui
* Use /data/adb/ksu/bin/ksu_susfs for features that use ksu_susfs commands
* Auto detects SUS_SU support from sus_su, and sus_su_active values
* Warning will show if SUS_SU 1 is forcefully enabled.
* Replace error symbol to warning symbol if sus_fs is not installed in your kernel (to avoid confusion)
* Minor loading improvements

### Scripts
* Implement Dynamic install for v1.5.2+
  * Currently v1.5.2-v1.5.3
* Use Dynamic version in module version
* Fix try_umount param (thanks @etnperlong)
* Implement susfs_log, sus_su, and sus_su_active, and spoof_uname functions and configs
* Add ability to override for susfs activation (thanks @backslashxx)
	* `touch /data/adb/susfs4ksu/susfs_force_override`
* Add kernelversion.txt for kernel uname spoofing on boot
* Add new configs if the config doesn't exist on /data/adb/susfs4ksu/config.sh
* Other misc fixes (thanks @backslashxx)

## v1.5.2 Revision 11
### WebUI
* Implement Try Umount Section in custom settings page
* Implement additional custom rom settings
  * Hide vendor sepolicy (disabled by default)
  * Hide Compat Matrix (disabled by default)
* Significant code refactor on the stats menu to reduce lag when lauching.
* Significant code refactor custom toggles of custom settings menu to reduce lag when going to custom settings.
* Very minor UI adjustments.
* UI adjust for MMRL
### Scripts
* Implement Compat Matrix hide for the latest native detector (6.5.7) (thanks @AzyrRuthless)
* Add hide_vendor_sepolicy, hide_compat_matrix, and try_umount configurations
* Count the number of sus_path sus_mount and try_umount for WebUI stats on dmesg instead of logs
* Remove the webroot folder if SUSFS is not supported in the kernel
### KSU_SUSFS
* update susfs userspace tool

## v1.5.2 Revision 10
* change again the module status check from 'susfs_init' to 'susfs:'
* Fix sus_su installation

## v1.5.2 Revision 9
* **WebUI: Introduce Custom Settings page**
  This includes:
  * Hide custom ROM paths
  * Hide Gapps
  * Hide Revanced (Youtube/Youtube Music)
  * Spoof CMDLINE (Experimental)
  * Hide KSU Loops
  * Force Hide LSPosed Mounts
  * Custom SUS Paths
  * Custom SUS Mounts
* WebUI: Add @backslashxx @rifsxd to credits page
* WebUI: White Mode
* Scripts: Complete rework to provide more customizability of sus_path and sus_mounts to WebUI (Big thanks to @backslashxx)
  * The settings are in /data/adb/susfs4ksu
* Scripts: Improve logging for WebUI stats
  * If the stats don't show in WebUI it could be your logd are disabled or there is a low log buffer size in the kernel
  * If the WebUI Stats finds no susfs paths and mounts inside the main susfs.log, it will fall off to susfs1.log which logs for susfs paths/mounts executed from the boot scripts.
* Implement dynamic install of ksu_susfs bins for gki and non-gki
* Introduce Spoof CMDLINE (experimental)
* Use auto susfs hide by default by removing susfs mounts in the script and sus_path.txt
* Hide custom rom, gapps, cmdline, and force LSPosed are off by default

## v1.5.2 Revision 8
* Introducing SUSFS WebUI 1.5.2
	* SUS_PATH, SUS_MOUNT, and TRY_UMOUNT Stats
	* SUSFS Logs toggle
	* SUS SU modes (0,1,2)
	* SUS SU modes on boot (1,2)
	* Spoof Kernel Version
* Move addon.d and install-recovery.sh sus_path to post-fs-data.sh
* Remove comment on susfs enable log and make susfslogs.txt
* Change to 'susfs:' string on susfs detection

## v1.4.2 Revision 7
* Hide lineage vendor sepolicy traces (thanks @backslashxx)
* Hide Custom ROM related paths
* Hide Gapps releated paths
* Move addon.d and install-recovery.sh sus_path to boot-completed.sh
* Reduce false positives on module status description

## v1.4.2 Revision 6
* Move hide sus loopdev paths to service.sh

## v1.4.2 Revision 5
* Hide sus loopdev paths to fix Holmes 1.5.x futile hide (thanks simon punk and @backslashxx)
* Hide system_ext (thanks @rifsxd)
* Add status description if susfs is implemented in the kernel
* sus_su will not mount/installed if sus_su is not supported/turned on in the kernel

## v1.4.2 Revision 4
* Revert props command from susfs_hexpatch_props to resetprop

## v1.4.2 Revision 3
* Add related props from Shamiko using susfs_hexpatch_props
* Add VerifiedBootHash directory for devices with missing `ro.boot.vbmeta.digest` value
	* Located at `/data/adb/VerifiedBootHash/VerifiedBootHash.txt`
* Enable SUS_SU for SUS_SU enabled kernel (uses kprobe hook)
	* for kernel that manually implemented the KSU instead of kprobes, if you have abnormal environment detected try comment the `enable_sus_su` in `service.sh`
* Move /system/etc mount to post-mount script
	* This will only work if the module executed before the SUSFS module
	* For systemless hosts module you need to use [sidex15's fork](https://github.com/sidex15/systemless-hosts-KernelSU-module)

## v1.4.2 Revision 2
* Hide /vendor
* Add a script that checks if YouTube Revanced is mounted 15 times
	* This will ensure YouTube Revanced is hidden after the boot is completed
	* Thanks "silvzr" from telegram for this workaround

## v1.4.2 Revision 1
* Hide Custom Rom-specific files
- Remove unnecessary hosts hide sus-fs commands

## v1.4.2-SUSFS
* Initial release