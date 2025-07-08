const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureAuthenticatedAPI } = require('../middleware/auth');
const { createLogEntry } = require('../utils');

// Get all tokens
router.get('/', ensureAuthenticated, (req, res) => {
  const db = req.app.locals.db;
  
  db.all(`
    SELECT t.*, s.name as serviceName, s.url as serviceUrl
    FROM fcm_tokens t
    JOIN services s ON t.serviceId = s.id
    ORDER BY t.id DESC
  `, [], (err, tokens) => {
    if (err) {
      req.flash('error_msg', 'Error retrieving tokens');
      return res.redirect('/dashboard');
    }
    
    res.render('tokens/index', {
      title: 'FCM Tokens',
      tokens,
      service: null
    });
  });
});

// Register token
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  
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

      const logContent = `Token registered (${token})`;
      createLogEntry(db, 'info', logContent, serviceId);
      res.status(200).send({ message: 'Token registered successfully'});
      
      console.log('New registration token:', token, 'for service:', serviceId);
    });
  });
});

router.delete('/', (req, res) => {
  const db = req.app.locals.db;
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
    
    const logContent = `Token unregistered (${token})`;
    createLogEntry(db, 'info', logContent, serviceId);
    res.status(200).send({ message: 'Token unregistered successfully' });
    console.log('Token unregistered:', token, 'for service:', serviceId);
  });
});

// Delete token
router.delete('/:id', ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  const db = req.app.locals.db;
  
  db.run('DELETE FROM fcm_tokens WHERE id = ?', [id], function(err) {
    if (err) {
      req.flash('error_msg', 'Error deleting token: ' + err.message);
    } else if (this.changes === 0) {
      req.flash('error_msg', 'Token not found');
    } else {
      const logContent = `Token deleted (ID: ${id})`;
      createLogEntry(db, 'warning', logContent);
      req.flash('success_msg', 'Token deleted successfully');
    }
    
    // Redirect back to the referrer or to tokens list
    const referrer = req.header('Referer') || '/tokens';
    res.redirect(referrer);
  });
});

module.exports = router;
