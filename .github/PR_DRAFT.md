# Improve userspace helper builds, priority UID filtering, and module compatibility

## Summary

This proposal updates the userspace SUSFS module with source-built upstream helpers, explicit build-source selection, module-local helper routing, opt-in priority UID filtering, distribution fixes, and targeted WebUI/property changes.

This is a userspace module change only. It does not patch the kernel or upgrade the SUSFS implementation in the running kernel.

Draft source: `Najip/susfs4ksu-module`, branch `v1.5.2+`, reviewed through commit `05819c69d68aab7e89de3f26ab24773d366509eb`.

## Motivation

- Make the source revision used for the modern userspace helper explicit and traceable.
- Keep routine builds pinned while allowing deliberate testing of newer upstream revisions.
- Provide priority UID filtering only when supported, without enabling it by default.
- Preserve module-local legacy compatibility while avoiding unsafe retries of modifying commands.
- Correct distribution staging and improve clarity around compatibility settings.

## Changes

### 1. Source-built upstream ARM64 helper

The module build fetches helper source directly from `https://gitlab.com/simonpunk/susfs4ksu.git` and builds `ksu_susfs` with Android NDK `27.2.12479018`, targeting `arm64-v8a` and Android API 26.

The resulting executable retains the module-local filename `ksu_susfs_modern` for router compatibility. Keeping this filename does not imply that the binary comes from a separate upstream project.

The build records the resolved source revision, selection mode, NDK version, and helper SHA-256. It also uploads an exact source archive, commit metadata, source license, and source-archive checksum as a separate artifact.

The standalone `.github/workflows/build-upstream-helper.yml` remains available for producing a test helper artifact separately from the module build.

### 2. Pinned/latest dropdown with an optional SHA override

Both manual module-build entry points expose:

- `helper_source`: `pinned` or `latest`, defaulting to `pinned`.
- `helper_sha`: an optional string, empty by default, accepting a full 40-character hexadecimal commit SHA.

Selection precedence:

| SHA field | Dropdown | Selected source |
| --- | --- | --- |
| Empty | `pinned` | Saved pinned commit |
| Empty | `latest` | Current `gki-android14-6.1` branch head |
| Valid full SHA | Either | Exact supplied commit; dropdown ignored |

A non-empty malformed SHA fails the build rather than silently using the dropdown. Uppercase hexadecimal is normalized to lowercase. When a commit is explicitly requested, the fetched revision must match it.

Automatic push builds remain pinned. Neither `latest` nor a SHA override updates the saved pin. Future manual pin bumps require changing only `PINNED_HELPER_REV` in `.github/workflows/build-priority-module.yml`.

Current saved pin: `a2165b6f875b73e2f87d3c6f12814efac8de061d`.

### 3. Module-local helper routing

- Retain `ksu_susfs_modern` and `ksu_susfs_legacy` within the module.
- Route the explicitly supported modern command set to the modern helper and other commands to the legacy helper.
- Restrict fallback to read-only version/features/variant queries.
- Do not retry modifying commands through another helper.
- Do not overwrite a global helper binary.

Legacy compatibility remains part of this proposal; this is not a complete removal of legacy support.

### 4. Opt-in priority UID filtering

- Add a Custom Settings control, disabled by default.
- Gate availability on helper/kernel capability checks.
- Accept third-party package names rather than raw numeric UIDs.
- Reject empty package input.
- Support immediate application and application during boot, with current-boot status reporting.
- Explain that disabling requires a reboot to clear the current-boot effect.

The Kernel Features Status entry describes support, not whether the user's priority-filter toggle is enabled.

### 5. Distribution and validation

Update `.github/scripts/prepare-distribution.py` for the current helper-initialization layout, preserve the WebUI, and remove obsolete slicing assumptions.

The shared build includes checks for:

- ELF64/AArch64 output.
- Presence of the `set_priority_uid_filter` command string.
- Byte-for-byte agreement between the built helper and staged helper.
- Staged helper checksums and distribution layout validation.
- Shell and selected JavaScript syntax.

These checks are build-time safeguards, not proof of runtime command compatibility. In particular, finding a command string does not establish that a modifying command works correctly on every kernel.

### 6. OEM property handling

For SDK 36 and newer, delete `sys.oem_unlock_allowed`; on older SDK levels, set it to `0`. Set `ro.oem_unlock_supported` to `0`.

### 7. WebUI cleanup and compatibility guidance

- Hide deprecated SUS SU and zygote-isolation HTML rows.
- Add a compact Home recommendation card with a scrollable explanation dialog.
- Explain manual per-app/default module-unmount workarounds without claiming to read or control the Manager's actual setting.
- Match existing WebUI typography and button styling.

This is not a complete removal of deprecated code from the minified JavaScript bundle, and it does not implement native KernelSU Manager setting integration.

## Validation and evidence

### Reported device environment

- KernelSU `32718-6`.
- Running kernel SUSFS `2.3.0`.
- WildGKI `6.1.176`.
- HyperOS 3 Vietnam build on GKI.

### Reported testing

- The OEM property change was confirmed on the test device.
- Priority filtering was reported enabled and applied on that environment.
- A read-only audit of the standalone upstream helper successfully queried `show version`, `show enabled_features`, and `show variant`.
- The audit reported that the tested upstream artifact and installed module-local modern helper had identical SHA-256 values and were byte-for-byte identical.

The helper's `show version` output describes the running kernel's SUSFS version; it must not be presented as the helper source release version.

### Not established by that testing

- The read-only audit did not exercise modifying commands.
- The audit does not establish compatibility for every future `latest` or SHA-override build.
- Successful end-to-end runs of the newly integrated module build and SHA-override paths have not been independently verified for this draft.
- General compatibility across kernels, Android releases, architectures, and Manager versions has not been demonstrated.

## Scope exclusions and known limitations

- No kernel patching or kernel SUSFS upgrade.
- No automatic pin updates or scheduled tracking of upstream HEAD.
- No native read/write integration for KernelSU Manager's default module-unmount setting.
- No blanket claim that application failures with default module unmount enabled are fixed; the cause remains unresolved.
- No new hosts-hiding implementation. The reported hosts visibility issue was resolved on the test device by enabling the existing Hide SUS mounts option and rebooting.
- No complete cleanup of deprecated minified WebUI logic.

## Pre-merge checklist

- [ ] Review the complete upstream-base-to-fork diff and agree on the target base branch.
- [ ] Confirm licensing and source/provenance packaging requirements.
- [ ] Run an automatic pinned build and a manual pinned build with an empty SHA field.
- [ ] Run a manual latest build with an empty SHA field.
- [ ] Run a valid SHA override with each dropdown selection and confirm the recorded revision.
- [ ] Confirm malformed and unavailable SHAs fail without silently falling back.
- [ ] Confirm latest/override runs leave the saved pin unchanged.
- [ ] Install the generated module package and verify boot, WebUI, routing, and read-only queries.
- [ ] Test priority filtering enabled/disabled, unsupported-device behavior, and reboot semantics.
- [ ] Test relevant modifying commands on supported kernels with recovery available.
- [ ] Test compatibility with default and per-app unmount settings; document remaining failures.
- [ ] Attach redacted logs and build/run evidence before marking the PR ready.

## Review guidance

The changes can be reviewed as separate areas: helper build/provenance and source selection; routing/distribution; priority filtering; OEM property handling; and WebUI guidance/cleanup. They can be split into focused PRs if preferred by maintainers.

This document is a proposed PR body only; generating it does not open or submit a pull request.
