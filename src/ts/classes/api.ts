import { apiDataGames, apiDataPlatforms } from '../types.js';
import Logger from './logger.js';
import { closest } from 'fastest-levenshtein';

export default class API {
	private apiKey: string = '';
	private apiUrl: string = 'https://api.thegamesdb.net/v1';
	private imagesUrl: string =
		'https://cdn.thegamesdb.net/images/thumb/boxart/front';
	private logger: Logger;

	/**
	 * Class constructor
	 * @param {Logger} logger An instance of the Logger class to log messages to the console
	 */
	constructor(logger: Logger) {
		this.logger = logger;
	}

	/**
	 * Opens a prompt to insert the API key and saves it for future use
	 * @returns {boolean} `True` if the key was successfully inserted, `false` otherwise
	 */
	public async getKey(): Promise<boolean> {
		this.apiKey = await (window as any).electron.ipcRenderer.invoke('getKey');

		this.logger.add('Games DB API key saved successfully');
		this.logger.add('Testing Games DB API key...');

		if (await this.testApiKey()) {
			this.logger.add('Games DB API key is valid', 'success');
			return true;
		} else {
			this.logger.add('Games DB API key is invalid', 'error');
			this.apiKey = '';
			return false;
		}
	}

	/**
	 * Tests the validity of the API key
	 * @returns {boolean} `True` if successful, `false` otherwise
	 */
	public async testApiKey(): Promise<boolean> {
		try {
			const res: Response = await fetch(
				`${this.apiUrl}/Platforms?apikey=${this.apiKey}`,
			);

			if (res.ok) {
				return true;
			} else {
				return false;
			}
		} catch (err: any) {
			this.logger.add(
				`Error testing Games DB API key: ${err.message}`,
				'error',
			);
			return false;
		}
	}

	/**
	 * Fetches the platform ID that matches the name the closest
	 * @param {string} platform The name of the platform to search for
	 * @returns {Promise<number | null>} The ID of the closest matching platform, or null if not found
	 */
	public async getPlatformId(platform: string): Promise<number | null> {
		try {
			const res: Response = await fetch(
				`${this.apiUrl}/ByPlatformName?apikey=${this.apiKey}&name=${encodeURIComponent(platform)}`,
			);

			if (res.ok) {
				const data: apiDataPlatforms = await res.json();
				const platforms: { name: string; id: number; alias: string }[] =
					data.data.games;

				const platformNames: string[] = platforms.map(
					(p: { name: string; id: number; alias: string }): string => p.name,
				);

				const match: string = closest(platform, platformNames);

				return (
					platforms.find(
						(p: { name: string; id: number; alias: string }): boolean =>
							p.name === match,
					)?.id || null
				);
			} else {
				this.logger.add(`Error fetching platform: ${res.statusText}`, 'error');
				return null;
			}
		} catch (err: any) {
			this.logger.add(`Error fetching platform: ${err.message}`, 'error');
			return null;
		}
	}

	/**
	 * Fetches the game ID that matches the name the closest for a given platform
	 * @param {number} platformId The ID of the platform to search the game in
	 * @param {string} gameName The name of the game to search for
	 * @returns {Promise<number | null>} The ID of the closest matching game, or null if not found
	 */
	public async getGameByName(
		platformId: number,
		gameName: string,
	): Promise<number | null> {
		try {
			const res: Response = await fetch(
				`${this.apiUrl}/ByGameName?apikey=${this.apiKey}&filter[platform]=${platformId}&name=${encodeURIComponent(gameName)}`,
			);

			if (res.ok) {
				const data: apiDataGames = await res.json();
				const games: { game_title: string; id: number }[] = data.data.games;

				const gameNames: string[] = games.map(
					(g: { game_title: string; id: number }): string => g.game_title,
				);

				const match: string = closest(gameName, gameNames);

				return (
					games.find(
						(g: { game_title: string; id: number }): boolean =>
							g.game_title === match,
					)?.id || null
				);
			} else {
				this.logger.add(`Error fetching game: ${res.statusText}`, 'error');
				return null;
			}
		} catch (err: any) {
			this.logger.add(`Error fetching game: ${err.message}`, 'error');
			return null;
		}
	}

	/**
	 * Gets the image of a game by its ID and returns it as a base64 string
	 * @param {number} gameId The ID of the game to fetch the image for
	 * @returns {Promise<string | null>} The base64 string of the game image, or null if not found or an error occurs
	 */
	public async getImageByGameId(gameId: number): Promise<string | null> {
		try {
			const res: Response = await fetch(`${this.imagesUrl}/${gameId}-1.jpg`);

			if (res.ok) {
				const blob: Blob = await res.blob();
				const buffer: Buffer = Buffer.from(await blob.arrayBuffer());
				return 'data:image/jpeg;base64,' + buffer.toString('base64');
			} else {
				this.logger.add(
					`Error fetching game image: ${res.statusText}`,
					'error',
				);
				return null;
			}
		} catch (err: any) {
			this.logger.add(`Error fetching game image: ${err.message}`, 'error');
			return null;
		}
	}
}
