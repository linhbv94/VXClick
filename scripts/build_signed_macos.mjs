import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

if (process.platform !== 'darwin') {
  throw new Error('Build này chỉ áp dụng cho macOS.');
}

// Identity ký số ổn định (Certificate-bound Designated Requirement)
// Mặc định sử dụng certificate đã được cấu hình trong keychain máy local
const defaultIdentity = 'FE024021592C718A39AD70B76D2EDC5DA0CD6B70';
const identity = process.env.VXCLICK_CODESIGN_IDENTITY || defaultIdentity;

if (!identity || identity === '-') {
  throw new Error('Thiếu signing identity ổn định. Không sử dụng ad-hoc signing (-) vì sẽ làm mất mapping quyền TCC.');
}

const root = fileURLToPath(new URL('../', import.meta.url));

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// 1. Mở khóa keychain nếu cần
const keychainPath = `${process.env.HOME}/Library/Keychains/.release_keys/vxclean_codesign.keychain-db`;
spawnSync('security', ['unlock-keychain', '-p', '', keychainPath]);
spawnSync('security', ['set-key-partition-list', '-S', 'apple-tool:,apple:,codesign:', '-s', '-k', '', keychainPath]);

console.log(`[build_signed_macos] Đang đóng gói và ký số với Identity: ${identity}`);

// 2. Build Tauri Bundle
run('npx', [
  'tauri',
  'build',
  '--bundles',
  'app',
  '--',
  '--offline'
]);

const app = resolve(root, 'src-tauri/target/release/bundle/macos/VXClick.app');

// 3. Ký số ổn định (Deep Signing với Certificate Identity)
run('/usr/bin/codesign', [
  '--force',
  '--deep',
  '--sign',
  identity,
  app
]);

// 4. Kiểm tra tính toàn vẹn (Strict Verification)
run('/usr/bin/codesign', [
  '--verify',
  '--deep',
  '--strict',
  '--verbose=2',
  app
]);

// 5. Xác thực Designated Requirement không phụ thuộc vào cdhash
const requirement = spawnSync('/usr/bin/codesign', ['-d', '-r-', app], { encoding: 'utf8' });
const output = `${requirement.stdout ?? ''}${requirement.stderr ?? ''}`;
if (requirement.status !== 0 || !/certificate leaf = H"|anchor H"|anchor apple generic/.test(output)) {
  throw new Error(`Gói chưa có Designated Requirement ràng buộc certificate hợp lệ! Output: ${output}`);
}

console.log('✅ Ký số ổn định thành công!');
console.log(output.trim());
