// Run in the owner's native checkout AFTER copying game files into www, BEFORE cap sync.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let major='8';
try {
  const htmlPath = path.resolve('www/index.html');
  if (!fs.existsSync(htmlPath)) throw new Error('Copy the game into www first. No files changed.');
  major = JSON.parse(fs.readFileSync(require.resolve('@capacitor/core/package.json'),'utf8')).version.split('.')[0];
  for (const pkg of ['@capacitor/app','@capacitor/share','@capacitor/filesystem']) {
    const version=JSON.parse(fs.readFileSync(require.resolve(pkg+'/package.json'),'utf8')).version;
    if (version.split('.')[0]!==major) throw new Error(`${pkg} must match Capacitor major ${major}.`);
  }
  const {build}=await import('esbuild');
  await build({entryPoints:['tools/native-plugins-entry.mjs'],bundle:true,format:'iife',outfile:'www/native-plugins.js'});
  let html=fs.readFileSync(htmlPath,'utf8');
  if(!html.includes('src="native-plugins.js"'))html=html.replace('</head>','<script src="native-plugins.js"></script>\n</head>');
  fs.writeFileSync(htmlPath,html);
  console.log('Native sharing, lifecycle and Back bridge prepared. Run npx cap sync, then build in Xcode/Android Studio.');
} catch(error) {
  console.error(error.message);
  console.error(`Install matching native plugins and the build tool in this native checkout: npm install @capacitor/app@${major} @capacitor/share@${major} @capacitor/filesystem@${major}; npm install --save-dev esbuild`);
  process.exitCode=1;
}
