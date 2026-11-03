import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cacheDir } from '../cache-dir.ts';

const TOKEN = /^[0-9A-Za-z]{1,64}$/;
const PRIVATE_DIR = 0o700;
const PRIVATE_FILE = 0o600;

/** True for a token the TV could have issued; anything else is never stored or sent. */
export function isRemoteToken(value: string): boolean {
  return TOKEN.test(value);
}

/** Where the token a TV issued to `rn-tizen` is kept, readable by this user only. */
export function tokenPath(host: string, env: NodeJS.ProcessEnv = process.env): string {
  return join(cacheDir(env), 'remote', `${host}.token`);
}

/** The saved token for the TV at `host`, or null when it never paired or the file is not a token. */
export function readToken(host: string, env: NodeJS.ProcessEnv = process.env): string | null {
  try {
    const token = readFileSync(tokenPath(host, env), 'utf8').trim();
    return isRemoteToken(token) ? token : null;
  } catch {
    return null;
  }
}

/** Saves the token the TV at `host` issued, mode 0600 in a 0700 directory. */
export function saveToken(host: string, token: string, env: NodeJS.ProcessEnv = process.env): void {
  const path = tokenPath(host, env);
  const dir = join(cacheDir(env), 'remote');
  mkdirSync(dir, { recursive: true, mode: PRIVATE_DIR });
  chmodSync(dir, PRIVATE_DIR);
  writeFileSync(path, token, { mode: PRIVATE_FILE });
  chmodSync(path, PRIVATE_FILE);
}
