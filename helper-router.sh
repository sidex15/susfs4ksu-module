#!/system/bin/sh
# Module-local SUSFS helper dispatcher.
# Never replace or invoke the shared global helper.

MODDIR=$(
    CDPATH= cd -P "$(dirname "$0")" 2>/dev/null && pwd
) || {
    printf '%s\n' 'helper-router: cannot resolve module directory' >&2
    exit 1
}

MODERN="${MODDIR}/ksu_susfs_modern"
LEGACY="${MODDIR}/ksu_susfs_legacy"

run_helper() {
    helper=$1
    shift

    if [ ! -f "$helper" ] || [ ! -x "$helper" ]; then
        printf 'helper-router: missing or non-executable helper: %s\n' \
            "$helper" >&2
        exit 126
    fi

    exec "$helper" "$@"
}

# Only these read-only queries may be retried with another helper.
if [ "$#" -eq 2 ] && [ "$1" = "show" ]; then
    case "$2" in
        version|enabled_features|variant)
            if [ -f "$MODERN" ] && [ -x "$MODERN" ]; then
                output=$("$MODERN" "$@" 2>/dev/null)
                status=$?
                if [ "$status" -eq 0 ] && [ -n "$output" ]; then
                    printf '%s\n' "$output"
                    exit 0
                fi
            fi

            run_helper "$LEGACY" "$@"
            ;;
    esac
fi

case "${1-}" in
    add_sus_path|add_sus_path_loop|\
    hide_sus_mnts_for_non_su_procs|\
    add_sus_map|set_priority_uid_filter|\
    add_sus_kstat_statically|add_sus_kstat|\
    update_sus_kstat|update_sus_kstat_full_clone|\
    set_uname|set_cmdline_or_bootconfig|\
    enable_log|enable_avc_log_spoofing|\
    add_open_redirect)
        # Do not retry modifying commands after failure.
        # Preserve every argument and the helper's exit status.
        run_helper "$MODERN" "$@"
        ;;
    *)
        # Preserve legacy command names and arguments unchanged.
        # Do not translate all-process hiding into non-su hiding.
        run_helper "$LEGACY" "$@"
        ;;
esac
