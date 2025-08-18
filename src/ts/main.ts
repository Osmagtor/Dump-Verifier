import { app, BrowserWindow, ipcMain, dialog, nativeTheme } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { shell } from 'electron';

if (require('electron-squirrel-startup')) app.quit();

let baseDir: string;
let width: number;
let height: number;

if (process.platform === 'win32') {
    baseDir = process.cwd();
    width = 600;
    height = 560;
} else if (process.platform === 'darwin') {
    baseDir = app.getPath('userData');
    width = 580;
    height = 490;
} else {
    baseDir = app.getPath('userData');
    width = 585;
    height = 490;
}

app.whenReady().then((): void => {

    createWindow();

    ipcMain.handle('getOS', async (): Promise<string> => {
        return process.platform;
    });

    ipcMain.handle('createDat', async (): Promise<void> => {
        try {
            const folderRedump: string = path.join(baseDir, 'dat/redump');
            const folderNointro: string = path.join(baseDir, 'dat/no-intro');

            if (!fs.existsSync(folderRedump)) fs.mkdirSync(folderRedump, { recursive: true });
            if (!fs.existsSync(folderNointro)) fs.mkdirSync(folderNointro, { recursive: true });
        } catch (err: any) {
            console.error(err);
        }
    });

    ipcMain.handle('checkFile', async (_, datFileName, datFolder): Promise<boolean> => {
        try {
            const filePath: string = path.join(baseDir, datFolder, datFileName);
            return fs.existsSync(filePath);
        } catch (err: any) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('readDatFile', async (_, datFileName, datFolder): Promise<string | null> => {
        try {
            const filePath: string = path.join(baseDir, datFolder, datFileName);
            return fs.readFileSync(filePath, 'utf-8');
        } catch (err: any) {
            console.error(err);
            return null;
        }
    });

    ipcMain.handle('readDatFileExternal', async (_, datFilePath): Promise<Buffer | null> => {
        try {
            return fs.readFileSync(datFilePath);
        } catch (err: any) {
            console.error(err);
            return null;
        }
    });

    ipcMain.handle('deleteDatFile', async (_, datFileName, datFolder): Promise<boolean> => {
        try {
            const filePath: string = path.join(baseDir, datFolder, datFileName);
            fs.unlinkSync(filePath);
            return true;
        } catch (err: any) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('readDatDirectory', async (_, datFolder, ext): Promise<{ file: string; content: string }[]> => {
        try {
            const dirPath: string = path.join(baseDir, datFolder);
            const files = fs.readdirSync(dirPath);
            const filesFound = files.filter(file => file.endsWith(ext));

            return filesFound.map(file => {
                const filePath = path.join(dirPath, file);
                return {
                    file: file,
                    content: fs.readFileSync(filePath, 'utf-8')
                }
            });
        } catch (err: any) {
            console.error(err);
            return [];
        }
    });

    ipcMain.handle('deleteDatDirectoryContents', async (_, datFolder): Promise<boolean> => {
        try {
            const dirPath: string = path.join(baseDir, datFolder);

            if (fs.existsSync(dirPath)) {

                const files = fs.readdirSync(dirPath);

                for (const file of files) {

                    const filePath = path.join(dirPath, file);

                    if (fs.lstatSync(filePath).isFile()) {
                        fs.unlinkSync(filePath);
                    }
                }
            }
            return true;
        } catch (err: any) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('saveDatFile', async (_, datFileName, datFolder, text): Promise<boolean> => {
        try {
            const folderPath: string = path.join(baseDir, datFolder);
            const filePath: string = path.join(folderPath, datFileName);

            fs.mkdirSync(folderPath, { recursive: true });
            fs.writeFileSync(filePath, text, 'utf-8');

            return true;
        } catch (err: any) {
            console.error(err);
            return false;
        }
    });

    ipcMain.handle('openFile', async (_, exts: string[]): Promise<string[] | null> => {

        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [
                exts?.length
                    ? { name: 'Files', extensions: exts }
                    : { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (canceled) return null;
        else return filePaths;
    });

    ipcMain.handle('basename', async (_, filePath: string): Promise<string> => {
        return path.basename(filePath);
    });

    ipcMain.handle('hash', async (_, filepath: string, start: number = 0, end: number, size: number | null = null): Promise<string | null> => {
        try {
            return await new Promise((resolve, reject) => {

                const hash = crypto.createHash('sha1');
                const stream = fs.createReadStream(filepath, { start: start, end: end });

                stream.on('error', err => reject(err));
                hash.on('error', err => reject(err));
                stream.on('end', () => resolve(hash.digest('hex')));

                stream.pipe(hash);
            });
        } catch (err: any) {
            console.error(err);
            return null;
        }
    });

    ipcMain.handle('openExternal', async (_, url: string): Promise<void> => {
        try {
            await shell.openExternal(url);
        } catch (err: any) {
            console.error('Failed to open external URL:', err);
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', (): void => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// FUNCTIONS

function getTheme(): string {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function createWindow(): void {

    const icon: string = path.join(app.getAppPath(), 'img/icon.ico');

    const win: BrowserWindow = new BrowserWindow({
        width: 600,
        height: 560,
        resizable: false,
        icon: icon,
        webPreferences: {
            preload: path.join(app.getAppPath(), 'dist/js/preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadFile(path.join(app.getAppPath(), 'dist/html/index.html'));
    // win.webContents.openDevTools();
    win.setMenuBarVisibility(false);

    // Send accent color to renderer
    win.webContents.on('did-finish-load', () => {

        const callbackTheme = (): void => {
            const theme = getTheme();
            win.webContents.send('theme', theme);
        }

        nativeTheme.on('updated', callbackTheme);

        callbackTheme();
    });
}