import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const MACOS_SIGNER = 'FE024021592C718A39AD70B76D2EDC5DA0CD6B70';
export function assertMacosRequirement(requirement) {
  const dr = requirement.split('\n').find(line => /^(?:# )?designated => /.test(line.trim()));
  assert.ok(dr, 'Thiếu designated requirement');
  assert.match(dr, /identifier "com\.vxclick\.desktop"/, 'Sai bundle identity');
  assert.ok(dr.toUpperCase().includes(`CERTIFICATE LEAF = H"${MACOS_SIGNER}"`), 'Sai certificate hoặc bundle ad-hoc');
  assert.doesNotMatch(dr, /\bcdhash\b|\bor\b/, 'Requirement không được phụ thuộc cdhash hoặc nới bằng OR');
}
export function verifyMacosIdentity(app) {
  for (const args of [['--verify', '--deep', '--strict', '--verbose=2', app], ['-d', '-r-', app]]) {
    const result = spawnSync('/usr/bin/codesign', args, { encoding: 'utf8', timeout: 30000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || 'codesign failed');
    if (args[0] === '-d') {
      const output = `${result.stdout}${result.stderr}`;
      assertMacosRequirement(output);
      console.log(output.trim());
    }
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/verify_macos_identity.mjs <app>');
  verifyMacosIdentity(resolve(process.argv[2]));
}
