#!/bin/sh
PATH=/data/adb/ksu/bin:/data/data/com.termux/files/usr/bin:$PATH
KSU_BIN=/data/adb/ksu/bin/ksud
DEST_BIN_DIR=/data/adb/ksu/bin

if [ -z "$KSU" ] ; then
	abort '[!] SuSFS is for KernelSU only.'
fi

if [ ! -d ${DEST_BIN_DIR} ]; then
    ui_print "'${DEST_BIN_DIR}' not existed, installation aborted."
    rm -rf ${MODPATH}
    exit 1
fi

unzip -qq ${ZIPFILE} -d ${TMPDIR}/susfs

download() { busybox wget -T 10 --no-check-certificate -qO - "$1"; }
if command -v curl > /dev/null 2>&1; then
	download() { curl --connect-timeout 10 -Ls "$1"; }
fi

# Checking KernelSU Version
ksuver=$(${KSU_BIN} debug version | cut -d' ' -f3)
ui_print "[-] Detected KernelSU version: $ksuver"
susfs_temp_bin="pre-20000"

if [ ${ksuver} -gt 19999 ] 2>/dev/null; then
	ui_print "[-] KernelSU version is using supercalls, using v2.0.0 binary for checking"
	susfs_temp_bin="20000"
fi

ver=$(uname -r | cut -d. -f1)
if [ ${ver} -lt 5 ]; then
    KERNEL_VERSION=non-gki
	ui_print "[-] Non-GKI kernel detected... use non-GKI susfs bins..."
	chmod +x "${TMPDIR}/susfs/tools/${susfs_temp_bin}/${KERNEL_VERSION}/ksu_susfs_arm64"
	if [ ${ARCH} = "arm64" ]; then
		# Example output = 'v1.5.3'
		SUSFS_VERSION_RAW="$(${TMPDIR}/susfs/tools/${susfs_temp_bin}/${KERNEL_VERSION}/ksu_susfs_arm64 show version)"
		# SUSFS_DECIMAL_MAIN = '1'
		SUSFS_DECIMAL_MAIN=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//;' | cut -d'.' -f1)
		# SUSFS_DECIMAL_SUB = '5'
		SUSFS_DECIMAL_SUB=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//;' | cut -d'.' -f2)
		# SUSFS_DECIMAL_PATCH = '3'
		SUSFS_DECIMAL_PATCH=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//;' | cut -d'.' -f3)
	fi
else
	KERNEL_VERSION=gki
	ui_print "[-] GKI kernel detected... use GKI susfs bins..."
	chmod +x "${TMPDIR}/susfs/tools/${susfs_temp_bin}/${KERNEL_VERSION}/ksu_susfs_arm64"
	if [ ${ARCH} = "arm64" ]; then
		# Example output = 'v1.5.3'
		SUSFS_VERSION_RAW="$(${TMPDIR}/susfs/tools/${susfs_temp_bin}/${KERNEL_VERSION}/ksu_susfs_arm64 show version)"
		# SUSFS_DECIMAL_MAIN = '1'
		SUSFS_DECIMAL_MAIN=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//;' | cut -d'.' -f1)
		# SUSFS_DECIMAL_SUB = '5'
		SUSFS_DECIMAL_SUB=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//;' | cut -d'.' -f2)
		# SUSFS_DECIMAL_PATCH = '3'
		SUSFS_DECIMAL_PATCH=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//;' | cut -d'.' -f3)
	fi
fi

# dl logic, shorthand
# download remote
#    test binary; if fail use whats shipped
# if dl fail; use whats shipped
if [ -n "$SUSFS_VERSION_RAW" ] 2>/dev/null; then
	ui_print "[-] Kernel is using susfs $SUSFS_VERSION_RAW"
	ui_print "[-] Downloading susfs $SUSFS_VERSION_RAW from the internet"
	if download "https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/new/$SUSFS_DECIMAL_MAIN/$SUSFS_DECIMAL_SUB/$SUSFS_DECIMAL_PATCH/$KERNEL_VERSION/ksu_susfs_arm64" > ${MODPATH}/ksu_susfs_remote ; then
		# test downloaded binary
		chmod +x ${MODPATH}/ksu_susfs_remote
		if ${MODPATH}/ksu_susfs_remote > /dev/null 2>&1 ; then
			# test ok
			cp -f ${MODPATH}/ksu_susfs_remote ${DEST_BIN_DIR}/ksu_susfs
		else
			# test failed
			cp ${TMPDIR}/susfs/tools/${susfs_temp_bin}/${KERNEL_VERSION}/ksu_susfs_arm64 ${DEST_BIN_DIR}/ksu_susfs
		fi
	else
		# failed
		echo "[!] No internet connection or susfs binaries not found"
		echo "[-] Using local susfs binaries"
		cp ${TMPDIR}/susfs/tools/${susfs_temp_bin}/${KERNEL_VERSION}/ksu_susfs_arm64 ${DEST_BIN_DIR}/ksu_susfs
	fi		
else
	ui_print "[-] Kernel is using susfs v1.5.2"
	cp -f ${TMPDIR}/susfs/tools/152/${KERNEL_VERSION}/ksu_susfs_arm64 ${DEST_BIN_DIR}/ksu_susfs
fi

# cleanup
rm -f ${MODPATH}/ksu_susfs_remote > /dev/null 2>&1

# copy sus_su over
if [ -n "$SUSFS_DECIMAL_MAIN" ] && [ "$SUSFS_DECIMAL_MAIN" -ge 2 ]; then
	ui_print "[!] Susfs version v2.0.0+ detected, sus_su is deprecated"
	ui_print "[-] Skipping sus_su installation"
else
	ui_print "[-] Installing sus_su"
	cp ${TMPDIR}/susfs/tools/sus_su_arm64 ${DEST_BIN_DIR}/sus_su
	chmod 755 ${DEST_BIN_DIR}/ksu_susfs ${DEST_BIN_DIR}/sus_su
fi

# set permissions
chmod 644 ${MODPATH}/post-fs-data.sh ${MODPATH}/post-mount.sh ${MODPATH}/service.sh ${MODPATH}/boot-completed.sh ${MODPATH}/action.sh ${MODPATH}/uninstall.sh ${MODPATH}/susfs-bin-update.sh ${MODPATH}/susfs_reset.sh

prop_value=$(getprop ro.boot.vbmeta.digest)
HASH_DIR=/data/adb/VerifiedBootHash
if ${KSU_BIN} module list | grep -qE "vbmeta-fixer|TA_utl"; then
	ui_print "*********************************************************"
	ui_print "! vbmeta-fixer or Tricky Addon module detected"
	ui_print "! skipping VerifiedBootHash creation"
	ui_print "*********************************************************"
else
	if [ -z "$prop_value" ]; then
		ui_print "[!] Property ro.boot.vbmeta.digest is empty, generate VerifiedBootHash directory"
		if [ ! -d "$HASH_DIR" ]; then
		ui_print "[-] Creating VerifiedBootHash directory"
		mkdir -p "$HASH_DIR"
		[ ! -f "$HASH_DIR/VerifiedBootHash.txt" ] && touch "$HASH_DIR/VerifiedBootHash.txt"
		fi
		ui_print "*********************************************************"
		ui_print "! Please copy your VerifiedBootHash in Key Attestation demo"
		ui_print "! And Paste it to /data/adb/VerifiedBootHash/VerifiedBootHash.txt"
		ui_print "*********************************************************"
	else
		ui_print "*********************************************************"
		ui_print "! Property ro.boot.vbmeta.digest has a value"
		ui_print "! skipping VerifiedBootHash creation"
		ui_print "*********************************************************"
	fi
fi

ui_print "[-] Preparing susfs4ksu persistent directory"
PERSISTENT_DIR=/data/adb/susfs4ksu
[ ! -d /data/adb/susfs4ksu ] && mkdir -p $PERSISTENT_DIR
files="sus_mount.txt try_umount.txt sus_path.txt sus_path_loop.txt sus_maps.txt config.sh"
for i in $files ; do
    if [ ! -f $PERSISTENT_DIR/$i ] ; then
        # If file doesn't exist, create it
        cat $MODPATH/$i > $PERSISTENT_DIR/$i
    elif [ "$i" = "config.sh" ]; then
        # Ensure file ends with newline
        [ -s "$PERSISTENT_DIR/$i" ] && [ "$(tail -c1 "$PERSISTENT_DIR/$i" | xxd -p)" != "0a" ] && echo "" >> "$PERSISTENT_DIR/$i"
        # For config.sh, append only new keys
        while IFS= read -r line; do
            # Extract key name before = sign
            key=$(echo "$line" | cut -d'=' -f1)
            # Only append if key doesn't exist
            grep -q "^${key}=" "$PERSISTENT_DIR/$i" || echo "$line" >> "$PERSISTENT_DIR/$i"
        done < "$MODPATH/$i"
    fi
    rm $MODPATH/$i
done

# Random ro.boot.vbmeta.size value
vbmeta_size=$(( 5504 + (RANDOM % 14 + 1)*1024 ))  # 5504~16384

# Data persistence
if grep -q "^vbmeta_size=" /data/adb/susfs4ksu/config.sh; then
    sed -i "s/^vbmeta_size=.*/vbmeta_size=$vbmeta_size/" /data/adb/susfs4ksu/config.sh
else
    echo "vbmeta_size=$vbmeta_size" >> /data/adb/susfs4ksu/config.sh
fi

rm -rf ${MODPATH}/tools
rm ${MODPATH}/customize.sh ${MODPATH}/README.md

if ${KSU_BIN} module list | grep -qiE "integrity\.box"; then
	ui_print "⚠️ Integrity-Box detected!"
	ui_print "⚠️ Integrity-Box Tampers with SUSFS4KSU custom settings without consent and may cause issues."
	ui_print "⚠️ Please Double Check Your SUSFS4KSU Settings in the WebUI if you are using Integrity-Box."
	ui_print "⚠️ If you are facing issues or you can't boot, please contact the Integrity-Box developer to disable tampering SUSFS Settings and paths"
fi

# EOF
