import { describe, expect, it } from 'vitest';
import { painter } from '../paint.ts';
import { formatLogEntry, isAtLeast, parseLogLine } from './log-line.ts';

const NINE_AM = new Date(2026, 10, 2, 9, 5, 3);

describe('parseLogLine', () => {
  it('reads the level and message the host streams', () => {
    expect(parseLogLine('{"message":"Running \\"main\\"","level":"info"}')).toEqual({
      level: 'info',
      message: 'Running "main"',
    });
  });

  it('keeps a line that is not JSON as an info message', () => {
    expect(parseLogLine('Segmentation fault')).toEqual({
      level: 'info',
      message: 'Segmentation fault',
    });
  });

  it('treats an unknown level as info', () => {
    expect(parseLogLine('{"level":"fatal","message":"x"}').level).toBe('info');
  });

  it('keeps JSON without a message as raw text', () => {
    expect(parseLogLine('{"level":"warn"}')).toEqual({
      level: 'info',
      message: '{"level":"warn"}',
    });
  });
});

describe('formatLogEntry', () => {
  const plain = painter(false);

  it('prints the time, the level and the message on one line', () => {
    expect(formatLogEntry({ level: 'warn', message: 'Slow frame' }, NINE_AM, plain)).toBe(
      '09:05:03 warn  Slow frame',
    );
  });

  it('indents the continuation lines of a stack trace under the message', () => {
    const entry = { level: 'error' as const, message: 'TypeError: x\n    at App (app.tsx:3)' };

    expect(formatLogEntry(entry, NINE_AM, plain)).toBe(
      '09:05:03 error TypeError: x\n                   at App (app.tsx:3)',
    );
  });

  it('colors the level when colors are on', () => {
    const line = formatLogEntry({ level: 'error', message: 'boom' }, NINE_AM, painter(true));

    expect(line).toContain('\u001b[31merror\u001b[39m');
  });
});

describe('isAtLeast', () => {
  it('lets a louder level through a quieter minimum', () => {
    expect(isAtLeast('error', 'info')).toBe(true);
    expect(isAtLeast('info', 'info')).toBe(true);
  });

  it('holds back a quieter level', () => {
    expect(isAtLeast('debug', 'info')).toBe(false);
  });
});
