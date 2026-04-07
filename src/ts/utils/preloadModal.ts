import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('electron', {
	ipcRenderer: {
		/**
		 * Handler for invoking IPC events. The function will return a promise that resolves with the result of the invoked event.
		 * @param {any[]} args The arguments to be passed to the invoked event.
		 */
		// @ts-expect-error Not being resolved by TypeScript
		invoke: (...args: any[]): any[] => ipcRenderer.invoke(...args),
	},
	/**
	 * Handler for accent color changes. The callback will be called with the new accent color as an argument whenever the accent color changes.
	 * @param {any} callback The callback function to be called when the accent color changes.
	 */
	onAccentColor: (callback: any): void => {
		ipcRenderer.on('accent-color', (_: IpcRendererEvent, color: string): any =>
			callback(color),
		);
	},
	/**
	 * Handler for theme changes. The callback will be called with the new theme as an argument whenever the theme changes.
	 * @param {any} callback The callback function to be called when the theme changes.
	 */
	onTheme: (callback: any): void => {
		ipcRenderer.on('theme', (_: IpcRendererEvent, theme: string): any =>
			callback(theme),
		);
	},
});
