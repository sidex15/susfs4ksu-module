#!/bin/sh
SUSFS_BIN=/data/adb/ksu/bin/ksu_susfs
SUSFSD=/data/adb/ksu/bin/susfsd
KSU_BIN=/data/adb/ksu/bin/
TMPDIR=/data/adb/ksu/susfs4ksu

echo "***************************************"
echo "SUSFS4KSU Userspace tool update script"
echo "***************************************"

download() { curl --connect-timeout 10 -Ls "$1"; }

# dl logic, shorthand
# download remote
#    test binary; if fail use whats shipped
# if dl fail; use whats shipped
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