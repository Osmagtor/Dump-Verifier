import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import MakerZIP from '@electron-forge/maker-zip';
import MakerAppImage from '@forkprince/electron-forge-maker-appimage';

const config: ForgeConfig = {
	packagerConfig: {
		ignore: ['dat($|/)'],
		name: 'Dump Verifier',
		executableName: 'dump-verifier',
		icon: 'img/icon',
	},
	makers: [
		new MakerSquirrel({
			name: 'dump-verifier',
			title: 'Dump Verifier',
			authors: 'Óscar Maganto Torres',
			description:
				'A tool to verify game dumps using the redump.org and no-intro.org databases.',
			setupIcon: 'img/icon.ico',
		}),
		new MakerZIP({}, ['darwin']),
		//@ts-ignore
		new MakerAppImage(
			{
				options: {
					name: 'dump-verifier',
					maintainer: 'Óscar Maganto Torres',
					productName: 'Dump Verifier',
					genericName: 'Hash Verifier for Game Dumps',
					description:
						'A tool to verify game dumps using the redump.org and no-intro.org databases.',
					icon: './img/icon.ico',
					section: 'misc',
					priority: 'optional',
					homepage: 'https://github.com/Osmagtor/Dump-Verifier',
					categories: ['Utility'],
				},
			},
			['linux'],
		),
	],
};

export default config;
