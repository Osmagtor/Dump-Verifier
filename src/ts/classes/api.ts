import { apiResponseGames, apiResponsePlatforms, dataGames } from '../types.js';
import Logger from './logger.js';
import { closest } from 'fastest-levenshtein';
import { countries, ICountry } from 'countries-list';

export default class API {
	private static readonly service: string = 'GamesDBAPI';
	private static readonly account: string = 'apiKey';

	private apiUrl: string = 'https://api.thegamesdb.net/v1';
	private imagesUrl: string =
		'https://cdn.thegamesdb.net/images/thumb/boxart/front';
	private logger: Logger;

	private platformIdCache: { [key: string]: number } = {};
	private gameIdCache: { [key: string]: number } = {};
	private failedCache: { [key: string]: boolean } = {};

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
			const failedCacheString: string | null =
				localStorage.getItem('failedCache');

			if (platformCacheString) {
				this.platformIdCache = JSON.parse(platformCacheString);
			}

			if (gameCacheString) {
				this.gameIdCache = JSON.parse(gameCacheString);
			}

			if (failedCacheString) {
				this.failedCache = JSON.parse(failedCacheString);
			}
		} catch (err: any) {
			console.error('Error initializing cache:', err);
		}
	}

	/**
	 * Stores the failed queries cache in local storage to avoid repeating failed queries in the future and improve performance
	 */
	private storeFailedCache(): void {
		try {
			const cacheString: string = JSON.stringify(this.failedCache);
			localStorage.setItem('failedCache', cacheString);
		} catch (err: any) {
			console.error('Error storing failed cache:', err);
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
			console.error('Error storing game ID cache:', err);
		}
	}

	/**
	 * Clears all caches
	 */
	public clearAllCache(): void {
		this.platformIdCache = {};
		this.gameIdCache = {};
		this.failedCache = {};
		this.storeCachePlatform();
		this.storeCacheGame();
		this.storeFailedCache();

		this.logger.emptyLine();
		this.logger.add('All caches cleared', 'success');
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
			return this.existsApiKey();
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
		} else if (this.failedCache[formattedPlatform]) {
			return null;
		}

		// Generating list of names to try (with hyphen fallback)

		const namesToTry: string[] = [];

		namesToTry.push(formattedPlatform);

		if (formattedPlatform.includes('-')) {
			const parts: string[] = formattedPlatform.split('-');

			parts.reverse().forEach((part: string): void => {
				namesToTry.push(part.trim());
			});
		}

		for (const nameToTry of namesToTry) {
			try {
				const res: Response = await fetch(
					`${this.apiUrl}/Platforms/ByPlatformName?apikey=${key}&name=${encodeURIComponent(nameToTry)}`,
				);

				if (res.ok) {
					const data: apiResponsePlatforms = await res.json();

					const platforms: { name: string; id: number; alias: string }[] =
						data.data.platforms;

					if (!platforms.length) {
						continue;
					}

					const platformNames: string[] = platforms.map(
						(p: { name: string; id: number; alias: string }): string =>
							p.name.toLowerCase().replace(/\s/g, ''),
					);

					const match: string = closest(formattedPlatform, platformNames)
						.toLowerCase()
						.replace(/\s/g, '');

					const found: number | null =
						platformNames
							.map((p: string, i: number): number | undefined => {
								if (p === match) {
									return platforms[i].id;
								}
							})
							.filter((v): v is number => !!v)[0] ?? null;

					if (found) {
						this.platformIdCache[formattedPlatform] = found;
						this.storeCachePlatform();
						return found;
					}
				}
			} catch (err: any) {
				this.logger.add('Error fetching platform', 'error');
				console.error('Error fetching platform:', err);
			}
		}

		this.failedCache[formattedPlatform] = true;
		this.storeFailedCache();
		return null;
	}

	/**
	 * Gets the region of a game
	 * @param {string} unformattedGameName The unformatted name of the game to get the region from
	 * @returns {number[]} An array of region IDs corresponding to the regions the game belongs to, based on its name
	 */
	private getRegions(unformattedGameName: string): number[] {
		const matchParentheses: RegExpMatchArray | null =
			unformattedGameName.match(/\(([^)]+)\)/);
		const matchBrackets: RegExpMatchArray | null =
			unformattedGameName.match(/\[([^)]+)\]/);

		let valueBrackets: string[] = [];
		let valueParentheses: string[] = [];

		let regions: number[] = [];

		if (matchParentheses) {
			valueParentheses = matchParentheses[1]
				.split(',')
				.map((v: string): string =>
					v.trim() === 'USA'
						? 'United States'
						: v.trim() === 'UK'
							? 'United Kingdom'
							: v.trim() === 'Korea'
								? 'South Korea'
								: v.trim(),
				)
				.filter(
					(v: string): boolean =>
						v.length > 2 &&
						!v.toLowerCase().includes('disc') &&
						!v.toLowerCase().includes('track'),
				);
		} else if (matchBrackets) {
			valueBrackets = matchBrackets[1]
				.split(',')
				.map((v: string): string =>
					v.trim() === 'USA'
						? 'United States'
						: v.trim() === 'UK'
							? 'United Kingdom'
							: v.trim() === 'Korea'
								? 'South Korea'
								: v.trim(),
				)
				.filter(
					(v: string): boolean =>
						v.length > 2 &&
						!v.toLowerCase().includes('disc') &&
						!v.toLowerCase().includes('track'),
				);
		}

		for (const v of [...valueBrackets, ...valueParentheses]) {
			let continent: string = '';
			let country: ICountry | undefined = Object.values(countries).find(
				(c: ICountry): boolean =>
					c.name.toLowerCase() === v.toLowerCase() ||
					c.native.toLowerCase() === v.toLowerCase(),
			);

			// The name might not be that of a country's but a continent's

			if (!country) {
				if (v.toLowerCase().includes('europe')) {
					continent = 'EU';
				} else if (v.toLowerCase().includes('america')) {
					continent = 'NA';
				} else if (v.toLowerCase().includes('asia')) {
					continent = 'AS';
				} else if (v.toLowerCase().includes('africa')) {
					continent = 'AF';
				} else if (v.toLowerCase().includes('oceania')) {
					continent = 'OC';
				}
			} else {
				continent = country.continent;
			}

			if (continent) {
				/**
				 * Region mapping from: api.thegamesdb.net/v1/Regions
				 * 1: NTSC
				 * 2: NTSC-U
				 * 3: NTSC-C
				 * 4: NTSC-J
				 * 5: NTSC-K
				 * 6: PAL
				 * 7: PAL-A
				 * 8: PAL-B
				 * 9: Other
				 */

				switch (continent) {
					case 'EU':
					case 'OC':
					case 'AF':
						regions = [...regions, 6, 7, 8];
						break;
					case 'NA':
					case 'SA':
						regions = [...regions, 1, 2];
						break;
					case 'AS':
						if (country?.name.toLowerCase() === 'china') {
							regions = [...regions, 3, 4];
						} else if (country?.name.toLowerCase() === 'south korea') {
							regions = [...regions, 5, 4];
						} else {
							regions = [...regions, 4];
						}
						break;
					default:
						regions = [...regions, 9, 0];
						break;
				}
			}
		}

		// Removing duplicates

		return Array.from(new Set(regions));
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

		// Getting the regions for the game

		const regions: number[] = this.getRegions(gameName);

		// Checking cache first

		const cacheKey: string = `${platformId}-${gameName}-${regions.join(',')}`;

		if (this.gameIdCache[cacheKey]) {
			return this.gameIdCache[cacheKey];
		} else if (this.failedCache[cacheKey]) {
			return null;
		}

		// Formatting the game name to improve the chances of a successful match

		const formattedGameName: string = this.gameFormatter(gameName);

		// Generating list of names to try (with hyphen fallback)

		const namesToTry: string[] = [];

		namesToTry.push(formattedGameName);

		if (formattedGameName.includes('-')) {
			const parts: string[] = formattedGameName.split('-');

			parts.reverse().forEach((part: string): void => {
				namesToTry.push(part.trim());
			});
		}

		for (const nameToTry of namesToTry) {
			try {
				const res: Response = await fetch(
					`${this.apiUrl}/Games/ByGameName?apikey=${key}&filter[platform]=${platformId}&name=${encodeURIComponent(nameToTry)}`,
				);

				if (res.ok) {
					const data: apiResponseGames = await res.json();
					const games: dataGames[] = data.data.games;

					const gameNames: string[] = games.map((g: dataGames): string =>
						g.game_title.toLowerCase().replace(/\s/g, ''),
					);

					const match: string = closest(formattedGameName, gameNames)
						.toLowerCase()
						.replace(/\s/g, '');

					const found: number =
						gameNames
							.map((g: string, i: number): number | undefined => {
								if (g === match) {
									if (
										regions.length === 0 ||
										regions.includes(games[i].region_id)
									) {
										return games[i].id;
									}
								}
							})
							.filter((v): v is number => !!v)[0] ?? null;

					if (found) {
						this.gameIdCache[cacheKey] = found;
						this.storeCacheGame();
						return found;
					}
				}
			} catch (err: any) {
				this.logger.add('Error fetching game', 'error');
				console.error('Error fetching game:', err);
				return null;
			}
		}

		this.failedCache[cacheKey] = true;
		this.storeFailedCache();
		return null;
	}

	/**
	 * Converts a blob to a base64 string and gets the aspect ratio of the image
	 * @param {Blob} blob The blob to convert
	 * @returns {Promise<{ base64: string, aspectRatio: string } | null>} The base64 string and aspect ratio, or null on error
	 */
	private async blobToBase64WithAspectRatio(
		blob: Blob,
	): Promise<{ base64: string; aspectRatio: string } | null> {
		try {
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
		} catch (err: any) {
			console.error('Error converting blob to base64:', err);
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
		if (!platform || !game || !this.existsApiKey()) {
			return null;
		}

		// Getting the platform ID

		const platformId: number | null = await this.getPlatformId(platform);

		if (platformId === null) {
			this.logger.add(`Not found: platform "${platform}"`, 'error');
			return null;
		}

		// Getting the game ID

		const gameId: number | null = await this.getGameByName(platformId, game);

		if (gameId === null) {
			this.logger.add(`Not found: game "${game}"`, 'error');
			return null;
		}

		// Getting the image from the website

		const extensions: string[] = ['jpg', 'png'];

		try {
			for (const ext of extensions) {
				for (let i: number = 1; i <= 2; i++) {
					const res: Response = await fetch(
						`${this.imagesUrl}/${gameId}-${i}.${ext}`,
					);

					if (res.ok) {
						const blob: Blob = await res.blob();
						const result: { base64: string; aspectRatio: string } | null =
							await this.blobToBase64WithAspectRatio(blob);

						if (result) {
							return result;
						}
					}
				}
			}

			this.logger.add('No valid image found', 'error');
			return null;
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
		return (
			platform
				.split('/')?.[1]
				?.trim()
				?.replace(/: /g, '')
				?.replace(/\([\w+\s-,]+\)/g, '')
				?.replace(/\[\w+\]/g, '')
				?.toLowerCase() ?? ''
		);
	}

	/**
	 * Formats the game string by removing unnecessary characters and formatting it to match the expected format for API queries
	 * @param {string} game The game string to format
	 * @returns {string} The formatted game string
	 */
	private gameFormatter(game: string): string {
		return game
			.replace(/\([\w+\s-,]+\)/g, '')
			.replace(/\[\w+\]/g, '')
			.replace(/\.[a-zA-Z0-9]+$/, '')
			.replace(/[^a-zA-Z0-9-&'\s]/g, '')
			.trim()
			.toLowerCase();
	}
}
