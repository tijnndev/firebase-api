const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Create a connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'firebase_dashboard',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test the connection
pool.getConnection()
  .then(connection => {
    console.log('Connected to MySQL database successfully.');
    connection.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });

// Define table schemas for MySQL
const schemas = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  services: `
    CREATE TABLE IF NOT EXISTS services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      url VARCHAR(500) NOT NULL,
      secret VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_secret (secret)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  fcm_tokens: `
    CREATE TABLE IF NOT EXISTS fcm_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(500) NOT NULL UNIQUE,
      serviceId INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE,
      INDEX idx_token (token(255)),
      INDEX idx_serviceId (serviceId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  log: `
    CREATE TABLE IF NOT EXISTS log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      service_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
      INDEX idx_type (type),
      INDEX idx_service_id (service_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `
};

// Run migrations
async function runMigrations() {
  const connection = await pool.getConnection();
  try {
    for (const [tableName, createTableSQL] of Object.entries(schemas)) {
      await connection.query(createTableSQL);
      console.log(`Table '${tableName}' is ready.`);
    }
    console.log('All migrations completed successfully.');
  } catch (err) {
    console.error('Error running migrations:', err.message);
    throw err;
  } finally {
    connection.release();
  }
}

// Create default admin user
async function createDefaultUser() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT COUNT(*) AS count FROM users');
    if (rows[0].count > 0) return;

    const username = process.env.DEFAULT_USER_USERNAME || 'admin';
    const password = process.env.DEFAULT_USER_PASSWORD || 'admin';

    const hashed = await bcrypt.hash(password, 10);
    await connection.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed]);
    console.log('Default user created successfully.');
  } catch (err) {
    console.error('Error creating default user:', err.message);
  } finally {
    connection.release();
  }
}

// Initialize database
(async () => {
  try {
    await runMigrations();
    await createDefaultUser();
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    process.exit(1);
  }
})();

// Export the pool with callback-style methods for backward compatibility
module.exports = {
  // Promise-based methods
  query: (sql, params) => pool.query(sql, params),
  execute: (sql, params) => pool.execute(sql, params),
  getConnection: () => pool.getConnection(),
  
  // Callback-style methods for backward compatibility with existing code
  all: async (sql, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    try {
      const [rows] = await pool.query(sql, params);
      callback(null, rows);
    } catch (err) {
      callback(err);
    }
  },
  
  get: async (sql, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    try {
      const [rows] = await pool.query(sql, params);
      callback(null, rows[0] || null);
    } catch (err) {
      callback(err);
    }
  },
  
  run: async (sql, params, callback) => {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    try {
      const [result] = await pool.query(sql, params);
      // Emulate SQLite's this.lastID and this.changes
      if (callback) {
        callback.call({
          lastID: result.insertId,
          changes: result.affectedRows
        }, null);
      }
    } catch (err) {
      if (callback) callback(err);
    }
  },
  
  // Pool instance for advanced usage
  pool
};
