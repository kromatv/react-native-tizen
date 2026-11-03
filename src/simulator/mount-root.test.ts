import { describe, expect, it } from 'vitest';
import { FixableError } from '../errors.ts';
import { mountRoot, requireNarrowMount } from './mount-root.ts';

describe('mountRoot', () => {
  it('is the repository root for a workspace package and its hoisted react-native', () => {
    expect(
      mountRoot([
        '/repo/packages/react-native-tizen',
        '/repo/node_modules/.bun/react-native-tvos@0.88.0/node_modules/react-native-tvos',
      ]),
    ).toBe('/repo');
  });

  it('is the app node_modules for an installed package', () => {
    expect(
      mountRoot([
        '/app/node_modules/@kromatv/react-native-tizen',
        '/app/node_modules/react-native',
      ]),
    ).toBe('/app/node_modules');
  });

  it('does not stop inside a directory name both paths start with', () => {
    expect(mountRoot(['/work/app', '/work/app-tools/lib'])).toBe('/work');
  });

  it('is the filesystem root when the paths share nothing', () => {
    expect(mountRoot(['/a/b', '/c/d'])).toBe('/');
  });
});

describe('requireNarrowMount', () => {
  it('lets a project inside the home directory through', () => {
    expect(() => requireNarrowMount('/Users/ada/work/app', '/Users/ada')).not.toThrow();
  });

  it('refuses the filesystem root', () => {
    expect(() => requireNarrowMount('/', '/Users/ada')).toThrow(FixableError);
  });

  it('refuses the home directory itself', () => {
    expect(() => requireNarrowMount('/Users/ada', '/Users/ada')).toThrow(
      'The simulator would mount /Users/ada, which holds /Users/ada',
    );
  });

  it('refuses a directory that holds the home directory', () => {
    expect(() => requireNarrowMount('/Users', '/Users/ada')).toThrow(FixableError);
  });

  it('lets a directory outside the home directory through', () => {
    expect(() => requireNarrowMount('/opt/apps/tv', '/Users/ada')).not.toThrow();
  });
});
