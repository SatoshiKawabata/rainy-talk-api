
import sqlite3 from 'sqlite3';
const sqlite3Client = sqlite3.verbose();


const dbPath = process.env.SQLITE_DB_PATH || '../db/mydatabase.db';
const db = new sqlite3Client.Database(dbPath);

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS messages (text TEXT)');

  db.run('INSERT INTO messages (text) VALUES (?)', 'Hello, World!', (err) => {
    if (err) return console.log(err.message);

    db.all('SELECT text FROM messages', [], (err, rows) => {
      if (err) throw err;

      rows.forEach((row) => {
        console.log(row.text);
      });
      db.close();
    });
  });
});

