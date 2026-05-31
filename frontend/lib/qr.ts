// Dependency-light QR Code generator (byte mode) producing an SVG string.
// Pure TypeScript, no runtime dependencies. Suitable for printable flyers and
// short URLs. Based on the public-domain QR Code algorithm (ISO/IEC 18004).
//
// Usage:
//   const svg = qrSvg('https://tryhardly.com/redding', { size: 256 });

type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

// --- Galois field arithmetic over GF(256) for Reed-Solomon ---
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: number[], ecLen: number): number[] {
  const gen = rsGeneratorPoly(ecLen);
  const res = new Array(ecLen).fill(0);
  for (const d of data) {
    const factor = d ^ res[0];
    res.shift();
    res.push(0);
    for (let i = 0; i < gen.length; i++) {
      res[i] ^= gfMul(gen[i], factor);
    }
  }
  return res;
}

// --- Version capacity tables (byte-mode data codewords) ---
// We support versions 1..10, which comfortably hold the short launch URLs.
// [version]: { totalCodewords, ec: { L,M,Q,H: { ecPerBlock, group1Blocks, group1Words, group2Blocks, group2Words } } }
interface BlockInfo {
  ecPerBlock: number;
  g1Blocks: number;
  g1Words: number;
  g2Blocks: number;
  g2Words: number;
}

// Data capacity in codewords per version (after EC) for byte mode is derived,
// but we need the block structure. Table for versions 1-10.
const EC_TABLE: Record<number, Record<ErrorCorrectionLevel, BlockInfo>> = {
  1: {
    L: { ecPerBlock: 7, g1Blocks: 1, g1Words: 19, g2Blocks: 0, g2Words: 0 },
    M: { ecPerBlock: 10, g1Blocks: 1, g1Words: 16, g2Blocks: 0, g2Words: 0 },
    Q: { ecPerBlock: 13, g1Blocks: 1, g1Words: 13, g2Blocks: 0, g2Words: 0 },
    H: { ecPerBlock: 17, g1Blocks: 1, g1Words: 9, g2Blocks: 0, g2Words: 0 },
  },
  2: {
    L: { ecPerBlock: 10, g1Blocks: 1, g1Words: 34, g2Blocks: 0, g2Words: 0 },
    M: { ecPerBlock: 16, g1Blocks: 1, g1Words: 28, g2Blocks: 0, g2Words: 0 },
    Q: { ecPerBlock: 22, g1Blocks: 1, g1Words: 22, g2Blocks: 0, g2Words: 0 },
    H: { ecPerBlock: 28, g1Blocks: 1, g1Words: 16, g2Blocks: 0, g2Words: 0 },
  },
  3: {
    L: { ecPerBlock: 15, g1Blocks: 1, g1Words: 55, g2Blocks: 0, g2Words: 0 },
    M: { ecPerBlock: 26, g1Blocks: 1, g1Words: 44, g2Blocks: 0, g2Words: 0 },
    Q: { ecPerBlock: 18, g1Blocks: 2, g1Words: 17, g2Blocks: 0, g2Words: 0 },
    H: { ecPerBlock: 22, g1Blocks: 2, g1Words: 13, g2Blocks: 0, g2Words: 0 },
  },
  4: {
    L: { ecPerBlock: 20, g1Blocks: 1, g1Words: 80, g2Blocks: 0, g2Words: 0 },
    M: { ecPerBlock: 18, g1Blocks: 2, g1Words: 32, g2Blocks: 0, g2Words: 0 },
    Q: { ecPerBlock: 26, g1Blocks: 2, g1Words: 24, g2Blocks: 0, g2Words: 0 },
    H: { ecPerBlock: 16, g1Blocks: 4, g1Words: 9, g2Blocks: 0, g2Words: 0 },
  },
  5: {
    L: { ecPerBlock: 26, g1Blocks: 1, g1Words: 108, g2Blocks: 0, g2Words: 0 },
    M: { ecPerBlock: 24, g1Blocks: 2, g1Words: 43, g2Blocks: 0, g2Words: 0 },
    Q: { ecPerBlock: 18, g1Blocks: 2, g1Words: 15, g2Blocks: 2, g2Words: 16 },
    H: { ecPerBlock: 22, g1Blocks: 2, g1Words: 11, g2Blocks: 2, g2Words: 12 },
  },
  6: {
    L: { ecPerBlock: 18, g1Blocks: 2, g1Words: 68, g2Blocks: 0, g2Words: 0 },
    M: { ecPerBlock: 16, g1Blocks: 4, g1Words: 27, g2Blocks: 0, g2Words: 0 },
    Q: { ecPerBlock: 24, g1Blocks: 4, g1Words: 19, g2Blocks: 0, g2Words: 0 },
    H: { ecPerBlock: 28, g1Blocks: 4, g1Words: 15, g2Blocks: 0, g2Words: 0 },
  },
  7: {
    L: { ecPerBlock: 20, g1Blocks: 2, g1Words: 78, g2Blocks: 0, g2Words: 0 },
    M: { ecPerBlock: 18, g1Blocks: 4, g1Words: 31, g2Blocks: 0, g2Words: 0 },
    Q: { ecPerBlock: 18, g1Blocks: 2, g1Words: 14, g2Blocks: 4, g2Words: 15 },
    H: { ecPerBlock: 26, g1Blocks: 4, g1Words: 13, g2Blocks: 1, g2Words: 14 },
  },
  8: {
    L: { ecPerBlock: 24, g1Blocks: 2, g1Words: 97, g2Blocks: 0, g2Words: 0 },
    M: { ecPerBlock: 22, g1Blocks: 2, g1Words: 38, g2Blocks: 2, g2Words: 39 },
    Q: { ecPerBlock: 22, g1Blocks: 4, g1Words: 18, g2Blocks: 2, g2Words: 19 },
    H: { ecPerBlock: 26, g1Blocks: 4, g1Words: 14, g2Blocks: 2, g2Words: 15 },
  },
  9: {
    L: { ecPerBlock: 30, g1Blocks: 2, g1Words: 116, g2Blocks: 0, g2Words: 0 },
    M: { ecPerBlock: 22, g1Blocks: 3, g1Words: 36, g2Blocks: 2, g2Words: 37 },
    Q: { ecPerBlock: 20, g1Blocks: 4, g1Words: 16, g2Blocks: 4, g2Words: 17 },
    H: { ecPerBlock: 24, g1Blocks: 4, g1Words: 12, g2Blocks: 4, g2Words: 13 },
  },
  10: {
    L: { ecPerBlock: 18, g1Blocks: 2, g1Words: 68, g2Blocks: 2, g2Words: 69 },
    M: { ecPerBlock: 26, g1Blocks: 4, g1Words: 43, g2Blocks: 1, g2Words: 44 },
    Q: { ecPerBlock: 24, g1Blocks: 6, g1Words: 19, g2Blocks: 2, g2Words: 20 },
    H: { ecPerBlock: 28, g1Blocks: 6, g1Words: 15, g2Blocks: 2, g2Words: 16 },
  },
};

function dataCodewords(version: number, ecl: ErrorCorrectionLevel): number {
  const b = EC_TABLE[version][ecl];
  return b.g1Blocks * b.g1Words + b.g2Blocks * b.g2Words;
}

// Alignment pattern center coordinates per version.
const ALIGN_POS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

function bitBuffer() {
  const bits: number[] = [];
  return {
    put(value: number, len: number) {
      for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
    },
    get length() {
      return bits.length;
    },
    bits,
  };
}

function chooseVersion(byteLen: number, ecl: ErrorCorrectionLevel): number {
  for (let v = 1; v <= 10; v++) {
    // mode(4) + charCount(8 for v1-9) + data*8, must fit data codewords*8
    const charCountBits = v <= 9 ? 8 : 16;
    const required = 4 + charCountBits + byteLen * 8;
    if (required <= dataCodewords(v, ecl) * 8) return v;
  }
  throw new Error('QR data too long for supported versions (max 10).');
}

const PAD = [0xec, 0x11];

function encodeData(text: string, ecl: ErrorCorrectionLevel) {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  const version = chooseVersion(bytes.length, ecl);
  const totalData = dataCodewords(version, ecl);
  const buf = bitBuffer();
  buf.put(0b0100, 4); // byte mode
  buf.put(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) buf.put(b, 8);
  // terminator
  const cap = totalData * 8;
  const term = Math.min(4, cap - buf.length);
  if (term > 0) buf.put(0, term);
  // pad to byte boundary
  while (buf.length % 8 !== 0) buf.bits.push(0);
  // to codewords
  const cw: number[] = [];
  for (let i = 0; i < buf.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | buf.bits[i + j];
    cw.push(v);
  }
  // pad codewords
  let pi = 0;
  while (cw.length < totalData) cw.push(PAD[pi++ % 2]);
  return { version, codewords: cw };
}

function interleave(codewords: number[], version: number, ecl: ErrorCorrectionLevel): number[] {
  const info = EC_TABLE[version][ecl];
  const blocks: { data: number[]; ec: number[] }[] = [];
  let idx = 0;
  for (let i = 0; i < info.g1Blocks; i++) {
    const data = codewords.slice(idx, idx + info.g1Words);
    idx += info.g1Words;
    blocks.push({ data, ec: rsEncode(data, info.ecPerBlock) });
  }
  for (let i = 0; i < info.g2Blocks; i++) {
    const data = codewords.slice(idx, idx + info.g2Words);
    idx += info.g2Words;
    blocks.push({ data, ec: rsEncode(data, info.ecPerBlock) });
  }
  const result: number[] = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) {
    for (const b of blocks) if (i < b.data.length) result.push(b.data[i]);
  }
  const maxEc = info.ecPerBlock;
  for (let i = 0; i < maxEc; i++) {
    for (const b of blocks) result.push(b.ec[i]);
  }
  return result;
}

// --- Matrix building ---
function buildMatrix(version: number, ecl: ErrorCorrectionLevel, finalBits: number[]) {
  const size = version * 4 + 17;
  const mod: (number | null)[][] = Array.from({ length: size }, () => new Array(size).fill(null));
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  const setFn = (r: number, c: number, v: number) => {
    mod[r][c] = v;
    reserved[r][c] = true;
  };

  // Finder patterns + separators
  const placeFinder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const isBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const isCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFn(rr, cc, isBorder || isCenter ? 1 : 0);
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFn(6, i, i % 2 === 0 ? 1 : 0);
    setFn(i, 6, i % 2 === 0 ? 1 : 0);
  }

  // Alignment patterns
  const centers = ALIGN_POS[version];
  for (const r of centers) {
    for (const c of centers) {
      // skip overlapping finders
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
          const isCenter = dr === 0 && dc === 0;
          setFn(r + dr, c + dc, isBorder || isCenter ? 1 : 0);
        }
      }
    }
  }

  // Dark module
  setFn(size - 8, 8, 1);

  // Reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (!reserved[8][i]) reserved[8][i] = true;
    if (!reserved[i][8]) reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }

  // Reserve version info (v >= 7)
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        reserved[i][size - 11 + j] = true;
        reserved[size - 11 + j][i] = true;
      }
    }
  }

  // Place data bits in zigzag
  let bitIdx = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // skip timing column
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let k = 0; k < 2; k++) {
        const c = col - k;
        if (reserved[row][c]) continue;
        const bit = bitIdx < finalBits.length ? finalBits[bitIdx] : 0;
        mod[row][c] = bit;
        bitIdx++;
      }
    }
    upward = !upward;
  }

  return { mod, reserved, size };
}

function applyMask(
  mod: (number | null)[][],
  reserved: boolean[][],
  size: number,
  mask: number
): number[][] {
  const out: number[][] = Array.from({ length: size }, (_, r) =>
    (mod[r] as number[]).map((v) => v ?? 0)
  );
  const maskFn = (r: number, c: number): boolean => {
    switch (mask) {
      case 0:
        return (r + c) % 2 === 0;
      case 1:
        return r % 2 === 0;
      case 2:
        return c % 3 === 0;
      case 3:
        return (r + c) % 3 === 0;
      case 4:
        return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5:
        return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6:
        return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7:
        return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
      default:
        return false;
    }
  };
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c] && maskFn(r, c)) out[r][c] ^= 1;
    }
  }
  return out;
}

const ECL_BITS: Record<ErrorCorrectionLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };

function placeFormatInfo(matrix: number[][], size: number, ecl: ErrorCorrectionLevel, mask: number) {
  const data = (ECL_BITS[ecl] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) & 1 ? 0b10100110111 : 0);
  const bits = ((data << 10) | rem) ^ 0b101010000010010;

  for (let i = 0; i <= 5; i++) matrix[8][i] = (bits >> i) & 1;
  matrix[8][7] = (bits >> 6) & 1;
  matrix[8][8] = (bits >> 7) & 1;
  matrix[7][8] = (bits >> 8) & 1;
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = (bits >> i) & 1;

  for (let i = 0; i < 8; i++) matrix[size - 1 - i][8] = (bits >> i) & 1;
  for (let i = 8; i < 15; i++) matrix[8][size - 15 + i] = (bits >> i) & 1;
  matrix[size - 8][8] = 1; // dark module guaranteed
}

const VERSION_INFO: Record<number, number> = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
  10: 0x0a4d3,
};

function placeVersionInfo(matrix: number[][], size: number, version: number) {
  if (version < 7) return;
  const bits = VERSION_INFO[version];
  for (let i = 0; i < 18; i++) {
    const bit = (bits >> i) & 1;
    const r = Math.floor(i / 3);
    const c = i % 3;
    matrix[r][size - 11 + c] = bit;
    matrix[size - 11 + c][r] = bit;
  }
}

function penalty(matrix: number[][], size: number): number {
  let p = 0;
  // Rule 1: runs of >=5
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c < size; c++) {
      if (matrix[r][c] === matrix[r][c - 1]) {
        run++;
      } else {
        if (run >= 5) p += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) p += 3 + (run - 5);
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r < size; r++) {
      if (matrix[r][c] === matrix[r - 1][c]) {
        run++;
      } else {
        if (run >= 5) p += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) p += 3 + (run - 5);
  }
  // Rule 2: 2x2 blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = matrix[r][c];
      if (v === matrix[r][c + 1] && v === matrix[r + 1][c] && v === matrix[r + 1][c + 1]) p += 3;
    }
  }
  return p;
}

export interface QrOptions {
  ecl?: ErrorCorrectionLevel;
  size?: number; // pixel size of the rendered SVG (square)
  margin?: number; // quiet zone in modules (default 4)
  dark?: string;
  light?: string;
}

export function qrMatrix(text: string, ecl: ErrorCorrectionLevel = 'M'): number[][] {
  const { version, codewords } = encodeData(text, ecl);
  const finalCw = interleave(codewords, version, ecl);
  const finalBits: number[] = [];
  for (const cw of finalCw) for (let i = 7; i >= 0; i--) finalBits.push((cw >> i) & 1);

  const { mod, reserved, size } = buildMatrix(version, ecl, finalBits);

  let best: number[][] | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const masked = applyMask(mod, reserved, size, mask);
    placeFormatInfo(masked, size, ecl, mask);
    placeVersionInfo(masked, size, version);
    const score = penalty(masked, size);
    if (score < bestScore) {
      bestScore = score;
      best = masked;
    }
  }
  return best as number[][];
}

export function qrSvg(text: string, opts: QrOptions = {}): string {
  const ecl = opts.ecl ?? 'M';
  const margin = opts.margin ?? 4;
  const dark = opts.dark ?? '#000000';
  const light = opts.light ?? '#ffffff';
  const matrix = qrMatrix(text, ecl);
  const count = matrix.length;
  const total = count + margin * 2;
  const px = opts.size ?? total * 8;

  let path = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (matrix[r][c]) {
        path += `M${c + margin},${r + margin}h1v1h-1z`;
      }
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ` +
    `viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" ` +
    `aria-label="QR code">` +
    `<rect width="${total}" height="${total}" fill="${light}"/>` +
    `<path d="${path}" fill="${dark}"/>` +
    `</svg>`
  );
}
