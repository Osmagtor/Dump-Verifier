import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        // @ts-ignore
        invoke: (...args) => ipcRenderer.invoke(...args),
        // Add a generic event listener
        on: (channel: string, listener: (...args: any[]) => void) => ipcRenderer.on(channel, listener),
    },
    onAccentColor: (callback: any) => {
        ipcRenderer.on('accent-color', (_, color: string) => callback(color));
    },
    onTheme: (callback: any) => {
        ipcRenderer.on('theme', (_, theme: string) => callback(theme));
    }
});