#!/bin/sh
SUSFS_BIN=/data/adb/ksu/bin/ksu_susfs
KSU_BIN=/data/adb/ksu/bin/
TMPDIR=/data/adb/ksu/susfs4ksu

echo "***************************************"
echo "SUSFS4KSU Userspace tool update script"
echo "***************************************"

download() { busybox wget -T 1 --no-check-certificate -qO - "$1"; }
if command -v curl > /dev/null 2>&1; then
	download() { curl --connect-timeout 1 -Ls "$1"; }
fi

# dl logic, shorthand
# download remote
#    test binary; if fail use whats shipped
# if dl fail; use whats shipped
if download "https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/new/$1/$2/$3/$4/ksu_susfs_arm64" > ${TMPDIR}/ksu_susfs_remote ; then
    # test downloaded binary
    chmod +x ${TMPDIR}/ksu_susfs_remote
    if ${TMPDIR}/ksu_susfs_remote > /dev/null 2>&1 ; then
		# test ok
		mv -f ${TMPDIR}/ksu_susfs_remote ${KSU_BIN}/ksu_susfs
		echo "[-] Update Complete!"
    else
		# test failed
		echo "[!] Download Test Failed"
		echo "[!] Update Failed"
        exit 1
    fi
else
	# failed
	echo "[!] No internet connection or susfs binaries not found"
	echo "[!] Update Failed"
    exit 1
fi
#EOL