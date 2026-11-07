#!/system/bin/sh
# Dispatch by the command set of the pinned modern source, not kernel age or GKI status.
MODDIR=${0%/*}
MODERN=$MODDIR/ksu_susfs_modern
LEGACY=$MODDIR/ksu_susfs_legacy
case "${1:-}" in
    show)
        case "${2:-}" in
            version|enabled_features|variant)
                if result=$("$MODERN" "$@" 2>/dev/null); then
                    printf '%s\n' "$result"
                    exit 0
                fi
                # Only read-only queries may fall back after a failed modern query.
                exec "$LEGACY" "$@"
                ;;
        esac
        exec "$MODERN" "$@"
        ;;
    ''|add_sus_path|add_sus_path_loop|hide_sus_mnts_for_non_su_procs|add_sus_map|set_priority_uid_filter|add_open_redirect|add_sus_kstat_statically|add_sus_kstat|update_sus_kstat|update_sus_kstat_full_clone|enable_log|set_cmdline_or_bootconfig|enable_avc_log_spoofing|set_uname)
        # Never retry modifying commands with a second helper after an error.
        exec "$MODERN" "$@"
        ;;
    *)
        # Commands absent from the pinned modern dispatcher remain with legacy.
        exec "$LEGACY" "$@"
        ;;
esac
