import Verifier from '../classes/verifier.js';
import Downloader from '../classes/downloader.js';
import Logger from '../classes/logger.js';
import $ from 'jquery';
import tippy from 'tippy.js';
import JSConfetti from 'js-confetti';
import SelectGroup from '../classes/select-group.js';
import type { systemData } from '../types.js';
import {
	checkUpdates,
	toggleForm,
	initializeThemeVariables,
	toggleArtwork,
} from './misc.js';
import API from '../classes/api.js';

const logger: Logger = new Logger('#console');
const downloader: Downloader = new Downloader(logger);
const selectorGroup: SelectGroup = new SelectGroup('#system', '#game');
const api: API = new API(logger);

let loading: any;
let platformIdLast: number | null = null;
let apiExists: boolean = false;

// LISTENERS

// Listens for the progress event from the main process and update the progress bar in the console
(window as any).electron.ipcRenderer.on(
	'progress',
	(_: any, percentage: any): void => {
		// Update the percentage

		const percent: JQuery<HTMLElement> = $('#console .info__percentage').last();
		percent.text(percentage);

		// Update the progress bar

		const spans: JQuery<HTMLElement> = $('#console .progress-bar')
			.last()
			.find('span');
		spans
			.slice(0, Math.floor(spans.length * (percentage / 100)))
			.each((_: number, span: HTMLElement): void => {
				const c: string = $(span).attr('class') ?? '';
				if (!c.includes('success')) $(span).attr('class', c + '-success');
			});

		// Update the loading spinner

		const spinnerFrames: string[] = [
			'⠋',
			'⠙',
			'⠹',
			'⠸',
			'⠼',
			'⠴',
			'⠦',
			'⠧',
			'⠇',
			'⠏',
		];
		let spinnerIndex: number = 0;

		if (!loading) {
			loading = setInterval((): void => {
				$('#console .info__loading').last().text(spinnerFrames[spinnerIndex]);
				spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
			}, 100);
		} else if (percentage >= 100) {
			clearInterval(loading);
			loading = null;

			const spinner: JQuery<HTMLElement> = $('#console .info__loading').last();
			spinner.text('⠿');
			spinner.attr('class', spinner.attr('class') + '-success');
			percent.attr('class', percent.attr('class') + '-success');
		}
	},
);

// Listens for the theme event from the main process and set multiple CSS variables
(window as any).electron.onTheme((theme: string): void => {
	initializeThemeVariables(theme);
});

$(document).ready(async (): Promise<void> => {
	// Initializing the select elements

	selectorGroup.initialize([], []);

	// Disabling the form while loading

	toggleForm(false, selectorGroup);

	// Adding the tooltip

	// @ts-expect-error Not being resolved by TypeScript
	tippy('#help', {
		content: `<p>If no system is selected, the file will be verified against all systems. While this may take longer and be more resource intensive, it is useful when verifying multiple files from different systems.</p><p><b>Note 1</b>: Multi-track PlayStation games need to be verified against the specific game that the dump corresponds to.</p><p><b>Note 2</b>: The Redump.org files used for verification are downloaded automatically on startup and can be updated by clicking on the "<i>Update Redump</i>" button. However, No-intro.org files cannot be fetched automatically. Instead: <ol><li>Visit No-intro's <a id="no-intro-link" href="https://datomatic.no-intro.org/index.php?page=download&s=28&op=daily" target="_blank">Dat-o-Matic download page</a>.</li><li>Click on the "<i>Request</i>" button.</li><li>Wait for the page to be redirected (this may take a while).</li><li>Click on the "<i>Download</i>" button.</li><li>Click on the "<i>Upload No-intro</i>" button and select all the <i>.dat</i> files you downloaded at once. Any previously processed <i>.dat</i> files will be deleted.</li><li>The app will take care of the rest.</li></ol></p>`,
		allowHTML: true,
		arrow: true,
		placement: 'left',
		animation: 'scale-subtle',
		trigger: 'click',
		interactive: true,
		/**
		 * Opens the link in the tooltip in the system browser when clicked
		 * @param {any} instance The tippy instance
		 */
		onShown(instance: any): void {
			// Delegate click to open in system browser

			const link: HTMLAnchorElement | null =
				instance.popper.querySelector('#no-intro-link');

			if (link) {
				link.addEventListener('click', function (e: any): void {
					e.preventDefault();
					(window as any).electron.ipcRenderer.invoke(
						'openExternal',
						this.href,
					);
				});
			}
		},
	});

	// Getting all the systems and their games

	await downloader.init();

	// Updating the select elements

	const systems: systemData[] = downloader._systems;
	await selectorGroup.updateSelects(systems);

	// Checking if the API key is already stored and valid to show the artwork if possible

	apiExists = await api.existsApiKey();

	if (apiExists) {
		logger.emptyLine();
		logger.add('Games DB API key found in storage', 'success');
		toggleArtwork(true, null, null, null);
	}

	// Checking for updates

	await checkUpdates(logger);

	// Re-enabling the form

	logger.emptyLine();
	toggleForm(true, selectorGroup);
});

$('#api').on('click', async (ev: JQuery.Event): Promise<void> => {
	ev.preventDefault();
	const success: boolean = await api.getKey();
	toggleArtwork(success, null, null, null);
});

$('#credentials').on('click', async (ev: JQuery.Event): Promise<void> => {
	ev.preventDefault();

	const success: boolean = await downloader.getToken();

	if (success) $('#credentials').addClass('active');
	else $('#credentials').removeClass('active');
});

$('#log').on('click', (ev: JQuery.Event): void => {
	ev.preventDefault();

	// Downloading the console log as a text file

	const blob: Blob = new Blob([logger._text], { type: 'text/plain' });
	const url: string = URL.createObjectURL(blob);
	const a: HTMLAnchorElement = document.createElement('a');
	a.href = url;
	a.download = 'log.txt';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
});

$('#clear').on('click', (ev: JQuery.Event): void => {
	ev.preventDefault();

	// Clearing the console

	logger.clear();
});

$('#system').on('change', async (): Promise<void> => {
	// Disabling the form while processing

	toggleForm(false, selectorGroup);

	// Updating the games select element based on the selected system

	const systems: systemData[] = downloader._systems;
	await selectorGroup.updateSelects(systems);

	// Clearing the platformIdLast variable to fetch the new platform ID when a new system is selected

	platformIdLast = null;

	// Removing the artwork when changing the system

	toggleArtwork(apiExists, null, null, null);

	// Re-enabling the form

	toggleForm(true, selectorGroup);
});

$('#game').on('change', async (): Promise<void> => {
	const system: string = selectorGroup._selectSystemsText;
	const game: string = selectorGroup._selectGamesValue;

	if (system && game) {
		let platformId: number | null = platformIdLast;

		if (platformIdLast === null) {
			const platformTemp: string =
				system.split('/')?.[1]?.trim()?.replace(/: /g, '')?.toLowerCase() ?? '';

			const platformTemp2: string = platformTemp.includes('-')
				? platformTemp.split('-')?.[1]?.trim()
				: platformTemp;

			platformId = await api.getPlatformId(platformTemp2);
		} else {
			platformId = platformIdLast;
		}

		if (platformId !== null) {
			const gameNameTemp: string = game
				.replace(/\([\w+\s-]+\)/g, '')
				.replace(/\[\w+\]/g, '')
				.replace(/\.[a-zA-Z0-9]+$/, '')
				.replace(/,/g, '')
				.trim()
				.toLowerCase();

			const gameNameTemp2: string = gameNameTemp.includes('-')
				? gameNameTemp.split('-')?.[1]?.trim()
				: gameNameTemp;

			const gameId: number | null = await api.getGameByName(
				platformId,
				gameNameTemp2,
			);

			if (gameId !== null) {
				const imgData: { base64: string; aspectRatio: string } | null =
					await api.getImageByGameId(gameId);

				if (imgData?.base64 && imgData?.aspectRatio) {
					toggleArtwork(true, imgData.base64, game, imgData.aspectRatio);
				} else {
					toggleArtwork(apiExists, null, null, null);
				}
			}
		}
	}
});

$('#files').on('click', async (ev: JQuery.Event): Promise<void> => {
	ev.preventDefault();

	// Calling the openFile IPC handler to open a file dialog and get the selected file paths

	const filePaths: string[] = await (window as any).electron.ipcRenderer.invoke(
		'openFile',
		[],
	);
	const baseNames: string[] = [];

	// Iterating over the selected file paths to get their base names

	for (const filePath of filePaths) {
		const baseName: string = await (window as any).electron.ipcRenderer.invoke(
			'basename',
			filePath,
		);

		baseNames.push(baseName);
	}

	// Logging the selected file names

	if (baseNames.length) {
		logger.emptyLine();

		logger.add('Selected file(s):');

		baseNames.forEach((name: string): void => {
			logger.add(name);
		});

		logger.emptyLine();
	}

	// Storing the file paths in the hidden input field

	if (filePaths.length) $('#filepaths').val(JSON.stringify(filePaths));
});

$('#redump').on('click', async (ev: JQuery.Event): Promise<void> => {
	ev.preventDefault();

	toggleForm(false, selectorGroup);

	const folder: string = 'dat/redump';

	// Calling the deleteDatDirectoryContents IPC handler to delete the contents of the dat/redump directory

	await (window as any).electron.ipcRenderer.invoke(
		'deleteDatDirectoryContents',
		folder,
	);

	logger.emptyLine();
	logger.add('Redump files deleted');

	// Calling the initRedump function

	await downloader.initRedump();

	toggleForm(true, selectorGroup);
});

$('#no-intro').on('click', async (ev: JQuery.Event): Promise<void> => {
	ev.preventDefault();

	toggleForm(false, selectorGroup);

	const folder: string = 'dat/no-intro';

	// Calling the openFile IPC handler to open a file dialog and get the selected file paths

	const filePaths: string[] = await (window as any).electron.ipcRenderer.invoke(
		'openFile',
		['dat'],
	);

	if (filePaths?.length) {
		// Calling the deleteDatDirectoryContents IPC handler to delete the contents of the dat/no-intro directory

		await (window as any).electron.ipcRenderer.invoke(
			'deleteDatDirectoryContents',
			folder,
		);

		logger.emptyLine();
		logger.add('No-intro files deleted');

		// Iterating over the selected file paths to get their base names and content to be able to save them

		for (const filePath of filePaths) {
			const content: string = await (window as any).electron.ipcRenderer.invoke(
				'readDatFileExternal',
				filePath,
			);

			const basename: string = await (
				window as any
			).electron.ipcRenderer.invoke('basename', filePath);

			await (window as any).electron.ipcRenderer.invoke(
				'saveDatFile',
				basename,
				folder,
				content,
			);
		}

		// Calling the initNoIntro function

		await downloader.initNoIntro();
	}

	toggleForm(true, selectorGroup);
});

$('form').on('submit', async (ev: JQuery.Event): Promise<void> => {
	ev.preventDefault();

	// Disabling the form while processing

	toggleForm(false, selectorGroup);

	// Verifying the selected files

	const value: string = $('#filepaths').val() as string;
	const filePaths: string[] = value ? JSON.parse(value) : [];

	const system: string = selectorGroup._selectSystemsValue;
	const game: string = selectorGroup._selectGamesValue;

	if (filePaths.length) {
		const v: Verifier = new Verifier(filePaths, system, game, logger);
		await v.init();

		const successful: number = v._successful;

		logger.add(
			`${successful}/${filePaths.length} files verified successfully.`,
		);

		if (successful - filePaths.length === 0) {
			// @ts-expect-error Not being resolved by TypeScript
			const jsConfetti: JSConfetti = new JSConfetti();

			for (let i: number = 0; i < 3; i++) {
				setTimeout((): void => {
					jsConfetti.addConfetti();
				}, i * 1500);
			}
		}
	} else {
		logger.add('No file(s) selected.', 'error');
	}

	// Re-enabling the form after processing

	toggleForm(true, selectorGroup);
});
