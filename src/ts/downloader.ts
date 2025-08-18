// @ts-ignore
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

    private static baseURL: string = "http://redump.org/datfile/";

    // Extracted from: http://wiki.redump.org/index.php?title=List_of_DB_Download_Links

    private static pathURLs: string[] = [
        "3do/",
        "acd/",
        "ajcd/",
        "arch/",
        "audio-cd/",
        "bd-video/",
        "cd32/",
        "cdi/",
        "cdtv/",
        "chihiro/",
        "dc/",
        "dvd-video/",
        "fmt/",
        "fpp/",
        "gamewave/",
        "gc-bios/",
        "gc/",
        "hddvd-video/",
        "hs/",
        "hvn/",
        "hvnc/",
        "hvnjr/",
        "hvnxp/",
        "ite/",
        "ixl/",
        "kea/",
        "kfb/",
        "km2/",
        "ks573/",
        "ksgv/",
        "ksite/",
        "lindbergh/",
        "m2/",
        "mac/",
        "mcd/",
        "naomi/",
        "naomi2/",
        "navi21/",
        "ngcd/",
        "ns246/",
        "nuon/",
        "palm/",
        "pc-88/",
        "pc-98/",
        "pc-fx/",
        "pc/",
        "pce/",
        "photo-cd/",
        "pippin/",
        "ppc/",
        "ps2-bios/",
        "ps2/",
        "ps3/",
        "ps4/",
        "ps5/",
        "psp/",
        "psx-bios/",
        "psx/",
        "psxgs/",
        "qis/",
        "quizard/",
        "sp21/",
        "sre/",
        "sre2/",
        "ss/",
        "trf/",
        "vcd/",
        "vflash/",
        "vis/",
        "wii/",
        "wiiu/",
        "x68k/",
        "xbox-bios/",
        "xbox/",
        "xbox360/",
        "xboxone/",
        "xboxsx/"
    ];

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

        Downloader.total = Downloader.pathURLs.length;
        const folder: string = 'dat/redump';

        try {
            for (const element of Downloader.pathURLs) {

                const url = Downloader.baseURL + element;
                const baseName: string = element.replace(/\/+$/, '');
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
                            Downloader.total--;
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
            const res: Response = await fetch(url);
            if (res.ok) return await res.arrayBuffer();
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
            console.error(err);
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
