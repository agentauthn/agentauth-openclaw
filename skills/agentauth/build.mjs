import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.mjs'],
  outfile: 'scripts/cli.cjs',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  treeShaking: true,
  minify: true,
  sourcemap: false,
});
