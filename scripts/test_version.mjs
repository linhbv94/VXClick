import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {assertMacosRequirement, MACOS_SIGNER} from './verify_macos_identity.mjs';
const setter=fileURLToPath(new URL('./set_version.mjs',import.meta.url));
const validator=fileURLToPath(new URL('./validate_release.mjs',import.meta.url));
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'release_version_'));
 mkdirSync(join(root,'src-tauri'));
 const json=(path,data)=>writeFileSync(join(root,path),JSON.stringify(data));
 json('package.json',{name:'frontend_app',version:'1.0.0'});
 json('package-lock.json',{name:'previous_frontend',version:'1.0.0',lockfileVersion:3,packages:{'':{name:'previous_frontend',version:'1.0.0'},'node_modules/support':{version:'1.0.0'}}});
 json('src-tauri/tauri.conf.json',{productName:'Example',version:'1.0.0',bundle:{createUpdaterArtifacts:true,macOS:{signingIdentity:'FE024021592C718A39AD70B76D2EDC5DA0CD6B70'},windows:{nsis:{installMode:'currentUser'}}},plugins:{updater:{pubkey:Buffer.from('untrusted comment: public fixture\nRWQf6LRCGA9i53mlYecO4IzT51TGPpvWucNSCh1CBM0QTaLn73Y7GFO3').toString('base64'),windows:{installMode:'passive'}}}});
 writeFileSync(join(root,'src-tauri/Cargo.toml'),'[package]\nname = "native_engine"\nversion = "1.0.0"\n\n[dependencies]\nsupport = "1.0.0"\n');
 writeFileSync(join(root,'src-tauri/Cargo.lock'),'version = 3\n\n[[package]]\nname = "native_engine"\nversion = "1.0.0"\n\n[[package]]\nname = "support"\nversion = "1.0.0"\n');
 return root;
}
function run(script,root,arg){const env={...process.env};delete env.GITHUB_REPOSITORY;return spawnSync(process.execPath,[script,arg],{cwd:root,env,encoding:'utf8'});}
test('version bump repairs renamed npm lock names, independently locates Cargo crate and preserves dependencies',()=>{
 const root=fixture();try{
  assert.notEqual(run(validator,root,'v1.0.0').status,0);
  const result=run(setter,root,'3.4.5');assert.equal(result.status,0,result.stderr);
  const lock=JSON.parse(readFileSync(join(root,'package-lock.json')));
  assert.equal(lock.name,'frontend_app');assert.equal(lock.packages[''].name,'frontend_app');assert.equal(lock.packages['node_modules/support'].version,'1.0.0');
  const cargo=readFileSync(join(root,'src-tauri/Cargo.toml'),'utf8');assert.match(cargo,/version = "3.4.5"/);assert.match(cargo,/support = "1.0.0"/);
  const cargoLock=readFileSync(join(root,'src-tauri/Cargo.lock'),'utf8');assert.match(cargoLock,/name = "support"\nversion = "1.0.0"/);
  const checked=run(validator,root,'v3.4.5');assert.equal(checked.status,0,checked.stderr);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('missing Cargo root entry fails before any manifest write',()=>{
 const root=fixture();try{
  writeFileSync(join(root,'src-tauri/Cargo.lock'),'version = 3\n');
  const files=['package.json','package-lock.json','src-tauri/tauri.conf.json','src-tauri/Cargo.toml'];const before=files.map(p=>readFileSync(join(root,p),'utf8'));
  assert.notEqual(run(setter,root,'3.4.5').status,0);
  assert.deepEqual(files.map(p=>readFileSync(join(root,p),'utf8')),before);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('release rejects ad-hoc and a different certificate even when versions are valid',()=>{
 const root=fixture();try{
  assert.equal(run(setter,root,'3.4.5').status,0);
  const path=join(root,'src-tauri/tauri.conf.json');
  const config=JSON.parse(readFileSync(path));
  for(const identity of ['-', '0123456789012345678901234567890123456789']) {
   config.bundle.macOS.signingIdentity=identity;writeFileSync(path,JSON.stringify(config));
   const result=run(validator,root,'v3.4.5');
   assert.notEqual(result.status,0);assert.match(result.stderr,/preserve the existing certificate identity/);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('bundle identity rejects cdhash, wrong app, wrong certificate and permissive OR',()=>{
 const valid=`# designated => identifier "com.vxclick.desktop" and certificate leaf = H"${MACOS_SIGNER.toLowerCase()}"`;
 assertMacosRequirement(valid);
 for(const bad of ['designated => cdhash H"7e09b8df2382bd4e87ea7b5184f5d765e445e84e"',valid.replace('com.vxclick.desktop','com.other.desktop'),valid.replace(MACOS_SIGNER.toLowerCase(),'0'.repeat(40)),valid+' or identifier "com.vxclick.desktop"','']) assert.throws(()=>assertMacosRequirement(bad));
});
