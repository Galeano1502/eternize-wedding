// Gerador leve de QR Code (ISO/IEC 18004 - Byte Mode, ECC Level M) sem dependências externas

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

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    const factor = EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Uint8Array(data.length + ecCount);
  res.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return res.slice(data.length);
}

// Versões 1 a 12 (ECC M): [capacidadeBytes, blocos: [qtd, dataPorBloco, ecPorBloco][], alinhamento[]]
const VERSIONS = [
  null,
  [14, [[1, 16, 10]], []],
  [26, [[1, 28, 16]], [6, 18]],
  [42, [[1, 44, 26]], [6, 22]],
  [62, [[2, 32, 18]], [6, 26]],
  [84, [[2, 43, 24]], [6, 30]],
  [106, [[4, 27, 16]], [6, 34]],
  [122, [[4, 31, 18]], [6, 22, 38]],
  [152, [[2, 38, 22], [2, 39, 22]], [6, 24, 42]],
  [180, [[3, 36, 22], [2, 37, 22]], [6, 26, 46]],
  [213, [[4, 43, 26], [1, 44, 26]], [6, 28, 50]],
  [251, [[1, 50, 30], [4, 51, 30]], [6, 30, 54]],
  [287, [[6, 36, 22], [2, 37, 22]], [6, 32, 58]],
];

const VERSION_INFO = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
  10: 0x0a4d3,
  11: 0x0bbf6,
  12: 0x0c762,
};

export function createQrMatrix(text) {
  const bytes = new TextEncoder().encode(String(text || ''));
  let version = 1;
  while (version < VERSIONS.length && VERSIONS[version][0] < bytes.length) {
    version++;
  }
  if (version >= VERSIONS.length) {
    throw new Error('Texto muito longo para o QR Code.');
  }

  const [, blockGroups, alignCenters] = VERSIONS[version];
  const totalDataCodewords = blockGroups.reduce((sum, [cnt, d]) => sum + cnt * d, 0);

  // Bit stream (Byte mode = 0100)
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  pushBits(0b0100, 4);
  pushBits(bytes.length, version >= 10 ? 16 : 8);
  for (const b of bytes) pushBits(b, 8);

  const maxBits = totalDataCodewords * 8;
  pushBits(0, Math.min(4, maxBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }

  const pads = [0xec, 0x11];
  let padIdx = 0;
  while (codewords.length < totalDataCodewords) {
    codewords.push(pads[padIdx % 2]);
    padIdx++;
  }

  // Divide em blocos e gera correção de erros Reed-Solomon
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (const [count, dataLen, ecLen] of blockGroups) {
    for (let i = 0; i < count; i++) {
      const slice = codewords.slice(offset, offset + dataLen);
      offset += dataLen;
      dataBlocks.push(slice);
      ecBlocks.push(rsEncode(slice, ecLen));
    }
  }

  const finalCodewords = [];
  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const blk of dataBlocks) {
      if (i < blk.length) finalCodewords.push(blk[i]);
    }
  }
  const maxEcLen = Math.max(...ecBlocks.map((b) => b.length));
  for (let i = 0; i < maxEcLen; i++) {
    for (const blk of ecBlocks) {
      if (i < blk.length) finalCodewords.push(blk[i]);
    }
  }

  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Uint8Array(size));
  const reserved = Array.from({ length: size }, () => new Uint8Array(size));

  const setFunctionModule = (x, y, val) => {
    if (x >= 0 && y >= 0 && x < size && y < size) {
      modules[y][x] = val ? 1 : 0;
      reserved[y][x] = 1;
    }
  };

  // Padrões de busca (Finder + separador)
  const drawFinder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        setFunctionModule(cx + dx, cy + dy, dist !== 2 && dist !== 4);
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  // Padrões de alinhamento
  for (const cy of alignCenters) {
    for (const cx of alignCenters) {
      const nearTopLeft = cx === 6 && cy === 6;
      const nearTopRight = cx === size - 7 && cy === 6;
      const nearBottomLeft = cx === 6 && cy === size - 7;
      if (nearTopLeft || nearTopRight || nearBottomLeft) continue;

      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          setFunctionModule(cx + dx, cy + dy, dist !== 1);
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(i, 6, i % 2 === 0);
    setFunctionModule(6, i, i % 2 === 0);
  }

  // Módulo escuro fixo e reserva da área de formato
  setFunctionModule(8, size - 8, 1);
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      reserved[8][i] = 1;
      reserved[i][8] = 1;
    }
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = 1;
    reserved[size - 1 - i][8] = 1;
  }

  // Informação de versão (versões >= 7)
  if (version >= 7 && VERSION_INFO[version]) {
    const vInfo = VERSION_INFO[version];
    for (let i = 0; i < 18; i++) {
      const bit = (vInfo >> i) & 1;
      setFunctionModule(Math.floor(i / 3), size - 11 + (i % 3), bit);
      setFunctionModule(size - 11 + (i % 3), Math.floor(i / 3), bit);
    }
  }

  // Preenchimento em zigue-zague com Máscara 0 ((x + y) % 2 === 0)
  const finalBits = [];
  for (const cw of finalCodewords) {
    for (let b = 7; b >= 0; b--) finalBits.push((cw >> b) & 1);
  }

  let bitIdx = 0;
  let dir = -1;
  let x = size - 1;
  while (x > 0) {
    if (x === 6) x--;
    for (let step = 0; step < size; step++) {
      const y = dir === -1 ? size - 1 - step : step;
      for (let dx = 0; dx < 2; dx++) {
        const col = x - dx;
        if (!reserved[y][col]) {
          const rawBit = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0;
          const maskedBit = (y + col) % 2 === 0 ? rawBit ^ 1 : rawBit;
          modules[y][col] = maskedBit;
        }
      }
    }
    dir = -dir;
    x -= 2;
  }

  // Informação de formato (ECC Level M = 00, Mask 0 = 000 => 0x5412)
  const format = 0x5412;
  for (let i = 0; i < 15; i++) {
    const bit = (format >> i) & 1;
    if (i < 6) modules[i][8] = bit;
    else if (i < 8) modules[i + 1][8] = bit;
    else modules[size - 15 + i][8] = bit;

    if (i < 8) modules[8][size - 1 - i] = bit;
    else if (i < 9) modules[8][15 - i] = bit;
    else modules[8][14 - i] = bit;
  }

  return modules;
}

export function downloadQrPng(text, filename = 'qrcode-convite-eternize.png', pixelSize = 1024) {
  const matrix = createQrMatrix(text);
  const size = matrix.length;
  const quiet = 4;
  const totalModules = size + quiet * 2;
  const scale = Math.max(8, Math.floor(pixelSize / totalModules));
  const canvasSize = totalModules * scale;

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  ctx.fillStyle = '#111827';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix[y][x]) {
        ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
      }
    }
  }

  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}