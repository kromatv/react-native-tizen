import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import * as der from './der.ts';
import { OID, Pkcs12PasswordError, readPkcs12 } from './pkcs12.ts';
import { bmpPassword, KDF_PURPOSE, pkcs12Kdf } from './pkcs12-kdf.ts';
import { writePkcs12 } from './pkcs12-write.ts';
import { rc2CbcEncrypt } from './rc2-encrypt.fixtures.ts';
import { testSigner } from './signing.fixtures.ts';

const signer = testSigner('Author');

describe('pkcs12Kdf', () => {
  it.each([
    [
      'smeg',
      '0a58cf64530d823f',
      1,
      KDF_PURPOSE.key,
      24,
      '8aaae6297b6cb04642ab5b077851284eb7128f1a2a7fbca3',
    ],
    ['smeg', '0a58cf64530d823f', 1, KDF_PURPOSE.iv, 8, '79993dfe048d3b76'],
    [
      'smeg',
      '3d83c0e4546ac140',
      1,
      KDF_PURPOSE.mac,
      20,
      '8d967d88f6caa9d714800ab3d48051d63f73a312',
    ],
    [
      'queeg',
      '05dec959acff72f7',
      1000,
      KDF_PURPOSE.key,
      24,
      'ed2034e36328830ff09df1e1a07dd357185dac0d4f9eb3d4',
    ],
  ])(
    'derives the published vector for %s, salt %s',
    (password, salt, iterations, purpose, length, expected) => {
      const derived = pkcs12Kdf(
        'sha1',
        bmpPassword(password),
        Buffer.from(salt, 'hex'),
        iterations,
        purpose,
        length,
      );

      expect(derived.toString('hex')).toBe(expected);
    },
  );
});

describe('readPkcs12', () => {
  it('opens what writePkcs12 wrote: the key and its chain', () => {
    const file = writePkcs12(signer.key, signer.chain, 'secret', 'author');

    const contents = readPkcs12(file, 'secret');

    expect(contents.certificates.map((certificate) => certificate.raw)).toEqual(
      signer.chain.map((certificate) => certificate.raw),
    );
    expect(contents.certificates[0]?.checkPrivateKey(contents.key)).toBe(true);
  });

  it('refuses the wrong password', () => {
    const file = writePkcs12(signer.key, signer.chain, 'secret', 'author');

    expect(() => readPkcs12(file, 'guess')).toThrow(Pkcs12PasswordError);
  });

  it('reads certificates encrypted with 40-bit RC2, as Samsung issues them', () => {
    const password = 'secret';
    const salt = randomBytes(8);
    const secret = bmpPassword(password);
    const certificates = der.sequence(
      der.sequence(
        der.oid(OID.certBag),
        der.explicit(
          0,
          der.sequence(
            der.oid(OID.x509Certificate),
            der.explicit(0, der.octets(signer.chain[0]?.raw ?? Buffer.alloc(0))),
          ),
        ),
      ),
    );
    const encrypted = rc2CbcEncrypt(
      certificates,
      pkcs12Kdf('sha1', secret, salt, 2048, KDF_PURPOSE.key, 5),
      pkcs12Kdf('sha1', secret, salt, 2048, KDF_PURPOSE.iv, 8),
      40,
    );
    const algorithm = der.sequence(
      der.oid(OID.pbeSha1Rc2_40),
      der.sequence(der.octets(salt), der.integer(2048)),
    );
    const encryptedData = der.sequence(
      der.oid(OID.encryptedData),
      der.explicit(
        0,
        der.sequence(
          der.integer(0),
          der.sequence(der.oid(OID.data), algorithm, der.encode(0x80, encrypted)),
        ),
      ),
    );
    const keyBag = der.sequence(
      der.oid(OID.keyBag),
      der.explicit(0, signer.key.export({ format: 'der', type: 'pkcs8' })),
    );
    const keyContent = der.sequence(
      der.oid(OID.data),
      der.explicit(0, der.octets(der.sequence(keyBag))),
    );
    const file = der.sequence(
      der.integer(3),
      der.sequence(
        der.oid(OID.data),
        der.explicit(0, der.octets(der.sequence(encryptedData, keyContent))),
      ),
    );

    const contents = readPkcs12(file, password);

    expect(contents.certificates[0]?.raw.equals(signer.chain[0]?.raw ?? Buffer.alloc(0))).toBe(
      true,
    );
  });
});
