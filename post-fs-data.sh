#!/bin/sh
MODDIR=/data/adb/modules/susfs4ksu
SUSFS_BIN=${MODDIR}/ksu_susfs_modern
KSU_BIN=/data/adb/ksu/bin/ksud
. ${MODDIR}/utils.sh
PERSISTENT_DIR=/data/adb/susfs4ksu
tmpfolder=/data/adb/ksu/susfs4ksu
mkdir -p $tmpfolder/logs
mkdir -p $tmpfolder
logfile="$tmpfolder/logs/susfs.log"
logfile1="$tmpfolder/logs/susfs1.log"
susfs_features=$(${SUSFS_BIN} show enabled_features)
version=$(${SUSFS_BIN} show version)
SUSFS_DECIMAL_MAIN=$(echo "$version" | sed 's/^v//;' | cut -d'.' -f1)
SUSFS_DECIMAL_SUB=$(echo "$version" | sed 's/^v//;' | cut -d'.' -f2)
SUSFS_DECIMAL_PATCH=$(echo "$version" | sed 's/^v//;' | cut -d'.' -f3)

# Mount folder of susfs4ksu
[ -w /mnt ] && mntfolder=/mnt/susfs4ksu
[ -w /mnt/vendor ] && mntfolder=/mnt/vendor/susfs4ksu
mkdir -p $mntfolder

if [ -n "$susfs_features" ]; then
	touch $tmpfolder/logs/susfs_active
else
	dmesg | grep -q "susfs:" > /dev/null && touch $tmpfolder/logs/susfs_active || rm -f $tmpfolder/logs/susfs_active
fi

[ -f $PERSISTENT_DIR/susfs_force_override ] && touch $tmpfolder/logs/susfs_active

force_hide_lsposed=0
spoof_uname=0
avc_log_spoofing=0
hide_sus_mnts_for_all_or_non_su_procs=0
[ -f $PERSISTENT_DIR/config.sh ] && . $PERSISTENT_DIR/config.sh

echo "susfs4ksu/post-fs-data: [logging_initialized]" > $logfile1

[ "$SUSFS_DECIMAL_MAIN" -ge 2 ] && [ -f /data/adb/ksu/susfs4ksu/using_old_sus_path_layout ] && {
	echo "susfs4ksu/post-fs-data: Detected old sus path layout, removing the cache file for rechecking old and new sus_path layout" >> $logfile1
	rm -f /data/adb/ksu/susfs4ksu/using_old_sus_path_layout
}

# Hide sus mounts for non-su processes
[ "$SUSFS_DECIMAL_MAIN" -ge 2 ] && { [ $hide_sus_mnts_for_all_or_non_su_procs -ge 1 ] && {
	${SUSFS_BIN} hide_sus_mnts_for_non_su_procs 1 >/dev/null && echo "[hide_sus_mnts_for_non_su_procs = 1]: susfs4ksu/post-fs-data"
} || {
	${SUSFS_BIN} hide_sus_mnts_for_non_su_procs 0 >/dev/null && echo "[hide_sus_mnts_for_non_su_procs = 0]: susfs4ksu/post-fs-data"
}; } >> $logfile1

#### Enable avc log spoofing to bypass 'su' domain detection via /proc/<pid> enumeration ####
[ $avc_log_spoofing = 1 ] && ${SUSFS_BIN} enable_avc_log_spoofing 1

# if spoof_uname is on mode 2, set_uname will be called here
[ $spoof_uname = 2 ] && spoof_uname

# LSPosed
if [ $force_hide_lsposed = 1 ] && echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"; then 
	echo "susfs4ksu/post-fs-data: [force_hide_lsposed]" >> $logfile1
	${KSU_BIN} kernel umount add /system/apex/com.android.art/bin/dex2oat --flags 2
	${KSU_BIN} kernel umount add /system/apex/com.android.art/bin/dex2oat32 --flags 2
	${KSU_BIN} kernel umount add /system/apex/com.android.art/bin/dex2oat64 --flags 2
	${KSU_BIN} kernel umount add /apex/com.android.art/bin/dex2oat --flags 2
	${KSU_BIN} kernel umount add /apex/com.android.art/bin/dex2oat32 --flags 2
	${KSU_BIN} kernel umount add /apex/com.android.art/bin/dex2oat64 --flags 2
fi

# SUSFS Logging
dmesg_snapshot=$(dmesg)
echo "$dmesg_snapshot" | grep -iE "susfs_auto_add|ksu_susfs|susfs:" > $logfile
endmsg=$(echo "$dmesg_snapshot" | grep -E '^\[ *[0-9]' | cut -d']' -f1 | sed 's/^\[ *//' | cut -d' ' -f1 | tail -n 1)
echo "post_fs_data=$endmsg" > $tmpfolder/logs/boot_stage_time.sh
