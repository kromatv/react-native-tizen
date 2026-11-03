import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cacheDir, stateDir } from './user-dirs.ts';

describe('cacheDir', () => {
  it('takes RN_TIZEN_CACHE_DIR as it is', () => {
    expect(cacheDir({ RN_TIZEN_CACHE_DIR: '/cache', XDG_CACHE_HOME: '/xdg' })).toBe('/cache');
  });

  it('lives under XDG_CACHE_HOME when it is set', () => {
    expect(cacheDir({ XDG_CACHE_HOME: '/xdg' })).toBe(join('/xdg', 'react-native-tizen'));
  });

  it('defaults to ~/.cache/react-native-tizen', () => {
    expect(cacheDir({})).toBe(join(homedir(), '.cache', 'react-native-tizen'));
  });
});

describe('stateDir', () => {
  it('lives under XDG_STATE_HOME when it is set', () => {
    expect(stateDir({ XDG_STATE_HOME: '/state' })).toBe(join('/state', 'react-native-tizen'));
  });

  it('defaults to ~/.local/state/react-native-tizen', () => {
    expect(stateDir({})).toBe(join(homedir(), '.local', 'state', 'react-native-tizen'));
  });
});
