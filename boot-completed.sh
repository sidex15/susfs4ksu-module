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
SUSFS_DECIMAL=$(echo "$version" | sed 's/^v//; s/\.//g')
kernel_ver=$(head -n 1 "$PERSISTENT_DIR/kernelversion.txt")

# Mount folder of susfs4ksu
[ -w /mnt ] && mntfolder=/mnt/susfs4ksu
[ -w /mnt/vendor ] && mntfolder=/mnt/vendor/susfs4ksu

hide_cusrom=0
hide_gapps=0
hide_revanced=0
spoof_uname=0
[ -f $PERSISTENT_DIR/config.sh ] && . $PERSISTENT_DIR/config.sh

# update description
if [ -f $tmpfolder/logs/susfs_active ] || dmesg | grep -q "susfs:"; then
	if ${KSU_BIN} module list | grep -q "Integrity-Box"; then
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
if [ -n "$version" ] && [ "$SUSFS_DECIMAL" -gt 152 ] 2>/dev/null; then
    # Replace only version number, keep suffix
    sed -i "s/^version=v[0-9.]*/version=$version/" $MODDIR/module.prop
fi

# routines

# if spoof_uname is on mode 1, set_uname will be called here
[ $spoof_uname = 1 ] && spoof_uname

# Hide Custom ROM Paths
[ $hide_cusrom -gt 0 ] && {
    [ $hide_cusrom = 5 ] && {
    # Find lineage and crdroid paths for all files and directories
	echo "susfs4ksu/boot-completed: [hide_cusrom][5]" >> $logfile1
    find /system /vendor /system_ext /product -type f -o -type d | grep -iE "lineage|crdroid" | grep -iE "\." | while read -r path; do
        ${SUSFS_BIN} add_sus_path "$path"
        echo "[sus_path]: susfs4ksu/boot-completed $path" >> "$logfile1"
    done
	}
	[ $hide_cusrom = 4 ] && {
	# Find lineage and crdroid paths for all files and directories, excluding specific .apk, jar, and /vendor/bin/hw/ files
	echo "susfs4ksu/boot-completed: [hide_cusrom][4]" >> $logfile1
	find /system /vendor /system_ext /product -type f -o -type d | grep -iE "lineage|crdroid" | grep -iE "\." | grep -vE ".(apk|jar)|/vendor/bin/hw/" | while read -r path; do
		${SUSFS_BIN} add_sus_mount "$path"
		echo "[sus_mount]: susfs4ksu/boot-completed $path" >> "$logfile1"
	done
	}
	[ $hide_cusrom = 3 ] && {
	# Find lineage and crdroid paths for all files and directories, excluding specific .apk, jar, odex, vdex, and /vendor/bin/hw/ files
	echo "susfs4ksu/boot-completed: [hide_cusrom][3]" >> $logfile1
	find /system /vendor /system_ext /product -type f -o -type d | grep -iE "lineage|crdroid" | grep -iE "\." | grep -vE ".(apk|jar|odex|vdex)|/vendor/bin/hw/" | while read -r path; do
		${SUSFS_BIN} add_sus_path "$path"
		echo "[sus_path]: susfs4ksu/boot-completed $path" >> "$logfile1"
	done
	}
	[ $hide_cusrom = 2 ] && {
	# Find lineage and crdroid paths for all files and directories, excluding specific .apk, jar, odex, vdex, so, and /vendor/bin/hw/ files
	echo "susfs4ksu/boot-completed: [hide_cusrom][2]" >> $logfile1
	find /system /vendor /system_ext /product -type f -o -type d | grep -iE "lineage|crdroid" | grep -iE "\." | grep -vE ".(apk|jar|odex|vdex|so)|/vendor/bin/hw/" | while read -r path; do
		${SUSFS_BIN} add_sus_path "$path"
		echo "[sus_path]: susfs4ksu/boot-completed $path" >> "$logfile1"
	done
	}
	[ $hide_cusrom = 1 ] && {
	# Find lineage and crdroid paths for all files and directories, excluding specific .apk, jar, odex, vdex, so, rc, and /vendor/bin/hw/ files
	echo "susfs4ksu/boot-completed: [hide_cusrom][1]" >> $logfile1
	find /system /vendor /system_ext /product -type f -o -type d | grep -iE "lineage|crdroid" | grep -iE "\." | grep -vE ".(apk|jar|odex|vdex|so|rc)|/vendor/bin/hw/" | while read -r path; do
		${SUSFS_BIN} add_sus_path "$path"
		echo "[sus_path]: susfs4ksu/boot-completed $path" >> "$logfile1"
	done
	}
}

# echo "hide_gapps=1" >> /data/adb/susfs4ksu/config.sh
[ $hide_gapps = 1 ] && {
	echo "susfs4ksu/boot-completed: [hide_gapps]" >> $logfile1
	for i in $(find /system /vendor /system_ext /product -iname *gapps*xml -o -type d -iname *gapps*) ; do 
		${SUSFS_BIN} add_sus_path $i 
		echo "[sus_path]: susfs4ksu/boot-completed $i" >> $logfile1
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
		if [ -n "$version" ] && [ "$SUSFS_DECIMAL" -gt 153 ] 2>/dev/null; then
		${SUSFS_BIN} set_cmdline_or_bootconfig $mntfolder/cmdline
		else
			${SUSFS_BIN} set_proc_cmdline $mntfolder/cmdline
		fi
	fi

	if [ -f $mntfolder/bootconfig ]; then
		if [ -n "$version" ] && [ "$SUSFS_DECIMAL" -gt 153 ] 2>/dev/null; then
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
		${SUSFS_BIN} add_sus_mount $path && echo "[sus_mount] susfs4ksu/boot-completed: [add_sus_mount] $i" >> $logfile1
		${SUSFS_BIN} add_try_umount $path 1 && echo "[try_umount] susfs4ksu/boot-completed: [add_try_umount] $i" >> $logfile1
		done
	}
	for i in $packages ; do hide_app $i ; done 
} & # run in background
