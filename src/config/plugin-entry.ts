import { join, resolve } from 'node:path';
import { PACKAGE_ROOT } from '../package-paths.ts';
import { TIZEN_PLUGIN } from './tizen-settings.ts';

const PLUGIN_FILES = new Set([
  join(PACKAGE_ROOT, 'app.plugin.js'),
  join(PACKAGE_ROOT, 'src', 'config', 'config-plugin.ts'),
]);

/**
 * This package's plugin by name, or by a path to its `app.plugin.js` or to the
 * source the example in this repository lists.
 */
export function isTizenPluginEntry(root: string, name: string): boolean {
  return name === TIZEN_PLUGIN || (name.startsWith('.') && PLUGIN_FILES.has(resolve(root, name)));
}
