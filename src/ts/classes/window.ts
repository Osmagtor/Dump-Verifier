import { BrowserWindow, nativeTheme } from 'electron';
import * as path from 'path';

export default class Window {
	private window!: BrowserWindow | null;
	private app!: Electron.App;
	private type!: 'main' | 'api' | 'login';

	/**
	 * Getter for the BrowserWindow instance
	 */
	public get _window(): BrowserWindow | null {
		return this.window;
	}

	/**
	 * Class constructor
	 * @param {'main'|'api'|'login'} type The type of window to create, which determines its dimensions and behavior. Can be 'main', 'api', or 'login'
	 * @param {Electron.App} app The Electron app instance, used to get paths for resources and set the application icon
	 */
	constructor(type: 'main' | 'api' | 'login', app: Electron.App) {
		this.type = type;
		this.app = app;
	}

	/**
	 * Gets the dimensions for the window based on the current platform
	 * @returns { width: number, height: number } An object containing the width and height for the window
	 */
	private getDimensions(): { width: number; height: number } {
		let res: { width: number; height: number } = { width: 0, height: 0 };

		if (this.type === 'main') {
			if (process.platform === 'win32') {
				res = { width: 600, height: 560 };
			} else if (process.platform === 'darwin') {
				res = { width: 585, height: 545 };
			} else {
				res = { width: 585, height: 490 };
			}
		} else if (this.type === 'api') {
			res = { width: 300, height: 160 };
		} else {
			res = { width: 800, height: 600 };
		}

		return res;
	}

	/**
	 * Gets the path to the application icon based on the current platform
	 * @returns {string} The path to the application icon
	 */
	private getIcon(): string {
		if (this.type === 'login') {
			return '';
		}

		return path.join(this.app.getAppPath(), 'img/icon.ico');
	}

	/**
	 * Gets the path to the preload script based on the window type
	 * @returns {string} The path to the preload script
	 */
	private getPreload(): string {
		if (this.type === 'login') {
			return '';
		}

		return path.join(
			this.app.getAppPath(),
			this.type === 'main' ? 'dist/js/preload.cjs' : 'dist/js/preloadModal.cjs',
		);
	}

	/**
	 * Gets the path to the HTML file to load based on the window type
	 * @returns {string} The path to the HTML file to load
	 */
	private getHTML(): string {
		if (this.type === 'login') {
			return 'http://forum.redump.org/login/';
		}

		return path.join(
			this.app.getAppPath(),
			this.type === 'main' ? 'dist/html/index.html' : 'dist/html/api.html',
		);
	}

	/**
	 * Closes the window if it exists
	 */
	public close(): void {
		if (this.window) {
			this.window.close();
			this.window = null;
		}
	}

	/**
	 * Creates the BrowserWindow instance
	 */
	public create(): void {
		if (this.window) {
			this.window.close();
			this.window = null;
		}

		const { width, height }: { width: number; height: number } =
			this.getDimensions();

		this.window = new BrowserWindow({
			width: width,
			height: height,
			resizable: this.type === 'login',
			icon: this.getIcon(),
			modal: this.type !== 'main',
			webPreferences: {
				preload: this.getPreload(),
				contextIsolation: true,
				nodeIntegration: false,
			},
		});

		this.window.setMenuBarVisibility(false);

		if (this.type !== 'login') {
			void this.window.loadFile(this.getHTML());

			// Send accent color to renderer

			this.window.webContents.on('did-finish-load', (): void => {
				if (this.window) {
					nativeTheme.on('updated', this.callbackTheme);
				}

				this.callbackTheme();
			});
		} else {
			void this.window.loadURL(this.getHTML());
		}

		this.window.on('closed', (): void => {
			this.window = null;
		});
	}

	/**
	 * Callback function to send the current theme to the renderer process
	 */
	private callbackTheme(): void {
		const theme: 'dark' | 'light' = nativeTheme.shouldUseDarkColors
			? 'dark'
			: 'light';

		if (this.window) {
			this.window.webContents.send('theme', theme);
		}
	}
}

module.exports = Window;
