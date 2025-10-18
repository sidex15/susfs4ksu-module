#!/bin/sh
config="/data/adb/susfs4ksu"

# Reset all settings from config.sh to default
while IFS= read -r line; do
    # Extract key name before = sign
    key=$(echo "$line" | cut -d'=' -f1)
    # Reset the key to its default value
    if echo $key | grep -q -E 'hide_sus_mnts_for_all_procs|susfs_log'; then
        sed -i "s/^$key=.*/$key=1/" "$config/config.sh"
        continue
    elif echo $key | grep -q -E 'kernel_version|kernel_build'; then
        sed -i "s/^$key=.*/$key='default'/" "$config/config.sh"
        continue
    elif echo $key | grep -q -E 'sus_su|sus_su_active|vbmeta_size'; then
        continue
    fi
    sed -i "s/^$key=.*/$key=0/" "$config/config.sh"
done < "$config/config.sh"

# Reset sus_path.txt
echo -e "# this contains suspicious paths you want \n# to be hidden at boot-completed.sh\n# example\n# /system/addon.d\n# /vendor/bin/install-recovery.sh\n# /system/bin/install-recovery.sh" > "$config/sus_path.txt"
# Reset sus_path_loop.txt
echo -e "# this contains suspicious paths you want \n# to be hidden at boot-completed.sh\n# example\n# /system/addon.d\n# /vendor/bin/install-recovery.sh\n# /system/bin/install-recovery.sh" > "$config/sus_path_loop.txt"
# Reset sus_maps.txt
echo -e "# this contains suspicious paths that are in the maps you want \n# to be hidden at boot-completed.sh\n# example\n# /system/font/Roboto-Regular.ttf\n# /system/font/Roboto-Bold.ttf\n# /vendor/lib/libsuspicious.so" > "$config/sus_maps.txt"
# Reset sus_mount.txt
echo -e "# this contains suspicious mounts you want \n# to be sus_mounted at post-mount.sh\n# example\n# /system\n# /system_ext\n# /data/adb/modules\n# /debug_ramdisk" > "$config/sus_mount.txt"
# Reset try_umount.txt
echo -e "# this contains suspicious mounts you want \n# to be try_umounted at post-mount.sh\n# example\n# /system\n# /system_ext\n# /debug_ramdisk" > "$config/try_umount.txt"

# Reset auto hide settings
[ -f data/adb/susfs_no_auto_add_sus_ksu_default_mount ] || rm -f /data/adb/susfs_no_auto_add_sus_ksu_default_mount
[ -f data/adb/susfs_no_auto_add_sus_bind_mount ] || rm -f /data/adb/susfs_no_auto_add_sus_bind_mount
[ -f data/adb/susfs_no_auto_add_try_umount_for_bind_mount ] || rm -f /data/adb/susfs_no_auto_add_try_umount_for_bind_mount
[ -f data/adb/susfs_umount_for_zygote_system_process ] || rm -f /data/adb/susfs_umount_for_zygote_system_process