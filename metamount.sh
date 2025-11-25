#!/system/bin/sh
# meta-overlayfs Module Mount Handler
# This script is the entry point for dual-directory module mounting

MODDIR="${0%/*}"

# Set dual-directory environment variables
MODULE_METADATA_DIR="/data/adb/modules"
MODULE_METADATA_SOURCE="KSU"
MODULE_METADATA_LOGLEVEL=3
MODULE_METADATA_LOGFILE="/data/adb/mm.log"
MODULE_METADATA_LOGFILE_OLD="/data/adb/mm.log/old"

if [ -f "$MODULE_METADATA_LOGFILE" ]; then
	mv -f "$MODULE_METADATA_LOGFILE" "$MODULE_METADATA_LOGFILE_OLD"
fi

# Execute the mount binary
$MODDIR/meta-mm -s "$MODULE_METADATA_SOURCE" -m "$MODULE_METADATA_DIR" -v "$MODULE_METADATA_LOGLEVEL" -l "$MODULE_METADATA_LOGFILE"

EXIT_CODE=$?

if [ "$EXIT_CODE" = 0 ]; then
	/data/adb/ksud kernel notify-module-mounted > /dev/null 2>&1 
fi

# EOF
