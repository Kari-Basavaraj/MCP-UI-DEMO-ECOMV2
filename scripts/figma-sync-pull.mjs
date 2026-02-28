#!/usr/bin/env node
import { appendRolloutLog, runCommand } from './figma-lib.mjs';

function runOrThrow(command, args) {
  const result = runCommand(command, args, { capture: false });
  if (!result.ok) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

async function main() {
  runOrThrow('npm', ['run', 'figma:pull:variables']);
  runOrThrow('npm', ['run', 'figma:normalize:variables']);
  runOrThrow('npm', ['run', 'figma:generate:tokens']);
  runOrThrow('npm', ['run', 'tokens:sync']);
  runOrThrow('npm', ['run', 'figma:verify']);
  appendRolloutLog('figma:sync:pull completed');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
