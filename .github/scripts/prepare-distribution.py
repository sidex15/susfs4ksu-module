from pathlib import Path
import hashlib
import os
import re
import shutil
import sys
import tempfile
from zipfile import ZipFile

source = Path(sys.argv[1]).resolve()
stage = Path(sys.argv[2]).resolve()
revision = os.environ['GITHUB_SHA']
short = revision[:7]
assert source != stage and not stage.exists(), 'Use a fresh, separate staging directory'
shutil.copytree(source, stage, ignore=shutil.ignore_patterns('.git', '.github', 'node_modules', 'src', 'tests', '__pycache__', '*.zip'))
route = '/data/adb/modules/susfs4ksu/helper-router.sh'
old_path = '/data/adb/ksu/bin/ksu_susfs'
legacy_source = stage / 'tools/ksu_susfs_arm64'
assert legacy_source.is_file()
shutil.copyfile(legacy_source, stage / 'ksu_susfs_legacy')
legacy_source.unlink()
assert (stage / 'ksu_susfs_modern').is_file()
assert (stage / 'helper-router.sh').is_file()

installer = stage / 'customize.sh'
text = installer.read_text()
start = text.index('download() {')
end = text.index('# copy sus_su over', start)
setup = """# Both helpers are module-owned. Never overwrite the global helper or its symlink target.
chmod 0755 "${MODPATH}/ksu_susfs_modern" "${MODPATH}/ksu_susfs_legacy" "${MODPATH}/helper-router.sh"
(cd "${MODPATH}" && sha256sum -c HELPER-SHA256SUMS) || abort 'Helper checksum verification failed'
SUSFS_VERSION_RAW="$(sh "${MODPATH}/helper-router.sh" show version)" || abort 'Neither bundled helper can query this kernel'
SUSFS_DECIMAL_MAIN=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//;' | cut -d'.' -f1)
SUSFS_DECIMAL_SUB=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//;' | cut -d'.' -f2)
SUSFS_DECIMAL_PATCH=$(echo "$SUSFS_VERSION_RAW" | sed 's/^v//;' | cut -d'.' -f3)
ui_print "[-] Kernel SUSFS: $SUSFS_VERSION_RAW; modern primary plus legacy-only commands"

"""
text = text[:start] + setup + text[end:]
text = text.replace('chmod 755 ${DEST_BIN_DIR}/ksu_susfs ${DEST_BIN_DIR}/sus_su', 'chmod 755 ${DEST_BIN_DIR}/sus_su')
installer.write_text(text)

uninstall = stage / 'uninstall.sh'
text = uninstall.read_text()
assert 'rm -f ' + old_path in text
uninstall.write_text(text.replace('rm -f ' + old_path, '# Global helper is not owned by this module build; leave it untouched.'))

# Existing cloud updaters must not replace the dispatcher or either module-owned helper.
(stage / 'susfs-bin-check.sh').write_text('#!/system/bin/sh\necho match\n')
message = 'Both helpers are bundled with this module. Update the module to update helpers.'
for name in ('action.sh', 'susfs-bin-update.sh'):
    (stage / name).write_text('#!/system/bin/sh\nprintf "%s\n" "' + message + '"\n')

for path in stage.rglob('*'):
    if path.is_file() and path.suffix in ('.sh', '.js', '.html'):
        text = path.read_text()
        text = text.replace(old_path, route)
        text = re.sub(r'(?<![A-Za-z0-9_/])ksu_susfs(?=\s+umount_for_zygote_iso_service\b)', route, text)
        if path == installer:
            text = text.replace('SUSFS_BIN=' + route, 'SUSFS_BIN=${MODPATH}/helper-router.sh')
        path.write_text(text)

config = stage / 'config.sh'
text = config.read_text()
if not re.search(r'^priority_uid_filter=', text, re.M):
    config.write_text(text + '\npriority_uid_filter=0\n')
boot = stage / 'boot-completed.sh'
text = boot.read_text()
if 'priority-uid-filter.sh boot' not in text:
    boot.write_text(text + '\n# Optional Priority UID Filter\nsh /data/adb/modules/susfs4ksu/priority-uid-filter.sh boot >> /data/adb/susfs4ksu/priority_uid_filter.log 2>&1\n')

# Keep legacy controls and the original version/feature checks; undo deprecated-row hiding.
ui = stage / 'webroot/priority-uid-filter.js'
text = ui.read_text()
start = text.index('    document.querySelectorAll(\'[id^="status_"]\')')
end = text.index('    document.querySelectorAll(\'[data-router-view]\')', start)
ui.write_text(text[:start] + text[end:])
for name in ('index.html', 'custom.html', 'status.html'):
    page = stage / 'webroot' / name
    html = page.read_text()
    assert '</head>' in html
    if 'src="/priority-uid-filter.js"' not in html:
        html = html.replace('</head>', '<script defer src="/priority-uid-filter.js"></script>\n</head>', 1)
    assert 'UID Filter UI 2 - build ' not in html
    page.write_text(html)

prop = stage / 'module.prop'
text, count = re.subn(r'^version=.*$', 'version=v1.5.2-CI-' + short, prop.read_text(), count=1, flags=re.M)
assert count == 1
prop.write_text(text)
(stage / 'UID-FILTER-BUILD.txt').write_text('UI integration: 4\nModule revision: ' + revision + '\nHelper policy: modern commands first; remaining commands legacy; read-only query fallback\n')
checksums = []
for name in ('ksu_susfs_modern', 'ksu_susfs_legacy'):
    path = stage / name
    assert path.stat().st_size > 0
    checksums.append(hashlib.sha256(path.read_bytes()).hexdigest() + '  ' + name)
(stage / 'HELPER-SHA256SUMS').write_text('\n'.join(checksums) + '\n')
(stage / 'MODERN-HELPER-SHA256SUMS').write_text(checksums[0] + '\n')

required = ('module.prop', 'customize.sh', 'helper-router.sh', 'ksu_susfs_modern', 'ksu_susfs_legacy', 'HELPER-SHA256SUMS', 'webroot/index.html', 'webroot/priority-uid-filter.js')
for name in required:
    assert (stage / name).is_file(), name
for path in stage.rglob('*'):
    if path.is_file() and path.suffix in ('.sh', '.js', '.html'):
        assert old_path not in path.read_text(), str(path)
assert b'set_priority_uid_filter' in (stage / 'ksu_susfs_modern').read_bytes()
assert 'priorityDeprecated' not in ui.read_text()
assert route in (stage / 'webroot/assets/index-BS9hEn4H.js').read_text()
assert 'priority_uid_filter=' in config.read_text()
assert 'priority-uid-filter.sh boot' in boot.read_text()
assert not list(stage.rglob('*.zip')), 'Do not upload a ZIP inside the artifact ZIP'
# Verify the root layout that upload-artifact will archive directly.
with tempfile.TemporaryFile() as stream:
    with ZipFile(stream, 'w') as archive:
        for path in stage.rglob('*'):
            if path.is_file():
                archive.write(path, path.relative_to(stage).as_posix())
    stream.seek(0)
    with ZipFile(stream) as archive:
        assert set(required).issubset(archive.namelist())
        assert not any(name.endswith('.zip') for name in archive.namelist())
print('Verified directly installable staging layout for susfs4ksu-' + short)
