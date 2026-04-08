import { apiResponseGames, apiResponsePlatforms } from '../types.js';
import Logger from './logger.js';
import { closest } from 'fastest-levenshtein';

export default class API {
	private static readonly service: string = 'GamesDBAPI';
	private static readonly account: string = 'apiKey';

	private apiUrl: string = 'https://api.thegamesdb.net/v1';
	private imagesUrl: string =
		'https://cdn.thegamesdb.net/images/thumb/boxart/front';
	private logger: Logger;

	private platformIdCache: { [key: string]: number } = {};
	private gameIdCache: { [key: string]: number } = {};

	/**
	 * Class constructor
	 * @param {Logger} logger An instance of the Logger class to log messages to the console
	 */
	constructor(logger: Logger) {
		this.logger = logger;
		this.initializeCache();
	}

	/**
	 * Initializes the platform and game ID caches by retrieving them from local storage, if they exist, to improve performance of API queries
	 */
	private initializeCache(): void {
		try {
			const platformCacheString: string | null =
				localStorage.getItem('platformIdCache');
			const gameCacheString: string | null =
				localStorage.getItem('gameIdCache');

			if (platformCacheString) {
				this.platformIdCache = JSON.parse(platformCacheString);
			}

			if (gameCacheString) {
				this.gameIdCache = JSON.parse(gameCacheString);
			}
		} catch (err: any) {
			console.error('Error initializing cache:', err);
		}
	}

	/**
	 * Stores the platform ID cache in local storage to improve performance of future queries
	 */
	private storeCachePlatform(): void {
		try {
			const cacheString: string = JSON.stringify(this.platformIdCache);
			localStorage.setItem('platformIdCache', cacheString);
		} catch (err: any) {
			this.logger.add('Error storing platform ID cache', 'error');
			console.error('Error storing platform ID cache:', err);
		}
	}

	/**
	 * Stores the game ID cache in local storage to improve performance of future queries
	 */
	private storeCacheGame(): void {
		try {
			const cacheString: string = JSON.stringify(this.gameIdCache);
			localStorage.setItem('gameIdCache', cacheString);
		} catch (err: any) {
			this.logger.add('Error storing game ID cache', 'error');
			console.error('Error storing game ID cache:', err);
		}
	}

	/**
	 * Opens a prompt to insert the API key and saves it for future use
	 * @returns {boolean} `True` if the key was successfully inserted, `false` otherwise
	 */
	public async getKey(): Promise<boolean> {
		const key: string = await (window as any).electron.ipcRenderer.invoke(
			'getKey',
		);

		this.logger.add('Games DB API key saved successfully');
		this.logger.add('Testing Games DB API key...');

		if (!key) {
			this.logger.add('No API key provided');
			return false;
		} else {
			if (await this.testApiKey(key)) {
				this.logger.add('Games DB API key is valid', 'success');
				await this.storeApiKey(key);
				return true;
			} else {
				this.logger.add('Games DB API key is invalid', 'error');
				return false;
			}
		}
	}

	/**
	 * Deletes the API key from secure storage
	 */
	public static async deleteApiKey(): Promise<void> {
		try {
			await (window as any).electron.ipcRenderer.invoke(
				'deleteFromKeytar',
				API.service,
				API.account,
			);
		} catch (err: any) {
			console.error('Error deleting API key:', err);
			throw err;
		}
	}

	/**
	 * Stores the API key securely using keytar
	 * @param {string} key The API key to store
	 */
	private async storeApiKey(key: string): Promise<void> {
		try {
			await (window as any).electron.ipcRenderer.invoke(
				'storeInKeytar',
				API.service,
				API.account,
				key,
			);
			this.logger.add('API key stored', 'success');
		} catch (err: any) {
			this.logger.add('Error storing API key', 'error');
			console.error('Error storing API key:', err);
			throw err;
		}
	}

	/**
	 * Retrieves the API key from secure storage using keytar
	 * @returns {string | null} The retrieved API key, or null if not found
	 */
	private async retrieveApiKey(): Promise<string | null> {
		try {
			const key: string | null = await (
				window as any
			).electron.ipcRenderer.invoke('getFromKeytar', API.service, API.account);

			if (key) {
				return key;
			} else {
				return null;
			}
		} catch (err: any) {
			this.logger.add('Error retrieving API key', 'error');
			console.error('Error retrieving API key:', err);
			throw err;
		}
	}

	/**
	 * Checks if the API key exists in secure storage
	 * @returns {boolean} `True` if the API key exists, `false` otherwise
	 */
	public async existsApiKey(): Promise<boolean> {
		const key: string | null = await this.retrieveApiKey();

		if (key !== null) {
			return true;
		} else {
			if (!key && key !== null) {
				await API.deleteApiKey();
			}

			return false;
		}
	}

	/**
	 * Tests the validity of the API key
	 * @param {string} key The API key to test
	 * @returns {boolean} `True` if successful, `false` otherwise
	 */
	private async testApiKey(key: string): Promise<boolean> {
		if (!key) {
			return false;
		}

		try {
			const res: Response = await fetch(
				`${this.apiUrl}/Platforms?apikey=${key}`,
			);

			if (res.ok) {
				return true;
			} else {
				return false;
			}
		} catch (err: any) {
			this.logger.add('Error testing Games DB API key', 'error');
			console.error('Error testing Games DB API key:', err);
			return false;
		}
	}

	/**
	 * Fetches the platform ID that matches the name the closest
	 * @param {string} platform The name of the platform to search for
	 * @returns {Promise<number | null>} The ID of the closest matching platform, or null if not found
	 */
	private async getPlatformId(platform: string): Promise<number | null> {
		const key: string | null = await this.retrieveApiKey();

		if (!key) {
			return null;
		}

		// Formatting the platform name to improve the chances of a successful match

		const formattedPlatform: string = this.platformFormatter(platform);

		// Checking cache first

		if (this.platformIdCache[formattedPlatform]) {
			return this.platformIdCache[formattedPlatform];
		}

		try {
			const res: Response = await fetch(
				`${this.apiUrl}/Platforms/ByPlatformName?apikey=${key}&name=${encodeURIComponent(formattedPlatform)}`,
			);

			if (res.ok) {
				const data: apiResponsePlatforms = await res.json();

				const platforms: { name: string; id: number; alias: string }[] =
					data.data.platforms;

				const platformNames: string[] = platforms.map(
					(p: { name: string; id: number; alias: string }): string => p.name,
				);

				const match: string = closest(formattedPlatform, platformNames);
				const found: number | null =
					platforms.find(
						(p: { name: string; id: number; alias: string }): boolean =>
							p.name === match,
					)?.id || null;

				if (found) {
					this.platformIdCache[formattedPlatform] = found;
					this.storeCachePlatform();
				}

				return found;
			} else {
				this.logger.add(`Error fetching platform: ${res.statusText}`, 'error');
				return null;
			}
		} catch (err: any) {
			this.logger.add('Error fetching platform', 'error');
			console.error('Error fetching platform:', err);
			return null;
		}
	}

	/**
	 * Fetches the game ID that matches the name the closest for a given platform
	 * @param {number} platformId The ID of the platform to search the game in
	 * @param {string} gameName The name of the game to search for
	 * @returns {Promise<number | null>} The ID of the closest matching game, or null if not found
	 */
	private async getGameByName(
		platformId: number,
		gameName: string,
	): Promise<number | null> {
		const key: string | null = await this.retrieveApiKey();

		if (!key) {
			return null;
		}

		// Formatting the game name to improve the chances of a successful match

		const formattedGameName: string = this.gameFormatter(gameName);

		// Checking cache first

		const cacheKey: string = `${platformId}-${formattedGameName}`;

		if (this.gameIdCache[cacheKey]) {
			return this.gameIdCache[cacheKey];
		}

		try {
			const res: Response = await fetch(
				`${this.apiUrl}/Games/ByGameName?apikey=${key}&filter[platform]=${platformId}&name=${encodeURIComponent(formattedGameName)}`,
			);

			if (res.ok) {
				const data: apiResponseGames = await res.json();
				const games: { game_title: string; id: number }[] = data.data.games;

				const gameNames: string[] = games.map(
					(g: { game_title: string; id: number }): string => g.game_title,
				);

				const match: string = closest(formattedGameName, gameNames);
				const found: number | null =
					games.find(
						(g: { game_title: string; id: number }): boolean =>
							g.game_title === match,
					)?.id || null;

				if (found) {
					this.gameIdCache[cacheKey] = found;
					this.storeCacheGame();
				}

				return found;
			} else {
				this.logger.add(`Error fetching game: ${res.statusText}`, 'error');
				return null;
			}
		} catch (err: any) {
			this.logger.add('Error fetching game', 'error');
			console.error('Error fetching game:', err);
			return null;
		}
	}

	/**
	 * Gets the image of a game by its ID and returns it as a base64 string
	 * @param {string} platform The name of the platform the game belongs to
	 * @param {string} game The name of the game to fetch the image for
	 * @returns {Promise<{ base64: string, aspectRatio: string } | null>} The base64 string of the game image and its aspect ratio, or null if not found or an error occurs
	 */
	public async getImage(
		platform: string,
		game: string,
	): Promise<{ base64: string; aspectRatio: string } | null> {
		// Getting the platform ID

		const platformId: number | null = await this.getPlatformId(platform);

		if (platformId === null) {
			this.logger.add(`Cannot fetch game image: platform not found`, 'error');
			return null;
		}

		// Getting the game ID

		const gameId: number | null = await this.getGameByName(platformId, game);

		if (gameId === null) {
			this.logger.add(`Cannot fetch game image: game not found`, 'error');
			return null;
		}

		// Getting the image from the website

		try {
			const res: Response = await fetch(`${this.imagesUrl}/${gameId}-1.jpg`);

			if (res.ok) {
				const blob: Blob = await res.blob();
				const arrayBuffer: ArrayBuffer = await blob.arrayBuffer();
				const uint8Array: Uint8Array = new Uint8Array(arrayBuffer);
				const binaryString: string = String.fromCharCode.apply(
					null,
					Array.from(uint8Array),
				);

				const img: HTMLImageElement = new Image();

				const aspectRatio: string = await new Promise<string>(
					(resolve: (aspectRatio: string) => void): void => {
						img.onload = (): void => resolve(`${img.width} / ${img.height}`);
						img.onerror = (): void => resolve('1');
						img.src = `data:image/jpeg;base64,${btoa(binaryString)}`;
					},
				);

				return {
					base64: btoa(binaryString),
					aspectRatio: aspectRatio,
				};
			} else {
				const res: Response = await fetch(`${this.imagesUrl}/${gameId}-2.jpg`);

				if (res.ok) {
					const blob: Blob = await res.blob();
					const arrayBuffer: ArrayBuffer = await blob.arrayBuffer();
					const uint8Array: Uint8Array = new Uint8Array(arrayBuffer);
					const binaryString: string = String.fromCharCode.apply(
						null,
						Array.from(uint8Array),
					);

					const img: HTMLImageElement = new Image();

					const aspectRatio: string = await new Promise<string>(
						(resolve: (aspectRatio: string) => void): void => {
							img.onload = (): void => resolve(`${img.width} / ${img.height}`);
							img.onerror = (): void => resolve('1');
							img.src = `data:image/jpeg;base64,${btoa(binaryString)}`;
						},
					);

					return {
						base64: btoa(binaryString),
						aspectRatio: aspectRatio,
					};
				} else {
					this.logger.add(
						`Error fetching game image: ${res.statusText}`,
						'error',
					);
					return null;
				}
			}
		} catch (err: any) {
			this.logger.add('Error fetching game image', 'error');
			console.error('Error fetching game image:', err);
			return null;
		}
	}

	/**
	 * Formats the platform string by removing unnecessary characters and formatting it to match the expected format for API queries
	 * @param {string} platform The platform string to format
	 * @returns {string} The formatted platform string
	 */
	private platformFormatter(platform: string): string {
		const platformTemp: string =
			platform.split('/')?.[1]?.trim()?.replace(/: /g, '')?.toLowerCase() ?? '';

		const platformTemp2: string = platformTemp.includes('-')
			? platformTemp.split('-')?.[1]?.trim()
			: platformTemp;

		return platformTemp2;
	}

	/**
	 * Formats the game string by removing unnecessary characters and formatting it to match the expected format for API queries
	 * @param {string} game The game string to format
	 * @returns {string} The formatted game string
	 */
	private gameFormatter(game: string): string {
		const gameNameTemp: string = game
			.replace(/\([\w+\s-]+\)/g, '')
			.replace(/\[\w+\]/g, '')
			.replace(/\.[a-zA-Z0-9]+$/, '')
			.replace(/,/g, '')
			.trim()
			.toLowerCase();

		const gameNameTemp2: string = gameNameTemp.includes('-')
			? gameNameTemp.split('-')?.[1]?.trim()
			: gameNameTemp;

		return gameNameTemp2;
	}
}
