import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: process.env.NODE_ENV === 'production',
  target: 'node18',
  outDir: 'dist',
  external: ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb'],
  banner: {
    js: '/* @skadhi/dynamo - Type-safe DynamoDB document mapper */',
  },
});
