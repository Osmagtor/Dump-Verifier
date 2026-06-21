import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import MakerZIP from '@electron-forge/maker-zip';
import MakerDeb from '@electron-forge/maker-deb';
import MakerRpm from '@electron-forge/maker-rpm';

const config: ForgeConfig = {
	packagerConfig: {
		ignore: ['dat($|/)'],
		name: 'Dump Verifier',
		executableName: 'dump-verifier',
		icon: 'img/icon',
	},
	makers: [
		new MakerSquirrel(
			{
				authors: 'Óscar Maganto Torres',
				setupIcon: 'img/icon.ico',
			},
			['win32'],
		),
		new MakerZIP({}, ['darwin']),
		new MakerDeb(
			{
				options: {
					name: 'dump-verifier',
					productName: 'Dump Verifier',
					genericName: 'Hash Verifier for Game Dumps',
					description:
						'A tool to verify game dumps using the redump.org and no-intro.org databases.',
					productDescription:
						'A tool to verify game dumps using the redump.org and no-intro.org databases.',
					version: '1.2.1',
					icon: 'img/icon.ico',
					categories: ['Utility'],
					homepage: 'https://github.com/Osmagtor/Dump-Verifier',
				},
			},
			['linux'],
		),
		new MakerRpm(
			{
				options: {
					name: 'dump-verifier',
					productName: 'Dump Verifier',
					genericName: 'Hash Verifier for Game Dumps',
					description:
						'A tool to verify game dumps using the redump.org and no-intro.org databases.',
					productDescription:
						'A tool to verify game dumps using the redump.org and no-intro.org databases.',
					version: '1.2.1',
					license: 'Apache-2.0',
					icon: 'img/icon.ico',
					categories: ['Utility'],
					homepage: 'https://github.com/Osmagtor/Dump-Verifier',
				},
			},
			['linux'],
		),
	],
};

export default config;
