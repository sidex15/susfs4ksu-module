## v1.5.2+ Revision 27
### Notes
This is a small but major update, especially with the introduction of unified/universal susfs binary and custom sus_kstat

### [Universal SUSFS Binary](https://github.com/sidex15/susfs4ksu-binaries/tree/universal-binary)
* Implement universal binary for ksu_susfs
  * This will support v1.5.x, v2.x.x, and beyond, even on future susfs versions
  * The universal binary is using prctl (v1.5.x) and sys_reboot (v2.0.0+) depending on the susfs version implemented in the kernel.
  * Cleaner help menu and add additional info in the help menu
  * Add `--help` argument for more help on the specific info.
  * CMD arguments on the help menu are showing the available CMDs for specific susfs kernel version
  * Automatically adds `using_old_sus_path_layout` file tag at the `/data/adb/ksu/susfs4ksu` when it's using old sus_path (early v2.0.0) and new sus_path (post v2.0.0+)
* [More technical changes here](https://github.com/sidex15/susfs4ksu-binaries/commits/universal-binary/)

### WebUI
* Implement custom SUS_KSTAT entry section.
    * You can now add or edit sus_kstat entries
* Consolidate custom susfs feature text area into one section.
* Fix toggles in custom rom settings
* Enhance setupBooleanToggle to support custom on/off states
* Add 'Use sus path loop' option and enhance toggle functionality for Vold App Data
* Localization
    * New Crowdin translations by GitHub Action
    * update languages xml

### Scripts
* scripts/binary: implement susfs universal binary
* scripts: service/boot-completed: add 4th parameter (uid_scheme) in the custom open redirect for susfs v2.1.0+
    * Sample parameter for custom open redirect for susfs v2.1.0+
        * `<original_path> <redirected_path> <0 or 1 (execute boot stages)> <0-4 (uid_scheme)>`
* scripts: boot-completed: add option to use add_sus_path_loop instead of add_sus_path for vold app data emulation
* scripts: post-fs-data: delete `using_old_sus_path_layout` first for rechecking old and new sus_path layout
* scripts: action/customize: set maximum timeout check for cloud binary to 5 seconds
* scripts: service/boot-completed: refactor kstat code on open redirect code block
* scripts: action: show latest susfs binary message when there's a new update
* scripts: service/boot-completed: remove clone permissions on custom open_redirect
* scripts: service: don't use susfs_clone_perm on susfs v2.1.0+
* scripts: boot-completed: execute sus_path related code at nearly end of the script