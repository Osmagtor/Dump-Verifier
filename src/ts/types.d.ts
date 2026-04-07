export interface data {
	sha1: string;
	name: string;
	extension: string;
	system: string;
	size: number;
}

export interface systemData {
	file: string;
	name: string;
}

export interface apiResponse {
	code: number;
	status: string;
}

export interface apiDataGames {
	data: {
		count: number;
		games: {
			id: number;
			game_title: string;
			release_date: string;
			platform: number;
			region_id: number;
			country_id: number;
			developers: number[];
		}[];
	};
}

export interface apiDataPlatforms {
	data: {
		count: number;
		games: {
			id: number;
			name: string;
			alias: string;
		}[];
	};
}
