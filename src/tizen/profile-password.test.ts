import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { profilePassword } from './profile-password.ts';

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('profilePassword', () => {
  it('takes a password written in the profile as it is, and none for an empty field', async () => {
    expect(await profilePassword('secret')).toBe('secret');
    expect(await profilePassword('')).toBeNull();
  });

  it('reads a .pwd file that exists', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rn-tizen-pwd-'));
    dirs.push(dir);
    const file = join(dir, 'author.pwd');
    writeFileSync(file, 'from-file\n');

    expect(await profilePassword(file, 'linux')).toBe('from-file');
  });

  it('finds no password for a missing .pwd file off macOS, nor in a keychain without it', async () => {
    const missing = join(tmpdir(), 'rn-tizen-missing', 'nobody.pwd');

    expect(await profilePassword(missing, 'linux')).toBeNull();
    expect(await profilePassword(missing, 'darwin')).toBeNull();
  });
});
