import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import type { AppProject } from '../app/app-project.ts';
import { cacheDir } from '../cache-dir.ts';
import { bundledImplementations } from '../libraries/bundled-implementations.ts';
import { findNativeLibraries } from '../libraries/find-native-libraries.ts';
import { prepareNativeLibraries } from '../libraries/prepare-native-libraries.ts';
import { ensureCodegen } from '../runtime/build-runtime.ts';
import { ninjaProgress } from '../runtime/ninja-progress.ts';
import type { Task } from '../task.ts';
import { guestRun } from './lima.ts';
import { RUNTIME_KEY, simulatorRuntimeKey } from './runtime-key.ts';
import { guestScript } from './simulator.ts';

const BUILD_WAIT_LINE = 'Waiting for another simulator build to finish...';

/** The key of the runtime build `app` runs on: its react-native, Expo core and native libraries. */
export function appRuntimeKey(app: AppProject): string {
  const { reactNative, expoModulesCore, expoModulesJsi } = app.packages;
  const bundled = bundledImplementations();
  const libraries = findNativeLibraries(app.root, [reactNative.dir]).libraries.map((library) => ({
    name: library.name,
    version: library.version,
    dir: realpathSync(library.dir),
    implementation: library.declaredTizenCMake ?? bundled.get(library.name) ?? null,
  }));
  const packages = [reactNative, expoModulesCore, expoModulesJsi].map((pkg) => ({
    ...pkg,
    dir: realpathSync(pkg.dir),
  }));
  return simulatorRuntimeKey({ packages, libraries });
}

/**
 * Builds `libreact-native-tizen.so` and the launcher for the simulator from
 * this package's runtime/, against the app's react-native and with its native
 * libraries, in the build those libraries key, and returns the key.
 * Incremental. Apps with the same libraries share the build, so this waits
 * for one already running in it, and calls `onWait` when it does.
 */
export async function buildSimulatorRuntime(
  task: Task,
  app: AppProject,
  onWait: () => void,
): Promise<string> {
  const { reactNative, expoModulesCore, expoModulesJsi } = app.packages;
  const key = appRuntimeKey(app);
  const root = join(cacheDir(), 'runtime', `${reactNative.name}-${reactNative.version}-simulator`);
  const codegen = join(root, 'codegen');
  task.progress('codegen');
  await ensureCodegen(reactNative, codegen);
  const nativeLibraries = await prepareNativeLibraries(
    app.root,
    reactNative,
    join(root, 'runtimes', key),
  );
  task.progress('compiling');
  const env = {
    RN_TIZEN_SIMULATOR_RUNTIME: key,
    RN_TIZEN_CACHE_DIR: cacheDir(),
    REACT_NATIVE_DIR: realpathSync(reactNative.dir),
    RN_TIZEN_CODEGEN_DIR: codegen,
    EXPO_MODULES_CORE_DIR: realpathSync(expoModulesCore.dir),
    EXPO_MODULES_JSI_DIR: realpathSync(expoModulesJsi.dir),
    RN_TIZEN_LIBRARIES_FILE: nativeLibraries.file,
  };
  await guestRun(task, ['bash', guestScript('build')], env, (line) => {
    if (line === BUILD_WAIT_LINE) {
      task.progress('waiting for another build');
      onWait();
      return;
    }
    const progress = ninjaProgress(line);
    if (progress !== null) task.progress(progress);
  });
  return key;
}

/** Removes every runtime build no instance runs, and returns their keys. */
export async function cleanSimulatorRuntimes(task: Task): Promise<string[]> {
  const output = await guestRun(task, ['bash', guestScript('clean')]);
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => RUNTIME_KEY.test(line) || line === 'runtime');
}
