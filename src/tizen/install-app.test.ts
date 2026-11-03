import { describe, expect, it } from 'vitest';
import { installFailureReason } from './install-app.ts';

describe('installFailureReason', () => {
  it('keeps the reason a TV gives for refusing a package', () => {
    const output = [
      'app_id[org.rntizen.example] installing[18]',
      'app_id[org.rntizen.example] install failed[118, -12], reason: Check certificate error : :Invalid signature. Signed with wrong key, changed signature file or changed package file.:<-4>',
      'spend time for wascmd is [3805]ms',
    ].join('\n');

    expect(installFailureReason(output)).toBe(
      'Check certificate error : :Invalid signature. Signed with wrong key, changed signature file or changed package file.:<-4>',
    );
  });

  it('falls back to the last line printed', () => {
    expect(installFailureReason('first\nsomething broke\n\n')).toBe('something broke');
    expect(installFailureReason('')).toBe('no output');
  });
});
