"""Import the release-only signer into an isolated hosted-runner keychain for VXClick."""
import base64
import json
import os
import secrets
import subprocess
import sys
from pathlib import Path

temp_dir = os.environ.get('RUNNER_TEMP', '/tmp')
root = Path(temp_dir) / 'vxclick_signer'

def run(*args):
    print("Signer step: " + args[0] + " " + args[1], flush=True)
    result = subprocess.run(args, capture_output=True, text=True, timeout=30)
    if result.returncode:
        raise RuntimeError('macOS signer command failed: ' + args[0] + ' ' + args[1] + '\n' + result.stderr)
    return result.stdout

if len(sys.argv) < 2:
    print('Usage: python3 ci_macos_signer.py [install|cleanup]')
    sys.exit(1)

action = sys.argv[1]

if action == 'install':
    cert_b64 = os.environ.get('VXCLICK_MACOS_CERTIFICATE')
    if not cert_b64:
        print('VXCLICK_MACOS_CERTIFICATE not set; skipping certificate-bound keychain install.')
        sys.exit(0)

    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    keychain = root / 'release.keychain-db'
    p12 = root / 'identity.p12'
    cert = root / 'identity.pem'

    previous = run('security', 'list-keychains', '-d', 'user')
    (root / 'previous.json').write_text(json.dumps([line.strip().strip('"') for line in previous.splitlines() if line.strip()]))

    password = secrets.token_urlsafe(40)
    p12.write_bytes(base64.b64decode(cert_b64, validate=True))
    p12.chmod(0o600)

    run('security', 'create-keychain', '-p', password, str(keychain))
    run('security', 'set-keychain-settings', '-lut', '21600', str(keychain))
    run('security', 'unlock-keychain', '-p', password, str(keychain))
    run('security', 'import', str(p12), '-k', str(keychain), '-P', os.environ.get('VXCLICK_MACOS_CERTIFICATE_PASSWORD', ''), '-T', '/usr/bin/codesign', '-T', '/usr/bin/security')
    run('security', 'set-key-partition-list', '-S', 'apple-tool:,apple:,codesign:', '-s', '-k', password, str(keychain))
    run('security', 'list-keychains', '-d', 'user', '-s', str(keychain), *json.loads((root / 'previous.json').read_text()))

    cert.write_text(run('security', 'find-certificate', '-a', '-p', str(keychain)))
    run('sudo', '-n', 'security', 'add-trusted-cert', '-d', '-r', 'trustRoot', '-p', 'codeSign', '-k', str(keychain), str(cert))

    identity = os.environ.get('VXCLICK_CODESIGN_IDENTITY', 'FE024021592C718A39AD70B76D2EDC5DA0CD6B70')
    if identity not in run('security', 'find-identity', '-v', '-p', 'codesigning', str(keychain)):
        raise RuntimeError('Expected signer ' + identity + ' is not trusted/available in temporary keychain')

    (root / 'tauri_signer.json').write_text(json.dumps({'bundle': {'macOS': {'signingIdentity': identity}}}))
    if 'GITHUB_ENV' in os.environ:
        with open(os.environ['GITHUB_ENV'], 'a') as stream:
            stream.write('VXCLICK_SIGNER_CONFIG=' + str(root / 'tauri_signer.json') + '\n')

    p12.unlink(missing_ok=True)
    print('Expected certificate-bound signer ' + identity + ' installed in temporary keychain successfully')

elif action == 'cleanup':
    if not root.exists():
        sys.exit(0)
    if (root / 'identity.pem').exists():
        try:
            result = subprocess.run(['sudo', '-n', 'security', 'remove-trusted-cert', '-d', str(root / 'identity.pem')], capture_output=True, timeout=30)
            if result.returncode:
                print('Public certificate trust remains until hosted runner disposal', flush=True)
        except subprocess.TimeoutExpired:
            print('Trust removal timed out; continue deleting private keychain.', flush=True)
    if (root / 'previous.json').exists():
        run('security', 'list-keychains', '-d', 'user', '-s', *json.loads((root / 'previous.json').read_text()))
    if (root / 'release.keychain-db').exists():
        run('security', 'delete-keychain', str(root / 'release.keychain-db'))
    for path in root.glob('*'):
        path.unlink(missing_ok=True)
    print('Signer cleanup completed')
else:
    raise RuntimeError('Unknown action: ' + action)
