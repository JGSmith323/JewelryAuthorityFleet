#!/usr/bin/env bash
# Usage: bash make-icons.sh path/to/source-image.png
# Resizes the diamond/tag icon to 192×192 and 512×512 for app + PWA use.
set -e
SRC="${1:-}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
DEST="$ROOT/client/public"

if [ -z "$SRC" ] || [ ! -f "$SRC" ]; then
  echo "Usage: bash make-icons.sh /path/to/icon.png"
  exit 1
fi

mkdir -p "$DEST"

node - "$SRC" "$DEST" << 'JSEOF'
const sharp = require('sharp');
const [,, src, dest] = process.argv;
(async () => {
  await sharp(src).resize(192, 192, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).png().toFile(`${dest}/icon-192.png`);
  await sharp(src).resize(512, 512, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).png().toFile(`${dest}/icon-512.png`);
  console.log('✅ Icons written:', dest);
})().catch(e => { console.error(e.message); process.exit(1); });
JSEOF
