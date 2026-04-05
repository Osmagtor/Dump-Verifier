import esbuild from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';
// @ts-expect-error Not being resolved by TypeScript but it works at runtime
import process from 'process';

const param: string = process.argv[2] ?? '';

if (param !== 'build' && param !== 'watch') {
	console.error("Invalid argument. Use 'build' or 'watch'");
	process.exit(1);
}

async function buildAll(): Promise<void> {
	// Only the renderer script is bundled for the browser side of the application.
	// This helps bundle the node_modules dependencies

	const rendererCtx: esbuild.BuildContext = await esbuild.context({
		entryPoints: ['./src/ts/renderer.ts'],
		bundle: true,
		sourcemap: param === 'watch',
		minify: param === 'build',
		outdir: 'dist/js',
		entryNames: '[name]',
		format: 'esm',
		platform: 'browser',
	});

	if (param === 'watch') {
		await rendererCtx.watch();
	} else {
		await rendererCtx.rebuild();
		await rendererCtx.dispose();
	}

	// Only the renderer script is bundled for the browser side of the application.
	// This helps bundle the node_modules dependencies

	const mainCtx: esbuild.BuildContext = await esbuild.context({
		entryPoints: ['./src/ts/main.ts', './src/ts/preload.ts'],
		bundle: false,
		sourcemap: param === 'watch',
		minify: param === 'build',
		outdir: 'dist/js',
		entryNames: '[name]',
		format: 'cjs',
		platform: 'node',
		outExtension: { '.js': '.cjs' },
	});

	if (param === 'watch') {
		await mainCtx.watch();
	} else {
		await mainCtx.rebuild();
		await mainCtx.dispose();
	}

	// Render the CSS files
	const cssCtx: esbuild.BuildContext = await esbuild.context({
		entryPoints: ['./src/scss/style.scss'],
		bundle: true,
		sourcemap: param === 'watch',
		minify: param === 'build',
		outdir: 'dist/css',
		entryNames: '[name]',
		plugins: [
			sassPlugin({
				type: 'css',
			}),
		],
		loader: {
			'.css': 'css',
			'.svg': 'file',
		},
		platform: 'browser',
	});

	if (param === 'watch') {
		await cssCtx.watch();
	} else {
		await cssCtx.rebuild();
		await cssCtx.dispose();
	}
}

buildAll().catch((): void => process.exit(1));
