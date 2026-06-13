const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

let db;

function initDb() {
  const dbPath = path.join(app.getPath('userData'), 'minerva.db');
  db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    // 1. Settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      user_id TEXT PRIMARY KEY,
      full_name TEXT,
      company_name TEXT,
      timezone TEXT,
      niches TEXT,
      cities TEXT,
      ai_tone TEXT,
      ai_density TEXT,
      quick_note TEXT,
      focus_title TEXT,
      focus_items TEXT,
      last_scrape_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);

    // 2. Leads table
    db.run(`CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      business_name TEXT,
      contact_name TEXT,
      contact_email TEXT,
      niche TEXT,
      city TEXT,
      source TEXT,
      status TEXT DEFAULT 'New',
      temperature TEXT DEFAULT 'Warm',
      next_action TEXT,
      next_action_date TEXT,
      owner TEXT DEFAULT 'Moi',
      image_url TEXT,
      workspace_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);

    // 3. Drafts table
    db.run(`CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      lead_id TEXT,
      user_id TEXT,
      channel TEXT DEFAULT 'Email',
      tone TEXT,
      content TEXT,
      status TEXT DEFAULT 'Draft',
      workspace_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);

    // 4. Notes table
    db.run(`CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      lead_id TEXT,
      user_id TEXT,
      type TEXT DEFAULT 'general',
      content TEXT,
      workspace_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);

    // 5. Tasks table
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      completed INTEGER DEFAULT 0,
      category TEXT DEFAULT 'General',
      due_date TEXT,
      workspace_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

module.exports = {
  initDb,
  run,
  all,
  get
};
