const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');

// Home/Landing page route
router.get('/', ensureAuthenticated, (req, res) => {
  res.redirect('/dashboard');
});

// Dashboard route
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  const db = req.app.locals.db;
  
  // Get counts for statistics
  db.all(`
    SELECT 
      (SELECT COUNT(*) FROM services) as servicesCount,
      (SELECT COUNT(*) FROM fcm_tokens) as tokensCount
  `, [], (err, rows) => {
    if (err) {
      req.flash('error_msg', 'Error retrieving dashboard data');
      return res.render('dashboard', {
        title: 'Dashboard',
        stats: { servicesCount: 0, tokensCount: 0 }
      });
    }
    
    res.render('dashboard', {
      title: 'Dashboard',
      stats: rows[0]
    });
  });
});

// Dashboard route
const util = require('util');

router.get('/log', ensureAuthenticated, async (req, res) => {
  const db = req.app.locals.db;

  // Promisify db.all and db.get
  const dbAll = util.promisify(db.all).bind(db);
  const dbGet = util.promisify(db.get).bind(db);

  try {
    const logs = await dbAll('SELECT * FROM log ORDER BY created_at DESC');

    // Enrich logs with service info
    const formattedLogs = await Promise.all(logs.map(async log => {
      let service = null;

      if (log.service_id) {
        service = await dbGet('SELECT * FROM services WHERE id = ?', [log.service_id]);
      }

      return {
        id: log.id,
        timestamp: log.created_at,
        type: log.type,
        message: log.content,
        service: service || null
      };
    }));

    res.render('log', {
      title: 'Log',
      logs: formattedLogs
    });
  } catch (err) {
    console.error('Error retrieving logs with service info:', err.message);
    req.flash('error_msg', 'Error retrieving logs');
    res.render('log', {
      title: 'Log',
      logs: []
    });
  }
});


// Toggle theme route
router.post('/toggle-theme', (req, res) => {
  const { darkMode } = req.body;
  req.session.darkMode = darkMode;
  res.json({ success: true });
});

// 404 route
router.get('/404', (req, res) => {
  res.render('404', { title: 'Page Not Found' });
});

module.exports = router;
