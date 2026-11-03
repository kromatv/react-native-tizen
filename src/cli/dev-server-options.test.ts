import { describe, expect, it } from 'vitest';
import { UsageError } from './command.ts';
import { chooseDevServer, devServerOrigin } from './dev-server-options.ts';

describe('chooseDevServer', () => {
  it('packages the bundle unless asked for a dev server', () => {
    expect(
      chooseDevServer({ command: 'run', enabled: undefined, port: undefined, host: '10.0.0.2' }),
    ).toBeNull();
  });

  it('points at port 8081 on the address the TV reaches this computer at', () => {
    const server = chooseDevServer({
      command: 'run',
      enabled: true,
      port: undefined,
      host: '10.0.0.2',
    });

    expect(server?.toString()).toBe('http://10.0.0.2:8081/');
  });

  it('takes the port `expo start` was given', () => {
    const server = chooseDevServer({
      command: 'run',
      enabled: true,
      port: '8090',
      host: '10.0.0.2',
    });

    expect(server?.port).toBe('8090');
  });

  it('refuses a dev server for a release build', () => {
    expect(() =>
      chooseDevServer({ command: 'run', enabled: true, port: undefined, host: null }),
    ).toThrow(UsageError);
  });

  it('refuses a port without a dev server', () => {
    expect(() =>
      chooseDevServer({ command: 'run', enabled: undefined, port: '8090', host: '10.0.0.2' }),
    ).toThrow(UsageError);
  });
});

describe('devServerOrigin', () => {
  it('brackets an IPv6 address', () => {
    expect(devServerOrigin('fe80::1', 8081).host).toBe('[fe80::1]:8081');
  });
});
