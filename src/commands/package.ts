import { statSync } from 'node:fs';
import {
  COMMON_OPTIONS,
  ENTRY_OPTIONS,
  parseCommandArgs,
  PROJECT_OPTIONS,
  type Command,
} from '../cli/command.ts';
import { formatPath, formatSize } from '../cli/format.ts';
import { packageSteps } from '../pipeline/package-steps.ts';
import { BUILD_OPTIONS, findDevice, openBuild, settleBuild } from './build-options.ts';

const OPTIONS = { ...BUILD_OPTIONS, ...PROJECT_OPTIONS, ...ENTRY_OPTIONS, ...COMMON_OPTIONS };

/** `rn-tizen package`: builds a signed `.tpk` of the app. */
export const packageCommand: Command = {
  name: 'package',
  summary: 'Build a signed .tpk of the app, native runtime included',
  options: OPTIONS,
  examples: [
    'rn-tizen package',
    'rn-tizen package --device 192.168.1.107',
    'rn-tizen package --release --profile Store',
  ],
  async run(args, context) {
    const flags = parseCommandArgs('package', args, OPTIONS);
    const base = openBuild(flags, context);
    const device = flags.device === undefined ? null : await findDevice(base, flags.device);
    const build = settleBuild('package', flags, base, device, context.cwd);
    const { reporter } = build;
    const tpk = await packageSteps(reporter, { ...build, profile: flags.profile });
    reporter.line();
    const size = formatSize(statSync(tpk).size);
    reporter.line(
      `${reporter.paint(['green', 'bold'], 'Package')} ${formatPath(tpk, context.cwd)} ${reporter.paint('gray', size)}`,
    );
    const target = device === null ? '<tv ip>' : device.serial;
    reporter.note(`Install and launch it with: rn-tizen run --device ${target}`);
  },
};
