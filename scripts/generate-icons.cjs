// Erzeugt App-Icons (aufsteigende Balken in Kupfer auf Graphit, Executive-Ledger-Look) als
// PNG, ohne externe Bildbibliothek.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      t[n] = c;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

const BG = [23, 20, 15]; // Graphit (--bg)
const FG = [185, 124, 69]; // Kupfer (--accent)

// true, wenn Pixel (x,y) zu einem von drei aufsteigenden Balken gehört (Bilanz-/BWA-Symbol).
function isBarPixel(x, y, size) {
  const baseline = size * 0.76;
  const bars = [
    { cx: size * 0.28, h: size * 0.28 },
    { cx: size * 0.5, h: size * 0.46 },
    { cx: size * 0.72, h: size * 0.64 },
  ];
  const halfWidth = size * 0.09;
  for (const bar of bars) {
    if (x >= bar.cx - halfWidth && x <= bar.cx + halfWidth && y <= baseline && y >= baseline - bar.h) {
      return true;
    }
  }
  return false;
}

function makePng(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowLen = size * 3;
  const raw = Buffer.alloc((rowLen + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (rowLen + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = isBarPixel(x + 0.5, y + 0.5, size) ? FG : BG;
      const px = rowStart + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }
  const idat = zlib.deflateSync(raw);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Dateinamen versioniert (v1), damit iOS' hartnäckiger Homescreen-Icon-Cache (der an der
// URL hängt, nicht am Inhalt) beim Ändern des Icons zuverlässig neu lädt.
const outDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(outDir, 'icon-192-v1.png'), makePng(192));
fs.writeFileSync(path.join(outDir, 'icon-512-v1.png'), makePng(512));
console.log('Icons erzeugt.');
