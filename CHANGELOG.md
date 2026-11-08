# v1.5.2+ Revision 28.1

## Notes

This revision is a userspace-only update. It does not patch the kernel or upgrade the SUSFS implementation in the running kernel.

The main changes are source-built upstream helper integration, explicit helper-source selection, module-local helper routing, opt-in priority UID filtering, distribution/staging fixes, OEM property handling, and targeted WebUI cleanup and guidance.

For more frequent updates use the CI version [here](https://nightly.link/sidex15/susfs4ksu-module/workflows/build/v1.5.2%2B?preview).

## Upstream helper builds

- Build the modern ARM64 helper directly from Simonpunk's `https://gitlab.com/simonpunk/susfs4ksu.git` source rather than using a mirror, prebuilt download, or intermediate fork.
- Build with Android NDK `27.2.12479018`, targeting `arm64-v8a` and Android API 26.
- Retain the module-local filename `ksu_susfs_modern` for compatibility with the existing helper router.
- Record the resolved source revision, source-selection mode, NDK version, and helper SHA-256 in build provenance.
- Upload an exact source archive, commit metadata, source license, and source-archive checksum as a separate build artifact.
- Add a standalone workflow for building an upstream helper test artifact.

## Helper source selection

- Add a `pinned` / `latest` dropdown to module build entry points, with `pinned` as the default.
- Add an optional full 40-character helper commit SHA field.
- Make a non-empty valid SHA override the dropdown and build the exact requested commit.
- Validate SHA input and verify that the fetched revision matches the requested SHA.
- Keep automatic push builds pinned.
- Keep `latest` and SHA overrides build-local; neither changes the saved pin.
- Keep the pinned revision in one workflow location for future manual bumps.
- Current saved pin: `a2165b6f875b73e2f87d3c6f12814efac8de061d`.

## Helper routing and legacy compatibility

- Retain module-local `ksu_susfs_modern` and `ksu_susfs_legacy` binaries.
- Route explicitly supported modern commands to the modern helper and other commands to the legacy helper.
- Restrict fallback to read-only version, enabled-features, and variant queries.
- Do not retry modifying commands through another helper.
- Do not overwrite a global helper binary.
- Preserve legacy compatibility; this revision does not remove legacy support.

## Priority UID filtering

- Add an opt-in Custom Settings control, disabled by default.
- Gate availability on helper/kernel capability checks.
- Accept third-party package names rather than raw numeric UIDs.
- Reject empty package input.
- Support immediate application and application during boot, with current-boot status reporting.
- Explain that disabling requires a reboot to clear the current-boot effect.
- Keep Kernel Features Status as a support indicator, not as the priority-filter toggle state.

## Distribution and validation

- Update the distribution staging script for the current helper-initialization layout.
- Preserve the WebUI during staging.
- Remove obsolete helper-slicing assumptions.
- Verify ELF64/AArch64 output and presence of the `set_priority_uid_filter` command string.
- Verify byte-for-byte agreement between the built helper and staged helper.
- Verify staged helper checksums, distribution layout, shell syntax, and selected JavaScript syntax.
- These are build-time safeguards, not proof of runtime command compatibility.

## OEM properties

- For SDK 36 and newer, delete `sys.oem_unlock_allowed`.
- For older SDK levels, set `sys.oem_unlock_allowed` to `0`.
- Set `ro.oem_unlock_supported` to `0`.

## WebUI

- Hide deprecated `sus_su_1`, `sus_su_142`, `try_umount_zygote_toggle`, and `umount_for_zygote_iso_service_toggle` HTML rows.
- Add a compact Home recommendation card for module-unmount compatibility.
- Add a scrollable explanation dialog with manual per-app and default unmount workarounds.
- Avoid claiming to read or control KernelSU Manager's actual default module-unmount setting.
- Match the card and dialog to existing WebUI typography and button styling.
- Remove an internal white divider from the recommendation card.
- This is not a complete cleanup of deprecated logic in the minified WebUI bundle.

## Known limitations

- No kernel patching or kernel SUSFS upgrade.
- No automatic pin updates or scheduled tracking of upstream HEAD.
- No native read/write integration for KernelSU Manager's default module-unmount setting.
- No blanket fix for applications failing while KernelSU's default module unmount is enabled; the cause remains unresolved.
- No new hosts-hiding implementation. The reported hosts visibility issue was resolved on the test device by enabling the existing Hide SUS mounts option and rebooting.
- No complete cleanup of deprecated minified WebUI logic.

## Validation

- OEM property changes were confirmed on the reported test device.
- Priority filtering was reported enabled and applied on that environment.
- A read-only audit of the standalone upstream helper successfully queried `show version`, `show enabled_features`, and `show variant`.
- The audit reported that the tested upstream artifact and installed module-local modern helper had identical SHA-256 values and were byte-for-byte identical.
- The read-only audit did not exercise modifying commands.
- The audit does not establish compatibility for every future `latest` or SHA-override build.
- Successful end-to-end runs of the newly integrated module build and SHA-override paths have not been independently verified.
- Reported test environment: KernelSU `32718-6`, SUSFS `2.3.0`, WildGKI `6.1.176`, HyperOS 3 Vietnam build, GKI.

## Upstream base

This revision is based on upstream `v1.5.2+ Revision 28` and includes the following prior upstream changes:

- WebUI configuration import/export, including version-dependent zygote flag handling and `LegitSusfsConfig` validation.
- Hiding the zygote try-umount toggle on SUSFS v2.1.0+ and disabling a greyed-out `avc_log_spoofing` toggle.
- Susfs log export improvements, including dated gzip filenames, `/sdcard/Download` output, and first-pid zygote64 handling.
- Refactoring `index.js` into feature-based modules and Crowdin localization updates.
- Boot-stage performance and correctness improvements, including reduced binary invocations, bounded `/sdcard/Android/data` waiting, improved mountinfo handling, and consolidated `hide_cusrom` logic.
- Compatibility handling for newer SUSFS mount IDs, `sus_kstat` spoofing, decimal SUS SU checks, and GKI bootconfig spoof formatting.
- Universal SUSFS binary refactoring, feature checks, version-specific behavior, and experimental `add_sus_memfd` support.

## Dev note

This revision is intended as a fork-side userspace compatibility and build-provenance update. It is not a kernel patch and should be tested on supported kernels before relying on modifying helper commands.
