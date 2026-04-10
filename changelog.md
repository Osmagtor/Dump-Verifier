# v2.0.3

- A log entry is now added when the "clear cache" button is pressed.
- Hotfix for Sega Genesis/MegaDrive cover art not working at all.

# v2.0.2

- Proper responsive UI. The UI should now be identical across platforms.
- Thanks to help from @pete-oconnell, the cover art from some games come be retrieved based on the region are from. The current solution is functional but somewhat hacky. While the Games DB API provides a region ID for each game entry, the `Redump` and `No-Intro` entries do not. To guess the region that a game from the `.dat` files belongs to:
  1. Any country names within parentheses in the game name are extracted using regular expressions.
  2. The continent of each country names is obtained using the [`countries-list`](https://www.npmjs.com/package/countries-list) NPM library.
  3. Each continent is assigned a region ID.
- Needless to say, the solution described above is not perfect and may not always work. Sometimes this may be due to a lacking entry in the Games DB, but in other cases it may not. Feel free to report any issues so they may be looked into.
- A button to clear the API cache has been added. If you believe that a game's cover art is not being fetched correctly because it may have incorrectly been cached in a previous version of the app, this button should help with that.
- Minor bug fixes.

# v2.0.1

- Better alignment of some UI elements.
- The cache of failed `Redump.org` `.dat` file URLS is now reset when requesting the `Redump.org` files again.
- When hovering over the cover art of the selected game, a tooltip is shown with a larger preview of the cover art.

# v2.0.0

- Major refactoring of the code for better readability.
- Should you choose to, you may know use a GamesDB API key along with the app.
  - It is primarily used to get the cover art of:
    1. The game that a backup is going to be verified against.
    2. The games that have been verified so far. These will have a stamp over them with the status of the verification process. When hovered, the name of the game that the backup was verified against or the name of the game itself will be shown in a tooltip. When clicked, the console will be scrolled to the exact position with the result of the verifications process. The line in question will blink for a few seconds for easier identification.
  - To introduce your API key, you have to click on the "API" button. A modal will open where you can introduce your API key (or delete it later on). It will be stored for convenience as it is something that may be used very often, unlike `Redump` credentials, which are only necessary when fetching `.dat` files for the first time.
  - It is worth noting that the cover art is region agnostic, meaning that it may not always match the region of your backup. There is no way to reliably determine a game's region from the title of its name in `Redump` and `No-Intro` `.dat` files. Nor is there a way to reliably determine a game's region using the GamesDB API. Suggestions are welcome.
  - Some game names may not be processed correctly and their cover art may consequently fail to be retrieved. Please report these cases to make the app as watertight as possible.
  - Caching is used to reduce the number of API calls where possible.

# v1.2.1

- Cleaned up the code to be more readable and maintanable. This should come with some very minor performance improvements.

# v1.2.0

- Logging into forum.redump.org to download DAT files that are reserved to authenticated users with dumper status is now possible. Check the instructions in the README file for more information.

# v1.1.0

- Added a progress bar to indicate how much of the hash has been calculated. This is particularly useful for game dumps that are up to Gigabytes in size.
- Added a system to check for updates on start-up.

# v1.0.0

- Initial release.
