import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const hasOutputOverride = args.some((arg) => arg.startsWith('--config.directories.output'));
const outputDir = process.env.ELECTRON_BUILDER_OUTPUT || path.join(os.tmpdir(), 'smart-pdf-tagger-release');
const builderArgs = hasOutputOverride ? args : [...args, `--config.directories.output=${outputDir}`];

if (!hasOutputOverride) {
  console.log(`Electron Builder output: ${outputDir}`);
}

const result = spawnSync('electron-builder', builderArgs, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
