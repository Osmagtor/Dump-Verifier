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

interface apiResponse {
	code: number;
	status: string;
}

export interface apiResponseGames extends apiResponse {
	data: apiDataGames;
}

export interface apiResponsePlatforms extends apiResponse {
	data: apiDataPlatforms;
}

export interface apiDataGames {
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
}

export interface apiDataPlatforms {
	count: number;
	platforms: {
		id: number;
		name: string;
		alias: string;
	}[];
}
