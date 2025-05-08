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
