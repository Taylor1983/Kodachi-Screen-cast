const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const body = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crcBuf]);
}

function generatePNG(width, height, isMaskable = false) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.44;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default deep slate background
      let r = 2, g = 6, b = 23, a = 255; // #020617

      // Cast icon / shield design
      if (dist < radius) {
        // Shield inner
        r = 15; g = 23; b = 42; // #0f172a
        
        // Emerald border
        if (dist > radius - 10) {
          r = 16; g = 185; b = 129; // #10b981
        }
      }

      // Display Screen rect in center
      const scrW = width * 0.38;
      const scrH = height * 0.26;
      if (Math.abs(dx) < scrW / 2 && Math.abs(dy) < scrH / 2) {
        // Screen bezel
        r = 2; g = 6; b = 23;
        if (Math.abs(dx) > scrW / 2 - 4 || Math.abs(dy) > scrH / 2 - 4) {
          r = 56; g = 189; b = 248; // sky-400
        } else {
          // Cast arcs
          const arcDist = Math.sqrt(Math.pow(dx + scrW * 0.25, 2) + Math.pow(dy - scrH * 0.2, 2));
          if (arcDist > 8 && arcDist < 14) {
            r = 16; g = 185; b = 129;
          } else if (arcDist > 20 && arcDist < 26) {
            r = 52; g = 211; b = 153;
          }
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync('public')) fs.mkdirSync('public');

fs.writeFileSync('public/pwa-192x192.png', generatePNG(192, 192));
fs.writeFileSync('public/pwa-512x512.png', generatePNG(512, 512));
fs.writeFileSync('public/pwa-maskable-512x512.png', generatePNG(512, 512, true));
fs.writeFileSync('public/apple-touch-icon.png', generatePNG(180, 180));
console.log('PNG Icons successfully generated in public/');
