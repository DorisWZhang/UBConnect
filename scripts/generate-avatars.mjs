// scripts/generate-avatars.mjs — One-time DiceBear avatar download
// Run with: node scripts/generate-avatars.mjs
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STYLES = ['adventurer', 'notionists'];
const COUNT = 30;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'avatars');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        fs.unlink(dest, () => {});
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const style of STYLES) {
    for (let i = 1; i <= COUNT; i++) {
      const seed = `ubconnect-${style}-${i}`;
      const num = String(i).padStart(2, '0');
      const filename = `${style}-${num}.png`;
      const url = `https://api.dicebear.com/9.x/${style}/png?seed=${seed}&size=256`;
      const dest = path.join(OUT_DIR, filename);
      if (fs.existsSync(dest)) { console.log(`SKIP ${filename}`); continue; }
      console.log(`Downloading ${filename}...`);
      await download(url, dest);
      // Rate limit
      await new Promise(r => setTimeout(r, 150));
    }
  }
  console.log('Done! Downloaded avatars to assets/avatars/');
}

main().catch(console.error);
