import { log, logLine } from './renderer.js';
import $ from 'jquery';
import type { data } from './types.js';

class Verifier {
	// COUNTERS

	private total: number = 0;
	private successful: number = 0;

	// GETTERS

	/**
	 * Gets the total number of verifications performed
	 * @returns {number} The total number of verifications performed
	 */
	public _total(): number {
		return this.total;
	}

	/**
	 * Gets the number of successful verifications
	 * @returns {number} The number of successful verifications
	 */
	public _successful(): number {
		return this.successful;
	}

	// FILE PATHS AND NAMES

	private data: data[] = [];
	private readonly filepaths: string[];
	private readonly system: string;
	private readonly game: string;
	private readonly extensions: string[] = [];

	/**
	 * Class constructor
	 * @param {string[]} filepaths The file paths of the files to verify
	 * @param {string} system The system that the files belong to
	 * @param {string} game The game that the file supposedly represents
	 */
	constructor(filepaths: string[], system: string, game: string) {
		this.filepaths = filepaths;
		this.system = system;
		this.game = game;
		this.extensions = filepaths.map(
			(filepath: string): string =>
				filepath.split('.').pop()?.toLocaleLowerCase() ?? '',
		);
	}

	/**
	 * Initializes the verification process by retrieving the data and verifying each file
	 */
	public async init(): Promise<void> {
		this.data = await this.getData();

		for (let i: number = 0; i < this.filepaths.length; i++) {
			await this.verify(this.filepaths[i], this.extensions[i]);
		}
	}

	/**
	 * Verifies the validity of a dump by calculating its SHA1 hash and checking it against the provided data
	 * @param {string} filepath The path to the file to verify
	 * @param {string} extension The file extension to filter the data by
	 */
	private async verify(filepath: string, extension: string): Promise<void> {
		this.total++;

		// Logging the loading bar

		logLine();
		log(`Verifying <i>"${filepath}"</i>...`);
		log(
			`<span class='message'>Calculating SHA1:</span> <span class='progress-bar'></span> <span class='info'><span class='info__percentage'>0</span> <span class='info__loading'></span></span>`,
			'normal',
			true,
			false,
		);

		const coordsMsg: DOMRect = $('.message').last()[0].getBoundingClientRect();
		const coordsPer: DOMRect = $('.info').last()[0].getBoundingClientRect();
		const gap: number = coordsPer.x - (coordsMsg.x + coordsMsg.width) - 40;

		let loadingBar: string = '';
		const nSegments: number = Math.floor(gap / 12);

		for (let i: number = 0; i < nSegments; i++) {
			loadingBar += '<span class="progress-bar__segment"></span>';
		}

		$('.progress-bar').last().html(loadingBar);

		// Starting with the verification process

		let sha1: string = await (window as any).electron.ipcRenderer.invoke(
			'hash',
			filepath,
		);
		let found: boolean = false;
		let name: string = '';
		let system: string = '';

		if (this.game && this.system) {
			const gameData: data | undefined = this.findGame();

			if (gameData) {
				const byteOffset: number = 20;

				for (let i: number = 0; i < byteOffset; i++) {
					const hashTemp: string = await (
						window as any
					).electron.ipcRenderer.invoke(
						'hash',
						filepath,
						i,
						gameData.size - 1 + i,
					);

					// console.log(gameData.sha1, hashTemp, hashTemp === gameData.sha1);

					if (hashTemp === gameData.sha1) {
						sha1 = hashTemp;
						found = true;
						name = gameData.name;
						system = gameData.system;
						break;
					} else if (extension !== 'bin' && this.system !== 'psx.json') {
						break; // If the extension is not 'bin', we stop checking further
					}
				}
			}
		} else {
			const filteredData: data[] = this.system
				? this.data
				: this.filterDataByExtension(extension);
			const gameData: data | null = this.findData(sha1, filteredData);

			if (gameData) {
				found = true;
				sha1 = gameData.sha1;
				name = gameData.name;
				system = gameData.system;
			}
		}

		found ? this.successful++ : null;

		log(`Calculated SHA1: <i>"${sha1}"</i>`);
		log(
			`${found ? `Match found: <i>"${name}"</i> (${system})` : 'No match found'}`,
			found ? 'success' : 'error',
		);
		logLine();
	}

	/**
	 * Retrieves the data for the specified system
	 * @returns {Promise<data[]>} A promise that resolves to an array of objects of the `data` interface
	 */
	private async getData(): Promise<data[]> {
		let data: data[] = [];

		if (this.system) {
			const textRedump: { file: string; content: string }[] = await (
				window as any
			).electron.ipcRenderer.invoke('readDatDirectory', 'dat/redump', 'json');

			const textNoIntro: { file: string; content: string }[] = await (
				window as any
			).electron.ipcRenderer.invoke('readDatDirectory', 'dat/no-intro', 'json');
			data = [...textRedump, ...textNoIntro].flatMap(
				(e: { file: string; content: string }): any =>
					e.content ? JSON.parse(e.content) : [],
			);
		} else {
			const parts: string[] = this.system.split('/');
			const folder: string = parts[1];
			const file: string = parts[2];

			const text: string = await (window as any).electron.ipcRenderer.invoke(
				'readDatFile',
				file,
				`dat/${folder}`,
			);
			data = JSON.parse(text);
		}

		return data;
	}

	/**
	 * Filters the data by file extension
	 * @param {string} extension The file extension to filter the data by
	 * @returns {data[]} An array of data objects that match the specified extension
	 */
	private filterDataByExtension(extension: string): data[] {
		return this.data.filter((e: data): boolean => e.extension === extension);
	}

	/**
	 * Finds the data object that matches the specified SHA1 hash
	 * @param {string} sha1 The SHA1 hash to search for
	 * @param {data[]} filteredData The array of data objects to search within
	 * @returns {data | null} The matching data object, or null if not found
	 */
	private findData(sha1: string, filteredData: data[]): data | null {
		if (!sha1) return null;
		return filteredData.find((e: data): boolean => e.sha1 === sha1) ?? null;
	}

	/**
	 * Finds the data object for the specified game
	 * @returns {data | undefined} The data object for the specified game, or undefined if there is no game
	 */
	private findGame(): data | undefined {
		if (this.game && this.system) {
			return this.data.find((e: data): boolean => e.name === this.game);
		}
	}
}

export default Verifier;
export { data };
