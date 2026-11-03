import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { BYTECODE_FILE, type AppBundle } from '../bundle/bundle-app.ts';
import { FixableError } from '../errors.ts';
import { TIZEN_PLATFORM } from '../metro/with-tizen.ts';

/** The entry Expo's dev server resolves to the app's `main`, whatever the server root. */
const VIRTUAL_ENTRY = '/.expo/.virtual-metro-entry.bundle';
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
const originSchema = z.url({ protocol: /^https?$/ });

/**
 * The URL a development build loads its bundle from: Expo's virtual entry on
 * the dev server at `origin`, for the `tizen` platform. A loopback host, which
 * the TV cannot reach, becomes `reachableHost`.
 */
export function devBundleUrl(origin: string, reachableHost: string): string {
  const parsed = originSchema.safeParse(origin);
  if (!parsed.success) {
    throw new FixableError(
      `${origin} is not a dev server address`,
      'Pass the http:// origin `expo start` prints.',
    );
  }
  const url = new URL(parsed.data);
  if (LOOPBACK.has(url.hostname)) url.hostname = reachableHost;
  url.pathname = VIRTUAL_ENTRY;
  url.search = new URLSearchParams({
    platform: TIZEN_PLATFORM,
    dev: 'true',
    minify: 'false',
  }).toString();
  return url.toString();
}

/**
 * What a package built for a dev server carries instead of a bundle: an empty
 * script, since the runtime loads `bundleUrl`, and no assets, which the dev
 * server serves.
 */
export async function devServerBundle(outDir: string): Promise<AppBundle> {
  const bundle: AppBundle = {
    javascript: join(outDir, 'index.tizen.js'),
    bytecode: join(outDir, BYTECODE_FILE),
    assetsDir: join(outDir, 'assets'),
  };
  await mkdir(bundle.assetsDir, { recursive: true });
  await writeFile(bundle.javascript, ';\n');
  await writeFile(bundle.bytecode, ';\n');
  return bundle;
}
