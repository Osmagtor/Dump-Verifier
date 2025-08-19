import Verifier, { data } from "./verifier.js";
import Downloader, { systemData } from "./downloader.js";
import $ from "jquery";
import tippy from "tippy.js";
import TomSelect from "tom-select";
import JSConfetti from "js-confetti";

let data: data[] = [];
let consoleLog: string = '';
let selectSystems: TomSelect | null = null;
let selectGames: TomSelect | null = null;
let games: data[] = [];
let loading: any;

// LISTENERS

// Listen for the progress event from the main process and update the progress bar in the console
//@ts-ignore
window.electron.ipcRenderer.on('progress', (_, percentage) => {

    // Update the percentage

    const percent: JQuery<HTMLElement> = $('#console .info__percentage').last();
    percent.text(percentage);

    // Update the progress bar

    const spans: JQuery<HTMLElement> = $('#console .progress-bar').last().find('span');
    spans.slice(0, Math.floor(spans.length * (percentage / 100))).each((_, span: HTMLElement) => {
        const c: string = $(span).attr('class') || '';
        if (!c.includes('success')) $(span).attr('class', c + '-success')
    });

    // Update the loading spinner

    const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let spinnerIndex = 0;

    if (!loading) {
        loading = setInterval(() => {
            $('#console .info__loading').last().text(spinnerFrames[spinnerIndex]);
            spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
        }, 100);
    } else if (percentage >= 100) {
        clearInterval(loading);
        loading = null;

        const spinner: JQuery<HTMLElement> = $('#console .info__loading').last();
        spinner.text('⠿');
        spinner.attr('class', spinner.attr('class') + '-success');

        percent.attr('class', percent.attr('class') + '-success');
    }
});

// Listen for the theme event from the main process and set multiple CSS variables
// @ts-ignore
window.electron.onTheme((theme: string) => {

    const dark: boolean = theme === 'dark';

    // Change the CSS variables based on the theme

    document.documentElement.style.setProperty('--os-accent-color', dark ? '#0078d4' : '#0078d4');
    document.documentElement.style.setProperty('--font', dark ? '#ffffff' : '#000000');
    document.documentElement.style.setProperty('--background', dark ? '#191919' : '#ffffff');
    document.documentElement.style.setProperty('--select', dark ? '#4b4b4b' : '#e2e2e2ff');
    document.documentElement.style.setProperty('--disabled', dark ? '#292929ff' : '#f1f1f1ff');
    document.documentElement.style.setProperty('--console', dark ? '#191919' : '#ffffff');
    document.documentElement.style.setProperty('--console-alternative', dark ? '#4b4b4b' : '#f0f0f0');
    document.documentElement.style.setProperty('--console-green', dark ? '#71c971' : 'green');
    document.documentElement.style.setProperty('--console-red', dark ? '#db8888' : 'red');
    document.documentElement.style.setProperty('--console-border', dark ? '#3f3f3f' : '#dadada');
    document.documentElement.style.setProperty('--button-normal', dark ? '#4b4b4b' : '#e2e2e2ff');
    document.documentElement.style.setProperty('--button-hover', dark ? '#585858' : '#bdbdbdff');
    document.documentElement.style.setProperty('--button-focus', dark ? '#686868ff' : '#a7a7a7ff');
    document.documentElement.style.setProperty('--submit-normal', '#009b4dff');
    document.documentElement.style.setProperty('--submit-hover', '#00793cff');
    document.documentElement.style.setProperty('--submit-focus', '#016b36ff');
    document.documentElement.style.setProperty('--submit-disabled', '#005028ff');
});

$(document).ready(async (): Promise<void> => {

    // Initializing the select elements

    initSelects();

    // Disabling the form while loading

    disableForm();

    // Adding the tooltip

    //@ts-ignore
    tippy('#help', {
        content: `<p>If no system is selected, the file will be verified against all systems. While this may take longer and be more resource intensive, it is useful when verifying multiple files from different systems.</p><p><b>Note 1</b>: Multi-track PlayStation games need to be verified against the specific game that the dump corresponds to.</p><p><b>Note 2</b>: The Redump.org files used for verification are downloaded automatically on startup and can be updated by clicking on the "<i>Update Redump</i>" button. However, No-intro.org files cannot be fetched automatically. Instead: <ol><li>Visit No-intro's <a id="no-intro-link" href="https://datomatic.no-intro.org/index.php?page=download&s=28&op=daily" target="_blank">Dat-o-Matic download page</a>.</li><li>Click on the "<i>Request</i>" button.</li><li>Wait for the page to be redirected (this may take a while).</li><li>Click on the "<i>Download</i>" button.</li><li>Click on the "<i>Upload No-intro</i>" button and select all the <i>.dat</i> files you downloaded at once. Any previously processed <i>.dat</i> files will be deleted.</li><li>The app will take care of the rest.</li></ol></p>`,
        allowHTML: true,
        arrow: true,
        placement: 'left',
        animation: 'scale-subtle',
        trigger: 'click',
        interactive: true,
        onShown(instance: any): void {

            // Delegate click to open in system browser

            const link = instance.popper.querySelector('#no-intro-link');

            if (link) {
                link.addEventListener('click', function (e: any) {
                    e.preventDefault();
                    // @ts-ignore
                    window.electron.ipcRenderer.invoke('openExternal', this.href);
                });
            }
        }
    });

    // Getting all the systems and their games

    await Downloader.init();

    // Updating the select elements

    await updateSelects();

    // Checking for updates

    await checkUpdates();

    // Re-enabling the form

    logLine();
    enableForm();
});

$('#log').on('click', (ev): void => {

    ev.preventDefault();

    // Downloading the console log as a text file

    const blob: Blob = new Blob([consoleLog], { type: 'text/plain' });
    const url: string = URL.createObjectURL(blob);
    const a: HTMLAnchorElement = document.createElement('a');
    a.href = url;
    a.download = 'log.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

$('#clear').on('click', (ev): void => {

    ev.preventDefault();

    // Clearing the console

    $('#console').empty();
    consoleLog = '';
});

$('#system').on('change', async (ev): Promise<void> => {

    // Disabling the form while processing

    disableForm();

    await updateSelects();

    // Re-enabling the form

    enableForm();
});

$('#files').on('click', async (ev): Promise<void> => {

    ev.preventDefault();

    // Calling the openFile IPC handler to open a file dialog and get the selected file paths

    // @ts-ignore
    const filePaths: string[] = await window.electron.ipcRenderer.invoke('openFile', []);
    const baseNames: string[] = [];

    // Iterating over the selected file paths to get their base names

    for (const filePath of filePaths) {
        // @ts-ignore
        const baseName: string = await window.electron.ipcRenderer.invoke('basename', filePath);
        baseNames.push(baseName);
    }

    // Logging the selected file names

    if (baseNames.length) {

        logLine();

        log('Selected file(s):');

        baseNames.forEach((name: string): void => {
            log(name);
        });

        logLine();
    }

    // Storing the file paths in the hidden input field

    if (filePaths.length) $('#filepaths').val(JSON.stringify(filePaths));
});

$('#redump').on('click', async (ev): Promise<void> => {

    ev.preventDefault();

    disableForm();

    const folder: string = 'dat/redump';

    // Calling the deleteDatDirectoryContents IPC handler to delete the contents of the dat/redump directory

    // @ts-ignore
    await window.electron.ipcRenderer.invoke('deleteDatDirectoryContents', folder);

    logLine();
    log('Redump files deleted');

    // Calling the initRedump function

    await Downloader.initRedump();

    enableForm();
});

$('#no-intro').on('click', async (ev): Promise<void> => {

    ev.preventDefault();

    disableForm();

    const folder: string = 'dat/no-intro';

    // Calling the openFile IPC handler to open a file dialog and get the selected file paths

    // @ts-ignore
    const filePaths: string[] = await window.electron.ipcRenderer.invoke('openFile', ['dat']);

    if (filePaths?.length) {

        // Calling the deleteDatDirectoryContents IPC handler to delete the contents of the dat/no-intro directory

        // @ts-ignore
        await window.electron.ipcRenderer.invoke('deleteDatDirectoryContents', folder);

        logLine();
        log('No-intro files deleted');

        // Iterating over the selected file paths to get their base names and content to be able to save them

        for (const filePath of filePaths) {
            // @ts-ignore
            const content: string = await window.electron.ipcRenderer.invoke('readDatFileExternal', filePath);
            // @ts-ignore
            const basename: string = await window.electron.ipcRenderer.invoke('basename', filePath);
            // @ts-ignore
            await window.electron.ipcRenderer.invoke('saveDatFile', basename, folder, content);
        }

        // Calling the initNoIntro function

        await Downloader.initNoIntro();
    }

    enableForm();
});

$('form').on('submit', async (ev): Promise<void> => {

    ev.preventDefault();

    // Disabling the form while processing

    disableForm();

    // Verifying the selected files

    const value: string = $('#filepaths').val() as string;
    const filePaths: string[] = value ? JSON.parse(value) : [];
    const system: string = $('#system').val() as string;
    const game: string = $('#game').val() as string;

    if (filePaths.length) {

        const v: Verifier = new Verifier(filePaths, system, game);
        await v.init();

        const successful: number = v._successful();

        log(`${successful}/${filePaths.length} files verified successfully.`);

        if (successful - filePaths.length === 0) {

            // @ts-ignore
            const jsConfetti = new JSConfetti();

            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    jsConfetti.addConfetti();
                }, i * 1500);
            }
        }
    } else {
        log('No file(s) selected.', 'error');
    }

    // Re-enabling the form after processing

    enableForm();
});

// FUNCTIONS

function initSelects(): void {

    if (!selectSystems && !selectGames) {

        selectSystems = new TomSelect('#system', {
            maxItems: 1,
            valueField: 'file',
            searchField: ['name'],
            labelField: 'name',
            sortField: 'name',
            create: false,
        });

        selectGames = new TomSelect('#game', {
            maxItems: 1,
            valueField: 'name',
            searchField: ['name'],
            labelField: 'name',
            sortField: 'name',
            create: false,
            load: function (query: string, callback: Function): void {

                const max: number = 7;
                const results: data[] = [];
                let count = 0;

                for (const game of games) {
                    if (game.name.toLowerCase().includes(query.toLowerCase())) {
                        results.push(game);
                        count++;
                        if (count >= max) break;
                    }
                }

                callback(results);
            }
        });
    }
}

/**
 * Updates the select elements with the Tom Select library
 */
async function updateSelects(): Promise<void> {

    const systems: systemData[] = Downloader._systems();

    // Getting the selected system to get the games for that system

    const systemSelected: string = $('#system').val()?.toString() || '';

    let folder: string = '';
    let file: string = '';
    let _: string = '';

    games = [];

    // console.log(systemSelected);

    if (systemSelected) {
        [_, folder, file] = systemSelected.split('/');

        // @ts-ignore
        const jsonText: string = await window.electron.ipcRenderer.invoke('readDatFile', file, `dat/${folder}`);
        games = JSON.parse(jsonText);
    }

    // console.log(systems, games);

    // Updating the Tom Select elements with the new options

    if (selectSystems) {
        selectSystems.clearOptions();
        selectSystems.addOptions(systems);
    }

    if (selectGames) {
        selectGames.clearOptions();
    }
}

/**
 * Logs a message to the console element in with optional color coding and a timestamp
 *
 * @param message The message to log
 * @param type The type of message, which determines the color. Can be 'success', 'error', or 'normal'. Defaults to 'normal'
 * @param time Whether to prepend the current time to the message. Defaults to true
 * @param store Whether to store the message in the consoleLog variable. Defaults to true
 */
function log(message: string, type: 'success' | 'error' | 'normal' = 'normal', time: boolean = true, store: boolean = true): void {

    const log: JQuery<HTMLTextAreaElement> = $('#console');

    if (message) {
        log.append(`<span>${time ? `[${new Date().toLocaleTimeString()}] ` : ''}<span class="text-${type}">${message}</span></span>`);
        if (store) consoleLog += `${time ? `[${new Date().toLocaleTimeString()}] ` : ''}${message.replace(/<\/?[a-zA-Z]+>/g, '')}\n`;
    } else {
        log.append('<span></span>');
        if (store) consoleLog += '\n';
    }

    log.scrollTop(log[0].scrollHeight);
}

/**
 * Logs an empty line to the console element
 */
function logLine(): void {
    const previousLogText: string = $('#console>span').last().text();
    if (previousLogText) log('', 'normal', false);
}

/**
 * Enables the form inputs and selects
 */
function enableForm(): void {
    $('form').find('form>div>input, button, input[type="submit"]').prop('disabled', false);
    if (selectSystems) selectSystems.enable();
    if (selectGames) selectGames.enable();
}

/**
 * Disables the form inputs and selects
 */
function disableForm(): void {
    $('form').find('form>div>input, button, input[type="submit"]').prop('disabled', true);
    if (selectSystems) selectSystems.disable();
    if (selectGames) selectGames.disable();
}

async function checkUpdates(): Promise<void> {


    // Getting the current version

    // @ts-ignore
    const currentVersion: string = await window.electron.ipcRenderer.invoke('getVersion');

    logLine();
    log(`The current version is: ${currentVersion}`);

    try {

        // Getting the latest release version from GitHub

        const res: Response = await fetch('https://api.github.com/repos/Osmagtor/Dump-Verifier/releases/latest');
        const data: any = await res.json();
        const latestVersion: string = (data.tag_name || data.name)?.replace('v', '');
        const latestVersionLink: string = data.html_url;

        if (currentVersion !== latestVersion) {
            log(`A new version is available: <a id="latest-version-link" href='${latestVersionLink}' target='_blank'>${latestVersion}</a> 🎉`, 'normal', true, false);

            // Delegate click to open in system browser
            setTimeout(() => {

                const link: JQuery<HTMLAnchorElement> = $('#latest-version-link');

                if (link) {
                    link.on('click', function (ev) {
                        ev.preventDefault();
                        // @ts-ignore
                        window.electron.ipcRenderer.invoke('openExternal', this.href);
                    });
                }
            }, 0);
        } else {
            log(`This is the latest version available`);
        }
    } catch (err: any) {
        
        // Nothing, there's probably just no internet connection or the Github API is down

        log(`It was not possible to check for updates`);
    }
}

// EXPORTS

export { log, logLine };