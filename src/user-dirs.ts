import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR_NAME = 'react-native-tizen';

/**
 * Where downloads, sysroot mirrors and runtime builds live. Shared by every
 * project on the machine; `RN_TIZEN_CACHE_DIR` overrides it, and the CMake
 * toolchain resolves the same directory.
 */
export function cacheDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.RN_TIZEN_CACHE_DIR) return env.RN_TIZEN_CACHE_DIR;
  if (env.XDG_CACHE_HOME) return join(env.XDG_CACHE_HOME, DIR_NAME);
  return join(homedir(), '.cache', DIR_NAME);
}

/**
 * Where `rn-tizen` keeps what a cache wipe must not lose, such as the token a TV
 * issued when it paired: `$XDG_STATE_HOME/react-native-tizen`, else
 * `~/.local/state/react-native-tizen`.
 */
export function stateDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.XDG_STATE_HOME) return join(env.XDG_STATE_HOME, DIR_NAME);
  return join(homedir(), '.local', 'state', DIR_NAME);
}
