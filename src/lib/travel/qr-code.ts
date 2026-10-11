/**
 * Pure TypeScript ISO/IEC 18004 QR Code generator (Byte mode, Versions 1–10).
 * Zero external dependencies and zero network calls — preserves full user privacy.
 */

export type QrErrorCorrection = "L" | "M";

export type QrMatrix = {
  version: number;
  size: number;
  modules: boolean[][];
};

type VersionSpec = {
  version: number;
  totalCodewords: number;
  ecCodewordsPerBlock: number;
  blocksGroup1: number;
  dataCodewordsGroup1: number;
  blocksGroup2: number;
  dataCodewordsGroup2: number;
  alignmentCenters: number[];
};

const ALIGNMENT_BY_VERSION: Record<number, number[]> = {
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

const SPECS_L: VersionSpec[] = [
  { version: 1, totalCodewords: 26, ecCodewordsPerBlock: 7, blocksGroup1: 1, dataCodewordsGroup1: 19, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[1] },
  { version: 2, totalCodewords: 44, ecCodewordsPerBlock: 10, blocksGroup1: 1, dataCodewordsGroup1: 34, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[2] },
  { version: 3, totalCodewords: 70, ecCodewordsPerBlock: 15, blocksGroup1: 1, dataCodewordsGroup1: 55, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[3] },
  { version: 4, totalCodewords: 100, ecCodewordsPerBlock: 20, blocksGroup1: 1, dataCodewordsGroup1: 80, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[4] },
  { version: 5, totalCodewords: 134, ecCodewordsPerBlock: 26, blocksGroup1: 1, dataCodewordsGroup1: 108, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[5] },
  { version: 6, totalCodewords: 172, ecCodewordsPerBlock: 18, blocksGroup1: 2, dataCodewordsGroup1: 68, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[6] },
  { version: 7, totalCodewords: 196, ecCodewordsPerBlock: 20, blocksGroup1: 2, dataCodewordsGroup1: 78, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[7] },
  { version: 8, totalCodewords: 242, ecCodewordsPerBlock: 24, blocksGroup1: 2, dataCodewordsGroup1: 97, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[8] },
  { version: 9, totalCodewords: 292, ecCodewordsPerBlock: 30, blocksGroup1: 2, dataCodewordsGroup1: 116, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[9] },
  { version: 10, totalCodewords: 346, ecCodewordsPerBlock: 18, blocksGroup1: 2, dataCodewordsGroup1: 68, blocksGroup2: 2, dataCodewordsGroup2: 69, alignmentCenters: ALIGNMENT_BY_VERSION[10] },
];

const SPECS_M: VersionSpec[] = [
  { version: 1, totalCodewords: 26, ecCodewordsPerBlock: 10, blocksGroup1: 1, dataCodewordsGroup1: 16, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[1] },
  { version: 2, totalCodewords: 44, ecCodewordsPerBlock: 16, blocksGroup1: 1, dataCodewordsGroup1: 28, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[2] },
  { version: 3, totalCodewords: 70, ecCodewordsPerBlock: 26, blocksGroup1: 1, dataCodewordsGroup1: 44, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[3] },
  { version: 4, totalCodewords: 100, ecCodewordsPerBlock: 18, blocksGroup1: 2, dataCodewordsGroup1: 32, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[4] },
  { version: 5, totalCodewords: 134, ecCodewordsPerBlock: 24, blocksGroup1: 2, dataCodewordsGroup1: 43, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[5] },
  { version: 6, totalCodewords: 172, ecCodewordsPerBlock: 16, blocksGroup1: 4, dataCodewordsGroup1: 27, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[6] },
  { version: 7, totalCodewords: 196, ecCodewordsPerBlock: 18, blocksGroup1: 4, dataCodewordsGroup1: 31, blocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: ALIGNMENT_BY_VERSION[7] },
  { version: 8, totalCodewords: 242, ecCodewordsPerBlock: 22, blocksGroup1: 2, dataCodewordsGroup1: 38, blocksGroup2: 2, dataCodewordsGroup2: 39, alignmentCenters: ALIGNMENT_BY_VERSION[8] },
  { version: 9, totalCodewords: 292, ecCodewordsPerBlock: 22, blocksGroup1: 3, dataCodewordsGroup1: 36, blocksGroup2: 2, dataCodewordsGroup2: 37, alignmentCenters: ALIGNMENT_BY_VERSION[9] },
  { version: 10, totalCodewords: 346, ecCodewordsPerBlock: 26, blocksGroup1: 4, dataCodewordsGroup1: 43, blocksGroup2: 1, dataCodewordsGroup2: 44, alignmentCenters: ALIGNMENT_BY_VERSION[10] },
];

function totalDataCapacityBytes(spec: VersionSpec): number {
  const totalDataCodewords =
    spec.blocksGroup1 * spec.dataCodewordsGroup1 + spec.blocksGroup2 * spec.dataCodewordsGroup2;
  const countBits = spec.version <= 9 ? 8 : 16;
  return Math.floor((totalDataCodewords * 8 - 4 - countBits) / 8);
}

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function reedSolomonDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) {
        result[j] ^= result[j + 1];
      }
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(data: Uint8Array, degree: number): Uint8Array {
  const divisor = reedSolomonDivisor(degree);
  const result = new Uint8Array(degree);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.copyWithin(0, 1);
    result[degree - 1] = 0;
    for (let i = 0; i < degree; i++) {
      result[i] ^= gfMul(divisor[i], factor);
    }
  }
  return result;
}

function encodeDataCodewords(bytes: Uint8Array, spec: VersionSpec): Uint8Array {
  const totalDataCodewords =
    spec.blocksGroup1 * spec.dataCodewordsGroup1 + spec.blocksGroup2 * spec.dataCodewordsGroup2;
  const bits: number[] = [];

  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Byte mode indicator (0100)
  pushBits(0b0100, 4);
  pushBits(bytes.length, spec.version <= 9 ? 8 : 16);
  for (const b of bytes) {
    pushBits(b, 8);
  }

  const capacityBits = totalDataCodewords * 8;
  const terminatorLen = Math.min(4, capacityBits - bits.length);
  pushBits(0, terminatorLen);

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const data = new Uint8Array(totalDataCodewords);
  for (let i = 0; i < bits.length / 8; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i * 8 + b];
    }
    data[i] = byte;
  }

  let padIndex = bits.length / 8;
  let toggle = false;
  while (padIndex < totalDataCodewords) {
    data[padIndex++] = toggle ? 0x11 : 0xec;
    toggle = !toggle;
  }

  return data;
}

function interleaveWithEc(dataCodewords: Uint8Array, spec: VersionSpec): Uint8Array {
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let i = 0; i < spec.blocksGroup1; i++) {
    const block = dataCodewords.subarray(offset, offset + spec.dataCodewordsGroup1);
    offset += spec.dataCodewordsGroup1;
    dataBlocks.push(block);
    ecBlocks.push(reedSolomonRemainder(block, spec.ecCodewordsPerBlock));
  }
  for (let i = 0; i < spec.blocksGroup2; i++) {
    const block = dataCodewords.subarray(offset, offset + spec.dataCodewordsGroup2);
    offset += spec.dataCodewordsGroup2;
    dataBlocks.push(block);
    ecBlocks.push(reedSolomonRemainder(block, spec.ecCodewordsPerBlock));
  }

  const result = new Uint8Array(spec.totalCodewords);
  let outIdx = 0;
  const maxDataLen = Math.max(spec.dataCodewordsGroup1, spec.dataCodewordsGroup2);

  for (let col = 0; col < maxDataLen; col++) {
    for (const block of dataBlocks) {
      if (col < block.length) {
        result[outIdx++] = block[col];
      }
    }
  }
  for (let col = 0; col < spec.ecCodewordsPerBlock; col++) {
    for (const block of ecBlocks) {
      result[outIdx++] = block[col];
    }
  }

  return result;
}

function maskBit(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    case 7:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function drawFormatBits(
  modules: boolean[][],
  isFunction: boolean[][],
  ec: QrErrorCorrection,
  mask: number,
) {
  const size = modules.length;
  const ecFormat = ec === "L" ? 1 : 0;
  const data = (ecFormat << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  }
  const bits = ((data << 10) | rem) ^ 0x5412;

  const setModule = (r: number, c: number, dark: boolean) => {
    modules[r][c] = dark;
    isFunction[r][c] = true;
  };

  for (let i = 0; i <= 5; i++) setModule(i, 8, ((bits >>> i) & 1) !== 0);
  setModule(7, 8, ((bits >>> 6) & 1) !== 0);
  setModule(8, 8, ((bits >>> 7) & 1) !== 0);
  setModule(8, 7, ((bits >>> 8) & 1) !== 0);
  for (let i = 9; i < 15; i++) setModule(8, 14 - i, ((bits >>> i) & 1) !== 0);

  for (let i = 0; i < 8; i++) setModule(8, size - 1 - i, ((bits >>> i) & 1) !== 0);
  for (let i = 8; i < 15; i++) setModule(size - 15 + i, 8, ((bits >>> i) & 1) !== 0);
  setModule(size - 8, 8, true);
}

function computePenalty(modules: boolean[][]): number {
  const size = modules.length;
  let penalty = 0;

  // Rule 1: 5+ consecutive same-colored modules in row/col
  for (let r = 0; r < size; r++) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === runColor) {
        runLen++;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else {
        runColor = modules[r][c];
        runLen = 1;
      }
    }
  }
  for (let c = 0; c < size; c++) {
    let runColor = modules[0][c];
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === runColor) {
        runLen++;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else {
        runColor = modules[r][c];
        runLen = 1;
      }
    }
  }

  // Rule 2: 2x2 blocks of same color
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const color = modules[r][c];
      if (
        modules[r][c + 1] === color &&
        modules[r + 1][c] === color &&
        modules[r + 1][c + 1] === color
      ) {
        penalty += 3;
      }
    }
  }

  return penalty;
}

export function generateQrMatrix(
  text: string,
  ec: QrErrorCorrection = "M",
): QrMatrix {
  const bytes = new TextEncoder().encode(text.trim() || "https://traveltrip.app");
  const specs = ec === "L" ? SPECS_L : SPECS_M;

  let chosen = specs.find((spec) => totalDataCapacityBytes(spec) >= bytes.length);
  let chosenEc: QrErrorCorrection = ec;
  if (!chosen && ec === "M") {
    chosen = SPECS_L.find((spec) => totalDataCapacityBytes(spec) >= bytes.length);
    chosenEc = "L";
  }
  if (!chosen) {
    // Truncate safely to fit Version 10 L if input is unexpectedly huge
    chosen = SPECS_L[SPECS_L.length - 1];
    chosenEc = "L";
  }

  const maxLen = totalDataCapacityBytes(chosen);
  const safeBytes = bytes.length > maxLen ? bytes.subarray(0, maxLen) : bytes;
  const size = 17 + chosen.version * 4;

  const modules: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  );

  const setFunction = (r: number, c: number, dark: boolean) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    modules[r][c] = dark;
    isFunction[r][c] = true;
  };

  // Finder patterns + separators
  const drawFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onOuterBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunction(r, c, inOuter && (onOuterBorder || inCenter));
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const centers = chosen.alignmentCenters;
  for (const cr of centers) {
    for (const cc of centers) {
      if (
        (cr === 6 && cc === 6) ||
        (cr === 6 && cc === size - 7) ||
        (cr === size - 7 && cc === 6)
      ) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFunction(cr + dr, cc + dc, dist !== 1);
        }
      }
    }
  }

  // Version information (V >= 7)
  if (chosen.version >= 7) {
    let rem = chosen.version;
    for (let i = 0; i < 12; i++) {
      rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    }
    const bits = (chosen.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunction(a, b, dark);
      setFunction(b, a, dark);
    }
  }

  // Reserve format info areas first
  drawFormatBits(modules, isFunction, chosenEc, 0);

  // Encode & interleave data + EC codewords
  const dataCodewords = encodeDataCodewords(safeBytes, chosen);
  const allCodewords = interleaveWithEc(dataCodewords, chosen);

  // Zigzag placement
  let bitIdx = 0;
  const totalBits = allCodewords.length * 8;
  let upward = true;

  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let dc = 0; dc < 2; dc++) {
        const c = rightCol - dc;
        if (isFunction[r][c]) continue;
        let dark = false;
        if (bitIdx < totalBits) {
          const byte = allCodewords[bitIdx >>> 3];
          dark = ((byte >>> (7 - (bitIdx & 7))) & 1) !== 0;
          bitIdx++;
        }
        modules[r][c] = dark;
      }
    }
    upward = !upward;
  }

  // Choose mask with lowest penalty score
  let bestMask = 0;
  let bestPenalty = Number.POSITIVE_INFINITY;
  let bestGrid = modules;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = modules.map((row, r) =>
      row.map((val, c) => (isFunction[r][c] ? val : val !== maskBit(mask, r, c))),
    );
    drawFormatBits(candidate, isFunction, chosenEc, mask);
    const score = computePenalty(candidate);
    if (score < bestPenalty) {
      bestPenalty = score;
      bestMask = mask;
      bestGrid = candidate;
    }
  }

  drawFormatBits(bestGrid, isFunction, chosenEc, bestMask);

  return {
    version: chosen.version,
    size,
    modules: bestGrid,
  };
}

/**
 * Render a standalone SVG string for downloading or printing the QR code.
 */
export function renderQrSvgString(
  text: string,
  options: { quietZone?: number; darkColor?: string; lightColor?: string } = {},
): string {
  const matrix = generateQrMatrix(text, "M");
  const quiet = options.quietZone ?? 4;
  const darkColor = options.darkColor ?? "#132a28";
  const lightColor = options.lightColor ?? "#ffffff";
  const total = matrix.size + quiet * 2;

  const paths: string[] = [];
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (matrix.modules[r][c]) {
        paths.push(`M${c + quiet},${r + quiet}h1v1h-1z`);
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="512" height="512" shape-rendering="crispEdges">`,
    `<rect width="${total}" height="${total}" rx="2" fill="${lightColor}"/>`,
    `<path d="${paths.join("")}" fill="${darkColor}"/>`,
    `</svg>`,
  ].join("");
}

export type DevicePlatform = "android" | "ios" | "desktop" | "universal";

/**
 * Build the installation URL encoded in the QR code for a chosen target platform.
 */
export function buildInstallQrUrl(baseOrigin: string, platform: DevicePlatform): string {
  let cleanOrigin = baseOrigin.trim().replace(/\/+$/, "");
  if (!cleanOrigin.startsWith("http://") && !cleanOrigin.startsWith("https://")) {
    cleanOrigin = "https://traveltrip.app";
  }
  switch (platform) {
    case "ios":
      return `${cleanOrigin}/?install=1&platform=ios`;
    case "android":
      return `${cleanOrigin}/?install=android`;
    case "desktop":
      return `${cleanOrigin}/?install=desktop`;
    case "universal":
    default:
      return `${cleanOrigin}/`;
  }
}

/**
 * Detect the user's current platform from a user-agent string.
 */
export function detectDevicePlatform(userAgent: string, maxTouchPoints = 0): Exclude<DevicePlatform, "universal"> {
  const ua = userAgent || "";
  const isIPad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1);
  const isIPhone = /iPhone|iPod/i.test(ua);
  if (isIPad || isIPhone) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

