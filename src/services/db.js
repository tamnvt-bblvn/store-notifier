import Database from 'better-sqlite3';
import path from 'path';

let db;

export function initDb() {
  db = new Database('database.sqlite');
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      UNIQUE(channel_id, keyword)
    )
  `);
}

export function addSubscription(channelId, keyword) {
  const stmt = db.prepare('INSERT OR IGNORE INTO subscriptions (channel_id, keyword) VALUES (?, ?)');
  stmt.run(channelId, keyword);
}

export function removeSubscription(channelId, keyword) {
  const stmt = db.prepare('DELETE FROM subscriptions WHERE channel_id = ? AND keyword = ?');
  stmt.run(channelId, keyword);
}

export function getSubscriptions(channelId) {
  const stmt = db.prepare('SELECT keyword FROM subscriptions WHERE channel_id = ?');
  return stmt.all(channelId).map(row => row.keyword);
}

export function findChannelsByKeyword(text) {
  const stmt = db.prepare('SELECT channel_id, keyword FROM subscriptions');
  const allSubs = stmt.all();
  
  const matches = new Set();
  const lowerText = text.toLowerCase();
  
  for (const sub of allSubs) {
    if (lowerText.includes(sub.keyword.toLowerCase())) {
      matches.add(sub.channel_id);
    }
  }
  return Array.from(matches);
}
