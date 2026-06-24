import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

await mkdir('.train', { recursive: true });

await build({
  entryPoints: ['scripts/train-ai.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: '.train/train-ai.mjs',
  logLevel: 'silent',
});

await import(pathToFileURL(`${process.cwd()}/.train/train-ai.mjs`).href);
