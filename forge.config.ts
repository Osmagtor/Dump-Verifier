import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import MakerZIP from '@electron-forge/maker-zip';
import MakerFlatpak from '@electron-forge/maker-flatpak';
import MakerDeb from '@electron-forge/maker-deb';
import MakerRpm from '@electron-forge/maker-rpm';

const config: ForgeConfig = {
    packagerConfig: {
        ignore: [
            "dat($|/)"
        ],
        name: "Dump Verifier",
        executableName: "dump-verifier",
        icon: "img/icon"
    },
    makers: [
        new MakerSquirrel(
            {
                authors: "Óscar Maganto Torres",
                setupIcon: "img/icon.ico",
            },
            ["win32"]
        ),
        new MakerZIP(
            {},
            ["darwin"]
        ),
        new MakerDeb(
            {},
            ["linux"]
        ),
        new MakerRpm(
            {},
            ["linux"]
        ),
        new MakerFlatpak(
            {
                options: {
                    id: "org.dumpverifier.app",
                    icon: "img/icon.png",
                    productName: "Dump Verifier",
                    genericName: "Hash Verifier for Game Dumps",
                    description: "A tool to verify game dumps using the redump.org and no-intro.org databases.",
                    categories: [
                        "Utility"
                    ],
                    files: [
                        ["dist/js/main.cjs", "dist/js/main.cjs"],
                        ["dist/js/preload.cjs", "dist/js/preload.cjs"],
                        ["dist/js/renderer.js", "dist/js/renderer.js"],
                        ["dist/html/index.html", "dist/html/index.html"],
                        ["dist/css/style.css", "dist/css/style.css"],
                        ["img/icon.png", "img/icon.png"]
                    ],
                }
            },
            ["linux"]
        )
    ]
}

export default config;