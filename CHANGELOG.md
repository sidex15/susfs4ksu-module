## v1.5.2+ Revision 20
### WebUI
* Implement SUSFS Userspace Binaries Update Dialog
* Add Hide sus_mounts for all processes toggle for v1.5.7+
* Add Try umount for zygote isolation service toggle (V1.5.8+)
* Use susfsd features if ksu_susfs show enabled_features throws an error 
* Show spoofed kernel uname label and values in spoof kernel uname
* Fix auto overlayfs kstat status
* Add SUS Kstat support status
* Use @KOWX712 exec function for WebUI
* Fix Russian credits
* Localization:
  * Fix Various translations (@mehu3dhokia, @mattchengg)
### Scripts
* scripts: Implement SUSFS Binary Update Script for WebUI
* scripts: improve SUSFS logging and stats Instead of using sleep function
* scripts: boot-completed: set first the sdcard and android data root path first for sus_path (v1.5.8)
* scripts: add susfs binary check script for WebUI
* scripts: customize/action: change test download binary command
* scripts: post-fs-data: use susfsd to check if susfs is supported
* scripts: service: comment out add_sus_kstat and update_sus_kstat in hide vendor, compat matrix, and spoof service.
* scripts: action: use download function instead of curl for checking susfs hashes
* scripts: boot-completed: refactor custom sus_path handling
* scripts: customize: skip verifiedboothash creation if vbmeta-fixer or tricky addon is installed
* scripts: service: fix sus system_ext sepolicy (Thanks @devnoname120)
* scripts: config/boot-completed: implement hide sus mounts for all processes for susfs v1.5.7+
* scripts: boot-completed: always count sus_path on boot-scripts execution instead of finding in dmesg.
### Misc
* Add SUSFS banner