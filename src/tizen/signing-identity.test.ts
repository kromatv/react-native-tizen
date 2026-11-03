import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FixableError } from '../errors.ts';
import { writePkcs12 } from '../signing/pkcs12-write.ts';
import { testSigner } from '../signing/signing.fixtures.ts';
import { resolveSigning } from './signing-identity.ts';

const dirs: string[] = [];
const author = testSigner('Author');
const distributor = testSigner('Distributor');

function profiles(active: string, password = 'secret'): string {
  const dir = mkdtempSync(join(tmpdir(), 'rn-tizen-profiles-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'author.p12'), writePkcs12(author.key, author.chain, 'secret', 'author'));
  writeFileSync(
    join(dir, 'distributor.p12'),
    writePkcs12(distributor.key, distributor.chain, 'secret', 'distributor'),
  );
  const path = join(dir, 'profiles.xml');
  writeFileSync(
    path,
    [
      `<profiles active="${active}" version="3.1">`,
      '<profile name="TV">',
      `<profileitem ca="" distributor="0" key="${join(dir, 'author.p12')}" password="${password}" rootca=""/>`,
      `<profileitem ca="" distributor="1" key="${join(dir, 'distributor.p12')}" password="${password}" rootca=""/>`,
      '<profileitem ca="" distributor="2" key="" password="" rootca=""/>',
      '</profile>',
      '</profiles>',
    ].join('\n'),
  );
  return path;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('resolveSigning', () => {
  it('opens the active profile: one author and one distributor', async () => {
    const resolved = await resolveSigning({}, profiles('TV'));

    expect(resolved.name).toBe('TV');
    expect(resolved.identity.author.chain[0]?.subject).toContain('Author Test Signer');
    expect(resolved.identity.distributors).toHaveLength(1);
    expect(resolved.distributor.subject).toContain('Distributor Test Signer');
  });

  it('names the profiles there are when the one asked for is missing', async () => {
    await expect(resolveSigning({ profile: 'Store' }, profiles('TV'))).rejects.toThrow(
      'No signing profile named Store',
    );
  });

  it('says which password failed', async () => {
    const signing = resolveSigning({}, profiles('TV', 'wrong'));

    await expect(signing).rejects.toBeInstanceOf(FixableError);
    await expect(signing).rejects.toThrow('The author password does not open');
  });

  it('asks for a profile when none is active', async () => {
    await expect(resolveSigning({}, profiles(''))).rejects.toThrow('No active signing profile');
  });
});
