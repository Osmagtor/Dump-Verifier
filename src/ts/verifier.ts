import { log, logLine } from './renderer.js';

interface data {
    sha1: string;
    name: string;
    extension: string;
    system: string;
    size: number;
};

class Verifier {

    // COUNTERS

    private total: number = 0;
    private successful: number = 0;

    // GETTERS

    public _total(): number { return this.total; }
    public _successful(): number { return this.successful; }

    // FILE PATHS AND NAMES

    private filepaths: string[];
    private system: string;
    private game: string;
    private data: data[] = [];
    private extensions: string[] = [];

    constructor(filepaths: string[], system: string, game: string) {
        this.filepaths = filepaths;
        this.system = system;
        this.game = game;
        this.extensions = filepaths.map(filepath => filepath.split('.').pop()?.toLocaleLowerCase() || '');
    }

    public async init(): Promise<void> {

        this.data = await this.getData();

        for (let i = 0; i < this.filepaths.length; i++) {
            await this.verify(this.filepaths[i], this.extensions[i]);
        }
    }

    /**
     * Verifies the validity of a dump by calculating its SHA1 hash and checking it against the provided data
     * @param filepath The path to the file to verify
     * @param extension The file extension to filter the data by
     */
    private async verify(filepath: string, extension: string): Promise<void> {

        this.total++;

        let loadingBar: string = '';

        for (let i = 0; i < 28; i++) {
            loadingBar += '<span class="progress-bar__segment">⏹</span>'
        }

        logLine();
        log(`Verifying <i>"${filepath}"</i>...`);
        log(`Calculating SHA1: <span class='progress-bar'>${loadingBar}</span> <span class='info'><span class='info__percentage'>0</span> <span class='info__loading'></span></span>`, 'normal', true, false);

        // @ts-ignore
        let sha1: string = await window.electron.ipcRenderer.invoke('hash', filepath);
        let found: boolean = false;
        let name: string = '';
        let system: string = '';

        // console.log(sha1, this.system, this.game);

        if (this.game && this.system) {

            const gameData: data | undefined = this.findGame();

            if (gameData) {

                const byteOffset: number = 20;

                for (let i = 0; i < byteOffset; i++) {

                    // @ts-ignore
                    const hashTemp: string = await window.electron.ipcRenderer.invoke('hash', filepath, i, (gameData.size - 1) + i);

                    // console.log(gameData.sha1, hashTemp, hashTemp === gameData.sha1);

                    if (hashTemp === gameData.sha1) {
                        sha1 = hashTemp;
                        found = true;
                        name = gameData.name;
                        system = gameData.system;
                        break;
                    } else if (extension !== 'bin' && this.system !== 'psx.json') {
                        break; // If the extension is not 'bin', we stop checking further
                    }
                }
            }
        } else {

            const filteredData: data[] = (this.system)
                ? this.data
                : this.filterDataByExtension(extension);
            const gameData: data | null = this.findData(sha1, filteredData);

            if (gameData) {
                found = true;
                sha1 = gameData.sha1;
                name = gameData.name;
                system = gameData.system;
            }
        }

        found ? this.successful++ : null;

        log(`Calculated SHA1: <i>"${sha1}"</i>`);
        log(`${found ? `Match found: <i>"${name}"</i> (${system})` : 'No match found'}`, found ? 'success' : 'error');
        logLine();
    }

    /**
     * Retrieves the data for the specified system
     * @returns A promise that resolves to an array of objects of the `data` interface
     */
    private async getData(): Promise<data[]> {

        let data: data[] = [];

        if (this.system) {
            // @ts-ignore
            const textRedump: { file: string; content: string }[] = await window.electron.ipcRenderer.invoke('readDatDirectory', 'dat/redump', 'json');
            // @ts-ignore
            const textNoIntro: { file: string; content: string }[] = await window.electron.ipcRenderer.invoke('readDatDirectory', 'dat/no-intro', 'json');
            data = [...textRedump, ...textNoIntro].flatMap((e: { file: string; content: string }) => e.content ? JSON.parse(e.content) : [])
        } else {
            const [ _, folder, file ] = this.system.split('/');

            // @ts-ignore
            const text: string = await window.electron.ipcRenderer.invoke('readDatFile', file, `dat/${folder}`);
            data = JSON.parse(text);
        }

        return data;
    }

    /**
     * Filters the data by file extension
     * @param extension The file extension to filter the data by
     * @returns An array of data objects that match the specified extension
     */
    private filterDataByExtension(extension: string): data[] {
        return this.data.filter((e: data) => e.extension === extension);
    }

    /**
     * Finds the data object that matches the specified SHA1 hash
     * @param sha1 The SHA1 hash to search for
     * @param filteredData The array of data objects to search within
     * @returns The matching data object, or null if not found
     */
    private findData(sha1: string | null | undefined, filteredData: data[]): data | null {
        if (!sha1) return null;
        return filteredData.find((e: data) => e.sha1 === sha1) || null;
    }

    /**
     * Finds the data object for the specified game
     * @returns The data object for the specified game, or undefined if there is no game
     */
    private findGame(): data | undefined {
        if (this.game && this.system) {
            return this.data.find((e: data) => e.name === this.game);
        }
    }
}

export default Verifier;
export { data };