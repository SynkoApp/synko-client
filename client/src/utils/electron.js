const {remote, ipcRenderer} = window.require("electron");
const { shell, clipboard } = remote;

function getCurrentWindow() {
    return remote.getCurrentWindow();
}

function getCurrentVersion() {
    return remote.app.getVersion();
}

export {
    getCurrentWindow,
    getCurrentVersion,
    ipcRenderer,
    shell,
    clipboard
};