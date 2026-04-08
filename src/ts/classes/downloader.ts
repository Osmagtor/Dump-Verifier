import Logger from './logger.js';
import JSZip from 'jszip';
import type { data, systemData } from '../types.js';

class Downloader {
	private static redumpURL: string =
		'http://wiki.redump.org/index.php?title=List_of_DB_Download_Links';

	private readonly systems: systemData[] = [];
	private loaded: number = 0;
	private total: number = 0;

	private logger: Logger;
	private cookies: string = '';
	private requireAuthentication!: Record<string, boolean>;

	/**
	 * Getter for the list of systems with their corresponding DAT file paths
	 */
	public get _systems(): systemData[] {
		return this.systems;
	}

	/**
	 * Class constructor
	 * @param {Logger} logger The Logger instance to log messages to
	 */
	constructor(logger: Logger) {
		this.logger = logger;
		this.requireAuthentication = this.getRequireAuthentication();
	}

	/**
	 * Gets the list of systems from Redump.org that require authentication from localStorage
	 * @returns {Record<string, boolean>} An object where the keys are system names and the values indicate whether authentication is required
	 */
	private getRequireAuthentication(): Record<string, boolean> {
		try {
			const requireAuthenticationString: string | null = localStorage.getItem(
				'requireAuthentication',
			);

			if (requireAuthenticationString) {
				return JSON.parse(requireAuthenticationString);
			}
		} catch (err: any) {
			console.error('Error parsing requireAuthentication:', err);
		}

		return {};
	}

	/**
	 * Stores the list of systems from Redump.org that require authentication in localStorage
	 * @param {Record<string, boolean>} requireAuthentication An object where the keys are system names and the values indicate whether authentication is required
	 */
	private storeRequireAuthentication(
		requireAuthentication: Record<string, boolean>,
	): void {
		try {
			localStorage.setItem(
				'requireAuthentication',
				JSON.stringify(requireAuthentication),
			);
		} catch (err: any) {
			console.error('Error storing requireAuthentication:', err);
		}
	}

	/**
	 * Gets the URLs of the Redump DAT files
	 * @returns {Promise<string[]>} A promise that resolves to an array of URLs for the Redump DAT files
	 */
	private async getPathURLs(): Promise<string[]> {
		const links: string[] = [];

		try {
			const res: Response = await fetch(Downloader.redumpURL);

			if (res.ok) {
				const htmlRaw: string = await res.text();
				Array.from(
					htmlRaw.matchAll(/http:\/\/redump.org\/datfile\/[a-zA-Z0-9]+\//g),
				).forEach((match: RegExpMatchArray): void => {
					if (!links.includes(match[0])) links.push(match[0]);
				});
			}
		} catch {
			const info: { file: string; content: string }[] = await (
				window as any
			).electron.ipcRenderer.invoke('readDatDirectory', 'dat/redump', 'json');

			info.forEach((el: { file: string; content: string }): void => {
				links.push(el.file.replace('.json', ''));
			});
		}

		return links;
	}

	/**
	 * Gets the authentication token
	 * @returns {boolean} `True` if the token was successfully obtained, `false` otherwise
	 */
	public async getToken(): Promise<boolean> {
		this.cookies = await (window as any).electron.ipcRenderer.invoke(
			'redumpLogin',
		);

		if (this.cookies) {
			this.logger.add('Successfully logged in');
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Initializes the downloader
	 */
	public async init(): Promise<void> {
		await (window as any).electron.ipcRenderer.invoke('createDat');
		await this.initRedump();
		await this.initNoIntro();
	}

	/**
	 * Initializes the Redump DAT files
	 */
	public async initRedump(): Promise<void> {
		this.total = 0;
		this.loaded = 0;

		this.logger.add('Preparing Redump files...');
		await this.redump();
	}
	/**
	 * Initializes the No-Intro DAT files
	 */
	public async initNoIntro(): Promise<void> {
		this.total = 0;
		this.loaded = 0;

		this.logger.add('Preparing No-intro files...');
		await this.nointro();
	}

	/**
	 * Checks for the existence of .dat files in the "dat/no-intro" folder, parses them to JSON if they exist, and saves the JSON files. It also loads any existing JSON files in the folder. After processing, it deletes the original .dat files.
	 */
	private async nointro(): Promise<void> {
		const folder: string = 'dat/no-intro';
		const newFiles: string[] = [];

		// Check if there exist .dat files the in no-intro folder

		const textDat: { file: string; content: string }[] = await (
			window as any
		).electron.ipcRenderer.invoke('readDatDirectory', folder, 'dat');

		if (textDat.length) {
			for (const datText of textDat) {
				const jsonFileName: string = datText.file.replace(/\.dat$/i, '.json');

				const exists: boolean = await (
					window as any
				).electron.ipcRenderer.invoke('checkFile', jsonFileName, folder);

				if (!exists) {
					const data: data[] = Downloader.parseXML(datText.content, 'no-intro');

					if (data[0]) {
						const saved: boolean = await (
							window as any
						).electron.ipcRenderer.invoke(
							'saveDatFile',
							jsonFileName,
							folder,
							JSON.stringify(data),
						);

						if (saved) {
							this.systems.push({
								file: `dat/no-intro/${jsonFileName}`,
								name: data[0].system,
							});

							this.loaded++;
							newFiles.push(jsonFileName);

							this.logger.add(`Parsed DAT file "${datText.file}"`, 'success');

							await (window as any).electron.ipcRenderer.invoke(
								'deleteDatFile',
								datText.file,
								folder,
							);
						} else {
							this.logger.add(
								`Failed to parse data from "${datText.file}"`,
								'error',
							);
						}
					} else {
						await (window as any).electron.ipcRenderer.invoke(
							'deleteDatFile',
							datText.file,
							folder,
						);
					}
				}
			}
		}

		const text: { file: string; content: string }[] = await (
			window as any
		).electron.ipcRenderer.invoke('readDatDirectory', folder, 'json');

		this.total = text.length;

		for (const jsonText of text) {
			if (!newFiles.includes(jsonText.file)) {
				const data: data[] = JSON.parse(jsonText.content);

				this.systems.push({
					file: `dat/no-intro/${jsonText.file}`,
					name: data[0].system,
				});
				this.loaded++;

				this.logger.add(
					`Loaded JSON file <i>"${jsonText.file}"</i>`,
					'success',
				);
			}
		}

		this.logger.add(`Loaded ${this.loaded}/${this.total} JSON files`);
	}

	/**
	 * Downloads DAT files from the Redump website if they do not already exist locally and saves them as JSON files that follow the structure of the `data` interface.
	 */
	private async redump(): Promise<void> {
		const folder: string = 'dat/redump';
		const urls: string[] = await this.getPathURLs();

		this.total = urls.length;

		try {
			for (const url of urls) {
				const baseName: string = url
					.replace('http://redump.org/datfile/', '')
					.replace(/\/+$/, '');

				const datFileName: string = baseName + '.dat';
				const jsonFileName: string = baseName + '.json';

				const exists: boolean = await (
					window as any
				).electron.ipcRenderer.invoke('checkFile', jsonFileName, folder);

				if (!exists) {
					let dataFetched: ArrayBuffer | undefined;

					if (!this.requireAuthentication[baseName]) {
						dataFetched = await this.fetch(url + datFileName);
					}

					if (dataFetched) {
						const xmlText: string | undefined =
							await Downloader.unzip(dataFetched);

						if (xmlText) {
							const data: data[] = Downloader.parseXML(xmlText, 'redump');

							if (data.length) {
								const saved: boolean = await (
									window as any
								).electron.ipcRenderer.invoke(
									'saveDatFile',
									jsonFileName,
									folder,
									JSON.stringify(data),
								);

								if (saved) {
									this.systems.push({
										file: `dat/redump/${jsonFileName}`,
										name: data[0].system,
									});
									this.loaded++;

									this.logger.add(
										`Downloaded and saved DAT file "${datFileName}" from "${url}"`,
										'success',
									);
								} else {
									this.logger.add(
										`Failed to parse data from "${url}"`,
										'error',
									);
								}
							} else {
								this.logger.add(
									`Failed to save DAT file from "${url}"`,
									'error',
								);
							}
						} else {
							this.logger.add(
								`Failed to unzip DAT file from "${url}"`,
								'error',
							);
							this.logger.add(
								'It probably requires authentication and dumper status',
								'error',
							);

							this.requireAuthentication[baseName] = true;
							this.storeRequireAuthentication(this.requireAuthentication);
						}
					} else if (!this.requireAuthentication[baseName]) {
						this.logger.add(`Failed to fetch files from "${url}"`, 'error');
					} else {
						this.logger.add(
							`Skipping "${datFileName}" as it requires authentication and dumper status`,
							'error',
						);
					}
				} else {
					this.logger.add(
						`Loaded JSON file <i>"${jsonFileName}"</i>`,
						'success',
					);

					const jsonText: string = await (
						window as any
					).electron.ipcRenderer.invoke('readDatFile', jsonFileName, folder);

					const data: data[] = JSON.parse(jsonText);
					this.systems.push({
						file: `dat/redump/${jsonFileName}`,
						name: data[0].system,
					});
					this.loaded++;
				}
			}
		} catch (err: any) {
			this.logger.add(`There was an error downloading DAT files`, 'error');
			console.error(err);
		}

		this.logger.add(`Loaded ${this.loaded}/${this.total} JSON files`);
	}

	/**
	 * Fetches a DAT file from the specified Redump URL
	 * @param {string} url The URL to fetch the DAT file from
	 * @returns {Promise<ArrayBuffer | undefined>} A promise that resolves to the ArrayBuffer of the fetched file, or undefined if the fetch failed
	 */
	private async fetch(url: string): Promise<ArrayBuffer | undefined> {
		try {
			if (this.cookies) {
				const ab: ArrayBuffer = await (
					window as any
				).electron.ipcRenderer.invoke('redumpCookieFetch', url, this.cookies);
				if (ab) return ab;
			} else {
				const res: Response = await fetch(url);
				if (res.ok) return await res.arrayBuffer();
			}
		} catch (err: any) {
			console.error(err);
		}
	}

	/**
	 * Unzips a ZIP file and extracts the DAT file
	 * @param {ArrayBuffer} zipData The ArrayBuffer of the ZIP file containing the DAT file
	 * @returns {Promise<string | undefined>} A promise that resolves to the text content of the extracted DAT file, or undefined if the extraction failed
	 */
	private static async unzip(
		zipData: ArrayBuffer,
	): Promise<string | undefined> {
		try {
			const zip: JSZip = await JSZip.loadAsync(zipData);

			const datFileName: string =
				Object.keys(zip.files).find((name: string): boolean =>
					name.endsWith('.dat'),
				) ?? '';

			if (datFileName) return await zip.files[datFileName].async('text');
		} catch (err: any) {
			if (!err.message.includes('is a zip')) console.error(err);
		}
	}

	/**
	 * Parses the XML text content of a DAT file to an object of the `data` interface
	 * @param {string} xmlText The XML text content of the DAT file
	 * @param {string} dir The directory (e.g., "redump" or "no-intro") to prepend to the system name
	 * @returns {data[]} An array of data objects extracted from the DAT file
	 */
	private static parseXML(xmlText: string, dir: string): data[] {
		const parser: DOMParser = new DOMParser();
		const xmlDoc: Document = parser.parseFromString(xmlText, 'text/xml');

		const roms: HTMLCollectionOf<Element> = xmlDoc.getElementsByTagName('rom');
		const data: data[] = [];
		const system: string =
			dir + '/' + xmlDoc.getElementsByTagName('name')?.[0]?.textContent || '';

		Array.from(roms).forEach((rom: Element): void => {
			const sha1: string | null = rom.getAttribute('sha1') ?? '';
			const name: string = rom.getAttribute('name') ?? '';
			const extension: string =
				name.split('.').pop()?.toLocaleLowerCase() ?? '';
			const size: number = parseInt(rom.getAttribute('size') ?? '0', 10);

			data.push({ sha1, name, extension, system, size });
		});

		return data;
	}
}

export default Downloader;
export { systemData };
