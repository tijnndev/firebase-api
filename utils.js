/**
 * Utility functions for the Firebase Notification Dashboard
 */

/**
 * Creates a log entry in the database
 * @param {Object} db - Database instance
 * @param {string} type - Type of log entry (info, error, warning, success)
 * @param {string} content - Log content
 * @param {number|null} serviceId - Optional service ID
 * @returns {Promise<Object>} Created log entry
 */
async function createLogEntry(db, type, content, serviceId = null) {
  try {
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const hasServiceId = serviceId !== null;
    const sql = hasServiceId
      ? `INSERT INTO log (type, content, service_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      : `INSERT INTO log (type, content, created_at, updated_at)
         VALUES (?, ?, ?, ?)`;

    const params = hasServiceId
      ? [type, content, serviceId, timestamp, timestamp]
      : [type, content, timestamp, timestamp];

    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) {
          console.error('Failed to insert log entry:', err.message);
          return reject(new Error('Database insert failed: ' + err.message));
        }

        resolve({
          id: this.lastID,
          type,
          content,
          service_id: serviceId,
          created_at: timestamp,
          updated_at: timestamp,
        });
      });
    });
  } catch (error) {
    console.error('Error in createLogEntry:', error);
    throw error;
  }
}

/**
 * Validates if a string is a valid URL
 * @param {string} str - String to validate
 * @returns {boolean} True if valid URL
 */
function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Generates a random secret key
 * @param {number} length - Length of the secret key
 * @returns {string} Random secret key
 */
function generateSecretKey(length = 32) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Sanitizes user input to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Formats a date to a readable string
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return d.toLocaleDateString('en-US', options);
}

/**
 * Validates FCM token format
 * @param {string} token - Token to validate
 * @returns {boolean} True if valid token format
 */
function isValidFCMToken(token) {
  // FCM tokens are typically 152+ characters
  return typeof token === 'string' && token.length >= 100;
}

/**
 * Creates a standardized error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Error response object
 */
function createErrorResponse(message, statusCode = 500) {
  return {
    success: false,
    error: message,
    statusCode,
    timestamp: new Date().toISOString()
  };
}

/**
 * Creates a standardized success response
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Success response object
 */
function createSuccessResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Truncates a string to a specified length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
function truncateString(str, maxLength = 50) {
  if (typeof str !== 'string') return str;
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

/**
 * Delays execution for specified milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delayMs - Initial delay in milliseconds
 * @returns {Promise<*>} Result of the function
 */
async function retryWithBackoff(fn, maxRetries = 3, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const waitTime = delayMs * Math.pow(2, i);
      console.log(`Retry attempt ${i + 1} after ${waitTime}ms`);
      await delay(waitTime);
    }
  }
}

module.exports = {
  createLogEntry,
  isValidUrl,
  generateSecretKey,
  sanitizeInput,
  formatDate,
  isValidFCMToken,
  createErrorResponse,
  createSuccessResponse,
  isValidEmail,
  truncateString,
  delay,
  retryWithBackoff
};