const express = require('express');
const firebaseAdmin = require('firebase-admin');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
dotenv.config();

const serviceAccount = require('./serviceAccountKey.json');

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount)
});


const app = express();
app.use(express.json());

app.use(cors({
  origin: '*'
}));

const db = new sqlite3.Database(process.env.DB_FILE, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
)`);

db.run(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS fcm_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    serviceId INTEGER NOT NULL,
    FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
  )
`);

const createDefaultUser = () => {
  db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
    if (err) {
      console.error('Error checking users:', err.message);
    } else if (row.count === 0) {
      bcrypt.hash(process.env.DEFAULT_USER_PASSWORD, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err.message);
        } else {
          db.run(
            `INSERT INTO users (username, password) VALUES (?, ?)`,
            [process.env.DEFAULT_USER_USERNAME, hashedPassword],
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

const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).send({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
  });
};

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send({ error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).send({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).send({ error: 'User not found' });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        return res.status(500).send({ error: 'Error comparing password' });
      }

      if (!isMatch) {
        return res.status(401).send({ error: 'Invalid credentials' });
      }

      const payload = { id: user.id, username: user.username };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.status(200).send({ message: 'Login successful', token });
    });
  });
})

const messaging = firebaseAdmin.messaging();

const broadCastMessage = (serviceId, title, body) => {
  const message = {
    notification: {
      title: title,
      body: body,
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        visibility: 'public',
        channelId: 'high_priority_channel' // required for Android 8+
      }
    }
  };

  db.all('SELECT * FROM fcm_tokens WHERE serviceId = ?', [serviceId], (err, rows) => {
    if (err) {
      console.error('Error retrieving FCM tokens:', err.message);
      return;
    }

    const tokens = rows.map((row) => row.token);

    if (tokens.length === 0) {
      console.log('No tokens found for service:', serviceId);
      return;
    }

    tokens.forEach((token) => {
      messaging
        .send({ ...message, token })
        .then((response) => {
          console.log('Notification sent successfully:', response);
        })
        .catch((error) => {
          console.error('Error sending notification to token:', token, error);
        });
    });
  });
};

app.get('/services', authenticate, (req,res) => {
    db.all('SELECT * FROM services', [], (err, rows) => {
        if (err) {
          console.error('Error retrieving FCM tokens:', err.message);
          return;
        }
        res.status(200).send(rows)
    })
})

app.post('/create-service', authenticate, (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).send({error: 'Name iks required'});
  }

  db.run('INSERT INTO services (name) VALUES (?)', [name], (err) => {
    if (err) {
      return res.status(500).send({ error: 'Error creating service: ' + err.message});
    }
    res.status(200).send({message: 'Service created successfully'});
  });
});


app.post('/register-token', (req, res) => {
  const { token, serviceId } = req.body;

  if (!token || !serviceId) {
    return res.status(400).send({ error: 'Token and serviceId are required'});
  }

  db.get('SELECT * FROM fcm_tokens WHERE token = ?', [token], (err, row) => {
    if (err) {
      return res.status(500).send({ error: 'Database error'});
    }

    if (row) {
      return res.status(400).send({ error: 'Token already registered'});
    }

    db.run('INSERT INTO fcm_tokens (token, serviceId) VALUES (?, ?)', [token, serviceId], (err) => {
      if (err) {
        return res.status(500).send({ error: 'Error registering token'});
      }
      res.status(200).send({ message: 'Token registered successfully'});
    });
  });
});

app.post('/broadcast', authenticate, (req, res) => {
    const { title, body, serviceId } = req.body;
  
    if (!title || !body || !serviceId) {
      return res.status(400).send({ error: 'Title, body, and serviceId are required' });
    }
  
    broadCastMessage(serviceId, title, body);
  
    res.status(200).send({ message: 'Broadcast message sent successfully' });
});

app.get('/tokens', authenticate, (req, res) => {
  db.all('SELECT * FROM fcm_tokens', [], (err, rows) => {
    if (err) {
      return res.status(500).send({ error: 'Error retrieving tokens: ' + err.message });
    }
    res.status(200).send(rows);
  });
});


const PORT = process.env.HTTP_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
