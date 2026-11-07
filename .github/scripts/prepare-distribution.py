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
assert source != stage and source not in stage.parents and not stage.exists(), 'Use a fresh staging directory outside the source'
shutil.copytree(source, stage, ignore=shutil.ignore_patterns('.git', '.github', 'node_modules', 'src', 'tests', '__pycache__', '*.zip'))
route = '/data/adb/modules/susfs4ksu/helper-router.sh'
old_path = '/data/adb/ksu/bin/ksu_susfs'
legacy_source = stage / 'tools/ksu_susfs_arm64'
legacy = stage / 'ksu_susfs_legacy'
if not legacy.is_file():
    assert legacy_source.is_file(), 'Missing bundled legacy helper'
    shutil.copyfile(legacy_source, legacy)
if legacy_source.is_file():
    legacy_source.unlink()
for name in ('ksu_susfs_modern', 'ksu_susfs_legacy', 'helper-router.sh'):
    path = stage / name
    assert path.is_file() and path.stat().st_size > 0, name
    path.chmod(0o755)

installer = stage / 'customize.sh'
text = installer.read_text()
assert 'download() {' not in text, 'Unexpected obsolete installer; review before packaging'
setup = '''# Verify module-owned helpers before querying the kernel.
chmod 0755 "${MODPATH}/ksu_susfs_modern" "${MODPATH}/ksu_susfs_legacy" "${MODPATH}/helper-router.sh" || abort 'Cannot set helper permissions'
(cd "${MODPATH}" && sha256sum -c HELPER-SHA256SUMS) || abort 'Helper checksum verification failed'
'''
anchor = 'chmod +x "${MODPATH}/ksu_susfs_modern"'
assert text.count(anchor) == 1, 'Current installer initialization anchor changed'
text = text.replace(anchor, setup, 1)
text = text.replace('SUSFS_VERSION_RAW="$(${MODPATH}/ksu_susfs_modern show version)"', 'SUSFS_VERSION_RAW="$(sh "${MODPATH}/helper-router.sh" show version)" || abort \'Neither bundled helper can query this kernel\'')
text = text.replace('SUSFS_BIN=${MODPATH}/ksu_susfs_modern', 'SUSFS_BIN=${MODPATH}/helper-router.sh')
assert 'SUSFS_VERSION_RAW="$(sh "${MODPATH}/helper-router.sh" show version)"' in text
installer.write_text(text)

uninstall = stage / 'uninstall.sh'
text = uninstall.read_text()
text = re.sub(r'^\s*rm -f /data/adb/ksu/bin/ksu_susfs\s*$', '# Leave the shared global helper untouched.', text, flags=re.M)
uninstall.write_text(text)
(stage / 'susfs-bin-check.sh').write_text('#!/system/bin/sh\necho match\n')
message = 'Helpers are bundled with this module. Update the module to update helpers.'
for name in ('action.sh', 'susfs-bin-update.sh'):
    (stage / name).write_text('#!/system/bin/sh\nprintf \'%s\\n\' "' + message + '"\n')

for path in stage.rglob('*'):
    if path.is_file() and path.suffix in ('.sh', '.js', '.html'):
        text = path.read_text().replace(old_path, route)
        text = re.sub(r'(?<![A-Za-z0-9_/])ksu_susfs(?=\s+umount_for_zygote_iso_service\b)', route, text)
        if path == installer:
            text = text.replace('SUSFS_BIN=' + route, 'SUSFS_BIN=${MODPATH}/helper-router.sh')
        path.write_text(text)

config = stage / 'config.sh'
text = config.read_text()
if not re.search(r'^priority_uid_filter=', text, re.M):
    config.write_text(text + '\npriority_uid_filter=0\n')
boot = stage / 'boot-completed.sh'
if 'priority-uid-filter.sh boot' not in boot.read_text():
    boot.write_text(boot.read_text() + '\nsh /data/adb/modules/susfs4ksu/priority-uid-filter.sh boot >> /data/adb/susfs4ksu/priority_uid_filter.log 2>&1\n')
ui = stage / 'webroot/priority-uid-filter.js'
assert ui.is_file(), 'Missing Priority UID Filter WebUI integration'
for name in ('index.html', 'custom.html', 'status.html'):
    page = stage / 'webroot' / name
    html = page.read_text()
    assert '</head>' in html, name
    if 'src="/priority-uid-filter.js"' not in html:
        html = html.replace('</head>', '<script defer src="/priority-uid-filter.js"></script>\n</head>', 1)
    page.write_text(html)

prop = stage / 'module.prop'
text, count = re.subn(r'^version=.*$', 'version=v1.5.2-CI-' + short, prop.read_text(), count=1, flags=re.M)
assert count == 1
prop.write_text(text)
(stage / 'UID-FILTER-BUILD.txt').write_text('UI integration: 4\nModule revision: ' + revision + '\nHelper policy: modern command list; remaining commands legacy; read-only query fallback\n')
checksums = []
for name in ('ksu_susfs_modern', 'ksu_susfs_legacy'):
    checksums.append(hashlib.sha256((stage / name).read_bytes()).hexdigest() + '  ' + name)
(stage / 'HELPER-SHA256SUMS').write_text('\n'.join(checksums) + '\n')
(stage / 'MODERN-HELPER-SHA256SUMS').write_text(checksums[0] + '\n')
required = ('module.prop', 'customize.sh', 'helper-router.sh', 'ksu_susfs_modern', 'ksu_susfs_legacy', 'HELPER-SHA256SUMS', 'priority-uid-filter.sh', 'webroot/index.html', 'webroot/priority-uid-filter.js')
for name in required:
    assert (stage / name).is_file(), name
for path in stage.rglob('*'):
    if path.is_file() and path.suffix in ('.sh', '.js', '.html'):
        assert old_path not in path.read_text(), str(path)
assert b'set_priority_uid_filter' in (stage / 'ksu_susfs_modern').read_bytes()
assert 'priority_uid_filter=' in config.read_text()
assert 'priority-uid-filter.sh boot' in boot.read_text()
assert not list(stage.rglob('*.zip')), 'Do not nest ZIPs inside the artifact'
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
