import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        // @ts-ignore
        invoke: (...args) => ipcRenderer.invoke(...args),
        // More methods can be added here if needed
    },
    onAccentColor: (callback: any) => {
        ipcRenderer.on('accent-color', (_, color: string) => callback(color));
    },
    onTheme: (callback: any) => {
        ipcRenderer.on('theme', (_, theme: string) => callback(theme));
    }
});