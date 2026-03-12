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

download() { busybox wget -T 10 --no-check-certificate -qO - "$1"; }
if command -v curl > /dev/null 2>&1; then
	download() { curl --connect-timeout 10 -Ls "$1"; }
fi

check() { 
    if command -v curl > /dev/null 2>&1; then
        curl -s --max-time 0.7 --head "$1" > /dev/null 2>&1
    else
        busybox wget --no-check-certificate --timeout=0.7 --spider -q "$1" > /dev/null 2>&1
    fi
}

# Checking KernelSU Version
ksuver=$(${KSU_BIN} debug version | cut -d' ' -f3)
ui_print "[-] Detected KernelSU version: $ksuver"
susfs_temp_bin="pre-20000"

if [ ${ksuver} -gt 19999 ] 2>/dev/null; then
	ui_print "[-] KernelSU version is using supercalls, using v2.0.0 binary for checking"
	susfs_temp_bin="20000"
fi

chmod +x "${TMPDIR}/susfs/tools/ksu_susfs_arm64"
# Example output = 'v1.5.3'
SUSFS_VERSION_RAW="$(${TMPDIR}/susfs/tools/ksu_susfs_arm64 show version)"

# dl logic, shorthand
# download remote
#    test binary; if fail use whats shipped
# if dl fail; use whats shipped
if [ -n "$SUSFS_VERSION_RAW" ] 2>/dev/null; then
	ui_print "[-] Kernel is using susfs $SUSFS_VERSION_RAW"	
else
	ui_print "[-] Kernel is using susfs v1.5.2"
fi

# Check connectivity first
ui_print "[-] Checking susfs binary cloud connection"
base_url="https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/universal-binary/ksu_susfs_arm64"
if check "$base_url"; then
	ui_print "[-] susfs binary cloud connection established"
	# Check the hash of susfs binaries
	hash=$(sha256sum ${TMPDIR}/susfs/tools/ksu_susfs_arm64 | awk '{print $1}')
	cloudhash=$(download https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/universal-binary/ksu_susfs_arm64 | sha256sum | awk '{print $1}')
	if [ $hash = $cloudhash > /dev/null 2>&1 ]; then
		ui_print "[-] susfs local and cloud binary hash is the same"
		ui_print "[-] skipping binary cloud update"
	else
		ui_print "[-] Downloading latest susfs binary from the internet"
		download "https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/universal-binary/ksu_susfs_arm64" > ${MODPATH}/ksu_susfs_remote
		# test downloaded binary
		chmod +x ${MODPATH}/ksu_susfs_remote
		if ${MODPATH}/ksu_susfs_remote > /dev/null 2>&1 ; then
			# test ok
			ui_print "[-] Downloaded susfs binary is working, using it for installation"
			cp -f ${MODPATH}/ksu_susfs_remote ${DEST_BIN_DIR}/ksu_susfs
		else
			# test failed
			ui_print "[!] Downloaded susfs binary is not working, using local binary for installation"
			cp ${TMPDIR}/susfs/tools/ksu_susfs_arm64 ${DEST_BIN_DIR}/ksu_susfs
		fi
	fi
else
	# failed
	ui_print "[!] No internet connection"
	ui_print "[-] Using local susfs binaries"
	cp ${TMPDIR}/susfs/tools/ksu_susfs_arm64 ${DEST_BIN_DIR}/ksu_susfs
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

# Check if config folder exists
if [ -d /data/adb/susfs4ksu ]; then
susfs4ksu_config_check
fi

prop_value=$(getprop ro.boot.vbmeta.digest)
HASH_DIR=/data/adb/VerifiedBootHash
if ${KSU_BIN} module list | grep -qE "vbmeta-fixer|TA_utl"; then
	ui_print "****************************************"
	ui_print "! vbmeta-fixer or Tricky Addon module detected"
	ui_print "! skipping VerifiedBootHash creation"
	ui_print "****************************************"
else
	if [ -z "$prop_value" ]; then
		ui_print "[!] Property ro.boot.vbmeta.digest is empty, generate VerifiedBootHash directory"
		if [ ! -d "$HASH_DIR" ]; then
		ui_print "[-] Creating VerifiedBootHash directory"
		mkdir -p "$HASH_DIR"
		[ ! -f "$HASH_DIR/VerifiedBootHash.txt" ] && touch "$HASH_DIR/VerifiedBootHash.txt"
		fi
		ui_print "****************************************"
		ui_print "! Please copy your VerifiedBootHash in Key Attestation demo"
		ui_print "! And Paste it to /data/adb/VerifiedBootHash/VerifiedBootHash.txt"
		ui_print "****************************************"
	else
		ui_print "****************************************"
		ui_print "! Property ro.boot.vbmeta.digest has a value"
		ui_print "! skipping VerifiedBootHash creation"
		ui_print "****************************************"
	fi
fi

ui_print "[-] Preparing susfs4ksu persistent directory"
PERSISTENT_DIR=/data/adb/susfs4ksu
[ ! -d /data/adb/susfs4ksu ] && mkdir -p $PERSISTENT_DIR
files="sus_mount.txt try_umount.txt sus_path.txt sus_path_loop.txt sus_maps.txt sus_open_redirect.txt legit_mounts.txt config.sh"
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
rm ${MODPATH}/customize.sh

# EOF
