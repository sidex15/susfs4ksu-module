SUSFS_BIN=/data/adb/ksu/bin/ksu_susfs
KSU_BIN=/data/adb/ksu/bin/
TMPDIR=/data/adb/ksu/susfs4ksu

echo "***************************************"
echo "SUSFS4KSU Userspace tool update script"
echo "***************************************"

download() { busybox wget -T 10 --no-check-certificate -qO - "$1"; }
if command -v curl > /dev/null 2>&1; then
	download() { curl --connect-timeout 10 -Ls "$1"; }
fi

# dl logic, shorthand
# download remote
#    test binary; if fail use whats shipped
# if dl fail; use whats shipped
susfsupdate() {
    echo "[-] Downloading susfs $3 from the internet"
	if download "https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/main/$1/$2/ksu_susfs_arm64" > ${TMPDIR}/ksu_susfs_remote ; then
		# test downloaded binary
		chmod +x ${TMPDIR}/ksu_susfs_remote
		if ${TMPDIR}/ksu_susfs_remote > /dev/null 2>&1 ; then
			# test ok
			cp -f ${TMPDIR}/ksu_susfs_remote ${KSU_BIN}/ksu_susfs
            echo "[-] Update Complete!"
		else
			# test failed
            echo "[!] Download Test Failed"
			echo "[!] Update Failed"
		fi
	else
		# failed
		echo "[!] No internet connection or susfs binaries not found"
		echo "[!] Update Failed"
	fi
}

ver=$(uname -r | cut -d. -f1)
if [ ${ver} -lt 5 ]; then
    KERNEL_VERSION=non-gki
	echo "[-] Non-GKI kernel detected... use non-GKI susfs bins..."
    SUSFS_VERSION_RAW=$(${SUSFS_BIN} show version)
    # Example output = 'v1.5.3'
    SUSFS_DECIMAL=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//; s/\.//g')
    # SUSFS_DECIMAL = '153'
else
	KERNEL_VERSION=gki
	echo "[-] GKI kernel detected... use GKI susfs bins..."
    SUSFS_VERSION_RAW=$(${SUSFS_BIN} show version)
    # Example output = 'v1.5.3'
    SUSFS_DECIMAL=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//; s/\.//g')
    # SUSFS_DECIMAL = '153'
fi

# Check the hash of susfs binaries
echo "[-] Checking hash of susfs binaries..."
echo "[-] Kernel is using susfs $SUSFS_VERSION_RAW"
hash=$(sha256sum ${SUSFS_BIN} | awk '{print $1}')
cloudhash=$(download https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/main/$SUSFS_DECIMAL/$KERNEL_VERSION/ksu_susfs_arm64 | sha256sum | awk '{print $1}')
[ $hash = $cloudhash > /dev/null 2>&1 ] && echo "[-] Local and Cloud Version match, no need to update" || susfsupdate $SUSFS_DECIMAL $KERNEL_VERSION $SUSFS_VERSION_RAW