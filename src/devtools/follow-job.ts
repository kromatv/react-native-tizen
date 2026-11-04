import { setTimeout as sleep } from 'node:timers/promises';
import { readJob, readLog, type Job } from './jobs.ts';

/** How {@link followJob} reads and waits, replaced in tests. */
export interface JobFollower {
  readonly write: (text: string) => void;
  readonly intervalMs: number;
  readonly sleep: (ms: number) => Promise<unknown>;
  /** Runs `stop` if this process exits first; the returned function cancels that. */
  readonly onExit: (stop: () => void) => () => void;
}

const defaultFollower: Omit<JobFollower, 'write'> = {
  intervalMs: 250,
  sleep,
  onExit: (stop) => {
    process.once('exit', stop);
    return () => process.off('exit', stop);
  },
};

function stopNow(job: Job | null): void {
  if (job?.status !== 'running' || job.pid === undefined) return;
  try {
    process.kill(-job.pid, 'SIGTERM');
  } catch {
    return;
  }
}

/**
 * Writes what a job prints as it prints it, until it ends, and returns how it
 * ended. The job stops if this process exits first.
 */
export async function followJob(
  dir: string,
  id: string,
  follower: Pick<JobFollower, 'write'> & Partial<JobFollower>,
): Promise<Job | null> {
  const { write, intervalMs, sleep: wait, onExit } = { ...defaultFollower, ...follower };
  let job = await readJob(dir, id);
  const cancel = onExit(() => stopNow(job));
  try {
    let from = 0;
    for (;;) {
      const log = await readLog(dir, id, from);
      if (log.text !== '') write(log.text);
      from = log.next;
      job = await readJob(dir, id);
      if (job?.status !== 'running' && log.text === '') return job;
      await wait(intervalMs);
    }
  } finally {
    cancel();
  }
}
