## v1.5.2+ Revision 25
### WebUI
* add custom open redirect section
* hide auto hide features if it is not supported, disabled, or deprecated in the susfs kernel
* enable custom try_umount section for KernelSU V2.0+
* Remove spoof service list toggle
* rename hide_sus_mnts_for_all_procs to hide_sus_mnts_for_all_or_non_su_procs
* add turn off after boot completed option for hide sus mounts for all/non-su processes
* fix susfs kernel features translatation
* Localization:
    * [Implement Crowdin Localization support](https://crowdin.com/project/susfs4ksu-module)
    * fallback to english for some labels that are not translated yet
    * fill out missing label on some languages for crowdin compliance

### Scripts
* scripts: implement custom susfs open redirect feature
* scripts: service/boot-completed: clone permissions on every check on custom open redirect
* scripts: service/boot-completed.sh: spoof ino and dev stat on custom open redirect
* scripts: service: deprecate fake service list feature
* scripts: boot-completed: temporarily disable hide sus mounts for all processes in auto try umount (userspace)
* scripts: customize/boot-completed: remove imposter checks
* scripts: customize: remove architecture check
* scripts boot-completed/post-fs-data: add support for ksud umount in hide dex2oat mounts
* scripts: post-mount/boot-completed: improve while loop and string conditions for custom susfs features 
* scripts: boot-completed: rework custom sus_path and sus_path_loop
* scripts: post-fs-data/boot-completed: rework hide sus mounts for all processes to comply with latest susfs commit
* scripts post-fs-data/boot-completed: rework and rename "hide_sus_mnts_for_all_procs" to "hide_sus_mnts_for_all_or_non_su_procs"
* scripts: boot-completed: count sus_mounts generated in /proc/1/mountinfo for sus_mount stats
* scripts: boot-completed.sh: Turn off hide_sus_mnts_for_all_procs after boot completed if configured as hide_sus_mnts_for_all_or_non_su_procs = 2
* scripts: boot-completed: rename 'susfs4ksu/post-fs-data' to 'susfs4ksu/boot-completed'
* scripts: boot-completed: refactor sus_path code block
* scripts: boot-completed: remove run on background on sus_path code block

### [Binaries](https://github.com/sidex15/susfs4ksu-binaries)
* cloud-binaries: return error if there's an invalid argument
* local-inaries: return error if there's an invalid argument