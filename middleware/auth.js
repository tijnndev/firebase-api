const jwt = require('jsonwebtoken');

module.exports = {
  // Check if user is authenticated using JWT
  ensureAuthenticated: (req, res, next) => {
    if (req.session.user) {
      return next();
    }
    
    // Check if token exists in cookie
    const token = req.headers['authorization']?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
      req.flash('error_msg', 'Please log in to access this resource');
      return res.redirect('/auth/login');
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
      req.user = decoded;
      req.session.user = decoded;
      next();
    } catch (err) {
      req.flash('error_msg', 'Invalid authentication token');
      res.redirect('/auth/login');
    }
  },
  
  // For API routes that require JWT token
  ensureAuthenticatedAPI: (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      console.log(token)
      return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }
};
