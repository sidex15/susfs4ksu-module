#!/system/bin/sh
MODDIR=${0%/*}
DIR=/data/adb/susfs4ksu
CONFIG=$DIR/config.sh
HELPER=$MODDIR/ksu_susfs_modern
UNIVERSAL=/data/adb/ksu/bin/ksu_susfs
LOG=$DIR/priority_uid_filter.log
STATE=$DIR/priority_uid_filter.state
BOOT=$(cat /proc/sys/kernel/random/boot_id)

[ "$(id -u)" = 0 ] || exit 1
mkdir -p "$DIR"
umask 077

enabled() {
    grep -q '^priority_uid_filter=1$' "$CONFIG" 2>/dev/null
}
helper_ready() {
    [ -f "$HELPER" ] || return 1
    chmod 0755 "$HELPER" || return 1
    help_output=$("$HELPER" 2>&1)
    printf '%s\n' "$help_output" | grep -q 'set_priority_uid_filter'
}
kernel_ready() {
    features=$("$UNIVERSAL" show enabled_features 2>/dev/null) || return 1
    printf '%s\n' "$features" | grep -qx 'CONFIG_KSU_SUSFS_PRIORITY_UID_FILTER'
}
record() {
    printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >> "$LOG"
    printf '%s %s\n' "$BOOT" "$1" > "$STATE"
}
set_enabled() {
    [ -f "$CONFIG" ] || { echo 'Config missing; install the module first'; return 1; }
    temp=$CONFIG.priority.$$
    grep -v '^priority_uid_filter=' "$CONFIG" > "$temp"
    printf '\npriority_uid_filter=%s\n' "$1" >> "$temp"
    chmod 0600 "$temp" && mv -f "$temp" "$CONFIG"
}
apply_filter() {
    enabled || { echo 'Disabled for future boot applications; existing kernel state is not cleared'; return 0; }
    kernel_ready || { record unsupported_kernel; echo 'Kernel feature unavailable'; return 1; }
    helper_ready || { record unsupported_helper; echo 'Companion helper unavailable or missing command'; return 1; }
    package_output=$(cmd package list packages -3 2>&1)
    rc=$?
    [ "$rc" = 0 ] || { record package_query_failed; printf '%s\n' "$package_output" >> "$LOG"; return 1; }
    packages=$(printf '%s\n' "$package_output" | awk -F: '/^package:[A-Za-z0-9_.]+$/ {out=out (out ? "," : "") $2} END {print out}')
    [ -n "$packages" ] || { record empty_package_list; echo 'No packages; filter not changed'; return 1; }
    [ "${#packages}" -lt 65535 ] || { record package_list_too_long; return 1; }
    "$HELPER" set_priority_uid_filter "$packages" >> "$LOG" 2>&1
    rc=$?
    if [ "$rc" = 0 ]; then
        record applied
        echo 'Kernel accepted the filter. This does not prove detector results.'
    else
        record "failed_exit_$rc"
        echo "Filter application failed: exit=$rc; see $LOG"
    fi
    return "$rc"
}
status() {
    if enabled; then echo 'Configured: enabled'; else echo 'Configured: disabled'; fi
    if kernel_ready; then echo 'Kernel support: available'; else echo 'Kernel support: unavailable'; fi
    if helper_ready; then echo 'Companion command: available'; else echo 'Companion command: unavailable'; fi
    if [ -f "$STATE" ]; then
        read -r state_boot state_result < "$STATE"
        if [ "$state_boot" = "$BOOT" ]; then
            echo "Last application this boot: $state_result"
        else
            echo 'Last application: previous boot; current state not verified'
        fi
    else
        echo 'Last application: not recorded'
    fi
    echo 'Disabling prevents future applications; reboot to remove an already-applied filter.'
}
case "${1:-status}" in
    status) status; exit 0 ;;
    enable|disable|apply|boot) ;;
    *) echo 'Usage: sh priority-uid-filter.sh status|enable|disable|apply|boot'; exit 2 ;;
esac
LOCK=$DIR/.priority_uid_filter.lock
mkdir "$LOCK" 2>/dev/null || { echo 'Another filter operation is running'; exit 1; }
trap 'rmdir "$LOCK"' EXIT
trap 'exit 1' HUP INT TERM
case "$1" in
    enable) set_enabled 1 && apply_filter ;;
    disable) set_enabled 0 && echo 'Disabled for future boots. Reboot to remove any filter already applied.' ;;
    apply|boot) apply_filter ;;
esac
