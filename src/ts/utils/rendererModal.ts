import $ from 'jquery';
import { initializeThemeVariables } from './misc.js';

// Listens for the theme event from the main process and set multiple CSS variables
(window as any).electron.onTheme((theme: string): void => {
	initializeThemeVariables(theme);
});

$('form').on('submit', async (ev: JQuery.Event): Promise<void> => {
	ev.preventDefault();

	const key: string = ($('#key').val() as string) ?? '';

	// Sending the API key to the main process

	await (window as any).electron.ipcRenderer.invoke('setApiKey', key);
});
