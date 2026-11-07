#!/system/bin/sh
# Update only the module-local modern SUSFS helper.
# Never modifies the global KernelSU helper, its symlink target, or a legacy helper.

MODDIR=/data/adb/modules/susfs4ksu
MODERN_HELPER="$MODDIR/ksu_susfs_modern"
TMP_HELPER="$MODDIR/.ksu_susfs_modern.update"
URL="https://raw.githubusercontent.com/sidex15/susfs4ksu-binaries/universal-binary/ksu_susfs_arm64"

download() {
  if command -v curl >/dev/null 2>&1; then
    curl -fL --connect-timeout 10 --max-time 60 -sS -o "$1" "$2"
  else
    busybox wget -T 10 -qO "$1" "$2"
  fi
}

if [ ! -d "$MODDIR" ]; then
  echo "Module directory not found: $MODDIR"
  exit 1
fi

if [ -z "$1" ]; then
  echo "Usage: $0 <modern-helper-url>"
  exit 2
fi

URL="$1"
rm -f "$TMP_HELPER"

if ! download "$TMP_HELPER" "$URL"; then
  echo "Download failed: $URL"
  rm -f "$TMP_HELPER"
  exit 1
fi

if [ ! -s "$TMP_HELPER" ]; then
  echo "Downloaded helper is empty"
  rm -f "$TMP_HELPER"
  exit 1
fi

chmod 0755 "$TMP_HELPER"

if ! "$TMP_HELPER" show version >/dev/null 2>&1; then
  echo "Downloaded helper failed its execution check"
  rm -f "$TMP_HELPER"
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  OLD_HASH="$(sha256sum "$MODERN_HELPER" 2>/dev/null | awk '{print $1}')"
  NEW_HASH="$(sha256sum "$TMP_HELPER" | awk '{print $1}')"
  if [ -n "$OLD_HASH" ] && [ "$OLD_HASH" = "$NEW_HASH" ]; then
    echo "Modern helper is already up to date"
    rm -f "$TMP_HELPER"
    exit 0
  fi
fi

mv -f "$TMP_HELPER" "$MODERN_HELPER"
chmod 0755 "$MODERN_HELPER"

if ! "$MODERN_HELPER" show version >/dev/null 2>&1; then
  echo "Updated modern helper failed its execution check"
  exit 1
fi

echo "Modern helper updated successfully"
