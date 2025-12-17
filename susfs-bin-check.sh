#!/bin/sh
SUSFS_BIN=/data/adb/ksu/bin/ksu_susfs
TMPDIR=/data/adb/ksu/susfs4ksu

download() { busybox wget -T 1 --no-check-certificate -qO - "$1"; }
if command -v curl > /dev/null 2>&1; then
	download() { curl --connect-timeout 1 -Ls "$1"; }
fi

check() { 
    if command -v curl > /dev/null 2>&1; then
        curl -s --max-time 1 --head "$1" > /dev/null 2>&1
    else
        busybox wget --no-check-certificate --spider -q "$1" > /dev/null 2>&1
    fi
}

# Check connectivity first
base_url="https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/new"
if ! check "$base_url"; then
  echo "no-conn"
  exit 1
fi

# Check the hash of susfs binaries
hash=$(sha256sum ${SUSFS_BIN} | awk '{print $1}')
cloudhash=$(download https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/new/$1/$2/$3/$4/ksu_susfs_arm64 | sha256sum | awk '{print $1}')
[ $hash = $cloudhash > /dev/null 2>&1 ] && echo "match" || echo "mismatch"
#EOL