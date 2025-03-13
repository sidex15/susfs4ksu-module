#!/bin/sh
MODDIR=/data/adb/modules/susfs4ksu
SUSFS_BIN=/data/adb/ksu/bin/ksu_susfs
. ${MODDIR}/utils.sh
PERSISTENT_DIR=/data/adb/susfs4ksu
tmpfolder=/data/adb/ksu/susfs4ksu
mntfolder=/dev/susfs4ksu
logfile="$tmpfolder/logs/susfs.log"
logfile1="$tmpfolder/logs/susfs1.log"
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

# to add paths
# echo "/system/addon.d" >> /data/adb/susfs4ksu/sus_path.txt
# this'll make it easier for the webui to do stuff
for i in $(grep -v "#" $PERSISTENT_DIR/sus_path.txt); do
	${SUSFS_BIN} add_sus_path $i && echo "[sus_path]: susfs4ksu/post-mount $i" >> $logfile1
done

# EOF
