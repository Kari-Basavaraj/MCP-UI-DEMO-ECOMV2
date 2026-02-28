#!/usr/bin/env node
import { appendRolloutLog, runCommand } from './figma-lib.mjs';

function runOrThrow(command, args) {
  const result = runCommand(command, args, { capture: false });
  if (!result.ok) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

async function main() {
  const apply = process.argv.includes('--apply');

  runOrThrow('npm', ['run', 'figma:normalize:variables']);
  runOrThrow('npm', ['run', 'figma:generate:tokens']);
  runOrThrow('npm', ['run', 'tokens:sync']);

  if (apply) {
    runOrThrow('npm', ['run', 'figma:push:variables', '--', '--apply']);
  } else {
    runOrThrow('npm', ['run', 'figma:push:variables']);
  }

  runOrThrow('npm', ['run', 'figma:verify']);
  appendRolloutLog(`figma:sync:push completed mode=${apply ? 'apply' : 'dry-run'}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
