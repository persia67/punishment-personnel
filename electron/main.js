const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure autoUpdater logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = false; // Allow user to manually click "Download" in UI

let mainWindow = null;

function createWindow() {
  const isDev = !app.isPackaged;
  const iconPath = isDev
    ? path.join(__dirname, '../public/favicon.ico')
    : path.join(__dirname, '../dist/favicon.ico');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false // Often helps with renderer issues in production
    },
    title: "Intelligent monitoring system - Smart Safety & Reward Management",
    icon: iconPath,
    autoHideMenuBar: true
  });

  if (isDev) {
      mainWindow.loadURL('http://localhost:3000');
      // mainWindow.webContents.openDevTools(); 
  } else {
      // Correctly resolving path for production (packed inside asar)
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Auto Updater event forwarders
  autoUpdater.on('checking-for-update', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('checking-for-update');
    }
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available:', info);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available', info);
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded successfully:', info);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', info);
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', err == null ? "Unknown error" : (err.stack || err).toString());
    }
  });

  // Automatically check for updates once window is ready to show
  mainWindow.once('ready-to-show', () => {
    if (!isDev) {
      log.info('Checking for updates on startup...');
      autoUpdater.checkForUpdatesAndNotify();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC listeners for auto updater controls
ipcMain.on('check-for-updates', () => {
  if (!app.isPackaged) {
    log.info('Auto-update bypassed in development mode.');
    return;
  }
  log.info('Manual update check triggered.');
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on('start-download', () => {
  log.info('User confirmed download. Starting update download...');
  autoUpdater.downloadUpdate();
});

ipcMain.on('quit-and-install', () => {
  log.info('Quitting and installing new update version...');
  autoUpdater.quitAndInstall();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});