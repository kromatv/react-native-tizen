import { DEFAULT_DEV_SERVER_PORT } from '../package/dev-server.ts';
import { UsageError, type OptionSpecs } from './command.ts';
import { parsePort } from './log-options.ts';

/** The options that point a development build at `expo start` on this computer. */
export const DEV_SERVER_OPTIONS = {
  'dev-server': {
    type: 'boolean',
    description:
      'Load the bundle from `expo start` on this computer instead of packaging it: Fast Refresh, r to reload, LogBox and logs in its terminal',
  },
  'dev-server-port': {
    type: 'string',
    placeholder: '<port>',
    description: `The port \`expo start\` listens on (default: ${DEFAULT_DEV_SERVER_PORT})`,
  },
} as const satisfies OptionSpecs;

interface DevServerChoice {
  readonly command: string;
  readonly enabled: boolean | undefined;
  readonly port: string | undefined;
  /** The address the TV reaches this computer at, or null for a release build. */
  readonly host: string | null;
}

/** The dev server at `host`, the address the TV reaches this computer at, and `port`. */
export function devServerOrigin(host: string, port: number): URL {
  const origin = new URL('http://localhost');
  origin.hostname = host.includes(':') ? '[' + host + ']' : host;
  origin.port = String(port);
  return origin;
}

/** The dev server a development build loads its bundle from, or null to package the bundle. */
export function chooseDevServer(choice: DevServerChoice): URL | null {
  if (choice.enabled !== true) {
    if (choice.port !== undefined) {
      throw new UsageError('--dev-server-port needs --dev-server', choice.command);
    }
    return null;
  }
  if (choice.host === null) {
    throw new UsageError('--dev-server makes a development build: drop --release', choice.command);
  }
  return devServerOrigin(choice.host, parseDevServerPort(choice.port, choice.command));
}

/** Reads `--dev-server-port`. */
export function parseDevServerPort(value: string | undefined, command: string): number {
  return parsePort(value, '--dev-server-port', command, DEFAULT_DEV_SERVER_PORT);
}
