const express = require('express');
const firebaseAdmin = require('firebase-admin');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const cors = require('cors');
const crypto = require('crypto');
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

app.get('/', (req, res) => {
  res.status(200).send({ message: 'Welcome to the Firebase API' });
});

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
  db.get('SELECT * FROM services WHERE id = ?', [serviceId], (err, row) => {
    db.all('SELECT * FROM fcm_tokens WHERE serviceId = ?', [serviceId], (err, rows) => {
      
      const message = {
        data: {
          title: title,
          body: body,
          url: row.url,
          LinkUrl: row.url
        }
      };

      if (err) {
        console.error('Error retrieving FCM tokens:', err.message);
        return;
      }

      const tokens = rows.map((row) => row);

      if (tokens.length === 0) {
        console.log('No tokens found for service:', serviceId);
        return;
      }

      tokens.forEach((token) => {
        console.log(token)
        if (token.type === 'web') {
          // message.notification = {
          //   title: title,
          //   body: body,
          // };
          message.data = {
            ...message.data,
            click_action: row.url
          };
        }
        if (token.type === 'android') {
          message.notification = {
            title: title,
            body: body,
          }
          message.android = {
            priority: 'high',
            notification: {
              sound: 'default',
              visibility: 'public',
              channelId: 'high_priority_channel'
            }
          };
        }
        messaging
          .send({ ...message, token: token.token })
          .then((response) => {
            console.log('Notification sent successfully:', response);
          })
          .catch((error) => {
            console.error('Error sending notification to token:', token.token, error);
          });
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
  const { name, url } = req.body;

  if (!name || !url) {
    return res.status(400).send({ error: "Invalid body." });
  }

  const secret = crypto.randomBytes(32).toString('hex');

  db.run('INSERT INTO services (name, secret, url) VALUES (?, ?, ?)', [name, secret, url], function(err) {
    if (err) {
      return res.status(500).send({ error: 'Error creating service: ' + err.message });
    }
    res.status(200).send({ message: 'Service created successfully', id: this.lastID, secret });
  });
});


app.post('/register-token', (req, res) => {
  const { token, serviceId, type } = req.body;

  if (!token || !serviceId || !type) {
    return res.status(400).send({ error: 'Token, type and serviceId are required'});
  }

  db.get('SELECT * FROM fcm_tokens WHERE token = ?', [token], (err, row) => {
    if (err) {
      return res.status(500).send({ error: 'Database error'});
    }

    if (row) {
      console.log('Token:', token, 'already registered for service:', serviceId);
      return res.status(400).send({ error: 'Token already registered'});
    }

    db.run('INSERT INTO fcm_tokens (token, serviceId, type) VALUES (?, ?, ?)', [token, serviceId, type], (err) => {
      if (err) {
        return res.status(500).send({ error: 'Error registering token'});
      }
      res.status(200).send({ message: 'Token registered successfully'});
      
      console.log('New registration token:', token, 'for service:', serviceId);
    });
  });
});

app.post('/unregister-token', (req, res) => {
  const { token, serviceId } = req.body;

  if (!token || !serviceId) {
    return res.status(400).send({ error: 'Token and serviceId are required' });
  }

  db.run('DELETE FROM fcm_tokens WHERE token = ? AND serviceId = ?', [token, serviceId], function (err) {
    if (err) {
      return res.status(500).send({ error: 'Error unregistering token: ' + err.message });
    }

    if (this.changes === 0) {
      return res.status(404).send({ error: 'Token not found for the service' });
    }

    res.status(200).send({ message: 'Token unregistered successfully' });
    console.log('Token unregistered:', token, 'for service:', serviceId);
  });
});


app.post('/broadcast', (req, res) => {
  const { title, body, serviceId, secret } = req.body;

  if (!title || !body || !serviceId || !secret) {
    return res.status(400).send({ error: 'Title, body, serviceId, and secret are required' });
  }

  db.get('SELECT secret FROM services WHERE id = ?', [serviceId], (err, row) => {
    if (err) {
      return res.status(500).send({ error: 'Database error: ' + err.message });
    }

    if (!row) {
      return res.status(404).send({ error: 'Service not found' });
    }

    if (row.secret !== secret) {
      return res.status(403).send({ error: 'Invalid secret' });
    }

    broadCastMessage(serviceId, title, body);

    res.status(200).send({ message: 'Broadcast message sent successfully' });
  });
});

app.post('/reset-secret/:serviceId', authenticate, (req, res) => {
  const { serviceId } = req.params

  if (!serviceId) {
    return res.status(400).send({ error: 'serviceId is required' })
  }

  const newSecret = crypto.randomBytes(32).toString('hex')

  db.run('UPDATE services SET secret = ? WHERE id = ?', [newSecret, serviceId], function (err) {
    if (err) {
      return res.status(500).send({ error: 'Failed to reset secret: ' + err.message })
    }

    if (this.changes === 0) {
      return res.status(404).send({ error: 'Service not found' })
    }

    res.status(200).send({ message: 'Secret reset successfully', secret: newSecret })
  })
})

app.get('/tokens', authenticate, (req, res) => {
  db.all('SELECT * FROM fcm_tokens', [], (err, rows) => {
    if (err) {
      return res.status(500).send({ error: 'Error retrieving tokens: ' + err.message });
    }
    res.status(200).send(rows);
  });
});

app.delete('/tokens/:id', authenticate, (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).send({ error: 'Token id is required' });
  }

  db.run('DELETE FROM fcm_tokens WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).send({ error: 'Error deleting token: ' + err.message });
    }

    if (this.changes === 0) {
      return res.status(404).send({ error: 'Token not found' });
    }

    res.status(200).send({ message: 'Token deleted successfully' });
  });
});

const PORT = process.env.HTTP_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
