const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

const db = new sqlite3.Database(process.env.DB_FILE || './firebase.db', (err) => {
  if (err) console.error('Database connection failed:', err.message);
  else console.log('Connected to the SQLite database.');
});

// Define table schemas (columns and types)
const schemas = {
  users: {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    username: 'TEXT NOT NULL UNIQUE',
    password: 'TEXT NOT NULL'
  },
  services: {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    name: 'TEXT NOT NULL',
    url: 'TEXT NOT NULL',
    secret: 'TEXT NOT NULL UNIQUE',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
  },
  fcm_tokens: {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    token: 'TEXT NOT NULL UNIQUE',
    serviceId: 'INTEGER NOT NULL',
    type: 'TEXT NOT NULL'
    // Foreign keys cannot be added via ALTER TABLE in SQLite
  },
  log: {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    type: 'TEXT NOT NULL',
    content: 'TEXT NOT NULL',
    service_id: 'INTEGER NULL',
    created_at: 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'
  }
};

// Compare existing table schema to defined one
function autoMigrateTable(tableName, columns) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, existingColumns) => {
      if (err) return reject(err);

      const existingNames = new Set(existingColumns.map(col => col.name));
      const definedNames = Object.keys(columns);

      const missing = definedNames.filter(col => !existingNames.has(col));

      if (existingColumns.length === 0) {
        // Table doesn't exist, create it
        const columnDefs = Object.entries(columns)
          .map(([name, def]) => `${name} ${def}`)
          .join(',\n  ');

        db.run(`CREATE TABLE ${tableName} (\n  ${columnDefs}\n)`, (err) => {
          if (err) return reject(err);
          console.log(`Created table: ${tableName}`);
          resolve();
        });
      } else if (missing.length > 0) {
        // Add missing columns
        const addColumn = (col, cb) => {
          db.run(`ALTER TABLE ${tableName} ADD COLUMN ${col} ${columns[col]}`, cb);
        };

        let added = 0;
        missing.forEach(col => {
          addColumn(col, (err) => {
            if (err) console.error(`Failed to add column '${col}' to '${tableName}':`, err.message);
            else console.log(`Added column '${col}' to table '${tableName}'`);
            if (++added === missing.length) resolve();
          });
        });
      } else {
        resolve();
      }
    });
  });
}

// Run migrations
async function runMigrations() {
  for (const [table, columns] of Object.entries(schemas)) {
    try {
      await autoMigrateTable(table, columns);
    } catch (err) {
      console.error(`Error migrating table ${table}:`, err.message);
    }
  }
}

// Create default admin user
function createDefaultUser() {
  db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
    if (err) return console.error('Error checking users:', err.message);
    if (row.count > 0) return;

    const username = process.env.DEFAULT_USER_USERNAME || 'admin';
    const password = process.env.DEFAULT_USER_PASSWORD || 'admin';

    bcrypt.hash(password, 10, (err, hashed) => {
      if (err) return console.error('Error hashing password:', err.message);

      db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashed], (err) => {
        if (err) console.error('Error creating default user:', err.message);
        else console.log('Default user created.');
      });
    });
  });
}

(async () => {
  await runMigrations();
  createDefaultUser();
})();

module.exports = db;
