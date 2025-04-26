#!/bin/sh
PATH=/data/adb/ksu/bin:/data/data/com.termux/files/usr/bin:$PATH
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

ver=$(uname -r | cut -d. -f1)
if [ ${ver} -lt 5 ]; then
    KERNEL_VERSION=non-gki
	ui_print "[-] Non-GKI kernel detected... use non-GKI susfs bins..."
	chmod +x "${TMPDIR}/susfs/tools/latest/${KERNEL_VERSION}/ksu_susfs_arm64"
	if [ ${ARCH} = "arm64" ]; then
		SUSFS_VERSION_RAW="$(${TMPDIR}/susfs/tools/latest/${KERNEL_VERSION}/ksu_susfs_arm64 show version)"
		# Example output = 'v1.5.3'
		SUSFS_DECIMAL=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//; s/\.//g')
		# SUSFS_DECIMAL = '153'
	fi
else
	KERNEL_VERSION=gki
	ui_print "[-] GKI kernel detected... use GKI susfs bins..."
	chmod +x "${TMPDIR}/susfs/tools/latest/${KERNEL_VERSION}/ksu_susfs_arm64"
	if [ ${ARCH} = "arm64" ]; then
		SUSFS_VERSION_RAW="$(${TMPDIR}/susfs/tools/latest/${KERNEL_VERSION}/ksu_susfs_arm64 show version)"
		# Example output = 'v1.5.3'
		SUSFS_DECIMAL=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//; s/\.//g')
		# SUSFS_DECIMAL = '153'
	fi
fi

# dl logic, shorthand
# download remote
#    test binary; if fail use whats shipped
# if dl fail; use whats shipped
if [ -n "$SUSFS_VERSION_RAW" ] && [ "$SUSFS_DECIMAL" -gt 152 ] 2>/dev/null; then
	ui_print "[-] Kernel is using susfs $SUSFS_VERSION_RAW"
	ui_print "[-] Downloading susfs $SUSFS_VERSION_RAW from the internet"
	if download "https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/main/$SUSFS_DECIMAL/$KERNEL_VERSION/ksu_susfs_arm64" > ${MODPATH}/ksu_susfs_remote ; then
		# test downloaded binary
		chmod +x ${MODPATH}/ksu_susfs_remote
		if ${MODPATH}/ksu_susfs_remote show enabled_features | grep -q "CONFIG_KSU_SUSFS" > /dev/null 2>&1 ; then
			# test ok
			cp -f ${MODPATH}/ksu_susfs_remote ${DEST_BIN_DIR}/ksu_susfs
		else
			# test failed
			cp ${TMPDIR}/susfs/tools/latest/${KERNEL_VERSION}/ksu_susfs_arm64 ${DEST_BIN_DIR}/ksu_susfs
		fi
	else
		# failed
		echo "[!] No internet connection or susfs binaries not found"
		echo "[-] Using local susfs binaries"
		cp ${TMPDIR}/susfs/tools/latest/${KERNEL_VERSION}/ksu_susfs_arm64 ${DEST_BIN_DIR}/ksu_susfs
	fi		
else
	ui_print "[-] Kernel is using susfs v1.5.2"
	cp -f ${TMPDIR}/susfs/tools/152/${KERNEL_VERSION}/ksu_susfs_arm64 ${DEST_BIN_DIR}/ksu_susfs
fi

# cleanup
rm -f ${MODPATH}/ksu_susfs_remote > /dev/null 2>&1

# copy sus_su over
cp ${TMPDIR}/susfs/tools/sus_su_arm64 ${DEST_BIN_DIR}/sus_su
chmod 755 ${DEST_BIN_DIR}/ksu_susfs ${DEST_BIN_DIR}/sus_su
chmod 644 ${MODPATH}/post-fs-data.sh ${MODPATH}/service.sh ${MODPATH}/uninstall.sh

prop_value=$(getprop ro.boot.vbmeta.digest)
HASH_DIR=/data/adb/VerifiedBootHash

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

ui_print "[-] Preparing susfs4ksu persistent directory"
PERSISTENT_DIR=/data/adb/susfs4ksu
[ ! -d /data/adb/susfs4ksu ] && mkdir -p $PERSISTENT_DIR
files="sus_mount.txt try_umount.txt sus_path.txt config.sh"
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

rm -rf ${MODPATH}/tools
rm ${MODPATH}/customize.sh ${MODPATH}/README.md

# EOF
