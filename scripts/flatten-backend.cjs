const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }

  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }

  fs.copyFileSync(src, dest);
}

function flattenBackend() {
  const cwd = process.cwd();
  const nestedDir = path.join(cwd, 'dist', 'backend', 'backend');
  const destDir = path.join(cwd, 'dist', 'backend');

  if (!fs.existsSync(nestedDir)) {
    console.log('No nested backend build found at', nestedDir);
    return;
  }

  console.log(`Flattening backend from ${nestedDir} -> ${destDir}`);
  copyRecursive(nestedDir, destDir);
  console.log('Flatten complete');
}

flattenBackend();
