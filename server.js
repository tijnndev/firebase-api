const express = require('express');
const firebaseAdmin = require('firebase-admin');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts')

dotenv.config();

// Initialize Firebase Admin
try {
  const serviceAccount = require('./serviceAccountKey.json');
  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
  console.error('Continuing without Firebase functionality');
}

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));
app.use(methodOverride('_method'));

// Set up session management
app.use(session({
  secret: process.env.JWT_SECRET || 'default_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 } // 1 hour
}));

// Set up flash messages
app.use(flash());

// Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  res.locals.darkMode = req.session.darkMode || false;
  next();
});

// Set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts)
app.set('layout', 'layouts/main')

// Set up static folder
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const db = new sqlite3.Database(process.env.DB_FILE || './firebase.db', (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Create tables if they don't exist
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
)`);

db.run(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS fcm_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    serviceId INTEGER NOT NULL,
    type TEXT NOT NULL,
    FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
  )
`);

// Create default user if no users exist
const bcrypt = require('bcrypt');
const createDefaultUser = () => {
  db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
    if (err) {
      console.error('Error checking users:', err.message);
    } else if (row.count === 0) {
      bcrypt.hash(process.env.DEFAULT_USER_PASSWORD || 'admin', 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err.message);
        } else {
          db.run(
            `INSERT INTO users (username, password) VALUES (?, ?)`,
            [process.env.DEFAULT_USER_USERNAME || 'admin', hashedPassword],
            (err) => {
              if (err) {
                console.error('Error creating default user:', err.message);
              } else {
                console.log('Default user created.');
              }
            }
          );
        }
      });
    }
  });
};

createDefaultUser();

// Make db available to all routes
app.locals.db = db;
app.locals.firebaseAdmin = firebaseAdmin;

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/services', require('./routes/services'));
app.use('/tokens', require('./routes/tokens'));



// Start server
const PORT = process.env.HTTP_PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
