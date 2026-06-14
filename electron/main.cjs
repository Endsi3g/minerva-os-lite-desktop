/* eslint-disable @typescript-eslint/no-require-imports */
const { app, protocol, net, BrowserWindow, Menu, Tray, nativeImage, dialog, ipcMain, Notification, globalShortcut, clipboard } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const os = require('os');
const db = require('./database.cjs');
const sync = require('./sync.cjs');

// Workaround for Electron 42 + macOS 26 DCHECK crash in Chromium GPU/Metal stack
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');
// Disable Chrome translation UI (unused in this app)
app.commandLine.appendSwitch('disable-features', 'TranslateUI');

// Register the custom scheme 'app' as standard and secure
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

let mainWindow;
let spotlightWindow;
let trayWindow = null;
let tray = null;
let isQuitting = false;
let scrapingStatus = { status: 'idle', niche: '', city: '' };
let hasNotifiedBackground = false;

function broadcastScrapingStatus() {
  updateTrayMenu();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('scraping-status-changed', scrapingStatus);
  }
  if (trayWindow && !trayWindow.isDestroyed()) {
    trayWindow.webContents.send('scraping-status-changed', scrapingStatus);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Minerva OS Reach Lite",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      backgroundThrottling: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Hide the default menu bar on Windows
  mainWindow.setMenuBarVisibility(false);

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL('app://minerva/').catch(err => {
      console.error("Failed to load app url in Electron:", err);
    });
  }

  if (isDev) {
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[Renderer Console] [Level ${level}] ${message} (at ${sourceId}:${line})`);
    });
  } else {
    mainWindow.webContents.on('console-message', (event, level, message) => {
      if (level >= 2) console.warn(`[Renderer] ${message}`);
    });
  }

  // Intercept the close event to hide the window instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      if (!hasNotifiedBackground) {
        hasNotifiedBackground = true;
        if (Notification.isSupported()) {
          new Notification({
            title: 'Minerva OS Reach Lite',
            body: 'Minerva continue de tourner en tâche de fond dans la zone de notification.',
            icon: path.join(__dirname, '../public/icon-192.png')
          }).show();
        }
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function updateTrayMenu() {
  if (!tray) return;

  const statusLabel = scrapingStatus.status === 'running'
    ? `Statut : Scraping en cours (${scrapingStatus.niche} - ${scrapingStatus.city})`
    : 'Statut : Prêt pour la prospection';

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Minerva OS Reach Lite',
      enabled: false
    },
    {
      label: statusLabel,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Ouvrir l\'application',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quitter Minerva',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/icon-192.png');
  const trayIcon = nativeImage.createFromPath(iconPath);

  tray = new Tray(trayIcon);
  tray.setToolTip('Minerva OS Reach Lite');

  updateTrayMenu();

  // Click tray icon to toggle window visibility
  tray.on('click', () => {
    if (trayWindow) {
      if (trayWindow.isVisible()) {
        trayWindow.hide();
      } else {
        showTrayWindow();
      }
    } else {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
      }
    }
  });

  // Double click tray icon to show window
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
}

function setupMenuAndShortcuts() {
  const template = [
    {
      label: 'Édition',
      submenu: [
        { label: 'Annuler', role: 'undo' },
        { label: 'Rétablir', role: 'redo' },
        { type: 'separator' },
        { label: 'Couper', role: 'cut' },
        { label: 'Copier', role: 'copy' },
        { label: 'Coller', role: 'paste' },
        { label: 'Sélectionner tout', role: 'selectAll' }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Recharger', role: 'reload' },
        { label: 'Forcer le rechargement', role: 'forceReload' },
        { label: 'Outils de développement', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Taille réelle', role: 'resetZoom' },
        { label: 'Zoom avant', role: 'zoomIn' },
        { label: 'Zoom arrière', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Plein écran', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Fenêtre',
      submenu: [
        { label: 'Minimiser', role: 'minimize' },
        { label: 'Fermer', role: 'close' }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { label: 'À propos', role: 'about' },
        { type: 'separator' },
        { label: 'Masquer', role: 'hide' },
        { label: 'Masquer les autres', role: 'hideOthers' },
        { label: 'Tout afficher', role: 'unhide' },
        { type: 'separator' },
        { label: 'Quitter', role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function checkUpdates() {
  // Setup standard update event listeners to broadcast to renderer
  autoUpdater.on('checking-for-update', () => {
    if (mainWindow) mainWindow.webContents.send('update-status', 'checking');
  });
  autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('update-status', 'available', info.version);
  });
  autoUpdater.on('update-not-available', () => {
    if (mainWindow) mainWindow.webContents.send('update-status', 'not-available');
  });
  autoUpdater.on('error', (err) => {
    if (mainWindow) mainWindow.webContents.send('update-status', 'error', err.message);
  });
  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.webContents.send('update-status', 'downloaded', info.version);
    
    dialog.showMessageBox({
      type: 'info',
      title: 'Mise à jour disponible',
      message: `Une nouvelle version (${info.version}) de Minerva OS Reach Lite est disponible et a été téléchargée.`,
      detail: 'Voulez-vous redémarrer l\'application maintenant pour l\'installer ?',
      buttons: ['Redémarrer', 'Plus tard'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  // Defer update check 5s to not slow down initial window load
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.error("Failed to check for updates on startup:", err);
    });
  }, 5000);
}

function setupIpcHandlers() {
  // 1. Export SEO Audit to user-specified local path
  ipcMain.handle('export-audit', async (event, { fileName, content }) => {
    const window = BrowserWindow.getFocusedWindow() || mainWindow;
    const { filePath } = await dialog.showSaveDialog(window, {
      title: 'Exporter l\'audit SEO',
      defaultPath: fileName,
      filters: [
        { name: 'Texte brut (*.txt)', extensions: ['txt'] },
        { name: 'Markdown (*.md)', extensions: ['md'] },
        { name: 'Tous les fichiers', extensions: ['*'] }
      ]
    });

    if (filePath) {
      try {
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true, filePath };
      } catch (err) {
        console.error('Failed to write file locally:', err);
        return { success: false, error: err.message };
      }
    }
    return { success: false };
  });

  // 2. Native System Notifications
  ipcMain.handle('send-notification', async (event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({
        title,
        body,
        icon: path.join(__dirname, '../public/icon-192.png')
      }).show();
      return true;
    }
    return false;
  });

  // 3. Hardware / OS Diagnostic check details
  ipcMain.handle('get-diagnostics', async () => {
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const totalMemGb = (totalMemBytes / (1024 * 1024 * 1024)).toFixed(2);
    const freeMemGb = (freeMemBytes / (1024 * 1024 * 1024)).toFixed(2);
    const usedMemGb = ((totalMemBytes - freeMemBytes) / (1024 * 1024 * 1024)).toFixed(2);
    
    return {
      platform: process.platform === 'darwin' ? 'macOS' : process.platform === 'win32' ? 'Windows' : 'Linux',
      arch: process.arch,
      nodeVersion: process.version,
      chromeVersion: process.versions.chrome,
      electronVersion: process.versions.electron,
      totalMemory: `${totalMemGb} GB`,
      freeMemory: `${freeMemGb} GB`,
      usedMemory: `${usedMemGb} GB`,
      cpus: os.cpus().map(cpu => cpu.model)[0] || 'Unknown CPU',
      cpuCount: os.cpus().length,
      uptime: (os.uptime() / 3600).toFixed(2) + ' hours',
      appVersion: app.getVersion()
    };
  });

  // 4. Update scraping status in System Tray menu
  ipcMain.on('update-scraping-status', (event, { status, niche, city }) => {
    scrapingStatus = { status, niche, city };
    broadcastScrapingStatus();
  });

  // 5. Trigger update check manually from settings / download view
  ipcMain.on('trigger-update-check', () => {
    if (process.env.NODE_ENV === 'development') {
      if (mainWindow) {
        mainWindow.webContents.send('update-status', 'checking');
        setTimeout(() => {
          mainWindow.webContents.send('update-status', 'not-available');
        }, 1000);
      }
    } else {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });

  // 6. Local SQLite database handlers
  ipcMain.handle('db-all', async (event, { sql, params }) => {
    return await db.all(sql, params);
  });

  ipcMain.handle('db-run', async (event, { sql, params }) => {
    return await db.run(sql, params);
  });

  ipcMain.handle('db-get', async (event, { sql, params }) => {
    return await db.get(sql, params);
  });

  // 7. Supabase session and sync handlers
  ipcMain.handle('set-session', async (event, session) => {
    sync.setSession(session);
    return true;
  });

  ipcMain.handle('trigger-sync', async () => {
    await sync.triggerSync();
    return true;
  });

  // 8. Spotlight Quick Search window handlers
  ipcMain.on('hide-spotlight', () => {
    if (spotlightWindow && !spotlightWindow.isDestroyed()) spotlightWindow.hide();
  });

  ipcMain.on('open-lead-in-main', (event, leadId) => {
    if (spotlightWindow) spotlightWindow.hide();
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('focus-lead', leadId);
    }
  });

  ipcMain.on('copy-to-clipboard', (event, text) => {
    clipboard.writeText(text);
  });

  // 9. PDF printing handler
  ipcMain.handle('print-to-pdf', async (event, { fileName, htmlContent }) => {
    const pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false
      }
    });

    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    const window = BrowserWindow.getFocusedWindow() || mainWindow;
    const { filePath } = await dialog.showSaveDialog(window, {
      title: 'Exporter en PDF',
      defaultPath: fileName,
      filters: [{ name: 'Document PDF (*.pdf)', extensions: ['pdf'] }]
    });

    if (filePath) {
      try {
        const data = await pdfWindow.webContents.printToPDF({
          printBackground: true,
          margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
        });
        fs.writeFileSync(filePath, data);
        pdfWindow.close();
        return { success: true, filePath };
      } catch (err) {
        console.error("PDF printing failed:", err);
        pdfWindow.close();
        return { success: false, error: err.message };
      }
    }
    pdfWindow.close();
    return { success: false };
  });

  // 10. Open main window from tray
  ipcMain.on('open-main-window', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // 11. Get current scraping status for tray popover
  ipcMain.handle('get-scraping-status', () => {
    return scrapingStatus;
  });

  // 12. Trigger manual background scrape on demand from tray
  ipcMain.handle('trigger-background-scrape-on-demand', async () => {
    const setting = await db.get("SELECT * FROM settings ORDER BY updated_at DESC LIMIT 1");
    if (!setting) {
      return { success: false, error: "Aucun paramètre configuré. Veuillez vous connecter." };
    }
    return await executeScrape(setting);
  });
}

function ensureSpotlightWindow() {
  if (spotlightWindow && !spotlightWindow.isDestroyed()) return;

  spotlightWindow = new BrowserWindow({
    width: 600,
    height: 400,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      backgroundThrottling: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    spotlightWindow.loadURL('http://localhost:3000/spotlight');
  } else {
    spotlightWindow.loadURL('app://minerva/spotlight').catch(err => {
      console.error("Failed to load spotlight url in Electron:", err);
    });
  }

  spotlightWindow.on('blur', () => {
    if (spotlightWindow && !spotlightWindow.isDestroyed()) spotlightWindow.hide();
  });
  spotlightWindow.on('closed', () => { spotlightWindow = null; });
}

function ensureTrayWindow() {
  if (trayWindow && !trayWindow.isDestroyed()) return;

  trayWindow = new BrowserWindow({
    width: 360,
    height: 450,
    frame: false,
    resizable: false,
    show: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      backgroundThrottling: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    trayWindow.loadURL('http://localhost:3000/tray');
  } else {
    trayWindow.loadURL('app://minerva/tray').catch(err => {
      console.error("Failed to load tray url in Electron:", err);
    });
  }

  if (process.platform === 'darwin') {
    trayWindow.setVibrancy('under-window');
  }

  trayWindow.on('blur', () => {
    if (trayWindow && !trayWindow.isDestroyed()) trayWindow.hide();
  });
  trayWindow.on('closed', () => { trayWindow = null; });
}

function showTrayWindow() {
  ensureTrayWindow();
  if (!tray || !trayWindow) return;

  const trayBounds = tray.getBounds();
  const windowBounds = trayWindow.getBounds();
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
  let y = Math.round(trayBounds.y + trayBounds.height);

  if (x < 10) x = 10;
  if (x + windowBounds.width > screenWidth - 10) {
    x = screenWidth - windowBounds.width - 10;
  }

  if (y + windowBounds.height > screenHeight) {
    y = Math.round(trayBounds.y - windowBounds.height);
  }

  trayWindow.setPosition(x, y);
  trayWindow.show();
  trayWindow.focus();
}

async function executeScrape(setting) {
  try {
    const niches = JSON.parse(setting.niches || '[]');
    const cities = JSON.parse(setting.cities || '[]');

    if (niches.length === 0 || cities.length === 0) {
      return { success: false, error: "Veuillez configurer au moins un secteur (niche) et une ville dans les paramètres." };
    }

    const niche = niches[Math.floor(Math.random() * niches.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const query = `${niche} ${city}`;

    // Broadcast running status
    scrapingStatus = { status: 'running', niche, city };
    broadcastScrapingStatus();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://minerva-os-lite.com';
    const response = await fetch(`${appUrl}/api/scrape-maps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        niche,
        city,
        query,
        sources: ['google']
      })
    });

    const data = await response.json();
    
    // Update the last_scrape_at timestamp locally right away
    const nowStr = new Date().toISOString();
    await db.run("UPDATE settings SET last_scrape_at = ? WHERE user_id = ?", [nowStr, setting.user_id]);

    let addedCount = 0;
    if (data.leads && data.leads.length > 0) {
      for (const item of data.leads) {
        const existing = await db.get("SELECT id FROM leads WHERE business_name = ? AND city = ?", [item.businessName, item.city]);
        if (!existing) {
          const leadId = 'lead-' + Date.now() + Math.random().toString(36).substr(2, 5);
          let temp = 'Warm';
          if (item.rating < 4.0 || !item.website) temp = 'Hot';

          await db.run(`INSERT INTO leads (id, user_id, business_name, contact_name, contact_email, niche, city, source, status, temperature, next_action, next_action_date, owner, image_url, workspace_id, created_at, updated_at, sync_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_insert')`,
            [leadId, setting.user_id, item.businessName, 'Gérant', item.email || '', item.niche, item.city, `Background Maps - ${item.rating}★`, 'New', temp, item.seoAudit || 'Vérifier la fiche', new Date().toISOString().split('T')[0], 'Moi', '', '', new Date().toISOString(), new Date().toISOString()]
          );
          addedCount++;
        }
      }

      if (addedCount > 0) {
        await sync.triggerSync();

        if (Notification.isSupported()) {
          new Notification({
            title: 'Prospection Autonome',
            body: `${addedCount} nouveaux prospects trouvés pour "${niche}" à "${city}" !`,
            icon: path.join(__dirname, '../public/icon-192.png')
          }).show();
        }
      }
    }

    scrapingStatus = { status: 'idle', niche: '', city: '' };
    broadcastScrapingStatus();

    return { success: true, addedCount };
  } catch (err) {
    console.error("Scraping execution error:", err);
    scrapingStatus = { status: 'idle', niche: '', city: '' };
    broadcastScrapingStatus();
    return { success: false, error: err.message || "Erreur lors du scraping de leads." };
  }
}

async function runBackgroundScrapeIfNeeded() {
  try {
    const setting = await db.get("SELECT * FROM settings ORDER BY updated_at DESC LIMIT 1");
    if (!setting) return;

    const now = Date.now();
    const lastScrapeTime = setting.last_scrape_at ? new Date(setting.last_scrape_at).getTime() : 0;
    const sixHoursMs = 6 * 60 * 60 * 1000; // 21600000 ms

    if (now - lastScrapeTime >= sixHoursMs) {
      await executeScrape(setting);
    }
  } catch (err) {
    console.error("Background autonomous scraper scheduler error:", err);
  }
}

function setupProtocol() {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.ico': 'image/x-icon',
  };

  const findStaticFile = (startPath, suffix) => {
    const exactPath = startPath + suffix;
    if (fs.existsSync(exactPath)) {
      return exactPath;
    }
    
    const outDir = path.resolve(__dirname, '../out');
    let currentDir = path.dirname(exactPath);
    
    while (currentDir.startsWith(outDir)) {
      const placeholderPath = path.join(currentDir, `_placeholder_${suffix}`);
      if (fs.existsSync(placeholderPath)) {
        return placeholderPath;
      }
      const nextDir = path.dirname(currentDir);
      if (nextDir === currentDir) break;
      currentDir = nextDir;
    }
    
    const indexPath = path.join(outDir, `index${suffix}`);
    if (fs.existsSync(indexPath)) {
      return indexPath;
    }
    return null;
  };

  protocol.handle('app', async (request) => {
    try {
      const parsedUrl = new URL(request.url);
      const isRsc = parsedUrl.searchParams.has('_rsc') || request.headers.get('rsc') === '1' || request.headers.get('RSC') === '1';
      
      let cleanPath = decodeURIComponent(parsedUrl.pathname);
      if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.substring(1);
      }
      if (cleanPath.endsWith('/')) {
        cleanPath = cleanPath.slice(0, -1);
      }

      let filePath = path.join(__dirname, '../out', cleanPath);

      if (cleanPath === '' || cleanPath === 'index.html') {
        filePath = path.join(__dirname, '../out/index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const isHtmlOrRoute = ext === '' || ext === '.html';

      let finalPath = filePath;
      if (isHtmlOrRoute) {
        const suffix = isRsc ? '.txt' : '.html';
        
        if (ext === '') {
          const resolved = findStaticFile(filePath, suffix);
          if (resolved) {
            finalPath = resolved;
          } else {
            finalPath = path.join(__dirname, `../out/index${suffix}`);
          }
        } else {
          if (!fs.existsSync(filePath)) {
            const pathWithoutExt = filePath.slice(0, -5);
            const resolved = findStaticFile(pathWithoutExt, suffix);
            if (resolved) {
              finalPath = resolved;
            } else {
              finalPath = path.join(__dirname, `../out/index${suffix}`);
            }
          }
        }
      }

      // If it's a static asset (non-HTML/route) and doesn't exist, return 404
      if (!isHtmlOrRoute && !fs.existsSync(filePath)) {
        return new Response('Not Found', { status: 404 });
      }

      const fileExtension = path.extname(finalPath).toLowerCase();
      let contentType = mimeTypes[fileExtension] || 'application/octet-stream';
      if (isRsc && fileExtension === '.txt') {
        contentType = 'text/x-component';
      }

      const data = await fs.promises.readFile(finalPath);
      return new Response(data, {
        status: 200,
        headers: { 'content-type': contentType }
      });
    } catch (err) {
      console.error('Failed to handle app protocol request:', err);
      // Absolute fallback to index.html to keep the app loading
      try {
        const fallbackPath = path.join(__dirname, '../out/index.html');
        const data = await fs.promises.readFile(fallbackPath);
        return new Response(data, {
          status: 200,
          headers: { 'content-type': 'text/html' }
        });
      } catch (fallbackErr) {
        return new Response('Internal Server Error', { status: 500 });
      }
    }
  });
}

function setupBackgroundScraper() {
  // Delay first check by 30s to not slow down app startup
  setTimeout(runBackgroundScrapeIfNeeded, 30000);
  // Check every 30 minutes — actual scrape only triggers if last_scrape_at > 6h ago
  setInterval(runBackgroundScrapeIfNeeded, 30 * 60 * 1000);
}

app.whenReady().then(() => {
  setupProtocol();
  db.initDb();
  setupIpcHandlers();
  createWindow();
  createTray();
  setupMenuAndShortcuts();
  checkUpdates();
  setupBackgroundScraper();

  // Register global shortcut platform-adaptively
  const shortcutKey = process.platform === 'darwin' ? 'Option+Space' : 'Alt+Space';
  
  if (globalShortcut.isRegistered(shortcutKey)) {
    console.warn(`Global shortcut ${shortcutKey} is already registered by another application.`);
  } else {
    const success = globalShortcut.register(shortcutKey, () => {
      ensureSpotlightWindow();
      if (spotlightWindow.isVisible()) {
        spotlightWindow.hide();
      } else {
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        spotlightWindow.setPosition(Math.round((width - 600) / 2), Math.round(height * 0.15));
        spotlightWindow.show();
      }
    });

    if (!success) {
      console.error(`Failed to register global shortcut ${shortcutKey}`);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
