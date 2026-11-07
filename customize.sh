#!/bin/sh
PATH=/data/adb/ksu/bin:/data/data/com.termux/files/usr/bin:$PATH
KSU_BIN=/data/adb/ksu/bin/ksud
DEST_BIN_DIR=/data/adb/ksu/bin
MODULE_UPDATE_DIR=/data/adb/modules_update/susfs4ksu
tmpfolder=/data/adb/ksu/susfs4ksu

if [ -z "$KSU" ] ; then
	abort '[!] SuSFS is for KernelSU only.'
fi

if [ ! -d ${DEST_BIN_DIR} ]; then
    ui_print "'${DEST_BIN_DIR}' not existed, installation aborted."
    rm -rf ${MODPATH}
    exit 1
fi

unzip -qq ${ZIPFILE} -d ${TMPDIR}/susfs

susfs4ksu_config_check() {
  ui_print " "
  ui_print "****************************************"
  ui_print "     SUSFS4KSU Config Folder exists     "
  ui_print "****************************************"
  ui_print "     Do you want to reset settings?     "
  ui_print "****************************************"
  ui_print "  Volume Up (+): Reset to default"
  ui_print "  Volume Down (-): Keep current settings"
  ui_print " "
  ui_print "  Keep current settings in 10 seconds"
  ui_print "****************************************"
  local timeout=10
  local start_time=$(date +%s)
  while true; do
    local current_time=$(date +%s)
    if [ $((current_time - start_time)) -ge $timeout ]; then
      ui_print "[-] Timeout: Selected keep current settings"
      break
    fi
    local key_event=$(timeout 0.5 getevent -l 2>/dev/null)
    if echo "$key_event" | grep -q "KEY_VOLUMEUP"; then
      ui_print "[-] Key Detected: Selected Yes, reset to default"
      ui_print "[-] Resetting susfs4ksu settings to default..."
      rm -rf /data/adb/susfs4ksu
      break
    elif echo "$key_event" | grep -q "KEY_VOLUMEDOWN"; then
      ui_print "[-] Key Detected: Selected No, keep current settings"
      break
    fi
  done
}

# Checking KernelSU Version
ksuver=$(${KSU_BIN} debug version | cut -d' ' -f3)
ui_print "[-] Detected KernelSU version: $ksuver"

chmod +x "${MODPATH}/ksu_susfs_modern"
SUSFS_VERSION_RAW="$(${MODPATH}/ksu_susfs_modern show version)"

if [ -n "$SUSFS_VERSION_RAW" ]; then
	ui_print "[-] Kernel is using susfs $SUSFS_VERSION_RAW"
	SUSFS_DECIMAL_MAIN=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//;' | cut -d'.' -f1)
	SUSFS_DECIMAL_SUB=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//;' | cut -d'.' -f2)
	SUSFS_DECIMAL_PATCH=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//;' | cut -d'.' -f3)
else
	ui_print "[-] Kernel is using susfs v1.5.2"
fi

# set permissions
chmod 644 ${MODPATH}/post-fs-data.sh ${MODPATH}/post-mount.sh ${MODPATH}/service.sh ${MODPATH}/boot-completed.sh ${MODPATH}/action.sh ${MODPATH}/uninstall.sh ${MODPATH}/susfs_reset.sh

# Check if config folder exists
if [ -d /data/adb/susfs4ksu ]; then
susfs4ksu_config_check
fi

ui_print "[-] Preparing susfs4ksu persistent directory"
PERSISTENT_DIR=/data/adb/susfs4ksu
[ ! -d /data/adb/susfs4ksu ] && mkdir -p $PERSISTENT_DIR
files="sus_path.txt sus_path_loop.txt sus_maps.txt sus_open_redirect.txt legit_mounts.txt sus_kstat_statically.json config.sh"
for i in $files ; do
    if [ ! -f $PERSISTENT_DIR/$i ] ; then
        cat $MODPATH/$i > $PERSISTENT_DIR/$i
    elif [ "$i" = "config.sh" ]; then
        [ -s "$PERSISTENT_DIR/$i" ] && [ "$(tail -c1 "$PERSISTENT_DIR/$i" | xxd -p)" != "0a" ] && echo "" >> "$PERSISTENT_DIR/$i"
        while IFS= read -r line; do
            key=$(echo "$line" | cut -d'=' -f1)
            grep -q "^${key}=" "$PERSISTENT_DIR/$i" || echo "$line" >> "$PERSISTENT_DIR/$i"
        done < "$MODPATH/$i"
    fi
    rm $MODPATH/$i
done

# Remove obsolete legacy-only persistent files and config keys
rm -f $PERSISTENT_DIR/sus_mount.txt $PERSISTENT_DIR/try_umount.txt 2>/dev/null
sed -i '/^sus_su=/d; /^sus_su_active=/d; /^umount_for_zygote_iso_service=/d' $PERSISTENT_DIR/config.sh 2>/dev/null

# update the module.prop status and version immediately after installation if susfs is >= v1.5.3
if [ -n "$SUSFS_VERSION_RAW" ] && { [ "$SUSFS_DECIMAL_MAIN" -ge 2 ] || { [ "$SUSFS_DECIMAL_MAIN" -eq 1 ] && [ "$SUSFS_DECIMAL_PATCH" -ge 3 ]; }; }; then
    description="description=status: ✅ SuS ඞ"
    sed -i "s/^description=.*/$description/g" $MODPATH/module.prop
    sed -i "s/^description=.*/$description/g" $MODULE_UPDATE_DIR/module.prop

    sed -i "s/^version=.*\(-[^ ]*\)$/version=$SUSFS_VERSION_RAW\1/" $MODPATH/module.prop
    sed -i "s/^version=.*\(-[^ ]*\)$/version=$SUSFS_VERSION_RAW\1/" $MODULE_UPDATE_DIR/module.prop

    SUSFS_BIN=${MODPATH}/ksu_susfs_modern
    susfs_features=$(${SUSFS_BIN} show enabled_features)

mkdir -p $tmpfolder/logs

if [ ! -f $tmpfolder/susfs_stats.txt ] || [ ! -f $tmpfolder/susfs_stats1.txt ]; then
    echo sus_map=0 >> ${tmpfolder}/susfs_stats.txt
    echo sus_path=0 >> ${tmpfolder}/susfs_stats.txt
    echo sus_mount=0 >> ${tmpfolder}/susfs_stats.txt
    echo try_umount=0 >> ${tmpfolder}/susfs_stats.txt
    echo sus_map=0 >> ${tmpfolder}/susfs_stats1.txt
    echo sus_path=0 >> ${tmpfolder}/susfs_stats1.txt
    echo sus_mount=0 >> ${tmpfolder}/susfs_stats1.txt
    echo try_umount=0 >> ${tmpfolder}/susfs_stats1.txt
fi

touch $tmpfolder/logs/susfs_active
cp -r $MODULE_UPDATE_DIR /data/adb/modules
ui_print " "
ui_print "****************************************"
ui_print "      SUSFS4KSU Module installed        "
ui_print "****************************************"
ui_print " You don't need to reboot to access the "
ui_print "                WebUI                   "
ui_print "****************************************"
fi

rm -rf ${MODPATH}/tools
rm ${MODPATH}/customize.sh

# EOF
