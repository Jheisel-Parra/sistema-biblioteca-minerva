import crypto from 'crypto';

// ============================================================================
// 1. BASE32 & TOTP (RFC 6238 / Google Authenticator / Authy) - 100% Local
// ============================================================================
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Genera un secreto aleatorio en formato Base32 (20 bytes = 32 caracteres Base32)
 */
export function generarSecretoTOTP(bytesLength = 20) {
  const randomBytes = crypto.randomBytes(bytesLength);
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < randomBytes.length; i++) {
    value = (value << 8) | randomBytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Decodifica una cadena Base32 a Buffer binario
 */
export function decodificarBase32(base32Str) {
  const clean = String(base32Str || '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '');

  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Formatea el secreto Base32 en grupos de 4 caracteres para lectura cómoda
 */
export function formatearSecretoLegible(secret) {
  return String(secret || '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '')
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

/**
 * Calcula el código TOTP de 6 dígitos para un contador de tiempo dado (RFC 6238)
 */
export function generarCodigoTOTP(secret, counter = Math.floor(Date.now() / 1000 / 30)) {
  const key = decodificarBase32(secret);
  const buffer = Buffer.alloc(8);
  let tmp = BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    buffer[i] = Number(tmp & 0xffn);
    tmp >>= 8n;
  }

  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return String(otp).padStart(6, '0');
}

/**
 * Verifica un código TOTP de 6 dígitos con tolerancia de ±1 ventana (30s antes/después)
 * para compensar pequeños desfases de segundos entre el reloj del teléfono y la PC.
 */
export function verificarCodigoTOTP(secret, codigoIngresado, window = 1) {
  if (!secret || !codigoIngresado) return false;
  const codigoLimpio = String(codigoIngresado).replace(/\s+/g, '').trim();
  if (!/^\d{6}$/.test(codigoLimpio)) return false;

  const currentCounter = Math.floor(Date.now() / 1000 / 30);
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const esperado = generarCodigoTOTP(secret, currentCounter + errorWindow);
    if (esperado === codigoLimpio) {
      return true;
    }
  }
  return false;
}

/**
 * Construye la URI estándar otpauth:// para Google Authenticator / Authy
 */
export function construirOtpAuthUri({ secret, email, nombre, issuer = 'Libreria Minerva' }) {
  const cuenta = email || nombre || 'usuario';
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(cuenta)}`;
  const params = new URLSearchParams({
    secret: String(secret).replace(/\s+/g, ''),
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30'
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ============================================================================
// 2. GENERADOR QR CODE SVG (ISO/IEC 18004) - 100% Offline sin dependencias
// ============================================================================

// Tablas de capacidad para Nivel de Corrección L (Low: ~7%) en Modo Byte, Versiones 1 a 10
// [totalCodewords, ecCodewordsPerBlock, numBlocksGroup1, dataCodewordsGroup1, numBlocksGroup2, dataCodewordsGroup2]
const QR_VERSION_TABLE_L = [
  null,
  [26, 7, 1, 19, 0, 0],     // v1: 17 bytes
  [44, 10, 1, 34, 0, 0],    // v2: 32 bytes
  [70, 15, 1, 55, 0, 0],    // v3: 53 bytes
  [100, 20, 1, 80, 0, 0],   // v4: 78 bytes
  [134, 26, 1, 108, 0, 0],  // v5: 106 bytes
  [172, 18, 2, 68, 0, 0],   // v6: 134 bytes
  [196, 20, 2, 78, 0, 0],   // v7: 154 bytes
  [242, 24, 2, 97, 0, 0],   // v8: 192 bytes
  [292, 30, 2, 116, 0, 0],  // v9: 230 bytes
  [346, 18, 2, 68, 2, 69]   // v10: 271 bytes
];

const ALIGNMENT_PATTERNS = [
  null,
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50]
];

// Aritmética de Cuerpo Finito GF(256) para Reed-Solomon
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecLen) {
  const gen = rsGeneratorPoly(ecLen);
  const msg = new Uint8Array(data.length + ecLen);
  msg.set(data, 0);

  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 1; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

function elegirVersionQR(byteLength) {
  for (let v = 1; v <= 10; v++) {
    const [, , g1Blocks, g1Data, g2Blocks, g2Data] = QR_VERSION_TABLE_L[v];
    const totalDataCodewords = g1Blocks * g1Data + g2Blocks * g2Data;
    const headerBytes = v <= 9 ? 2 : 3; // 4 bits modo + 8/16 bits longitud + 4 bits terminador
    if (byteLength + headerBytes <= totalDataCodewords) {
      return v;
    }
  }
  throw new Error('Texto demasiado largo para generar código QR.');
}

function construirCodewords(utf8Bytes, version) {
  const [, ecLen, g1Blocks, g1Data, g2Blocks, g2Data] = QR_VERSION_TABLE_L[version];
  const totalDataCodewords = g1Blocks * g1Data + g2Blocks * g2Data;

  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Modo Byte (0100)
  pushBits(0b0100, 4);
  // Longitud de caracteres (8 bits para v1-9, 16 bits para v10+)
  pushBits(utf8Bytes.length, version <= 9 ? 8 : 16);

  for (let i = 0; i < utf8Bytes.length; i++) {
    pushBits(utf8Bytes[i], 8);
  }

  // Terminador (hasta 4 ceros)
  const maxBits = totalDataCodewords * 8;
  const terminatorLen = Math.min(4, maxBits - bits.length);
  pushBits(0, terminatorLen);

  // Alinear a múltiplo de 8
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const dataBytes = new Uint8Array(totalDataCodewords);
  for (let i = 0; i < bits.length / 8; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i * 8 + b];
    }
    dataBytes[i] = byte;
  }

  // Rellenar con bytes alternos 0xEC y 0x11
  let padToggle = true;
  for (let i = bits.length / 8; i < totalDataCodewords; i++) {
    dataBytes[i] = padToggle ? 0xec : 0x11;
    padToggle = !padToggle;
  }

  // Dividir en bloques y calcular corrección de errores Reed-Solomon
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;

  for (let b = 0; b < g1Blocks; b++) {
    const block = dataBytes.slice(offset, offset + g1Data);
    offset += g1Data;
    dataBlocks.push(block);
    ecBlocks.push(rsEncode(block, ecLen));
  }
  for (let b = 0; b < g2Blocks; b++) {
    const block = dataBytes.slice(offset, offset + g2Data);
    offset += g2Data;
    dataBlocks.push(block);
    ecBlocks.push(rsEncode(block, ecLen));
  }

  // Intercalar bloques de datos y bloques EC
  const interleaved = [];
  const maxDataLen = Math.max(g1Data, g2Data);
  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < dataBlocks.length; b++) {
      if (i < dataBlocks[b].length) {
        interleaved.push(dataBlocks[b][i]);
      }
    }
  }
  for (let i = 0; i < ecLen; i++) {
    for (let b = 0; b < ecBlocks.length; b++) {
      interleaved.push(ecBlocks[b][i]);
    }
  }

  return interleaved;
}

function crearMatrizQR(text) {
  const utf8Bytes = Buffer.from(text, 'utf8');
  const version = elegirVersionQR(utf8Bytes.length);
  const size = version * 4 + 17;

  const modules = Array.from({ length: size }, () => new Uint8Array(size));
  const isFunction = Array.from({ length: size }, () => new Uint8Array(size));

  const setFunctionModule = (r, c, dark) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    modules[r][c] = dark ? 1 : 0;
    isFunction[r][c] = 1;
  };

  // Patrones de búsqueda (Finder patterns 7x7 + separadores)
  const drawFinder = (row, col) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunctionModule(r, c, inOuter && (onBorder || inInner));
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Patrones de sincronización (Timing patterns)
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Patrones de alineación (Alignment patterns 5x5)
  const alignCoords = ALIGNMENT_PATTERNS[version];
  for (let i = 0; i < alignCoords.length; i++) {
    for (let j = 0; j < alignCoords.length; j++) {
      // No superponer con los 3 finder patterns
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === alignCoords.length - 1) ||
        (i === alignCoords.length - 1 && j === 0)
      ) {
        continue;
      }
      const cr = alignCoords[i];
      const cc = alignCoords[j];
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFunctionModule(cr + dr, cc + dc, dark);
        }
      }
    }
  }

  // Módulo oscuro fijo y reserva de áreas de formato (row, col)
  setFunctionModule(size - 8, 8, true);
  for (let i = 0; i < 9; i++) {
    if (!isFunction[i][8]) setFunctionModule(i, 8, false);
    if (!isFunction[8][i]) setFunctionModule(8, i, false);
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) setFunctionModule(8, size - 1 - i, false);
    if (!isFunction[size - 1 - i][8]) setFunctionModule(size - 1 - i, 8, false);
  }

  // Reserva de área de versión para v >= 7
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) {
      rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    }
    const versionBits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = ((versionBits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunctionModule(b, a, bit);
      setFunctionModule(a, b, bit);
    }
  }

  // Colocar los bits de datos y corrección de errores en zigzag
  const codewords = construirCodewords(utf8Bytes, version);
  let bitIdx = 0;
  const totalBits = codewords.length * 8;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? size - 1 - vert : vert;
        if (!isFunction[r][c]) {
          let dark = false;
          if (bitIdx < totalBits) {
            const byte = codewords[bitIdx >>> 3];
            dark = ((byte >>> (7 - (bitIdx & 7))) & 1) === 1;
            bitIdx++;
          }
          modules[r][c] = dark ? 1 : 0;
        }
      }
    }
  }

  // Aplicar máscara 0 ((r + c) % 2 === 0) y escribir bits de información de formato (Nivel L = 01, Máscara = 000)
  const mask = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c] && (r + c) % 2 === 0) {
        modules[r][c] ^= 1;
      }
    }
  }

  // Bits de formato para Nivel L (01) + máscara (000) con BCH y XOR 0x5412
  const formatData = (0b01 << 3) | mask;
  let rem = formatData;
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  }
  const formatBits = ((formatData << 10) | rem) ^ 0x5412;
  const getFormatBit = (idx) => ((formatBits >>> idx) & 1) === 1;

  // Primera copia (alrededor del patrón superior izquierdo: r=fila, c=columna)
  for (let i = 0; i <= 5; i++) setFunctionModule(i, 8, getFormatBit(i));
  setFunctionModule(7, 8, getFormatBit(6));
  setFunctionModule(8, 8, getFormatBit(7));
  setFunctionModule(8, 7, getFormatBit(8));
  for (let i = 9; i < 15; i++) setFunctionModule(8, 14 - i, getFormatBit(i));

  // Segunda copia (superior derecha e inferior izquierda: r=fila, c=columna)
  for (let i = 0; i < 8; i++) setFunctionModule(8, size - 1 - i, getFormatBit(i));
  for (let i = 8; i < 15; i++) setFunctionModule(size - 15 + i, 8, getFormatBit(i));
  setFunctionModule(size - 8, 8, true);

  return modules;
}

/**
 * Genera un SVG vectorial nítido con el Código QR listo para incrustar en el frontend
 */
export function generarQRCodeSVG(text, margin = 3) {
  const matrix = crearMatrizQR(text);
  const size = matrix.length;
  const totalSize = size + margin * 2;

  let pathData = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        pathData += `M${c + margin},${r + margin}h1v1h-1z`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges" width="210" height="210"><rect width="100%" height="100%" fill="#ffffff" rx="2"/><path d="${pathData}" fill="#0f172a"/></svg>`;
}
