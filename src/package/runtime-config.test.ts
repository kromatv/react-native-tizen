import { describe, expect, it } from 'vitest';
import type { TvFeatures } from '../config/tv-features.ts';
import { runtimeConfig } from './runtime-config.ts';

const features: TvFeatures = {
  voice: null,
  preview: null,
  resolution: '1080p',
  backgroundMedia: false,
  pictureInPicture: false,
};
const app = { packageId: 'org.example.app', features };

describe('runtimeConfig', () => {
  it('marks a development build and points it at the log listener', () => {
    expect(
      runtimeConfig({ file: 'index.tizen.hbc' }, { host: '192.168.1.20', port: 8099 }, app),
    ).toEqual({
      appKey: 'main',
      bundleFile: 'index.tizen.hbc',
      development: true,
      log: { host: '192.168.1.20', port: 8099 },
      resolution: '1080p',
      backgroundMedia: false,
    });
  });

  it('marks a release build, which streams no logs', () => {
    expect(runtimeConfig({ file: 'index.tizen.hbc' }, null, app)).toEqual({
      appKey: 'main',
      bundleFile: 'index.tizen.hbc',
      development: false,
      resolution: '1080p',
      backgroundMedia: false,
    });
  });

  it('points a build at a dev server, which makes it a development build', () => {
    const url = 'http://192.168.1.20:8081/.expo/.virtual-metro-entry.bundle?platform=tizen';

    expect(runtimeConfig({ url }, null, app)).toEqual({
      appKey: 'main',
      bundleUrl: url,
      development: true,
      resolution: '1080p',
      backgroundMedia: false,
    });
  });

  it('refuses a dev server the host cannot fetch from', () => {
    expect(() => runtimeConfig({ url: 'ws://192.168.1.20:8081/x.bundle' }, null, app)).toThrow();
  });

  it('refuses a port the host would refuse', () => {
    expect(() =>
      runtimeConfig({ file: 'index.tizen.hbc' }, { host: 'h', port: 70000 }, app),
    ).toThrow();
  });

  it('tells the host and the shell which TV features to start', () => {
    const config = runtimeConfig({ file: 'index.tizen.hbc' }, null, {
      packageId: 'org.example.app',
      features: {
        ...features,
        voice: { searchUrl: 'myapp://search?q={query}' },
        preview: { kind: 'personal', refreshMinutes: 30 },
        resolution: '4k',
        backgroundMedia: true,
      },
    });

    expect(config).toMatchObject({
      resolution: '4k',
      backgroundMedia: true,
      voice: { searchUrl: 'myapp://search?q={query}' },
      preview: { kind: 'personal', refreshMinutes: 30, service: 'org.example.app.preview' },
    });
  });

  it('turns voice on with no search URL', () => {
    const config = runtimeConfig({ file: 'index.tizen.hbc' }, null, {
      ...app,
      features: { ...features, voice: { searchUrl: null } },
    });

    expect(config.voice).toEqual({});
  });
});
