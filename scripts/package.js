import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const src = 'C:\\Users\\monit\\Desktop\\HealthMate_AI';
const dst = 'C:\\Users\\monit\\Downloads\\HealthMate_AI';
const zipDesktop = 'C:\\Users\\monit\\Desktop\\HealthMate_AI_Final.zip';
const zipDownloads = 'C:\\Users\\monit\\Downloads\\HealthMate_AI_Final.zip';

console.log('[Packaging] Copying files from Desktop to Downloads...');
const copyDirs = ['src', 'server', 'dist', 'public', 'tests', 'scripts'];
const copyFiles = ['package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.node.json', 'vite.config.ts', 'server.ts', 'index.html', 'tailwind.config.js', 'postcss.config.js', '.env'];

for (const dir of copyDirs) {
  const s = path.join(src, dir);
  const d = path.join(dst, dir);
  if (fs.existsSync(s)) {
    fs.cpSync(s, d, { recursive: true });
  }
}

for (const file of copyFiles) {
  const s = path.join(src, file);
  const d = path.join(dst, file);
  if (fs.existsSync(s)) {
    fs.copyFileSync(s, d);
  }
}

console.log('[Packaging] Creating clean zip archive...');
if (fs.existsSync(zipDesktop)) fs.unlinkSync(zipDesktop);
if (fs.existsSync(zipDownloads)) fs.unlinkSync(zipDownloads);

const tempFolder = path.join(process.env.TEMP || 'C:\\Windows\\Temp', 'HealthMate_AI_Export');
if (fs.existsSync(tempFolder)) fs.rmSync(tempFolder, { recursive: true, force: true });
fs.mkdirSync(tempFolder, { recursive: true });

for (const dir of copyDirs) {
  const s = path.join(src, dir);
  const d = path.join(tempFolder, dir);
  if (fs.existsSync(s)) fs.cpSync(s, d, { recursive: true });
}
for (const file of copyFiles) {
  const s = path.join(src, file);
  const d = path.join(tempFolder, file);
  if (fs.existsSync(s)) fs.copyFileSync(s, d);
}

execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${tempFolder}\\*' -DestinationPath '${zipDesktop}' -Force"`, { stdio: 'inherit' });
fs.copyFileSync(zipDesktop, zipDownloads);
fs.rmSync(tempFolder, { recursive: true, force: true });

console.log('[Packaging] Successfully built packages:');
console.log(' - ' + zipDesktop + ' (' + (fs.statSync(zipDesktop).size / (1024 * 1024)).toFixed(2) + ' MB)');
console.log(' - ' + zipDownloads + ' (' + (fs.statSync(zipDownloads).size / (1024 * 1024)).toFixed(2) + ' MB)');
