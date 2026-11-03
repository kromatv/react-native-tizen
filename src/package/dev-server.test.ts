import { describe, expect, it } from 'vitest';
import { devServerBundleUrl } from './dev-server.ts';

describe('devServerBundleUrl', () => {
  it("asks Expo's dev server for the app's entry, for Tizen and Hermes", () => {
    const url = new URL(devServerBundleUrl(new URL('http://192.168.1.20:8081'), 'org.example.app'));

    expect(url.origin).toBe('http://192.168.1.20:8081');
    expect(url.pathname).toBe('/.expo/.virtual-metro-entry.bundle');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      platform: 'tizen',
      dev: 'true',
      lazy: 'true',
      minify: 'false',
      app: 'org.example.app',
      modulesOnly: 'false',
      runModule: 'true',
      'transform.engine': 'hermes',
      unstable_transformProfile: 'hermes-stable',
    });
  });
});
