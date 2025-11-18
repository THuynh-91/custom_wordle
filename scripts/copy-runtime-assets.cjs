const fs = require('fs');
const path = require('path');

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    return false;
  }

  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }

  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  return true;
}

function main() {
  const root = process.cwd();
  const assets = [
    {
      label: 'word lists',
      src: path.join(root, 'data', 'words'),
      dest: path.join(root, 'dist', 'data', 'words')
    },
    {
      label: 'frequency data',
      src: path.join(root, 'data', 'frequencies'),
      dest: path.join(root, 'dist', 'data', 'frequencies')
    },
    {
      label: 'precomputed data',
      src: path.join(root, 'backend', 'data', 'precomputed'),
      dest: path.join(root, 'dist', 'backend', 'data', 'precomputed')
    }
  ];

  for (const asset of assets) {
    if (!fs.existsSync(asset.src)) {
      console.warn(`Skipping ${asset.label}: source missing at ${asset.src}`);
      continue;
    }

    if (copyDirectory(asset.src, asset.dest)) {
      console.log(`Copied ${asset.label} -> ${asset.dest}`);
    }
  }
}

main();
