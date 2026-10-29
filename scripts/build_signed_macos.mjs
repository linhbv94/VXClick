import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { verifyMacosIdentity, MACOS_SIGNER } from './verify_macos_identity.mjs';

if (process.platform !== 'darwin') throw new Error('Build này chỉ áp dụng cho macOS.');
if (process.env.VXCLICK_CODESIGN_IDENTITY && process.env.VXCLICK_CODESIGN_IDENTITY.toUpperCase() !== MACOS_SIGNER) {
  throw new Error('Không đổi signer trong build thường; migration identity cần review riêng.');
}
const root = fileURLToPath(new URL('../', import.meta.url));
// Sign during bundling, before archiving; use the SDK gate and existing keychain access.
// Never change keychain ACL/trust or silently fall back to ad-hoc here.
const result = spawnSync(process.execPath, [resolve(root, 'scripts/tauri_sdk.mjs'),
  'build', '--bundles', 'app', '--config', JSON.stringify({ bundle: {
    createUpdaterArtifacts: false, macOS: { signingIdentity: MACOS_SIGNER }
  }}), '--', '--offline'], { cwd: root, stdio: 'inherit', env: process.env });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const target = process.env.CARGO_TARGET_DIR ? resolve(root, process.env.CARGO_TARGET_DIR) : resolve(root, 'src-tauri/target');
verifyMacosIdentity(resolve(target, 'release/bundle/macos/VXClick.app'));
console.log('Bundle đúng signer/DR; giữ quyền Accessibility qua update vẫn cần runtime QA.');
