SUSFS_BIN=/data/adb/ksu/bin/ksu_susfs
KSU_BIN=/data/adb/ksu/bin/
TMPDIR=/data/adb/ksu/susfs4ksu
SUSFS_VERSION_RAW=$(${SUSFS_BIN} show version)
# SUSFS_DECIMAL_MAIN = '1'
SUSFS_DECIMAL_MAIN=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//;' | cut -d'.' -f1)
# SUSFS_DECIMAL_SUB = '5'
SUSFS_DECIMAL_SUB=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//;' | cut -d'.' -f2)
# SUSFS_DECIMAL_PATCH = '3'
SUSFS_DECIMAL_PATCH=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//;' | cut -d'.' -f3)

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
    echo "[-] Downloading susfs $5 from the internet"
	if download "https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/new/$1/$2/$3/$4/ksu_susfs_arm64" > ${TMPDIR}/ksu_susfs_remote ; then
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
else
	KERNEL_VERSION=gki
fi

# Check the hash of susfs binaries
echo "[-] Checking hash of susfs binaries..."
echo "[-] Kernel is using susfs $SUSFS_VERSION_RAW"
hash=$(sha256sum ${SUSFS_BIN} | awk '{print $1}')
cloudhash=$(download https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/new/$SUSFS_DECIMAL_MAIN/$SUSFS_DECIMAL_SUB/$SUSFS_DECIMAL_PATCH/$KERNEL_VERSION/ksu_susfs_arm64 | sha256sum | awk '{print $1}')
[ $hash = $cloudhash > /dev/null 2>&1 ] && echo "[-] Local and Cloud Version match, no need to update" || susfsupdate $SUSFS_DECIMAL_MAIN $SUSFS_DECIMAL_SUB $SUSFS_DECIMAL_PATCH $KERNEL_VERSION $SUSFS_VERSION_RAW