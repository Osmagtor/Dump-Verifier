import $ from 'jquery';
import { initializeThemeVariables } from './misc.js';
import API from '../classes/api.js';

// Listens for the theme event from the main process and set multiple CSS variables
(window as any).electron.onTheme((theme: string): void => {
	initializeThemeVariables(theme);
});

$('.delete').on('click', async (ev: JQuery.Event): Promise<void> => {
	ev.preventDefault();

	// Sending the API key to the main process

	await API.deleteApiKey();
});

$('[type="submit"]').on('click', async (ev: JQuery.Event): Promise<void> => {
	ev.preventDefault();

	const key: string = ($('#key').val() as string) ?? '';

	// Sending the API key to the main process

	await (window as any).electron.ipcRenderer.invoke('setApiKey', key);
});
