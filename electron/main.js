const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
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
    title: "SafeWatch AI - Smart Safety & Reward Management",
    icon: path.join(__dirname, '../public/favicon.ico'),
    autoHideMenuBar: true
  });

  const isDev = !app.isPackaged;
  
  if (isDev) {
      win.loadURL('http://localhost:5173');
      // win.webContents.openDevTools(); 
  } else {
      // Correctly resolving path for production (packed inside asar)
      win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

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