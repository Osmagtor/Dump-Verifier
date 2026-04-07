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
}
