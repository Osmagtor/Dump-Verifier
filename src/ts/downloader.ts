import { log, logLine } from './renderer.js';
import { data } from './verifier.js';
import JSZip from 'jszip';

interface systemData {
    file: string;
    name: string;
}

class Downloader {

    public static _systems(): systemData[] { return Downloader.systems; }
    private static systems: systemData[] = [];

    private static loaded: number = 0;
    private static total: number = 0;

    private static cookies: string = '';

    private static async getPathURLs(): Promise<string[]> {

        let links: string[] = [];

        const url: string = 'http://wiki.redump.org/index.php?title=List_of_DB_Download_Links';

        try {

            const res: Response = await fetch(url);

            if (res.ok) {

                const htmlRaw: string = await res.text();
                Array.from(htmlRaw.matchAll(/http:\/\/redump.org\/datfile\/[a-zA-Z0-9]+\//g)).forEach((match) => {
                    if (links.indexOf(match[0]) === -1) links.push(match[0]);
                });
            }
        } catch {
            // @ts-ignore
            const info: { file: string; content: string }[] = await window.electron.ipcRenderer.invoke('readDatDirectory', 'dat/redump', 'json');

            info.forEach((el) => {
                links.push(el.file.replace('.json', ''));
            });
        }

        return links;
    }

    public static async getToken(): Promise<boolean> {
        //@ts-ignore
        Downloader.cookies = await window.electron.ipcRenderer.invoke('redumpLogin');

        if (Downloader.cookies) {
            log('Successfully logged in');
            return true;
        } else {
            return false;
        }
    };

    public static async init(): Promise<void> {

        // @ts-ignore
        await window.electron.ipcRenderer.invoke('createDat');

        await Downloader.initRedump();
        await Downloader.initNoIntro();
    }

    public static async initRedump(): Promise<void> {

        Downloader.total = 0;
        Downloader.loaded = 0;

        logLine();
        log('Preparing Redump files...');
        await Downloader.redump();
    }

    public static async initNoIntro(): Promise<void> {

        Downloader.total = 0;
        Downloader.loaded = 0;

        logLine();
        log('Preparing No-intro files...');
        await Downloader.nointro();
    }

    private static async nointro(): Promise<void> {

        const folder: string = 'dat/no-intro';
        const newFiles: string[] = [];

        // Check if there exist .dat files the in no-intro folder

        // @ts-ignore
        const textDat: { file: string; content: string }[] = await window.electron.ipcRenderer.invoke('readDatDirectory', folder, 'dat');

        if (textDat.length) {
            for (const datText of textDat) {

                const jsonFileName: string = datText.file.replace(/\.dat$/i, '.json');

                // @ts-ignore
                const exists: boolean = await window.electron.ipcRenderer.invoke('checkFile', jsonFileName, folder);

                if (!exists) {
                    const data: data[] = Downloader.parseXML(datText.content, 'no-intro');

                    if (data[0]) {

                        // @ts-ignore
                        const saved: boolean = await window.electron.ipcRenderer.invoke('saveDatFile', jsonFileName, folder, JSON.stringify(data));

                        if (saved) {
                            Downloader.systems.push({ file: `dat/no-intro/${jsonFileName}`, name: data[0].system });
                            Downloader.loaded++;
                            newFiles.push(jsonFileName);

                            log(`Parsed DAT file "${datText.file}"`, 'success');

                            // @ts-ignore
                            await window.electron.ipcRenderer.invoke('deleteDatFile', datText.file, folder);
                        } else {
                            log(`Failed to parse data from "${datText.file}"`, 'error');
                        }
                    } else {
                        // @ts-ignore
                        await window.electron.ipcRenderer.invoke('deleteDatFile', datText.file, folder);
                    }
                }
            }
        }

        // @ts-ignore
        const text: { file: string; content: string }[] = await window.electron.ipcRenderer.invoke('readDatDirectory', folder, 'json');
        Downloader.total = text.length;

        for (const jsonText of text) {
            if (!newFiles.includes(jsonText.file)) {

                const data: data[] = JSON.parse(jsonText.content);

                Downloader.systems.push({ file: `dat/no-intro/${jsonText.file}`, name: data[0].system });
                Downloader.loaded++;

                log(`Loaded JSON file <i>"${jsonText.file}"</i>`, 'success');
            }
        }

        log(`Loaded ${Downloader.loaded}/${Downloader.total} JSON files`);
    }

    /**
     * Downloads DAT files from the Redump website if they do not already exist locally and saves them as JSON files that follow the structure of the `data` interface.
     */
    private static async redump(): Promise<void> {

        const urls: string[] = await Downloader.getPathURLs();
        Downloader.total = urls.length;
        const folder: string = 'dat/redump';

        try {
            for (const url of urls) {

                const baseName: string = url.replace('http://redump.org/datfile/', '').replace(/\/+$/, '');
                let datFileName: string = baseName + '.dat';
                let jsonFileName: string = baseName + '.json';

                // @ts-ignore
                const exists: boolean = await window.electron.ipcRenderer.invoke('checkFile', jsonFileName, folder);

                if (!exists) {

                    const dataFetched: ArrayBuffer | undefined = await Downloader.fetch(url);

                    if (dataFetched) {

                        const xmlText: string | undefined = await Downloader.unzip(dataFetched);

                        if (xmlText) {

                            const data: data[] = Downloader.parseXML(xmlText, 'redump');

                            if (data.length) {

                                // @ts-ignore
                                const saved: boolean = await window.electron.ipcRenderer.invoke('saveDatFile', jsonFileName, folder, JSON.stringify(data));

                                if (saved) {

                                    Downloader.systems.push({ file: `dat/redump/${jsonFileName}`, name: data[0].system });
                                    Downloader.loaded++;

                                    log(`Downloaded and saved DAT file "${datFileName}" from "${url}"`, 'success');
                                } else {
                                    log(`Failed to parse data from "${url}"`, 'error');
                                }
                            } else {
                                log(`Failed to save DAT file from "${url}"`, 'error');
                            }
                        } else {
                            log(`Failed to unzip DAT file from "${url}"`, 'error');
                            log('It probably requires authentication and dumper status', 'error');
                        }
                    } else {
                        log(`Failed to fetch files from "${url}"`, 'error');
                    }
                } else {
                    log(`Loaded JSON file <i>"${jsonFileName}"</i>`, 'success');

                    // @ts-ignore
                    const jsonText: string = await window.electron.ipcRenderer.invoke('readDatFile', jsonFileName, folder);

                    const data: data[] = JSON.parse(jsonText);
                    Downloader.systems.push({ file: `dat/redump/${jsonFileName}`, name: data[0].system });
                    Downloader.loaded++;
                }
            }
        } catch (err: any) {
            log(`There was an error downloading DAT files`, 'error');
            console.error(err);
        }

        log(`Loaded ${Downloader.loaded}/${Downloader.total} JSON files`);
    }

    /**
     * Fetches a DAT file from the specified Redump URL
     * @param url The URL to fetch the DAT file from
     * @returns A promise that resolves to the ArrayBuffer of the fetched file, or undefined if the fetch failed
     */
    private static async fetch(url: string): Promise<ArrayBuffer | undefined> {
        try {
            if (Downloader.cookies) {
                // @ts-ignore
                const ab: ArrayBuffer = await window.electron.ipcRenderer.invoke('redumpCookieFetch', url, Downloader.cookies);
                if (ab) return ab;
            } else {
                const res = await fetch(url);
                if (res.ok) return await res.arrayBuffer();
            }
        } catch (err: any) {
            console.error(err);
        }
    }

    /**
     * Unzips a ZIP file and extracts the DAT file
     * @param zipData The ArrayBuffer of the ZIP file containing the DAT file
     * @returns A promise that resolves to the text content of the extracted DAT file, or undefined if the extraction failed
     */
    private static async unzip(zipData: ArrayBuffer): Promise<string | undefined> {
        try {

            const zip = await JSZip.loadAsync(zipData);

            const datFileName = Object.keys(zip.files).find(name => name.endsWith('.dat')) || '';

            if (datFileName) return await zip.files[datFileName].async('text');
        } catch (err: any) {
            if (!err.message.includes('is a zip')) console.error(err);
        }
    }

    /**
     * Parses the XML text content of a DAT file to an object of the `data` interface
     * @param xmlText The XML text content of the DAT file
     * @returns An array of data objects extracted from the DAT file
     */
    private static parseXML(xmlText: string, dir: string): data[] {

        const parser: DOMParser = new DOMParser();
        const xmlDoc: Document = parser.parseFromString(xmlText, "text/xml");

        const roms: HTMLCollectionOf<Element> = xmlDoc.getElementsByTagName("rom");
        const data: data[] = [];
        const system: string = dir + '/' + xmlDoc.getElementsByTagName("name")?.[0]?.textContent || '';

        Array.from(roms).forEach((rom: Element) => {

            const sha1: string | null = rom.getAttribute("sha1") || '';
            const name: string = rom.getAttribute("name") || '';
            const extension: string = name.split('.').pop()?.toLocaleLowerCase() || '';
            const size: number = parseInt(rom.getAttribute("size") || '0', 10);

            data.push({ sha1, name, extension, system, size });
        });

        return data;
    }
}

export default Downloader;
export { systemData };
