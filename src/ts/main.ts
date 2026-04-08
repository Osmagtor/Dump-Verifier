// @ts-expect-error Not being resolved by TypeScript but it works at runtime
import Window from './window.cjs';
import {
	app,
	BrowserWindow,
	ipcMain,
	dialog,
	IpcMainInvokeEvent,
	Cookie,
	Session,
} from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { shell } from 'electron';
import keytar from 'keytar';

let baseDir: string;

let winMain: Window = new Window('main', app);
let winApi: Window = new Window('api', app);
let winLogin: Window = new Window('login', app);

if (process.platform === 'win32') {
	baseDir = process.cwd();
} else if (process.platform === 'darwin') {
	baseDir = app.getPath('userData');
} else {
	baseDir = app.getPath('userData');
}

void app.whenReady().then((): void => {
	winMain.create();

	ipcMain.handle(
		'storeInKeytar',
		async (
			_: IpcMainInvokeEvent,
			service: string,
			account: string,
			password: string,
		): Promise<void> => {
			await keytar.setPassword(service, account, password);
		},
	);

	ipcMain.handle(
		'getFromKeytar',
		async (
			_: IpcMainInvokeEvent,
			service: string,
			account: string,
		): Promise<string | null> => {
			return await keytar.getPassword(service, account);
		},
	);

	ipcMain.handle(
		'deleteFromKeytar',
		async (
			_: IpcMainInvokeEvent,
			service: string,
			account: string,
		): Promise<void> => {
			await keytar.deletePassword(service, account);

			if (winApi._window) {
				winApi.close();
			}
		},
	);

	ipcMain.handle(
		'redumpCookieFetch',
		async (
			_: IpcMainInvokeEvent,
			url: string,
			cookies: string,
		): Promise<ArrayBuffer | null> => {
			try {
				const res: Response = await fetch(url, {
					headers: { Cookie: cookies },
				});

				if (res.ok) return await res.arrayBuffer();
				else return null;
			} catch (err: any) {
				console.error(err);
				return null;
			}
		},
	);

	ipcMain.handle('getKey', async (): Promise<string> => {
		winApi.create();

		if (!winApi._window) {
			return '';
		}

		return new Promise((resolve: (result: string) => void): void => {
			ipcMain.removeHandler('setApiKey');

			// Returning the key if the user saves it through the modal

			ipcMain.handle(
				'setApiKey',
				async (_: IpcMainInvokeEvent, key: string): Promise<void> => {
					ipcMain.removeHandler('setApiKey');

					winApi.close();
					resolve(key);
				},
			);

			// Returning an empty string if the window is closed without inserting a key

			winApi._window.on('closed', (): void => {
				resolve('');
			});
		});
	});

	ipcMain.handle('redumpLogin', async (): Promise<string> => {
		return new Promise((resolve: (result: string) => void): void => {
			winLogin.create();

			if (!winLogin._window) {
				resolve('');
				return;
			}

			// Listening for cookies changes

			const ses: Session = winLogin._window.webContents.session;

			/**
			 * Helper function to check for the presence of the session cookie and resolve the promise if found
			 */
			const checkCookie: () => Promise<void> = async (): Promise<void> => {
				const cookies: Cookie[] = await ses.cookies.get({
					url: 'http://forum.redump.org/',
				});
				const cookieString: string = cookies
					.filter((c: Cookie): boolean =>
						c.name.toLowerCase().includes('redump'),
					)
					.map((c: Cookie): string => `${c.name}=${c.value}`)
					.join('; ');

				// Only resolving if cookies contain a session/login cookie

				if (cookieString.includes('redump')) {
					resolve(cookieString);
				}
			};

			// Periodically checking for the session cookie

			const interval: NodeJS.Timeout = setInterval(checkCookie, 1000);

			// If the user closes the window without logging in

			winLogin._window.on('closed', async (): Promise<void> => {
				clearInterval(interval);

				// Clearing all cookies for the external link
				const cookies: Cookie[] = await ses.cookies.get({
					url: 'http://forum.redump.org/',
				});

				for (const cookie of cookies) {
					await ses.cookies.remove('http://forum.redump.org/', cookie.name);
				}

				resolve('');
			});
		});
	});

	ipcMain.handle('getVersion', (): string => {
		return app.getVersion();
	});

	ipcMain.handle('createDat', (): void => {
		try {
			const folderRedump: string = path.join(baseDir, 'dat/redump');
			const folderNointro: string = path.join(baseDir, 'dat/no-intro');

			if (!fs.existsSync(folderRedump))
				fs.mkdirSync(folderRedump, { recursive: true });
			if (!fs.existsSync(folderNointro))
				fs.mkdirSync(folderNointro, { recursive: true });
		} catch (err: any) {
			console.error(err);
		}
	});

	ipcMain.handle(
		'checkFile',
		(
			_: IpcMainInvokeEvent,
			datFileName: string,
			datFolder: string,
		): boolean => {
			try {
				const filePath: string = path.join(baseDir, datFolder, datFileName);
				return fs.existsSync(filePath);
			} catch (err: any) {
				console.error(err);
				return false;
			}
		},
	);

	ipcMain.handle(
		'readDatFile',
		(
			_: IpcMainInvokeEvent,
			datFileName: string,
			datFolder: string,
		): string | null => {
			try {
				const filePath: string = path.join(baseDir, datFolder, datFileName);
				return fs.readFileSync(filePath, 'utf-8');
			} catch (err: any) {
				console.error(err);
				return null;
			}
		},
	);

	ipcMain.handle(
		'readDatFileExternal',
		(_: IpcMainInvokeEvent, datFilePath: string): Buffer | null => {
			try {
				return fs.readFileSync(datFilePath);
			} catch (err: any) {
				console.error(err);
				return null;
			}
		},
	);

	ipcMain.handle(
		'deleteDatFile',
		(
			_: IpcMainInvokeEvent,
			datFileName: string,
			datFolder: string,
		): boolean => {
			try {
				const filePath: string = path.join(baseDir, datFolder, datFileName);
				fs.unlinkSync(filePath);
				return true;
			} catch (err: any) {
				console.error(err);
				return false;
			}
		},
	);

	ipcMain.handle(
		'readDatDirectory',
		(
			_: IpcMainInvokeEvent,
			datFolder: string,
			ext: string,
		): { file: string; content: string }[] => {
			try {
				const dirPath: string = path.join(baseDir, datFolder);
				const files: string[] = fs.readdirSync(dirPath);
				const filesFound: string[] = files.filter((file: string): boolean =>
					file.endsWith(ext),
				);

				return filesFound.map(
					(file: string): { file: string; content: string } => {
						const filePath: string = path.join(dirPath, file);
						return {
							file: file,
							content: fs.readFileSync(filePath, 'utf-8'),
						};
					},
				);
			} catch (err: any) {
				console.error(err);
				return [];
			}
		},
	);

	ipcMain.handle(
		'deleteDatDirectoryContents',
		(_: IpcMainInvokeEvent, datFolder: string): boolean => {
			try {
				const dirPath: string = path.join(baseDir, datFolder);

				if (fs.existsSync(dirPath)) {
					const files: string[] = fs.readdirSync(dirPath);

					for (const file of files) {
						const filePath: string = path.join(dirPath, file);

						if (fs.lstatSync(filePath).isFile()) {
							fs.unlinkSync(filePath);
						}
					}
				}
				return true;
			} catch (err: any) {
				console.error(err);
				return false;
			}
		},
	);

	ipcMain.handle(
		'saveDatFile',
		(
			_: IpcMainInvokeEvent,
			datFileName: string,
			datFolder: string,
			text: string,
		): boolean => {
			try {
				const folderPath: string = path.join(baseDir, datFolder);
				const filePath: string = path.join(folderPath, datFileName);

				fs.mkdirSync(folderPath, { recursive: true });
				fs.writeFileSync(filePath, text, 'utf-8');

				return true;
			} catch (err: any) {
				console.error(err);
				return false;
			}
		},
	);

	ipcMain.handle(
		'openFile',
		async (_: IpcMainInvokeEvent, exts: string[]): Promise<string[] | null> => {
			const {
				canceled,
				filePaths,
			}: { canceled: boolean; filePaths: string[] } =
				await dialog.showOpenDialog({
					properties: ['openFile', 'multiSelections'],
					filters: [
						exts?.length
							? { name: 'Files', extensions: exts }
							: { name: 'All Files', extensions: ['*'] },
					],
				});

			if (canceled) return null;
			else return filePaths;
		},
	);

	ipcMain.handle(
		'basename',
		(_: IpcMainInvokeEvent, filePath: string): string => {
			return path.basename(filePath);
		},
	);

	ipcMain.handle(
		'hash',
		async (
			_: IpcMainInvokeEvent,
			filepath: string,
			start: number = 0,
			end: number,
		): Promise<string | null> => {
			try {
				return await new Promise(
					(
						resolve: (value: string) => void,
						reject: (reason?: any) => void,
					): void => {
						let percentageOld: string = '';
						let bytesRead: number = 0;

						const bytesTotal: number =
							(end ?? fs.statSync(filepath).size) - start + 1;
						const hash: crypto.Hash = crypto.createHash('sha1');
						const stream: fs.ReadStream = fs.createReadStream(filepath, {
							start,
							end,
						});

						stream.on('error', (err: Error): void => {
							reject(err);
						});

						hash.on('error', (err: Error): void => {
							reject(err);
						});

						stream.on('data', (chunk: string | Buffer): void => {
							hash.update(chunk);
							bytesRead += chunk.length;

							const percentage: string = Number(
								(bytesRead / bytesTotal) * 100,
							).toFixed(0);

							// Emitting a progress event

							if (winMain && percentage !== percentageOld) {
								percentageOld = percentage;

								if (winMain._window) {
									winMain._window.webContents.send('progress', percentage);
								}
							}
						});

						stream.on('end', (): void => {
							const finalHash: string = hash.digest('hex');
							resolve(finalHash);
						});
					},
				);
			} catch (err: any) {
				console.error(err);
				return null;
			}
		},
	);

	ipcMain.handle(
		'openExternal',
		async (_: IpcMainInvokeEvent, url: string): Promise<void> => {
			try {
				await shell.openExternal(url);
			} catch (err: any) {
				console.error('Failed to open external URL:', err);
			}
		},
	);

	app.on('activate', (): void => {
		if (BrowserWindow.getAllWindows().length === 0) {
			winMain.create();
		}
	});
});

app.on('window-all-closed', (): void => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
