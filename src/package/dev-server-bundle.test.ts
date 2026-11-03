import { describe, expect, it } from 'vitest';
import { devBundleUrl } from './dev-server-bundle.ts';

describe('devBundleUrl', () => {
  it("asks Expo's dev server for its virtual entry, for the tizen platform", () => {
    expect(devBundleUrl('http://192.168.1.20:8081', '192.168.1.20')).toBe(
      'http://192.168.1.20:8081/.expo/.virtual-metro-entry.bundle?platform=tizen&dev=true&minify=false',
    );
  });

  it('replaces a loopback host the TV cannot reach', () => {
    expect(devBundleUrl('http://localhost:8081/', '192.168.5.2')).toMatch(
      /^http:\/\/192\.168\.5\.2:8081\//,
    );
    expect(devBundleUrl('http://127.0.0.1:8081', '192.168.1.20')).toMatch(
      /^http:\/\/192\.168\.1\.20:8081\//,
    );
  });

  it('refuses what is not an http origin', () => {
    expect(() => devBundleUrl('ftp://example.org', 'x')).toThrow('not a dev server address');
    expect(() => devBundleUrl('8081', 'x')).toThrow('not a dev server address');
  });
});
