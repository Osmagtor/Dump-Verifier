# Dump Verifier

An Electron app to verify game dumps using the `redump.org` and `no-intro.org` databases.

![Screenshot](img/screenshot.png)

## Installation

### 1. Windows

From the releases page of this repository, download the latest `Windows executable` for your architecture (`ARM` or `x64`). Install the app by double clicking the downloaded file.

### 2. macOS

From the releases page of this repository, download the latest `compressed ZIP` file for your architecture (`ARM` or `x64`). Install the app by extracting it to the `Applications` folder.

### 3. Debian/Fedora based distributions

From the releases page of this repository, download the latest `.deb`/`.rpm` file for your architecture (`ARM` or `x64`). Install the app by navigating to the location of the downloaded file from a terminal and running `sudo apt install ./<package-name>` for the `.deb` package and `sudo rpm -i ./<package-name>` for the `.rpm` package.

### 4. Other Linux builds

If you would like to use this app on a different Linux distribution and you are familiar with Electron apps, clone this repository and modify the `package.json` to accommodate for your desired distribution. Then run `npm run make`from said distribution. You will find the built package under `./out/make`.

As of the time of updating these instructions (31st of January of 2026), `.rpm` distributables can't be reliably packaged using `electron-maker-rpm` on the latest versions of Fedora and RPM. It may be necessary to make the change described [here](https://github.com/electron/forge/issues/3701#issuecomment-2552233499).

As of the time of updating these instructions (6th of April of 2026), `.flatpak` distributables require an additional Flatpak repository to be built, as noted [here](https://github.com/electron/forge/issues/2561#issuecomment-1456162327). You may need to run `npm run make` as `sudo` to be able to build the `x64` distributable. As for `ARM`, I have not managed to get it to build locally.

## Set-up

### Redump

Shortly after opening up, the app downloads the list of available systems on `redump.org` and dynamically fetches the `.dat` files for each of the URLs therein. Then, it parses them as `.json` files and stores them locally. If these files already exist locally, they are simply skipped.

Some of the systems on this list may only be accessible to users with an account with "dumper" status on `redump.org`. If you already have such an account, you can download these `.dat` files too. To do so:

1. Click on the gray key icon in the top right corner. You will be taken to `forum.redump.org` to log in. If you successfully log in, the key icon will turn yellow.
2. Click on the `Update Redump` button to download all `.dat` files again. This time your session token from `Redump.org` will be used to download the remaining `.dat` files.

Note: Since `.dat` files do not need to be fetched every time (only the first time you open up the app or if new games have been added to `Redump.org` and you manually fetch them again by pressing the "Update Redump" button), your session token will not be stored locally for future use. Every time you want to download `.dat` files that require "dumper" status, you will need to log back in. This may be slightly inconvinient, but it is more secure.

### No-intro

`Redump.org` does not contain entries for cartridge based games, but `No-intro.org` does. Unlike `Redump.org` though, there is no way to dynamically fetch the `.dat` files for all systems available, so the process to obtain them is a little more manual:

1. Visit `No-intro.org`'s `Dat-o-Matic` [download page](https://datomatic.no-intro.org/index.php?page=download&s=28&op=daily).
2. Click on the `Request` button.
3. Wait for the page to redirect you to a download (this may take a while).
4. Click on the `Download` button.
5. Back in the app, click on the `Upload No-intro` button and select all the downloaded `.dat` files that you would like to import. Any previously uploaded `.dat` files will be deleted and the new ones will be processed. Therefore, it is important that you select all the `.dat` files that you would like to import.

These instructions are also available within the app after clicking on the help icon in the top right corner of the window.

## How to use

### Verifying a single game

- If you know which system and game to verify your backup against, then select them from the system and game dropdown menus and press the `Verify` button.
- If you only know which system to verify your backup against, only select the system from the system dropdown menu while keeping the game dropdown menu emtpy and press the `Verify` button. The hash produced from your backup file will be compared with all the available hashes for the selected system.
- If you do not know which system to verify your backup against, kepp both dropdown menus empty and press the `Verify` button. The hash produced from your backup file will be compared with all the available hashes for all systems. This process will be more resource intensive and take longer, so be patient.

Note: If you are verifying a multi-track game for the original PlayStation (e.g., the original Tomb Raider), you want to set the game drop-down menu to the specific game you would like to verify your backup against. The hash for your backup file will be produced by using the expected file size of the reference game. This corresponds to the chunk of the game file containing the track with the game data. This process is slightly more resource intensive and may take longer as a result, so be patient.

These instructions are also available within the app after clicking on the help icon in the top right corner of the window.

### Verifying multiple games

- If you know which system to verify your backups against, only select the system from the system dropdown menu while keeping the game dropdown menu emtpy and press the `Verify` button. The hash produced from your backup files will be compared with all the available hashes for the selected system.
- If you do not know which system to verify your backups against, kepp both dropdown menus empty and press the `Verify` button. The hash produced from your backup files will be compared with all the available hashes for all systems. This process will be more resource intensive and take longer, so be patient.

### Working with logs

The log window contains all the relevant information of the app's operations as they are performed. If the console log has grown too long, you can clear it by pressing the "Clear console" button. You can also keep a copy of the log for future reference by pressing the "Save log" button and selecting the destination where you would like to store the log file.

### Using thumbnails

If you would like to (1) get a preview with the cover art of the game you are verifying your backup against and (2) get the cover art of all the games that you have verified during your current session:

1. Obtain an API key from [The Games DB](https://thegamesdb.net/).
2. Click on the gray API icon in the top right corner.
3. Introduce your API key in the modal window that has opened up.

As already noted, the API key will be used to get the cover art of:

1. The game that a backup is going to be verified against.
2. The games that have been verified so far. These will have a stamp over them with the status of the verification process. When hovered, the name of the game that the backup was verified against or the name of the game itself will be shown in a tooltip. When clicked, the console will be scrolled to the exact position with the result of the verifications process. The line in question will blink for a few seconds for easier identification.

Your API key is stored locally for convenience as it is something that may be used very often, unlike the `Redump.org` session token. On a different note, caching is used to reduce the number of API calls where possible.

Note: Some game names may not be processed correctly and their cover art may consequently fail to be retrieved correctly or at all. In such cases, first make sure that [The Games DB](https://thegamesdb.net/) contains an entry for the game in question and for its region. If it already does, please open up an issue in this repository to look into it and make the app as watertight as possible. 

### Updates

After startup, the app will check this repository for updates. If a new version is available, the app will add a line to the console log with a link to the latest release. To update the app to a new version, you may first need to uninstall any old versions in your system.
