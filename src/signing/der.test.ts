import { describe, expect, it } from 'vitest';
import * as der from './der.ts';
import { childrenOf, oidOf, readDer, smallIntegerOf } from './der-reader.ts';

describe('der', () => {
  it('writes an integer in its shortest form, with a zero before a high bit', () => {
    expect(der.integer(Buffer.from([0, 0, 0x7f])).toString('hex')).toBe('02017f');
    expect(der.integer(Buffer.from([0x80])).toString('hex')).toBe('02020080');
    expect(der.integer(0).toString('hex')).toBe('020100');
  });

  it('reads back object identifiers, integers and long lengths', () => {
    const value = der.sequence(
      der.oid('1.2.840.113549.1.12.1.6'),
      der.integer(2048),
      der.octets(Buffer.alloc(300)),
    );

    const [oid, iterations, octets] = childrenOf(readDer(value));

    expect(oidOf(oid)).toBe('1.2.840.113549.1.12.1.6');
    expect(smallIntegerOf(iterations)).toBe(2048);
    expect(octets?.contents.length).toBe(300);
  });

  it('refuses a length past the end of the data', () => {
    expect(() => readDer(Buffer.from([0x30, 0x05, 0x00]))).toThrow('past the end');
  });
});
