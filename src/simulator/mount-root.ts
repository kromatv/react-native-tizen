import { sep } from 'node:path';

/**
 * The deepest directory holding every one of `dirs`, which must be absolute:
 * the one mount that lets the VM see them all at their own paths.
 */
export function mountRoot(dirs: readonly string[]): string {
  const [first, ...rest] = dirs.map((dir) => dir.split(sep));
  if (first === undefined) throw new Error('mountRoot() needs a directory');
  let length = first.length;
  for (const parts of rest) {
    let shared = 0;
    while (shared < Math.min(length, parts.length) && parts[shared] === first[shared]) shared += 1;
    length = shared;
  }
  return first.slice(0, length).join(sep) || sep;
}
