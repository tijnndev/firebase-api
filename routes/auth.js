const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Login page route
router.get('/login', (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { title: 'Login' });
});

// Login handler
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = req.app.locals.db;
  
  if (!username || !password) {
    req.flash('error_msg', 'Please enter all fields');
    return res.redirect('/auth/login');
  }
  
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      req.flash('error_msg', 'Database error');
      return res.redirect('/auth/login');
    }
    
    if (!user) {
      req.flash('error_msg', 'Invalid credentials');
      return res.redirect('/auth/login');
    }
    
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        req.flash('error_msg', 'Error comparing password');
        return res.redirect('/auth/login');
      }
      
      if (!isMatch) {
        req.flash('error_msg', 'Invalid credentials');
        return res.redirect('/auth/login');
      }
      
      // Create JWT token
      const payload = { id: user.id, username: user.username };
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'default_secret_key', { expiresIn: '1h' });
      
      // Store user in session
      req.session.user = payload;
      
      // Set token cookie
      res.cookie('token', token, { 
        httpOnly: true, 
        maxAge: 3600000 // 1 hour
      });
      
      req.flash('success_msg', 'Login successful');
      res.redirect('/dashboard');
    });
  });
});

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.clearCookie('token');
  res.redirect('/auth/login');
});

module.exports = router;
