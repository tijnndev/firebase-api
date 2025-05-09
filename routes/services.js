const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { ensureAuthenticated } = require('../middleware/auth');

// Get all services
router.get('/', ensureAuthenticated, (req, res) => {
  const db = req.app.locals.db;
  
  db.all('SELECT * FROM services ORDER BY id ASC', [], (err, services) => {
    if (err) {
      req.flash('error_msg', 'Error retrieving services');
      return res.redirect('/dashboard');
    }
    
    res.render('services/index', {
      title: 'Services',
      services
    });
  });
});

router.get('/json', ensureAuthenticated, (req, res) => {
  const db = req.app.locals.db;

  db.all('SELECT id, name, secret FROM services ORDER BY created_at DESC', [], (err, services) => {
    if (err) {
      return res.status(500).json({ error: 'Error retrieving services' });
    }

    res.json(services);
  });
});

// Show create service form
router.get('/create', ensureAuthenticated, (req, res) => {
  res.render('services/create', { title: 'Create Service' });
});

// Create new service
router.post('/create', ensureAuthenticated, (req, res) => {
  const { name, url } = req.body;
  const db = req.app.locals.db;
  
  if (!name || !url) {
    req.flash('error_msg', 'Please enter all fields');
    return res.redirect('/services/create');
  }
  
  // Generate a random secret
  const secret = crypto.randomBytes(32).toString('hex');
  
  db.run('INSERT INTO services (name, url, secret) VALUES (?, ?, ?)', [name, url, secret], function(err) {
    if (err) {
      req.flash('error_msg', 'Error creating service: ' + err.message);
      return res.redirect('/services/create');
    }
    
    req.flash('success_msg', 'Service created successfully');
    res.redirect('/services');
  });
});

// Delete service
router.delete('/:id', ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  const db = req.app.locals.db;
  
  db.run('DELETE FROM services WHERE id = ?', [id], function(err) {
    if (err) {
      req.flash('error_msg', 'Error deleting service: ' + err.message);
    } else if (this.changes === 0) {
      req.flash('error_msg', 'Service not found');
    } else {
      req.flash('success_msg', 'Service deleted successfully');
    }
    
    res.redirect('/services');
  });
});

// Reset service secret
router.post('/:id/reset-secret', ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  const db = req.app.locals.db;
  const newSecret = crypto.randomBytes(32).toString('hex');
  
  db.run('UPDATE services SET secret = ? WHERE id = ?', [newSecret, id], function(err) {
    if (err) {
      req.flash('error_msg', 'Failed to reset secret: ' + err.message);
    } else if (this.changes === 0) {
      req.flash('error_msg', 'Service not found');
    } else {
      req.flash('success_msg', 'Secret reset successfully');
    }
    
    res.redirect('/services');
  });
});

// Test notification route
router.post('/test-notification', ensureAuthenticated, (req, res) => {
  const { serviceId, title, body, secret } = req.body;
  const db = req.app.locals.db;
  const firebaseAdmin = req.app.locals.firebaseAdmin;
  
  if (!serviceId || !title || !body || !secret) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  db.get('SELECT secret FROM services WHERE id = ?', [serviceId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    if (row.secret !== secret) {
      return res.status(403).json({ error: 'Invalid secret' });
    }
    
    // Get service details
    db.get('SELECT * FROM services WHERE id = ?', [serviceId], (err, service) => {
      if (err || !service) {
        return res.status(500).json({ error: 'Error retrieving service details' });
      }
      
      // Get tokens for the service
      db.all('SELECT * FROM fcm_tokens WHERE serviceId = ?', [serviceId], (err, tokens) => {
        if (err) {
          return res.status(500).json({ error: 'Error retrieving FCM tokens' });
        }
        
        if (tokens.length === 0) {
          return res.status(404).json({ error: 'No tokens found for this service' });
        }
        
        // Send notification to all tokens
        const messaging = firebaseAdmin.messaging();
        const baseMessage = {
          data: {
            title: title,
            body: body,
            url: service.url,
            LinkUrl: service.url
          }
        };
        
        let sentCount = 0;
        let errorCount = 0;
        
        tokens.forEach((token) => {
          let message = {...baseMessage};
          
          if (token.type === 'web') {
            message.notification = {
              title: title,
              body: body,
            };
            message.data = {
              ...message.data,
              click_action: service.url
            };
            message.webpush = {
              fcmOptions: {
                link: service.url,
              },
            };
          }
          
          if (token.type === 'android') {
            message.notification = {
              title: title,
              body: body,
            };
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
            .then((resp) => {
              sentCount++;
              if (sentCount + errorCount === tokens.length) {
                res.json({ 
                  message: `Notification sent successfully to ${sentCount} devices. ${errorCount} failed.` 
                });
              }
            })
            .catch(() => {
              errorCount++;
              if (sentCount + errorCount === tokens.length) {
                res.json({ 
                  message: `Notification sent successfully to ${sentCount} devices. ${errorCount} failed.` 
                });
              }
            });
        });
      });
    });
  });
});

// Get service tokens
router.get('/:id/tokens', ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  const db = req.app.locals.db;
  
  db.get('SELECT * FROM services WHERE id = ?', [id], (err, service) => {
    if (err || !service) {
      req.flash('error_msg', 'Service not found');
      return res.redirect('/services');
    }
    
    db.all('SELECT * FROM fcm_tokens WHERE serviceId = ?', [id], (err, tokens) => {
      if (err) {
        req.flash('error_msg', 'Error retrieving tokens');
        return res.redirect('/services');
      }
      
      res.render('tokens/index', {
        title: `Tokens for ${service.name}`,
        tokens,
        service
      });
    });
  });
});
const broadCastMessage = (serviceId, title, body, db, messaging) => {
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
          message.notification = {
            title: title,
            body: body,
          };
          message.data = {
            ...message.data,
            click_action: row.url
          };
          message.webpush = {
            fcmOptions: {
              link: row.url,
            },
          }
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


router.post('/broadcast', (req, res) => {
  const db = req.app.locals.db;
  const firebaseAdmin = req.app.locals.firebaseAdmin;
  const messaging = firebaseAdmin.messaging();
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

    broadCastMessage(serviceId, title, body, db, messaging);

    res.status(200).send({ message: 'Broadcast message sent successfully' });
  });
});

module.exports = router;
