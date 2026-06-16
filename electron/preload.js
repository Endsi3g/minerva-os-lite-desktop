const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  exportAudit: (fileName, content) => ipcRenderer.invoke('export-audit', { fileName, content }),
  sendNotification: (title, body) => ipcRenderer.invoke('send-notification', { title, body }),
  updateScrapingStatus: (status, niche, city) => ipcRenderer.send('update-scraping-status', { status, niche, city }),
  getDiagnostics: () => ipcRenderer.invoke('get-diagnostics'),
  triggerUpdateCheck: () => ipcRenderer.send('trigger-update-check'),
  onUpdateStatus: (callback) => {
    const subscription = (event, status, details) => callback(status, details);
    ipcRenderer.on('update-status', subscription);
    return () => {
      ipcRenderer.removeListener('update-status', subscription);
    };
  },
  
  // Database API
  dbAll: (sql, params) => ipcRenderer.invoke('db-all', { sql, params }),
  dbRun: (sql, params) => ipcRenderer.invoke('db-run', { sql, params }),
  dbGet: (sql, params) => ipcRenderer.invoke('db-get', { sql, params }),
  setSession: (session) => ipcRenderer.invoke('set-session', session),
  triggerSync: () => ipcRenderer.invoke('trigger-sync'),

  // Spotlight search API
  hideSpotlight: () => ipcRenderer.send('hide-spotlight'),
  openLeadInMain: (leadId) => ipcRenderer.send('open-lead-in-main', leadId),
  copyToClipboard: (text) => ipcRenderer.send('copy-to-clipboard', text),
  
  // PDF Export API
  printToPdf: (fileName, htmlContent) => ipcRenderer.invoke('print-to-pdf', { fileName, htmlContent }),
  
  // Focus lead callback in main app
  onFocusLead: (callback) => {
    const subscription = (event, leadId) => callback(leadId);
    ipcRenderer.on('focus-lead', subscription);
    return () => {
      ipcRenderer.removeListener('focus-lead', subscription);
    };
  },

  // SMTP Email API (credentials stay local)
  sendSmtpEmail: (params) => ipcRenderer.invoke('send-smtp-email', params),
  testSmtpConnection: (smtpConfig) => ipcRenderer.invoke('test-smtp-connection', smtpConfig),

  // Tray Popover API
  openMainWindow: () => ipcRenderer.send('open-main-window'),
  triggerBackgroundScrapeOnDemand: () => ipcRenderer.invoke('trigger-background-scrape-on-demand'),
  onScrapingStatusChanged: (callback) => {
    const subscription = (event, statusData) => callback(statusData);
    ipcRenderer.on('scraping-status-changed', subscription);
    return () => {
      ipcRenderer.removeListener('scraping-status-changed', subscription);
    };
  }
});
