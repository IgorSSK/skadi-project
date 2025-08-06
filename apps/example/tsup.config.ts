import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/dynamo-demo.ts'],
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  target: 'node18',
});
