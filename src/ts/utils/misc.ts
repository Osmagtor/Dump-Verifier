import SelectGroup from '../classes/select-group.js';
import Logger from '../classes/logger.js';
import $ from 'jquery';
import tippy from 'tippy.js';

let tippySelected: any = null;
let tippies: any[] = [];

/**
 * Initializes the CSS variables based on the selected theme.
 * @param {string} theme The selected theme, either 'light' or 'dark'
 */
export function initializeThemeVariables(theme: string): void {
	const dark: boolean = theme === 'dark';

	// Change the CSS variables based on the theme

	document.documentElement.style.setProperty(
		'--os-accent-color',
		dark ? '#0078d4' : '#0078d4',
	);
	document.documentElement.style.setProperty(
		'--font',
		dark ? '#ffffff' : '#000000',
	);
	document.documentElement.style.setProperty(
		'--background',
		dark ? '#191919' : '#ffffff',
	);
	document.documentElement.style.setProperty(
		'--select',
		dark ? '#4b4b4b' : '#e2e2e2ff',
	);
	document.documentElement.style.setProperty(
		'--disabled',
		dark ? '#292929ff' : '#f1f1f1ff',
	);
	document.documentElement.style.setProperty(
		'--console',
		dark ? '#191919' : '#ffffff',
	);
	document.documentElement.style.setProperty(
		'--console-alternative',
		dark ? '#4b4b4b' : '#f0f0f0',
	);
	document.documentElement.style.setProperty(
		'--console-green',
		dark ? '#71c971' : 'green',
	);
	document.documentElement.style.setProperty(
		'--console-red',
		dark ? '#db8888' : 'red',
	);
	document.documentElement.style.setProperty(
		'--console-border',
		dark ? '#3f3f3f' : '#dadada',
	);
	document.documentElement.style.setProperty(
		'--button-normal',
		dark ? '#4b4b4b' : '#e2e2e2ff',
	);
	document.documentElement.style.setProperty(
		'--button-hover',
		dark ? '#585858' : '#bdbdbdff',
	);
	document.documentElement.style.setProperty(
		'--button-focus',
		dark ? '#686868ff' : '#a7a7a7ff',
	);
	document.documentElement.style.setProperty(
		'--help',
		dark ? '#D1D1D1' : '#cfcece',
	);
	document.documentElement.style.setProperty('--submit-normal', '#009b4dff');
	document.documentElement.style.setProperty('--submit-hover', '#00793cff');
	document.documentElement.style.setProperty('--submit-focus', '#016b36ff');
	document.documentElement.style.setProperty('--submit-disabled', '#005028ff');
	document.documentElement.style.setProperty('--delete-normal', '#c7254e');
	document.documentElement.style.setProperty('--delete-hover', '#a5203f');
	document.documentElement.style.setProperty('--delete-focus', '#851a33');
	document.documentElement.style.setProperty('--delete-disabled', '#651526');
}

/**
 * Toggles the form inputs and selects based on the provided parameters
 * @param {boolean} enabled Whether to enable or disable the form inputs and selects
 * @param {SelectGroup} selectorGroup The SelectGroup instance containing the Tom Select instances to enable
 */
export function toggleForm(enabled: boolean, selectorGroup: SelectGroup): void {
	$('form')
		.find('form>div>input, button, input[type="submit"]')
		.prop('disabled', !enabled);

	$('#credentials').css('pointer-events', enabled ? 'auto' : 'none');

	$('#api').css('pointer-events', enabled ? 'auto' : 'none');

	if (enabled) {
		selectorGroup.enable();
	} else {
		selectorGroup.disable();
	}
}

/**
 * Checks for updates by comparing the current version with the latest release version on GitHub and logs the result to the console
 * @param {Logger} logger The Logger instance to log the results to
 */
export async function checkUpdates(logger: Logger): Promise<void> {
	// Getting the current version

	const currentVersion: string = await (
		window as any
	).electron.ipcRenderer.invoke('getVersion');

	logger.emptyLine();
	logger.add(`The current version is: ${currentVersion}`);

	try {
		// Getting the latest release version from GitHub

		const res: Response = await fetch(
			'https://api.github.com/repos/Osmagtor/Dump-Verifier/releases/latest',
		);
		const data: any = await res.json();
		const latestVersion: string = (data.tag_name ?? data.name)?.replace(
			'v',
			'',
		);
		const latestVersionLink: string = data.html_url;

		if (currentVersion < latestVersion) {
			logger.add(
				`A new version is available: <a id="latest-version-link" href='${latestVersionLink}' target='_blank'>${latestVersion}</a> 🎉`,
				'normal',
				true,
				false,
			);

			// Delegating click to open in system browser

			setTimeout((): void => {
				const link: JQuery<HTMLAnchorElement> = $('#latest-version-link');

				if (link) {
					link.on(
						'click',
						function (ev: JQuery.ClickEvent<HTMLAnchorElement>): void {
							ev.preventDefault();
							(window as any).electron.ipcRenderer.invoke(
								'openExternal',
								this.href,
							);
						},
					);
				}
			}, 0);
		} else {
			logger.add(`This is the latest version available`);
		}
	} catch {
		// Nothing, there's probably just no internet connection or the Github API is down

		logger.add(`It was not possible to check for updates`, 'error');
	}
}

/**
 * Toggles the display of the game artwork based on the provided parameters
 * @param {boolean} show Whether to show or hide the artwork
 * @param {string | null} image The base64 string of the game image to display, or null to hide the image
 * @param {string | null} alt The alt text for the game image, or null to hide the image
 * @param {string | null} aspectRatio The aspect ratio for the game image, or null to use the default aspect ratio
 */
export function toggleArtwork(
	show: boolean,
	image: string | null,
	alt: string | null,
	aspectRatio: string | null,
): void {
	if (show) {
		$('#api').addClass('active');
		$('.row').addClass('narrow');
		$('#artwork').addClass('visible');
		$('#console').addClass('narrow');
		$('#images').addClass('visible');
	} else {
		$('#api').removeClass('active');
		$('.row').removeClass('narrow');
		$('#artwork').removeClass('visible');
		$('#console').removeClass('narrow');
		$('#images').removeClass('visible');
	}

	const parent: JQuery<HTMLDivElement> = $('#artwork');

	if (image !== null && alt !== null && aspectRatio !== null) {
		if (tippySelected) {
			tippySelected.destroy();
			tippySelected = null;
		}

		parent.css('aspect-ratio', aspectRatio);

		parent.find('p').removeClass('visible');

		parent
			.find('img')
			.addClass('visible')
			.attr('alt', alt)
			.attr('src', `data:image/jpeg;base64,${image}`);

		// Adding a tippy tooltip to the image with the alt text

		// @ts-expect-error Not being resolved by TypeScript
		tippySelected = tippy(parent.find('img')[0], {
			content: `
				<div>
					<img 
						src="data:image/jpeg;base64,${image}" 
						alt="${alt}" 
					\>
				</div>`,
			allowHTML: true,
			arrow: true,
			placement: 'left',
			animation: 'scale-subtle',
			trigger: 'mouseenter',
		});
	} else {
		parent.css('aspect-ratio', '');

		parent.find('img').removeClass('visible').attr('alt', '').attr('src', '');

		parent.find('p').addClass('visible');
	}
}

/**
 * Adds a verified game image to the verified images container
 * @param {string} img The base64 string of the game image to add
 * @param {string} alt The alt text for the game image
 * @param {string} aspectRatio The aspect ratio for the game image
 * @param {boolean} success Whether the verification was successful or not, used to determine the class of the image
 */
export function addImageToVerified(
	img: string,
	alt: string,
	aspectRatio: string,
	success: boolean,
): void {
	const container: JQuery<HTMLDivElement> = $('#images');

	// Creating the image element with the provided data

	const lastProgressBar: JQuery<HTMLSpanElement> = $('#console')
		.find('>span')
		.last();

	const divElement: JQuery<HTMLElement> = $('<div></div>')
		.append(
			$('<img>')
				.attr('src', img ? `data:image/jpeg;base64,${img}` : '')
				.attr('alt', alt)
				.on('click', (): void => {
					// Scroll the console to the corresponding log entry when the image is clicked

					lastProgressBar[0].scrollIntoView({
						behavior: 'smooth',
						block: 'center',
					});

					// Making the corresponding log entry blink to easily locate it

					lastProgressBar.addClass('blink');

					setTimeout((): void => {
						lastProgressBar.removeClass('blink');
					}, 2000);
				}),
			$('<div></div>')
				.addClass(success ? 'success' : 'failure')
				.text(success ? 'Verified' : 'Failed'),
		)
		.css('aspect-ratio', aspectRatio)
		.addClass('visible')
		.addClass(!img ? 'no-image' : '');

	// Adding the "overflow" class to the container

	container.addClass('overflow');

	// Removing the placeholder text

	container.find('p').removeClass('visible');

	// Adding the image to the container

	container.append(divElement);

	// Adding a tippy tooltip to the image with the alt text

	tippies.push(
		// @ts-expect-error Not being resolved by TypeScript
		tippy(divElement[0], {
			content: `[${new Date().toLocaleTimeString()}] ${alt || 'No game found'}`,
			arrow: true,
			placement: 'left',
			animation: 'scale-subtle',
			trigger: 'mouseenter',
		}),
	);
}

/**
 * Clears all verified game images from the verified images container and shows the placeholder text
 */
export function clearVerifiedImages(): void {
	const container: JQuery<HTMLDivElement> = $('#images');

	// Removing all images from the container

	container.find('>div').remove();

	// Showing the placeholder text

	container.find('p').addClass('visible');

	// Removing the "overflow" class from the container

	container.removeClass('overflow');

	// Destroying all tippy instances to prevent memory leaks

	tippies.forEach((tippyInstance: any): void => {
		tippyInstance.destroy();
	});

	tippies = [];
}
