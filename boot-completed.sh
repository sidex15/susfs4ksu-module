#!/bin/sh
MODDIR=/data/adb/modules/susfs4ksu
SUSFS_BIN=/data/adb/ksu/bin/ksu_susfs
KSU_BIN=/data/adb/ksu/bin/ksud
. ${MODDIR}/utils.sh
PERSISTENT_DIR=/data/adb/susfs4ksu
tmpfolder=/data/adb/ksu/susfs4ksu
logfile="$tmpfolder/logs/susfs.log"
logfile1="$tmpfolder/logs/susfs1.log"
version=$(${SUSFS_BIN} show version)
susfs_features=$(${SUSFS_BIN} show enabled_features)
# SUSFS_DECIMAL_MAIN = '1'
SUSFS_DECIMAL_MAIN=$(echo "$version" | sed 's/^v//;' | cut -d'.' -f1)
# SUSFS_DECIMAL_SUB = '5'
SUSFS_DECIMAL_SUB=$(echo "$version" | sed 's/^v//;' | cut -d'.' -f2)
# SUSFS_DECIMAL_PATCH = '3'
SUSFS_DECIMAL_PATCH=$(echo "$version" | sed 's/^v//;' | cut -d'.' -f3)

# Mount folder of susfs4ksu
[ -w /mnt ] && mntfolder=/mnt/susfs4ksu
[ -w /mnt/vendor ] && mntfolder=/mnt/vendor/susfs4ksu

service=0
[ -f $tmpfolder/logs/boot_stage_time.sh ] && . $tmpfolder/logs/boot_stage_time.sh

hide_cusrom=0
hide_gapps=0
hide_revanced=0
spoof_uname=0
hide_sus_mnts_for_all_procs=1
emulate_vold_app_data=0
[ -f $PERSISTENT_DIR/config.sh ] && . $PERSISTENT_DIR/config.sh

# update description
if [ -f $tmpfolder/logs/susfs_active ] || dmesg | grep -q "susfs:"; then
	if ${KSU_BIN} module list | grep -qiE integrity\.box; then
		description="description=status: ✅ SuS ඞ ‼️ There's an impostor among us"
	else
		description="description=status: ✅ SuS ඞ"
	fi
else
	description="description=status: failed 💢 - Make sure you're on a SuSFS patched kernel! 😭"
	touch ${MODDIR}/disable
fi
sed -i "s/^description=.*/$description/g" $MODDIR/module.prop

# Detect susfs version
if [ -n "$version" ] 2>/dev/null; then
    # Replace only version number, keep suffix
    sed -i "s/^version=v[0-9.]*/version=$version/" $MODDIR/module.prop
fi

# routines

# Enable ksud umount feature for susfs mounts (SUSFS v2.0.0+)
if [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] && ! echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"; then
		${KSU_BIN} feature set 1 1 && echo "[ksud umount enabled]: susfs4ksu/boot-completed" >> $logfile1
fi

# hide sus mounts for all processes v1.5.7+
 if [ -n "$version" ] && [ "$SUSFS_DECIMAL_MAIN" -ge 1 ] && [ "$SUSFS_DECIMAL_SUB" -ge 5 ] && [ "$SUSFS_DECIMAL_PATCH" -ge 7 ] || [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] 2>/dev/null; then
	if [ $hide_sus_mnts_for_all_procs -lt 1 ]; then
		# Hide sus mounts for all processes
		${SUSFS_BIN} hide_sus_mnts_for_all_procs 0 && echo "[hide_sus_mnts_for_all_procs]: susfs4ksu/boot-completed" >> $logfile1
	fi
fi

# Starting in SUSFS version v1.5.8, it needs to set the sdcard and android data root paths
# This will start the sus_path process. Without this check, sus_path will not work
if [ -n "$version" ] && [ "$SUSFS_DECIMAL_MAIN" -ge 1 ] && [ "$SUSFS_DECIMAL_SUB" -ge 5 ] && [ "$SUSFS_DECIMAL_PATCH" -ge 8 ] || [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] 2>/dev/null; then
	until [ -d "/sdcard/Android/data" ]; do sleep 1; done
	${SUSFS_BIN} set_sdcard_root_path /sdcard
	${SUSFS_BIN} set_android_data_root_path /sdcard/Android/data
	# to add paths
	# echo "/system/addon.d" >> /data/adb/susfs4ksu/sus_path.txt
	# this'll make it easier for the webui to do stuff
	for i in $(grep -v "#" $PERSISTENT_DIR/sus_path.txt); do
	${SUSFS_BIN} add_sus_path "$i" && echo "[sus_path]: susfs4ksu/boot-completed $i" >> $logfile1
	done

	# Emulate Vold app data
	[ $emulate_vold_app_data = 1 ] && {
		# Emulate Vold app data by using sus_path on /sdcard/Android/data/<pkg name> for all third-party apps (-3)
		for i in $(pm list packages -3 | cut -d: -f2); do
			${SUSFS_BIN} add_sus_path "/sdcard/Android/data/$i" && echo "[sus_path]: susfs4ksu/boot-completed /sdcard/Android/data/$i" >> $logfile1
		done
	}

else
	for i in $(grep -v "#" $PERSISTENT_DIR/sus_path.txt); do
		until [ -d "/sdcard/Android/data" ]; do sleep 1; done
		${SUSFS_BIN} add_sus_path "$i" && echo "[sus_path]: susfs4ksu/boot-completed $i" >> $logfile1
	done
fi

# Add sus_path_loop paths (late v1.5.9+)
if [ -n "$version" ] && [ "$SUSFS_DECIMAL_MAIN" -ge 1 ] && [ "$SUSFS_DECIMAL_SUB" -ge 5 ] && [ "$SUSFS_DECIMAL_PATCH" -ge 9 ] || [ "$SUSFS_DECIMAL_MAIN" -ge 2 ]  2>/dev/null; then
	# to add paths
	# echo "/system/addon.d" >> /data/adb/susfs4ksu/sus_path_loop.txt
	# this'll make it easier for the webui to do stuff
	for i in $(grep -v "#" $PERSISTENT_DIR/sus_path_loop.txt); do
	${SUSFS_BIN} add_sus_path_loop "$i" && echo "[sus_path_loop]: susfs4ksu/boot-completed $i" >> $logfile1
	done
fi

# Add sus_maps (late v1.5.12+)
if echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_SUS_MAP"; then
	for i in $(grep -v "#" $PERSISTENT_DIR/sus_maps.txt); do
		${SUSFS_BIN} add_sus_map "$i" && echo "[sus_map]: susfs4ksu/boot-completed $i" >> $logfile1
	done
fi

# Auto try_umount (v1.5.5+)
[ $auto_try_umount = 1 ] && {
	# Skip if the disable file is present
	if [ ! -f "/data/adb/susfs_no_auto_add_try_umount_for_bind_mount" ] && echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_AUTO_ADD_TRY_UMOUNT_FOR_BIND_MOUNT"; then
		sed -i 's/auto_try_umount=.*/auto_try_umount=0/' $PERSISTENT_DIR/config.sh
		return
	fi

	# Get all susfs mounts from /proc/1/mountinfo
	sus_mounts=$(cat /proc/1/mountinfo | grep -E "^[5][0-9]{5} .* (KSU|shared).*$" | awk '{print $5}') # Newer susfs mount IDs start with 500k
	# Fallback to older susfs mount IDs if no mounts found within 500k range
	if [ -z "$sus_mounts" ]; then
		sus_mounts=$(cat /proc/1/mountinfo | grep -E "^[13][0-9]{5} .* (KSU|shared).*$" | awk '{print $5}')
	fi
	for LINE in $sus_mounts; do
		if echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"; then
			${SUSFS_BIN} add_try_umount "${LINE}" 1 && echo "[try_umount (SUSFS)]: susfs4ksu/boot-completed ${LINE}" >> $logfile1
		elif [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] && ! echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"; then
			${KSU_BIN} kernel umount add "${LINE}" --flags 2 && echo "[try_umount (KSUD)]: susfs4ksu/boot-completed ${LINE}" >> $logfile1
		fi
	done
}

# Check and process try_umount paths (KSUD) (susfs v2.0.0+)
if [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] && ! echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"; then
	if grep -v "#" "$PERSISTENT_DIR/try_umount.txt" > /dev/null; then
		for i in $(grep -v "#" "$PERSISTENT_DIR/try_umount.txt"); do
			${KSU_BIN} kernel umount add "$i" --flags 2 && echo "[try_umount (KSUD)]: susfs4ksu/boot-completed $i" >> "$logfile1"
		done
	fi
fi

# if spoof_uname is on mode 1, set_uname will be called here
[ $spoof_uname = 1 ] && spoof_uname

# Hide Custom ROM Paths
[ $hide_cusrom -gt 0 ] && {
    [ $hide_cusrom = 5 ] && {
    # Find lineage and crdroid paths for all files and directories
	echo "susfs4ksu/boot-completed: [hide_cusrom][5]" >> $logfile1
    find /system /vendor /system_ext /product -type f -o -type d | grep -iE "lineage|crdroid" | grep -iE "\." | while read -r path; do
        ${SUSFS_BIN} add_sus_path "$path" && echo "[sus_path]: susfs4ksu/boot-completed $path" >> "$logfile1"
    done
	}
	[ $hide_cusrom = 4 ] && {
	# Find lineage and crdroid paths for all files and directories, excluding specific .apk, jar, and /vendor/bin/hw/ files
	echo "susfs4ksu/boot-completed: [hide_cusrom][4]" >> $logfile1
	find /system /vendor /system_ext /product -type f -o -type d | grep -iE "lineage|crdroid" | grep -iE "\." | grep -vE ".(apk|jar)|/vendor/bin/hw/" | while read -r path; do
		${SUSFS_BIN} add_sus_path "$path" && echo "[sus_path]: susfs4ksu/boot-completed $path" >> "$logfile1"
	done
	}
	[ $hide_cusrom = 3 ] && {
	# Find lineage and crdroid paths for all files and directories, excluding specific .apk, jar, odex, vdex, and /vendor/bin/hw/ files
	echo "susfs4ksu/boot-completed: [hide_cusrom][3]" >> $logfile1
	find /system /vendor /system_ext /product -type f -o -type d | grep -iE "lineage|crdroid" | grep -iE "\." | grep -vE ".(apk|jar|odex|vdex)|/vendor/bin/hw/" | while read -r path; do
		${SUSFS_BIN} add_sus_path "$path" && echo "[sus_path]: susfs4ksu/boot-completed $path" >> "$logfile1"
	done
	}
	[ $hide_cusrom = 2 ] && {
	# Find lineage and crdroid paths for all files and directories, excluding specific .apk, jar, odex, vdex, so, and /vendor/bin/hw/ files
	echo "susfs4ksu/boot-completed: [hide_cusrom][2]" >> $logfile1
	find /system /vendor /system_ext /product -type f -o -type d | grep -iE "lineage|crdroid" | grep -iE "\." | grep -vE ".(apk|jar|odex|vdex|so)|/vendor/bin/hw/" | while read -r path; do
		${SUSFS_BIN} add_sus_path "$path" && echo "[sus_path]: susfs4ksu/boot-completed $path" >> "$logfile1"
	done
	}
	[ $hide_cusrom = 1 ] && {
	# Find lineage and crdroid paths for all files and directories, excluding specific .apk, jar, odex, vdex, so, rc, and /vendor/bin/hw/ files
	echo "susfs4ksu/boot-completed: [hide_cusrom][1]" >> $logfile1
	find /system /vendor /system_ext /product -type f -o -type d | grep -iE "lineage|crdroid" | grep -iE "\." | grep -vE ".(apk|jar|odex|vdex|so|rc)|/vendor/bin/hw/" | while read -r path; do
		${SUSFS_BIN} add_sus_path "$path" && echo "[sus_path]: susfs4ksu/boot-completed $path" >> "$logfile1"
	done
	}
}

# echo "hide_gapps=1" >> /data/adb/susfs4ksu/config.sh
[ $hide_gapps = 1 ] && {
	echo "susfs4ksu/boot-completed: [hide_gapps]" >> $logfile1
	for i in $(find /system /vendor /system_ext /product -iname *gapps*xml -o -type d -iname *gapps*) ; do 
		${SUSFS_BIN} add_sus_path $i && echo "[sus_path]: susfs4ksu/boot-completed $i" >> $logfile1
	done
}

# echo "spoof_cmdline=1" >> /data/adb/susfs4ksu/config.sh
[ $spoof_cmdline = 1 ] && {
	echo "susfs4ksu/boot-completed: [spoof_cmdline]" >> $logfile1
	
	# Spoof cmdline and bootconfig
	if grep -q "androidboot.verifiedbootstate" /proc/cmdline; then
        sed 's|androidboot.verifiedbootstate=orange|androidboot.verifiedbootstate=green|g' /proc/cmdline > $mntfolder/cmdline
    else
		sed 's|androidboot.verifiedbootstate=orange|androidboot.verifiedbootstate=green|g' /proc/bootconfig > $mntfolder/bootconfig    
	fi	
		
	if grep -q "androidboot.hwname\|androidboot.product.hardware.sku" /proc/cmdline; then
		sed -i "s/androidboot.hwname=[^ ]*/androidboot.hwname=$(getprop ro.product.name)/; s/androidboot.product.hardware.sku=[^ ]*/androidboot.product.hardware.sku=$(getprop ro.product.name)/" $mntfolder/cmdline
	else
		sed -i "s/androidboot.hwname=[^ ]*/androidboot.hwname=$(getprop ro.product.name)/; s/androidboot.product.hardware.sku=[^ ]*/androidboot.product.hardware.sku=$(getprop ro.product.name)/" $mntfolder/bootconfig
	fi
	
	#check for susfs version and use the appropriate method
	if [ -f $mntfolder/cmdline ]; then
		if [ -n "$version" ] && [ "$SUSFS_DECIMAL_MAIN" -ge 1 ] && [ "$SUSFS_DECIMAL_SUB" -ge 5 ] && [ "$SUSFS_DECIMAL_PATCH" -ge 4 ] || [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] 2>/dev/null; then
		${SUSFS_BIN} set_cmdline_or_bootconfig $mntfolder/cmdline
		else
			${SUSFS_BIN} set_proc_cmdline $mntfolder/cmdline
		fi
	fi

	if [ -f $mntfolder/bootconfig ]; then
		if [ -n "$version" ] && [ "$SUSFS_DECIMAL_MAIN" -ge 1 ] && [ "$SUSFS_DECIMAL_SUB" -ge 5 ] && [ "$SUSFS_DECIMAL_PATCH" -ge 4 ] || [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] 2>/dev/null; then
		${SUSFS_BIN} set_cmdline_or_bootconfig $mntfolder/bootconfig
		else
			${SUSFS_BIN} set_proc_cmdline $mntfolder/bootconfig
		fi
	fi
	
}

# echo "hide_revanced=1" >> /data/adb/susfs4ksu/config.sh
[ $hide_revanced = 1 ] && {
	echo "susfs4ksu/boot-completed: [hide_revanced]" >> $logfile1
	count=0 
	max_attempts=15 
	until grep "youtube" /proc/self/mounts || [ $count -ge $max_attempts ]; do 
	    sleep 1 
	    count=$((count + 1)) 
	done
	packages="com.google.android.youtube com.google.android.apps.youtube.music"
	hide_app () {
		for path in $(pm path $1 | cut -d: -f2) ; do 
		if echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_SUS_MOUNT"; then
			${SUSFS_BIN} add_sus_mount $path && echo "[sus_mount] susfs4ksu/boot-completed: $path [add_sus_mount] $i" >> $logfile1
		fi
		if echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"; then
			${SUSFS_BIN} add_try_umount $path 1 && echo "[try_umount] susfs4ksu/boot-completed: $path [add_try_umount] $i" >> $logfile1
		fi
		if [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] && ! echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"; then
			${KSU_BIN} kernel umount add $path --flags 2 && echo "[try_umount (KSUD)] susfs4ksu/boot-completed: $path [add_try_umount] $i" >> $logfile1
		fi
		done
	}
	for i in $packages ; do hide_app $i ; done 
} & # run in background

# SUSFS Logging
dmesg | sed -n "/^\[ *$service/,\$p" | grep -iE "susfs_auto_add|ksu_susfs|susfs:" >> $logfile
endmsg=$(dmesg | grep -E '^\[ *[0-9]' | cut -d']' -f1 | sed 's/^\[ *//' | cut -d' ' -f1 | tail -n 1)
echo "boot_completed=$endmsg" >> $tmpfolder/logs/boot_stage_time.sh
sleep 15; # this delay is to ensure that all of the susfs logs have been captured
# Just to be sure, set sdcard and android data root paths again
if [ -n "$version" ] && [ "$SUSFS_DECIMAL_MAIN" -ge 1 ] && [ "$SUSFS_DECIMAL_SUB" -ge 5 ] && [ "$SUSFS_DECIMAL_PATCH" -ge 8 ] || [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] 2>/dev/null; then
	${SUSFS_BIN} set_sdcard_root_path /sdcard
	${SUSFS_BIN} set_android_data_root_path /sdcard/Android/data
fi
# Last dmesg logs
dmesg | sed -n "/^\[ *$endmsg/,\$p" | grep -iE "susfs_auto_add|ksu_susfs|susfs:" >> $logfile

# Generate susfs stats
rm ${tmpfolder}/susfs_stats.txt
echo sus_path=$(grep -ci 'sus_path' $logfile1 ) >> ${tmpfolder}/susfs_stats.txt
echo sus_map=$(grep -ci 'AS_FLAGS_SUS_MAP' $logfile ) >> ${tmpfolder}/susfs_stats.txt
echo sus_mount=$(grep -ciE "set SUS_MOUNT|to LH_SUS_MOUNT" $logfile ) >> ${tmpfolder}/susfs_stats.txt
if [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] && ! echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"; then
	echo try_umount=$(grep -ci 'try_umount (KSUD)' $logfile1 ) >> ${tmpfolder}/susfs_stats.txt
else
	echo try_umount=$(grep -ci 'to LH_TRY_UMOUNT_PATH' $logfile ) >> ${tmpfolder}/susfs_stats.txt
fi
rm ${tmpfolder}/susfs_stats1.txt
echo sus_path=$(grep -ci 'sus_path' $logfile1 ) >> ${tmpfolder}/susfs_stats1.txt
echo sus_map=$(grep -ci 'sus_map' $logfile1 ) >> ${tmpfolder}/susfs_stats1.txt
echo sus_mount=$(grep -ci 'sus_mount' $logfile1 ) >> ${tmpfolder}/susfs_stats1.txt
echo try_umount=$(grep -ci 'try_umount' $logfile1 ) >> ${tmpfolder}/susfs_stats1.txt
