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

legit_mounts="$PERSISTENT_DIR/legit_mounts.txt"

# Mount folder of susfs4ksu
[ -w /mnt ] && mntfolder=/mnt/susfs4ksu
[ -w /mnt/vendor ] && mntfolder=/mnt/vendor/susfs4ksu

service=0
[ -f $tmpfolder/logs/boot_stage_time.sh ] && . $tmpfolder/logs/boot_stage_time.sh

hide_cusrom=0
hide_gapps=0
hide_revanced=0
spoof_uname=0
hide_sus_mnts_for_all_or_non_su_procs=0
emulate_vold_app_data=0
[ -f $PERSISTENT_DIR/config.sh ] && . $PERSISTENT_DIR/config.sh

# update description
if [ -f $tmpfolder/logs/susfs_active ] || dmesg | grep -q "susfs:"; then
		description="description=status: ✅ SuS ඞ"
else
	description="description=status: failed 💢 - Make sure you're on a SuSFS patched kernel! 😭"
	touch ${MODDIR}/disable
fi
sed -i "s/^description=.*/$description/g" $MODDIR/module.prop

# Detect susfs version
if [ -n "$version" ] 2>/dev/null; then
    # Replace only version number, keep suffix
    sed -i "s/^version=.*\(-[^ ]*\)$/version=$version\1/" $MODDIR/module.prop
fi

# routines

# Enable ksud umount feature for susfs mounts (SUSFS v2.0.0+)
if [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] && [ $auto_try_umount = 1 ] && ! echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"; then
		${KSU_BIN} feature set 1 1 && echo "[ksud umount enabled]: susfs4ksu/boot-completed" >> $logfile1
fi

# hide sus mounts for all processes v1.5.7+
if [ -n "$version" ] && [ "$SUSFS_DECIMAL_MAIN" -ge 1 ] && [ "$SUSFS_DECIMAL_SUB" -ge 5 ] && [ "$SUSFS_DECIMAL_PATCH" -ge 7 ] 2>/dev/null; then
	if [ $hide_sus_mnts_for_all_or_non_su_procs -lt 1 ]; then
		# Hide sus mounts for all processes
		${SUSFS_BIN} hide_sus_mnts_for_all_procs 0 && echo "[hide_sus_mnts_for_all_procs = 0]: susfs4ksu/boot-completed" >> $logfile1
	fi
fi

# Add open redirect paths (boot-completed)
if echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_OPEN_REDIRECT"; then
	grep -v "#" "$PERSISTENT_DIR/sus_open_redirect.txt" | while read -r line; do
		original_path=$(echo "$line" | awk '{print $1}')
		redirected_path=$(echo "$line" | awk '{print $2}')
		execute_on=$(echo "$line" | awk '{print $3}')
		[ "$execute_on" != "0" ] && continue
		# Get inode and device of redirected path
		SUS_KSTAT=$(stat -c "%i %d default default %X 0 %Y 0 %Z 0 %b %B" "$original_path")
		if [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] && [ "$SUSFS_DECIMAL_SUB" -ge 1 ] 2>/dev/null; then
			uid_scheme=$(echo "$line" | awk '{print $4}')
			if [ -z $uid_scheme ]; then
				${SUSFS_BIN} add_open_redirect "$original_path" "$redirected_path" 2 && echo "[open_redirect]: susfs4ksu/boot-completed $original_path -> $redirected_path default_uid_scheme: 2" >> $logfile1
			else
				${SUSFS_BIN} add_open_redirect "$original_path" "$redirected_path" $uid_scheme && echo "[open_redirect]: susfs4ksu/boot-completed $original_path -> $redirected_path uid_scheme: $uid_scheme" >> $logfile1
			fi
		else
		# Add open redirect
		${SUSFS_BIN} add_open_redirect "$original_path" "$redirected_path" && echo "[open_redirect]: susfs4ksu/boot-completed $original_path -> $redirected_path" >> $logfile1
		fi
		# Spoof kstat for open redirected paths
		${SUSFS_BIN} add_sus_kstat_statically "$redirected_path" $SUS_KSTAT && echo "[add_sus_kstat_statically]: susfs4ksu/boot-completed $original_path" >> $logfile1
	done
fi

# Add sus_maps (late v1.5.12+)
if echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_SUS_MAP"; then
	grep -v "#" $PERSISTENT_DIR/sus_maps.txt | while read -r i; do
		[ -z "$i" ] || { ${SUSFS_BIN} add_sus_map "$i" && echo "[sus_map]: susfs4ksu/boot-completed $i" >> $logfile1; }
	done
fi

# Add sus_kstat_statically entries from JSON (late v1.5.8+)
if [ -f "$PERSISTENT_DIR/sus_kstat_statically.json" ]; then
	# Parse JSON and add sus_kstat_statically entries
	# Extract each JSON object and process it
	awk '/^[[:space:]]*\{/,/^[[:space:]]*\}/' "$PERSISTENT_DIR/sus_kstat_statically.json" | {
		current_obj=""
		while IFS= read -r line; do
			if echo "$line" | grep -q '^[[:space:]]*{'; then
				current_obj=""
			fi
			current_obj="$current_obj $line"
			
			if echo "$line" | grep -q '^[[:space:]]*}'; then
				# Process complete JSON object: extract all 13 string fields in a
				# single awk pass (first occurrence of each key wins), emitted as
				# one tab-separated record, then read them at once.
				IFS='	' read -r path ino dev nlink size atime atime_nsec mtime mtime_nsec ctime ctime_nsec blocks blksize <<EOF
$(echo "$current_obj" | awk '
				{
					while (match($0, /"[a-z_]+"[[:space:]]*:[[:space:]]*"[^"]*"/)) {
						pair = substr($0, RSTART, RLENGTH)
						$0 = substr($0, RSTART + RLENGTH)
						k = pair; sub(/"[[:space:]]*:.*/, "", k); sub(/^"/, "", k)
						v = pair; sub(/^[^:]*:[[:space:]]*"/, "", v); sub(/"$/, "", v)
						if (!(k in seen)) { seen[k] = 1; val[k] = v }
					}
				}
				END {
					printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n", \
						val["path"], val["ino"], val["dev"], val["nlink"], val["size"], \
						val["atime"], val["atime_nsec"], val["mtime"], val["mtime_nsec"], \
						val["ctime"], val["ctime_nsec"], val["blocks"], val["blksize"]
				}')
EOF

				# Execute if path is not empty
				if [ -n "$path" ]; then
					${SUSFS_BIN} add_sus_kstat_statically "$path" "$ino" "$dev" "$nlink" "$size" "$atime" "$atime_nsec" "$mtime" "$mtime_nsec" "$ctime" "$ctime_nsec" "$blocks" "$blksize" && \
					echo "[add_sus_kstat_statically]: susfs4ksu/boot-completed $path" >> "$logfile1"
				fi
				current_obj=""
			fi
		done
	} 2>/dev/null || true
fi

# Auto try_umount (v1.5.5+)
[ $auto_try_umount = 1 ] && {
	# Skip if the disable file is present
	if [ ! -f "/data/adb/susfs_no_auto_add_try_umount_for_bind_mount" ] && echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_AUTO_ADD_TRY_UMOUNT_FOR_BIND_MOUNT"; then
		sed -i 's/auto_try_umount=.*/auto_try_umount=0/' $PERSISTENT_DIR/config.sh
		return
	fi

	# Temporarily disable hide sus mounts for all processes to read /proc/1/mountinfo
	if [ -n "$version" ] && [ "$SUSFS_DECIMAL_MAIN" -ge 1 ] && [ "$SUSFS_DECIMAL_SUB" -ge 5 ] && [ "$SUSFS_DECIMAL_PATCH" -ge 7 ] || [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] 2>/dev/null; then
		# Disable hide sus mounts for all processes if hide_sus_mnts_for_all_procs is enabled
		[ $hide_sus_mnts_for_all_or_non_su_procs -ge 1 ] && {
			${SUSFS_BIN} hide_sus_mnts_for_all_procs 0 >/dev/null && echo "[hide_sus_mnts_for_all_procs = 0]: susfs4ksu/boot-completed" || {
				${SUSFS_BIN} hide_sus_mnts_for_non_su_procs 0 >/dev/null && echo "[hide_sus_mnts_for_non_su_procs = 0]: susfs4ksu/boot-completed";
			};
		} >> $logfile1
	fi

	# Get all susfs mounts from /proc/1/mountinfo
	sus_mounts=$(grep -E "^[25][0-9]{5,9} .* (KSU|shared).*$" /proc/1/mountinfo | awk '{print $5}') # Newer susfs mount IDs start with 500k or 2b
	# Fallback to older susfs mount IDs if no mounts found within 500k range
	if [ -z "$sus_mounts" ]; then
		sus_mounts=$(grep -E "^[13][0-9]{5} .* (KSU|shared).*$" /proc/1/mountinfo | awk '{print $5}')
	fi
	# Loop through each susfs mount and add try_umount path
	for LINE in $sus_mounts; do

		# remove legit mounts from the list if skip_legit_mounts is enabled
		if [ $skip_legit_mounts = 1 ] && grep -qE "^$LINE$" $legit_mounts 2>/dev/null; then
			echo "[skip_legit_mounts] Skipping legit mount: $LINE" >> $logfile1
			continue
		fi

		if echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"; then
			${SUSFS_BIN} add_try_umount "${LINE}" 1 && echo "[try_umount (SUSFS)]: susfs4ksu/boot-completed ${LINE}" >> $logfile1
		elif [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] && ! echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"; then
			${KSU_BIN} kernel umount add "${LINE}" --flags 2 && echo "[try_umount (KSUD)]: susfs4ksu/boot-completed ${LINE}" >> $logfile1
		fi
	done

	# Re-enable hide sus mounts for all processes
	if [ -n "$version" ] && [ "$SUSFS_DECIMAL_MAIN" -ge 1 ] && [ "$SUSFS_DECIMAL_SUB" -ge 5 ] && [ "$SUSFS_DECIMAL_PATCH" -ge 7 ] || [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] 2>/dev/null; then
		[ $hide_sus_mnts_for_all_or_non_su_procs -ge 1 ] && {
			${SUSFS_BIN} hide_sus_mnts_for_all_procs 1 >/dev/null && echo "[hide_sus_mnts_for_all_procs = 1]: susfs4ksu/boot-completed" || {
				${SUSFS_BIN} hide_sus_mnts_for_non_su_procs 1 >/dev/null && echo "[hide_sus_mnts_for_non_su_procs = 1]: susfs4ksu/boot-completed";
			}; 
		} >> $logfile1
	fi
}

# Check and process try_umount paths (KSUD) (susfs v2.0.0+)
if [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] && ! echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"; then
	if grep -v "#" "$PERSISTENT_DIR/try_umount.txt" > /dev/null; then
		grep -v "#" "$PERSISTENT_DIR/try_umount.txt" | while read -r i; do
			[ -z "$i" ] || { ${KSU_BIN} kernel umount add "$i" --flags 2 && echo "[try_umount (KSUD)]: susfs4ksu/boot-completed $i" >> "$logfile1"; }
		done
	fi
fi

# if spoof_uname is on mode 1, set_uname will be called here
[ $spoof_uname = 1 ] && spoof_uname

# Hide Custom ROM Paths
# Find lineage and crdroid paths for all files and directories, with a
# mode-specific exclusion of certain file types (and /vendor/bin/hw/).
# Mode 5 excludes nothing; lower modes progressively exclude more.
[ $hide_cusrom -gt 0 ] && {
	case $hide_cusrom in
		5) cusrom_exclude="" ;;
		4) cusrom_exclude=".(apk|jar)|/vendor/bin/hw/" ;;
		3) cusrom_exclude=".(apk|jar|odex|vdex)|/vendor/bin/hw/" ;;
		2) cusrom_exclude=".(apk|jar|odex|vdex|so)|/vendor/bin/hw/" ;;
		1) cusrom_exclude=".(apk|jar|odex|vdex|so|rc)|/vendor/bin/hw/" ;;
		*) cusrom_exclude="" ;;
	esac
	echo "susfs4ksu/boot-completed: [hide_cusrom][$hide_cusrom]" >> $logfile1
	find /system /vendor /system_ext /product -type f -o -type d | grep -iE "lineage|crdroid" | grep -iE "\." | {
		if [ -n "$cusrom_exclude" ]; then
			grep -vE "$cusrom_exclude"
		else
			cat
		fi
	} | while read -r path; do
		${SUSFS_BIN} add_sus_path "$path" && echo "[sus_path]: susfs4ksu/boot-completed $path" >> "$logfile1"
	done
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

# LSPosed
# This is for SUSFS v2.0.0+ where ksud umount feature is used
[ $force_hide_lsposed = 1 ] && [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] && {
	echo "susfs4ksu/boot-completed: [force_hide_lsposed]" >> $logfile1
	${KSU_BIN} kernel umount add /system/apex/com.android.art/bin/dex2oat --flags 2
	${KSU_BIN} kernel umount add /system/apex/com.android.art/bin/dex2oat32 --flags 2
	${KSU_BIN} kernel umount add /system/apex/com.android.art/bin/dex2oat64 --flags 2
	${KSU_BIN} kernel umount add /apex/com.android.art/bin/dex2oat --flags 2
	${KSU_BIN} kernel umount add /apex/com.android.art/bin/dex2oat32 --flags 2
	${KSU_BIN} kernel umount add /apex/com.android.art/bin/dex2oat64 --flags 2
}

# if hide_sus_mnts_for_all_or_non_su_procs = 2, turn off hide sus mounts for all processes after boot completed
if [ -n "$version" ] && [ "$SUSFS_DECIMAL_MAIN" -ge 1 ] && [ "$SUSFS_DECIMAL_SUB" -ge 5 ] && [ "$SUSFS_DECIMAL_PATCH" -ge 7 ] || [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] 2>/dev/null; then
		[ $hide_sus_mnts_for_all_or_non_su_procs = 2 ] && {
			${SUSFS_BIN} hide_sus_mnts_for_all_procs 0 >/dev/null && echo "[hide_sus_mnts_for_all_procs = 0]: susfs4ksu/post-fs-data" || {
				${SUSFS_BIN} hide_sus_mnts_for_non_su_procs 0 >/dev/null && echo "[hide_sus_mnts_for_non_su_procs = 0]: susfs4ksu/post-fs-data";
			}; 
		} >> $logfile1
fi

# Starting in SUSFS version v1.5.8, it needs to set the sdcard and android data root paths
# This will start the sus_path process. Without this check, sus_path will not work
count=0
max_attempts=60
until [ -d "/sdcard/Android/data" ] || [ $count -ge $max_attempts ]; do
	sleep 1
	count=$((count + 1))
done
if [ -n "$version" ] && [ "$SUSFS_DECIMAL_MAIN" -ge 1 ] && [ "$SUSFS_DECIMAL_SUB" -ge 5 ] && [ "$SUSFS_DECIMAL_PATCH" -ge 8 ] || [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] 2>/dev/null; then
	${SUSFS_BIN} set_sdcard_root_path /sdcard
	${SUSFS_BIN} set_android_data_root_path /sdcard/Android/data
fi

# Helper: read paths from a file and add them via susfs, with optional wait-for-existence retry
# Usage: _add_sus_paths <file> <susfs_subcommand> <log_tag>
_add_sus_paths() {
	local sus_path_count=0
    while read -r i; do
        case "$i" in
            ""|\#*) continue ;;
        esac

        path=$(echo "$i" | awk '{print $1}')
        max_tries=$(echo "$i" | awk '{print $2}')

        until [ -z "$max_tries" ] || [ "$max_tries" -le 0 ] || [ -e "$path" ]; do
            max_tries=$((max_tries - 1))
            sleep 1
        done

        ${SUSFS_BIN} "$2" "$path" && {
            sus_path_count=$((sus_path_count + 1))
            echo "[$3]: susfs4ksu/boot-completed $path" >> "$logfile1"
        }
    done < "$1"
	echo "$sus_path_count"
}

# SUSFS Logging
dmesg_snapshot=$(dmesg)
echo "$dmesg_snapshot" | sed -n "/^\[ *$service/,\$p" | grep -iE "susfs_auto_add|ksu_susfs|susfs:" >> $logfile
endmsg=$(echo "$dmesg_snapshot" | grep -E '^\[ *[0-9]' | cut -d']' -f1 | sed 's/^\[ *//' | cut -d' ' -f1 | tail -n 1)
echo "boot_completed=$endmsg" >> $tmpfolder/logs/boot_stage_time.sh
sleep 15; # this delay is to ensure that all of the susfs logs have been captured
# Just to be sure, set sdcard and android data root paths again
if [ -n "$version" ] && [ "$SUSFS_DECIMAL_MAIN" -ge 1 ] && [ "$SUSFS_DECIMAL_SUB" -ge 5 ] && [ "$SUSFS_DECIMAL_PATCH" -ge 8 ] || [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] 2>/dev/null; then
	${SUSFS_BIN} set_sdcard_root_path /sdcard
	${SUSFS_BIN} set_android_data_root_path /sdcard/Android/data
fi

# Generate susfs stats
sus_mount_count=$(($(grep -ciE "set SUS_MOUNT|to LH_SUS_MOUNT" $logfile ) + $(grep -cE "^[25][0-9]{5,9} .* (KSU|shared).*$" /proc/1/mountinfo )))
rm ${tmpfolder}/susfs_stats.txt
echo sus_map=$(grep -ci 'AS_FLAGS_SUS_MAP' $logfile ) >> ${tmpfolder}/susfs_stats.txt
echo sus_mount=$sus_mount_count >> ${tmpfolder}/susfs_stats.txt
if [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] && ! echo "$susfs_features" | grep -q "CONFIG_KSU_SUSFS_TRY_UMOUNT"; then
	echo try_umount=$(grep -ci 'try_umount (KSUD)' $logfile1 ) >> ${tmpfolder}/susfs_stats.txt
else
	echo try_umount=$(grep -ci 'to LH_TRY_UMOUNT_PATH' $logfile ) >> ${tmpfolder}/susfs_stats.txt
fi
rm ${tmpfolder}/susfs_stats1.txt
echo sus_map=$(grep -ci 'sus_map' $logfile1 ) >> ${tmpfolder}/susfs_stats1.txt
echo sus_mount=$(grep -ci 'sus_mount' $logfile1 ) >> ${tmpfolder}/susfs_stats1.txt
echo try_umount=$(grep -ci 'try_umount' $logfile1 ) >> ${tmpfolder}/susfs_stats1.txt

# to add paths: echo "/system/addon.d" >> /data/adb/susfs4ksu/sus_path.txt
{
	echo "sus_path=0" >> ${tmpfolder}/susfs_stats.txt
	# Emulate Vold app data
	[ $emulate_vold_app_data -ge 1 ] && {
		# Emulate Vold app data by using sus_path on /sdcard/Android/data/<pkg name> for all third-party apps (-3)
		for i in $(pm list packages -3 | cut -d: -f2); do
			[ $emulate_vold_app_data = 1 ] && ${SUSFS_BIN} add_sus_path "/sdcard/Android/data/$i" && {
				app_data_count=$((app_data_count + 1))
				echo "[sus_path]: susfs4ksu/boot-completed /sdcard/Android/data/$i" >> $logfile1
			}
			[ $emulate_vold_app_data = 2 ] && ${SUSFS_BIN} add_sus_path_loop "/sdcard/Android/data/$i" && {
				app_data_count=$((app_data_count + 1))
				echo "[sus_path_loop]: susfs4ksu/boot-completed /sdcard/Android/data/$i" >> $logfile1
			}
		done
	}

	sus_path_count=$(_add_sus_paths "$PERSISTENT_DIR/sus_path.txt" add_sus_path sus_path)

	# Add sus_path_loop paths (late v1.5.9+)
	# to add paths: echo "/system/addon.d" >> /data/adb/susfs4ksu/sus_path_loop.txt
	if [ -n "$version" ] && [ "$SUSFS_DECIMAL_MAIN" -ge 1 ] && [ "$SUSFS_DECIMAL_SUB" -ge 5 ] && [ "$SUSFS_DECIMAL_PATCH" -ge 9 ] || [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] 2>/dev/null; then
		sus_path_loop_count=$(_add_sus_paths "$PERSISTENT_DIR/sus_path_loop.txt" add_sus_path_loop sus_path_loop)
	fi

	# Calculate total sus paths added
	echo "$sus_path_count,$sus_path_loop_count, $app_data_count"
	total_sus_paths=$((sus_path_count + sus_path_loop_count + app_data_count))
	sed -i "s/sus_path=.*/sus_path=$total_sus_paths/" ${tmpfolder}/susfs_stats.txt
	# Last dmesg logs
	dmesg | sed -n "/^\[ *$endmsg/,\$p" | grep -iE "susfs_auto_add|ksu_susfs|susfs:" >> $logfile
} & # run in background
