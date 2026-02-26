import esbuild from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';

const minify: boolean = false;

async function buildAll(): Promise<void> {

    // Only the renderer script is bundled for the browser side of the application.
    // This helps bundle the node_modules dependencies

    const rendererCtx: esbuild.BuildContext = await esbuild.context({
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

    const mainCtx: esbuild.BuildContext = await esbuild.context({
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

    // Render the CSS files
    const cssCtx: esbuild.BuildContext = await esbuild.context({
        entryPoints: ['./src/scss/style.scss'],
        bundle: true,
        sourcemap: !minify,
        minify,
        outdir: 'dist/css',
        entryNames: '[name]',
        plugins: [
            sassPlugin({
                type: 'css', // output plain CSS
            }),
        ],
                loader: { 
            '.css': 'css',
            '.svg': 'file',
        },
        platform: 'browser',
    });
    cssCtx.watch();
}

buildAll().catch((): void => process.exit(1));