const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let expressServer = null;
let activePort = 3000;

// Set user data directory to Windows AppData (%APPDATA%/InvoiceWise/Data)
const appDataPath = path.join(app.getPath('userData'), 'InvoiceWiseData');
process.env.INVOICEWISE_DATA_DIR = appDataPath;

// Seed initial data to appDataPath on fresh install or release update
try {
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
  }
  const bundledDataDir = path.join(__dirname, 'data');
  const versionFile = path.join(appDataPath, '.version');
  const CURRENT_RELEASE_VERSION = '3.1.1';
  let installedVersion = '';
  if (fs.existsSync(versionFile)) {
    try { installedVersion = fs.readFileSync(versionFile, 'utf8').trim(); } catch (e) {}
  }
  const isFreshRelease = installedVersion !== CURRENT_RELEASE_VERSION;

  // Purge any legacy scratch/backup files
  if (fs.existsSync(appDataPath)) {
    const existingFiles = fs.readdirSync(appDataPath);
    for (const f of existingFiles) {
      if (f.startsWith('pre_import_backup') || f.endsWith('.bak') || f.endsWith('.tmp')) {
        try { fs.unlinkSync(path.join(appDataPath, f)); } catch (err) {}
      }
    }
  }

  if (fs.existsSync(bundledDataDir)) {
    const files = fs.readdirSync(bundledDataDir);
    for (const f of files) {
      if (f.endsWith('.json')) {
        const target = path.join(appDataPath, f);
        // Copy if missing, empty, or on fresh release upgrade
        if (!fs.existsSync(target) || fs.statSync(target).size < 10 || isFreshRelease) {
          fs.copyFileSync(path.join(bundledDataDir, f), target);
        }
      }
    }
  }
  fs.writeFileSync(versionFile, CURRENT_RELEASE_VERSION, 'utf8');
} catch (e) {
  console.warn('Initial data seeding check failed:', e);
}

async function startExpressServer() {
  try {
    expressServer = require('./server.js');
    if (expressServer && typeof expressServer.getServerPromise === 'function') {
      const { port } = await expressServer.getServerPromise();
      activePort = port;
    } else if (expressServer && typeof expressServer.getPort === 'function') {
      activePort = expressServer.getPort();
    }
  } catch (err) {
    console.error('Failed to start embedded server:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 920,
    minHeight: 640,
    title: 'InvoiceWise 3.1.1 — Professional GST Billing & Manufacturing ERP',
    icon: path.join(__dirname, 'public', 'logo.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  // Load backend URL on the resolved active port
  mainWindow.loadURL(`http://localhost:${activePort}`);

  // Handle pop-ups (e.g., A4 Invoice Print Pop-up) cleanly within Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 900,
        height: 950,
        title: 'InvoiceWise — Tax Invoice Print',
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      }
    };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    await startExpressServer();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
