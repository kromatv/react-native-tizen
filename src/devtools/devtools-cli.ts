import { z } from 'zod';
import { CommandInputError, jobPageUrl, planCommand } from './devtools-commands.ts';
import { jobsDir, listJobs, startJob, stopJob } from './jobs.ts';

interface OutputLine {
  readonly type: 'text';
  readonly text: string;
  readonly level: 'info' | 'warning' | 'error';
  readonly url?: string;
}

const argvSchema = z.tuple([z.string().min(1), z.string().max(8192), z.url()]);

function print(lines: readonly OutputLine[]): void {
  process.stdout.write(`${JSON.stringify(lines)}\n`);
}

/**
 * What Expo runs for a command under shift+m: `node <entry> <command> <args>
 * <dev server>`. Expo kills it after ten seconds, so it starts the work as a
 * detached job and prints where to follow it.
 */
async function main(argv: readonly string[]): Promise<void> {
  const [command, argsJson, devServer] = argvSchema.parse(argv);
  const plan = await planCommand(command, JSON.parse(argsJson), devServer);
  const dir = jobsDir();
  if (plan.exclusive) {
    const running = (await listJobs(dir)).filter(
      (job) => job.kind === plan.kind && job.status === 'running',
    );
    await Promise.all(running.map((job) => stopJob(dir, job.id)));
  }
  const job = await startJob(dir, {
    kind: plan.kind,
    title: plan.title,
    args: [...plan.args],
    cwd: process.cwd(),
  });
  const url = jobPageUrl(devServer, job.id);
  print([{ type: 'text', level: 'info', text: `${plan.title} started; progress and logs`, url }]);
}

function failure(error: unknown): string {
  if (error instanceof CommandInputError || error instanceof z.ZodError) return error.message;
  const reason = error instanceof Error ? error.message : String(error);
  return `rn-tizen could not start the command: ${reason}`;
}

main(process.argv.slice(2)).catch((error: unknown) => {
  print([{ type: 'text', level: 'error', text: failure(error) }]);
  process.exitCode = 1;
});
