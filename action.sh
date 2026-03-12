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

check() { 
    if command -v curl > /dev/null 2>&1; then
        curl -s --max-time 0.7 --head "$1" > /dev/null 2>&1
    else
        busybox wget --no-check-certificate --timeout=0.7 --spider -q "$1" > /dev/null 2>&1
    fi
}

# dl logic, shorthand
# download remote
#    test binary; if fail use whats shipped
# if dl fail; use whats shipped
susfsupdate() {
    echo "[-] Downloading susfs binary from the internet"
	if download "https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/universal-binary/ksu_susfs_arm64" > ${TMPDIR}/ksu_susfs_remote ; then
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
# Check connectivity first
echo "[-] Checking susfs binary cloud connection"
base_url="https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/universal-binary/ksu_susfs_arm64"
if check "$base_url"; then
	echo "[-] susfs binary cloud connection established"
	# Check the hash of susfs binaries
	echo "[-] Checking hash of susfs binaries..."
	hash=$(sha256sum ${SUSFS_BIN} | awk '{print $1}')
	cloudhash=$(download https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/universal-binary/ksu_susfs_arm64 | sha256sum | awk '{print $1}')
	[ $hash = $cloudhash > /dev/null 2>&1 ] && echo "[-] Local and Cloud Version match, no need to update" || susfsupdate
else
	echo "[!] No internet connection"
	exit 1
fi