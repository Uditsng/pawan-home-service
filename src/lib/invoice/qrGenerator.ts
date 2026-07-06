/**
 * Pure TypeScript self-contained QR Code generator.
 * Generates QR Code SVG paths without external NPM packages.
 * Supported: Type 1-10, Error Correction Level L/M/Q/H.
 * Encodes text into standard Byte Mode QR Code matrix.
 */

class QRBitBuffer {
  buffer: number[] = [];
  length = 0;

  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  }

  put(num: number, length: number) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  putBit(bit: boolean) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
    }
    this.length++;
  }
}

class QRPolynomial {
  num: number[];

  constructor(num: number[], shift = 0) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) {
      offset++;
    }
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset];
    }
    for (let i = num.length - offset; i < this.num.length; i++) {
      this.num[i] = 0;
    }
  }

  get(index: number): number {
    return this.num[index];
  }

  getLength(): number {
    return this.num.length;
  }

  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Array(this.getLength() + e.getLength() - 1);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      }
    }
    return new QRPolynomial(num);
  }

  mod(e: QRPolynomial): QRPolynomial {
    if (this.getLength() - e.getLength() < 0) {
      return this;
    }
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Array(this.getLength());
    for (let i = 0; i < this.getLength(); i++) {
      num[i] = this.get(i);
    }
    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new QRPolynomial(num).mod(e);
  }
}

const QRMath = {
  glog(n: number): number {
    if (n < 1) {
      throw new Error("glog(" + n + ")");
    }
    return LOG_TABLE[n];
  },
  gexp(n: number): number {
    while (n < 0) {
      n += 255;
    }
    while (n >= 256) {
      n -= 255;
    }
    return EXP_TABLE[n];
  }
};

const EXP_TABLE = new Array(256);
const LOG_TABLE = new Array(256);

for (let i = 0; i < 8; i++) {
  EXP_TABLE[i] = 1 << i;
}
for (let i = 8; i < 256; i++) {
  EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
}
for (let i = 0; i < 255; i++) {
  LOG_TABLE[EXP_TABLE[i]] = i;
}

const QR_LIMIT_TABLE = [
  [17, 14, 11, 7],     // 1
  [32, 26, 20, 14],    // 2
  [53, 42, 32, 24],    // 3
  [78, 62, 46, 34],    // 4
  [106, 84, 60, 44],   // 5
  [134, 106, 74, 58],  // 6
  [154, 122, 86, 64],  // 7
  [192, 152, 108, 84], // 8
  [230, 180, 130, 98], // 9
  [271, 213, 151, 119] // 10
];

const QR_RS_BLOCK_TABLE = [
  // L, M, Q, H
  [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],       // 1
  [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],      // 2
  [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],      // 3
  [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],      // 4
  [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12], // 5
  [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],      // 6
  [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14], // 7
  [2, 121, 97], [2, 22, 38, 2, 22, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15], // 8
  [2, 146, 116], [3, 25, 36, 2, 25, 37], [4, 45, 16, 4, 46, 17], [4, 44, 12, 4, 45, 13], // 9
  [2, 86, 68, 2, 87, 69], [4, 43, 27, 3, 44, 28], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16] // 10
];

const QR_ALIGNMENT_PATTERN_TABLE = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54]
];

export class QRCode {
  type: number;
  errorCorrectionLevel: number; // 0=L, 1=M, 2=Q, 3=H
  modules: (boolean | null)[][] = [];
  moduleCount = 0;
  data: string;

  constructor(data: string, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M') {
    this.data = data;
    const eclMap = { L: 1, M: 0, Q: 3, H: 2 };
    this.errorCorrectionLevel = eclMap[errorCorrectionLevel];

    // Determine type automatically
    const byteLen = this.getUTF8Length(data);
    let type = 1;
    for (let i = 0; i < QR_LIMIT_TABLE.length; i++) {
      if (byteLen <= QR_LIMIT_TABLE[i][this.errorCorrectionLevel]) {
        type = i + 1;
        break;
      }
      type = i + 1;
    }
    this.type = type;
  }

  getUTF8Length(str: string): number {
    return new TextEncoder().encode(str).length;
  }

  make() {
    this.moduleCount = this.type * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let r = 0; r < this.moduleCount; r++) {
      this.modules[r] = new Array(this.moduleCount).fill(null);
    }

    this.setupPositionFinderPattern(0, 0);
    this.setupPositionFinderPattern(this.moduleCount - 7, 0);
    this.setupPositionFinderPattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(false, 0);
    this.mapData(this.createData(), 0);
  }

  setupPositionFinderPattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      if (row + r < 0 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c < 0 || this.moduleCount <= col + c) continue;
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  }

  setupTimingPattern() {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] !== null) continue;
      this.modules[r][6] = (r % 2 === 0);
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] !== null) continue;
      this.modules[6][c] = (c % 2 === 0);
    }
  }

  setupPositionAdjustPattern() {
    const pos = QR_ALIGNMENT_PATTERN_TABLE[this.type];
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];
        if (this.modules[row][col] !== null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  }

  setupTypeInfo(test: boolean, maskPattern: number) {
    const data = (this.errorCorrectionLevel << 3) | maskPattern;
    let bits = data << 10;
    while (this.getBCHDigit(bits) - this.getBCHDigit(0x537) >= 0) {
      bits ^= (0x537 << (this.getBCHDigit(bits) - this.getBCHDigit(0x537)));
    }
    const typeInfo = ((data << 10) | bits) ^ 0x5412;

    // vertical
    for (let i = 0; i < 15; i++) {
      const mod = (!test && ((typeInfo >>> i) & 1) === 1);
      if (i < 6) {
        this.modules[i][8] = mod;
      } else if (i < 8) {
        this.modules[i + 1][8] = mod;
      } else {
        this.modules[this.moduleCount - 15 + i][8] = mod;
      }
    }

    // horizontal
    for (let i = 0; i < 15; i++) {
      const mod = (!test && ((typeInfo >>> i) & 1) === 1);
      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = mod;
      } else {
        this.modules[8][15 - i - 1] = mod;
      }
    }

    // fixed module
    this.modules[this.moduleCount - 8][8] = !test;
  }

  getBCHDigit(data: number): number {
    let digit = 0;
    while (data !== 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  }

  createData(): number[] {
    const rsBlocks = this.getRSBlocks();
    const buffer = new QRBitBuffer();

    // Mode: 8-bit byte (0100)
    buffer.put(4, 4);
    
    const utf8Bytes = new TextEncoder().encode(this.data);
    buffer.put(utf8Bytes.length, this.type < 10 ? 8 : 16);

    for (let i = 0; i < utf8Bytes.length; i++) {
      buffer.put(utf8Bytes[i], 8);
    }

    // Calc max data capacity
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      totalDataCount += rsBlocks[i].dataCount;
    }

    if (buffer.length > totalDataCount * 8) {
      throw new Error("Data overflow. Text is too long for QR Code limit.");
    }

    // Add terminator (0000)
    if (buffer.length + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }

    // Padding bits
    while (buffer.length % 8 !== 0) {
      buffer.putBit(false);
    }

    // Padding bytes
    while (true) {
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0xec, 8);
      if (buffer.length >= totalDataCount * 8) break;
      buffer.put(0x11, 8);
    }

    return this.createBytes(buffer, rsBlocks);
  }

  getRSBlocks(): { totalCount: number; dataCount: number }[] {
    const offset = (this.type - 1) * 4 + this.errorCorrectionLevel;
    const target = QR_RS_BLOCK_TABLE[offset];
    const list: { totalCount: number; dataCount: number }[] = [];
    
    const blockCount = target[0];
    const totalCount = target[1];
    const dataCount = target[2];
    for (let i = 0; i < blockCount; i++) {
      list.push({ totalCount, dataCount });
    }

    if (target.length > 3) {
      const blockCount2 = target[3];
      const totalCount2 = target[4];
      const dataCount2 = target[5];
      for (let i = 0; i < blockCount2; i++) {
        list.push({ totalCount: totalCount2, dataCount: dataCount2 });
      }
    }
    return list;
  }

  createBytes(buffer: QRBitBuffer, rsBlocks: { totalCount: number; dataCount: number }[]): number[] {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;

    const dcdata: number[][] = new Array(rsBlocks.length);
    const ecdata: number[][] = new Array(rsBlocks.length);

    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;

      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);

      dcdata[r] = new Array(dcCount);
      for (let i = 0; i < dcdata[r].length; i++) {
        dcdata[r][i] = 0xff & buffer.buffer[Math.floor((i * 8 + offset) / 8)];
      }
      offset += dcCount * 8;

      const rsPoly = this.getErrorCorrectionPolynomial(ecCount);
      const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);

      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
      }
    }

    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      totalCodeCount += rsBlocks[i].totalCount;
    }

    const data = new Array(totalCodeCount);
    let index = 0;

    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) {
          data[index++] = dcdata[r][i];
        }
      }
    }

    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) {
          data[index++] = ecdata[r][i];
        }
      }
    }

    return data;
  }

  getErrorCorrectionPolynomial(eccCount: number): QRPolynomial {
    let a = new QRPolynomial([1], 0);
    for (let i = 0; i < eccCount; i++) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  }

  mapData(data: number[], maskPattern: number) {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          const currentCol = col - c;
          if (this.modules[row][currentCol] === null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
            }
            // Mask evaluation
            const mask = this.getMask(maskPattern, row, currentCol);
            if (mask) {
              dark = !dark;
            }
            this.modules[row][currentCol] = dark;
            bitIndex--;
            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  getMask(maskPattern: number, i: number, j: number): boolean {
    switch (maskPattern) {
      case 0: return (i + j) % 2 === 0;
      case 1: return i % 2 === 0;
      case 2: return j % 3 === 0;
      case 3: return (i + j) % 3 === 0;
      case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case 5: return (i * j) % 2 + (i * j) % 3 === 0;
      case 6: return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
      case 7: return ((i * j) % 3 + (i + j) % 2) % 2 === 0;
      default: throw new Error("Invalid mask pattern: " + maskPattern);
    }
  }

  /**
   * Generates a responsive SVG markup of the QR code.
   */
  toSVGString(cellSize = 4, margin = 8): string {
    const size = this.moduleCount * cellSize + margin * 2;
    let paths = "";

    for (let r = 0; r < this.moduleCount; r++) {
      for (let c = 0; c < this.moduleCount; c++) {
        if (this.modules[r][c]) {
          const x = c * cellSize + margin;
          const y = r * cellSize + margin;
          paths += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z `;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" height="100%" style="display:block;shape-rendering:crispEdges;">
  <path d="${paths}" fill="#002261" />
</svg>`;
  }
}

/**
 * Convenience helper to render text as an SVG string.
 */
export function generateQrSvg(text: string, cellSize = 4, margin = 8): string {
  const qr = new QRCode(text, "M");
  qr.make();
  return qr.toSVGString(cellSize, margin);
}
