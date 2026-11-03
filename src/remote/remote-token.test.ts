import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readToken, saveToken, tokenPath } from './remote-token.ts';

const dirs: string[] = [];

function cacheEnv(): NodeJS.ProcessEnv {
  const dir = mkdtempSync(join(tmpdir(), 'rn-tizen-token-'));
  dirs.push(dir);
  return { RN_TIZEN_CACHE_DIR: dir };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('remote tokens', () => {
  it('saves a token readable by this user only and reads it back', () => {
    const env = cacheEnv();

    saveToken('192.168.1.107', '87654321', env);

    expect(readToken('192.168.1.107', env)).toBe('87654321');
    expect(statSync(tokenPath('192.168.1.107', env)).mode & 0o777).toBe(0o600);
    expect(statSync(join(env.RN_TIZEN_CACHE_DIR ?? '', 'remote')).mode & 0o777).toBe(0o700);
  });

  it('reads nothing for a TV that never paired', () => {
    expect(readToken('192.168.1.108', cacheEnv())).toBeNull();
  });

  it('reads nothing from a file that does not hold a token', () => {
    const env = cacheEnv();
    saveToken('192.168.1.107', '1', env);

    writeFileSync(tokenPath('192.168.1.107', env), 'not a token&x=1');

    expect(readToken('192.168.1.107', env)).toBeNull();
  });
});
