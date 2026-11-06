import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const svg=await fs.readFile('public/app-icon.svg');
await fs.mkdir('public/icons',{recursive:true});
const icons=[
  ['public/icons/icon-192.png',192],
  ['public/icons/icon-512.png',512],
  ['public/icons/favicon-32.png',32],
  ['app/apple-icon.png',180],
];
for(const [file,size] of icons){
  await sharp(svg).resize(size,size,{fit:'contain'}).png().toFile(file);
  console.log('Generated',file);
}
// Maskable icons must keep the important artwork in the central safe zone.
await sharp(svg).resize(384,384,{fit:'contain'}).extend({top:64,bottom:64,left:64,right:64,background:'#292929'}).png().toFile('public/icons/maskable-512.png');
console.log('Generated public/icons/maskable-512.png');
