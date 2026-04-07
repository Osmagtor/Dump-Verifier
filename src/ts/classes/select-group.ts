import TomSelect from 'tom-select';
import Downloader from './downloader.js';
import type { data, systemData } from '../types.js';

export default class SelectGroup {
	private selectorSystems: string = '';
	private selectorGames: string = '';
	private selectSystems!: TomSelect;
	private selectGames!: TomSelect;

	/**
	 * Getter for the value of the systems select element
	 */
	public get _selectSystemsValue(): string {
		if (this.selectSystems) {
			return this.selectSystems.getValue() as string;
		} else {
			return '';
		}
	}

	/**
	 * Getter for the value of the games select element
	 */
	public get _selectGamesValue(): string {
		if (this.selectGames) {
			return this.selectGames.getValue() as string;
		} else {
			return '';
		}
	}

	/**
	 * Class constructor
	 * @param {string} selectorSystems The selector for the systems select element
	 * @param {string} selectorGames The selector for the games select element
	 */
	constructor(selectorSystems: string, selectorGames: string) {
		this.selectorSystems = selectorSystems;
		this.selectorGames = selectorGames;
	}

	/**
	 * Initializes the select elements with the Tom Select library and sets up the game loading function for the games select element
	 * @param {systemData[]} systems The systems to populate the systems select element with
	 * @param {data[]} games The games to use for the game loading function in the games select element
	 */
	public initialize(systems: systemData[], games: data[]): void {
		if (this.selectSystems) {
			this.selectSystems.clearOptions();
			this.selectSystems.addOptions(systems);
		} else {
			this.selectSystems = new TomSelect(this.selectorSystems, {
				maxItems: 1,
				valueField: 'file',
				searchField: ['name'],
				labelField: 'name',
				sortField: 'name',
				create: false,
			});
		}

		if (this.selectGames) {
			this.selectGames.clearOptions();
			this.selectGames.destroy();
		}

		this.selectGames = new TomSelect(this.selectorGames, {
			maxItems: 1,
			valueField: 'name',
			searchField: ['name'],
			labelField: 'name',
			sortField: 'name',
			create: false,
			/**
			 * Loads the game options based on the query
			 * @param {string} query The search query to filter the games by
			 * @param {Function} callback The function to call with the filtered results
			 */
			load: function (
				query: string,
				callback: (results: data[]) => void,
			): void {
				const max: number = 7;
				const results: data[] = [];
				let count: number = 0;

				for (const game of games) {
					if (game.name.toLowerCase().includes(query.toLowerCase())) {
						results.push(game);
						count++;
						if (count >= max) break;
					}
				}

				callback(results);
			},
		});
	}

	/**
	 * Disables the select elements
	 */
	public disable(): void {
		this.selectSystems.disable();
		this.selectGames.disable();
	}

	/**
	 * Enables the select elements
	 */
	public enable(): void {
		this.selectSystems.enable();
		this.selectGames.enable();
	}

	/**
	 * Updates the select elements with the Tom Select library
	 * @param {systemData[]} systems The systems to update the select elements with
	 */
	public async updateSelects(systems: systemData[]): Promise<void> {
		// Getting the selected system to get the games for that system

		const systemSelected: string = this.selectSystems?.getValue() as string;

		let folder: string = '';
		let file: string = '';

		let games: data[] = [];

		if (systemSelected) {
			const parts: string[] = systemSelected.split('/');
			folder = parts[1];
			file = parts[2];

			const jsonText: string = await (
				window as any
			).electron.ipcRenderer.invoke('readDatFile', file, `dat/${folder}`);

			games = JSON.parse(jsonText);
		}

		// Updating the Tom Select elements with the new options

		this.initialize(systems, games);
	}
}
