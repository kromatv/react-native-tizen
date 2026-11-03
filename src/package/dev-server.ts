import { TIZEN_PLATFORM } from '../metro/with-tizen.ts';

/** The port `expo start` serves on unless given `--port`. */
export const DEFAULT_DEV_SERVER_PORT = 8081;

/** The entry Expo's dev server resolves to the app's main for any platform. */
const VIRTUAL_ENTRY = '/.expo/.virtual-metro-entry.bundle';

/**
 * The URL an app in development loads its bundle from on the dev server at
 * `origin`: Expo's virtual entry, asked for as Android's DevServerHelper asks,
 * for the `tizen` platform and Hermes. The runtime finds the server, the
 * packager socket and the HMR endpoint from it.
 */
export function devServerBundleUrl(origin: URL, packageId: string): string {
  const url = new URL(VIRTUAL_ENTRY, origin);
  url.search = new URLSearchParams({
    platform: TIZEN_PLATFORM,
    dev: 'true',
    lazy: 'true',
    minify: 'false',
    app: packageId,
    modulesOnly: 'false',
    runModule: 'true',
    'transform.engine': 'hermes',
    unstable_transformProfile: 'hermes-stable',
  }).toString();
  return url.toString();
}
