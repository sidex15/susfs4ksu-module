#!/bin/sh
MODDIR=/data/adb/modules/susfs4ksu
SUSFS_BIN=/data/adb/ksu/bin/ksu_susfs
. ${MODDIR}/utils.sh
PERSISTENT_DIR=/data/adb/susfs4ksu
tmpfolder=/data/adb/ksu/susfs4ksu
logfile="$tmpfolder/logs/susfs.log"
logfile1="$tmpfolder/logs/susfs1.log"

# Mount folder of susfs4ksu
[ -w /mnt ] && mntfolder=/mnt/susfs4ksu
[ -w /mnt/vendor ] && mntfolder=/mnt/vendor/susfs4ksu

post_fs_data=0
[ -f $tmpfolder/logs/boot_stage_time.sh ] && . $tmpfolder/logs/boot_stage_time.sh

# to add mounts
# echo "/system" >> /data/adb/susfs4ksu/sus_mount.txt
# this'll make it easier for the webui to do stuff
# Check and process sus_mount paths
if grep -v "#" "$PERSISTENT_DIR/sus_mount.txt" > /dev/null; then
    for i in $(grep -v "#" "$PERSISTENT_DIR/sus_mount.txt"); do
        ${SUSFS_BIN} add_sus_mount "$i" && echo "[sus_mount]: susfs4ksu/post-mount $i" >> "$logfile1"
    done
fi

# Check and process try_umount paths
if grep -v "#" "$PERSISTENT_DIR/try_umount.txt" > /dev/null; then
    for i in $(grep -v "#" "$PERSISTENT_DIR/try_umount.txt"); do
        ${SUSFS_BIN} add_try_umount "$i" 1 && echo "[try_umount]: susfs4ksu/post-mount $i" >> "$logfile1"
    done
fi

# SUSFS Logging
dmesg | sed -n "/^\[ *$post_fs_data/,\$p" | grep -iE "susfs_auto_add|ksu_susfs|susfs:" >> $logfile
endmsg=$(dmesg | grep -E '^\[ *[0-9]' | cut -d']' -f1 | sed 's/^\[ *//' | cut -d' ' -f1 | tail -n 1)
echo "post_mount=$endmsg" >> $tmpfolder/logs/boot_stage_time.sh
# EOF
