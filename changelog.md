# v2.0.0

- Major refactoring of the code for better readability.
- Should you choose to, you may know use a GamesDB API key along with the app.
  - It is primarily used to get the cover art of:
    1. The game that a backup is going to be verified against.
    2. The games that have been verified so far. These will have a stamp over them with the status of the verification process. When hovered, the name of the game that the backup was verified against or the name of the game itself will be shown in a tooltip. When clicked, the console will be scrolled to the exact position with the result of the verifications process. The line in question will blink for a few seconds for easier identification.
  - To introduce your API key, you have to click on the "API" button. A modal will open where you can introduce your API key (or delete it later on). It will be stored for convenience as it is something that may be used very often, unlike Redump credentials, which are only necessary when fetching `.dat` files for the first time.
  - It is worth noting that the cover art is region agnostic, meaning that it may not always match the region of your backup. There is no way to reliably determine a game's region from the title of its name in `redump` and `no-intro` `.dat` files. Nor is there a way to reliably determine a game's region using the GamesDB API. Suggestions are welcome.
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

- Initial release
