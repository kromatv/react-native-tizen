import { expandKey } from './rc2.ts';

const ROTATIONS = [1, 2, 3, 5] as const;

function encryptBlock(block: Buffer, keys: Uint16Array): Buffer {
  const r = new Uint16Array([0, 1, 2, 3].map((i) => block.readUInt16LE(i * 2)));
  const word = (i: number) => r[(i + 4) % 4] ?? 0;
  let j = 0;
  const mixRound = () => {
    for (let i = 0; i < 4; i++) {
      r[i] = word(i) + (keys[j] ?? 0) + (word(i - 1) & word(i - 2)) + (~word(i - 1) & word(i - 3));
      j += 1;
      const shift = ROTATIONS[i] ?? 0;
      r[i] = (word(i) << shift) | (word(i) >>> (16 - shift));
    }
  };
  const mashRound = () => {
    for (let i = 0; i < 4; i++) r[i] = word(i) + (keys[word(i - 1) & 63] ?? 0);
  };
  for (let round = 0; round < 5; round++) mixRound();
  mashRound();
  for (let round = 0; round < 6; round++) mixRound();
  mashRound();
  for (let round = 0; round < 5; round++) mixRound();
  const out = Buffer.alloc(8);
  r.forEach((value, i) => out.writeUInt16LE(value, i * 2));
  return out;
}

/** RC2-CBC encryption with PKCS#7 padding, for building test files Node cannot. */
export function rc2CbcEncrypt(
  data: Buffer,
  key: Buffer,
  iv: Buffer,
  effectiveBits: number,
): Buffer {
  const keys = expandKey(key, effectiveBits);
  const padding = 8 - (data.length % 8);
  const plain = Buffer.concat([data, Buffer.alloc(padding, padding)]);
  const out = Buffer.alloc(plain.length);
  let previous = iv;
  for (let at = 0; at < plain.length; at += 8) {
    const mixed = Buffer.alloc(8);
    for (let i = 0; i < 8; i++) mixed[i] = (plain[at + i] ?? 0) ^ (previous[i] ?? 0);
    previous = encryptBlock(mixed, keys);
    previous.copy(out, at);
  }
  return out;
}
