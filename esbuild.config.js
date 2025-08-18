import esbuild from 'esbuild';

const minify = false;

async function buildAll() {

    // Only the renderer script is bundled for the browser side of the application.
    // This helps bundle the node_modules dependencies

    const rendererCtx = await esbuild.context({
        entryPoints: ['./src/ts/renderer.ts'],
        bundle: true,
        sourcemap: !minify,
        minify,
        outdir: 'dist/js',
        entryNames: '[name]',
        format: 'esm',
        platform: 'browser',
    });
    rendererCtx.watch();

    // Only the renderer script is bundled for the browser side of the application.
    // This helps bundle the node_modules dependencies

    const mainCtx = await esbuild.context({
        entryPoints: ['./src/ts/main.ts', './src/ts/preload.ts'],
        bundle: false,
        sourcemap: !minify,
        minify,
        outdir: 'dist/js',
        entryNames: '[name]',
        format: 'cjs',
        platform: 'node',
        outExtension: { '.js': '.cjs' }, // <-- Add this line
    });
    mainCtx.watch();
}

buildAll().catch(() => process.exit(1));

// Prevent Node.js from exiting so watch mode works
setInterval(() => { }, 1 << 30);