const { app, BrowserWindow, globalShortcut, dialog, shell } = require('electron');
const isDev = require('electron-is-dev');   
const path = require('path');
const Store = require('electron-store');
const TrayGenerator = require('./TrayGenerator');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
 
let mainWindow;
let Tray;

const schema = {
    launchAtStart: true,
    bounds: {
        width: 1280,
        height: 720
    }
}
const store = new Store(schema);

app.setLoginItemSettings({
    openAtLogin: store.get('launchAtStart'),
});

autoUpdater.on('checking-for-update', (evt) => {
    log.info(`Checking for update...`);
});

autoUpdater.on('update-available', (info) => {
    sendMessage('notification', `New update is available: v${app.getVersion()} > v${info.version} ! Downloading...`);
});

autoUpdater.on('not-update-available', (info) => {
    sendMessage('notification', `There's no update available.`);
});

autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + fBytes(progressObj.bytesPerSecond).size+" "+fBytes(progressObj.bytesPerSecond).unit + "/s";
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + fBytes(progressObj.transferred).size + "/" + fBytes(progressObj.total).size + " " + fBytes(progressObj.total).unit + ')';
    sendMessage('notification', log_message);
})

autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater. ' + err);
})

autoUpdater.on('update-downloaded', (info) => {
    sendMessage('notification', `Update ${info.version} is downloaded ! App will restart in 5 seconds.`);
    setTimeout(() => {
        autoUpdater.quitAndInstall();
    }, 5000);
});
 
function createWindow() {
    mainWindow = new BrowserWindow({
        width: store.get("bounds.width") || 1280,
        height: store.get("bounds.height") || 720,
        minHeight: 720,
        minWidth: 1280,
        show: false,
        resizable: true,
        frame: false,
        title: "Synko Client",
        darkTheme: true,
        webPreferences: {
            devTools: isDev,
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
            nativeWindowOpen: true
        },
        icon: `${path.join(__dirname, '/icon.ico')}`
    });
    const startURL = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`;
 
    mainWindow.loadURL(startURL);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        autoUpdater.checkForUpdates();
    });

    mainWindow.webContents.on('new-window', (evt, url) => {
        evt.preventDefault();
        shell.openExternal(url);
    });

    mainWindow.on('resize', (evt) => {
        let { width, height } = mainWindow.getBounds();
        store.set("bounds", {
            width,
            height
        });
    });
}

function sendMessage(type, message) {
    mainWindow.webContents.send(type, message);
    log.info(message);
}

function fBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return {
        size: parseFloat((bytes / Math.pow(k, i)).toFixed(dm)),
        unit: sizes[i],
    }
}
app.on('ready', () => {
    createWindow();
    Tray = new TrayGenerator(mainWindow, store);
    Tray.createTray();

    if(!isDev) {
        globalShortcut.register('Control+Shift+I', () => {
            return false;
        });
    }
});