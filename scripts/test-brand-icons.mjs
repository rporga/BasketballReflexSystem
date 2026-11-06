import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url));
const text=name=>read(name).toString('utf8');
const logo=read('public/pick-roll-logo.webp');
const icon192=read('public/icons/icon-192.png');
const icon512=read('public/icons/icon-512.png');
const mask=read('public/icons/maskable-512.png');
const apple=read('app/apple-icon.png');
const favicon=read('public/icons/favicon-32.png');
assert.equal(logo.toString('ascii',0,4),'RIFF');
assert.equal(logo.toString('ascii',8,12),'WEBP');
const checkPng=(buffer,width,height)=>{
  assert.equal(buffer.toString('hex',0,8),'89504e470d0a1a0a');
  assert.equal(buffer.readUInt32BE(16),width);
  assert.equal(buffer.readUInt32BE(20),height);
};
checkPng(icon192,192,192);checkPng(icon512,512,512);checkPng(mask,512,512);
checkPng(apple,180,180);checkPng(favicon,32,32);
const page=text('app/page.jsx'),manifest=text('app/manifest.js');
const layout=text('app/layout.jsx'),sw=text('public/sw.js');
assert.ok(page.includes('/pick-roll-logo.webp'),'Header uses new uploaded wordmark');
assert.ok(!page.includes('src="/pick-roll-logo.svg"'),'Legacy logo removed from header');
for(const file of ['icon-192.png','icon-512.png','maskable-512.png'])assert.ok(manifest.includes(file),'Manifest icon: '+file);
assert.ok(layout.includes('apple-icon.png?v=2')&&layout.includes('favicon-32.png?v=2'));
assert.ok(sw.includes('pick-roll-shell-v2'),'New SW version invalidates old icon cache');
for(const file of ['app/icon.svg','public/app-icon.svg']){
 const xml=text(file);
 assert.ok(xml.includes('data:image/png;base64,'),'SVG image wrapper embeds uploaded app image');
}
console.log('PASS original Pick & Roll wordmark, PWA icons, Apple icon, favicon, and cache references');
