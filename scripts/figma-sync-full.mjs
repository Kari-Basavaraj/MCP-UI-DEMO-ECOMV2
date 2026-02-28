#!/usr/bin/env node
import { PATHS, appendRolloutLog, readJson, runCommand } from './figma-lib.mjs';

function runOrThrow(command, args) {
  const result = runCommand(command, args, { capture: false });
  if (!result.ok) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

async function main() {
  const applyPush = process.argv.includes('--apply-push');
  const applyPublish = process.argv.includes('--apply-publish');

  runOrThrow('npm', ['run', 'figma:probe']);

  const probe = readJson(PATHS.probeJson, null);
  const route = probe?.selectedRoute || 'Route C';

  runOrThrow('npm', ['run', 'figma:sync:pull']);
  runOrThrow('npm', ['run', 'figma:codeconnect:generate']);
  runOrThrow('npm', ['run', 'figma:codeconnect:verify']);

  if (applyPublish) {
    runOrThrow('npm', ['run', 'figma:codeconnect:publish', '--', '--apply']);
  } else {
    runOrThrow('npm', ['run', 'figma:codeconnect:publish']);
  }

  if (applyPush) {
    if (route === 'Route B') {
      runOrThrow('npm', ['run', 'figma:sync:push', '--', '--apply']);
    } else {
      console.log(`Skipping apply push because selected route is ${route}`);
      runOrThrow('npm', ['run', 'figma:sync:push']);
    }
  } else {
    runOrThrow('npm', ['run', 'figma:sync:push']);
  }

  appendRolloutLog(`figma:sync:full completed route=${route} applyPush=${applyPush} applyPublish=${applyPublish}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
