import esbuild from 'esbuild';

async function build() {
  await esbuild.build({
    entryPoints: ['server.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outfile: 'dist/server.js',
    sourcemap: false,
    banner: {
      js: '// HealthMate AI Server Bundle',
    },
  });
  console.log('[Build] Server successfully bundled to dist/server.js');
}

build().catch((err) => {
  console.error('[Build] Server bundle failure:', err);
  process.exit(1);
});
