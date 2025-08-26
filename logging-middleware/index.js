const axios = require('axios');

const LOG_API_URL = 'http://20.244.56.144/evaluation-service/logs';

// Use the same token format as your frontend for consistency
let ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJyb2hpdHJhaS4yNmNzYkBsaWNldC5hYy5pbiIsImV4cCI6MTc1NjE5OTY2NywiaWF0IjoxNzU2MTk4NzY3LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiNWI3YzFlNWYtOTQwNi00MjU5LWE4YzEtMWUxNzA1MmIyMWEyIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoicm9oaXRyYWkiLCJzdWIiOiI2NWQ5ZDMwNC01OTUyLTQ4ZGItOTg0Zi1hZDFkYTljNDIzMGUifSwiZW1haWwiOiJyb2hpdHJhaS4yNmNzYkBsaWNldC5hYy5pbiIsIm5hbWUiOiJyb2hpdHJhaSIsInJvbGxObyI6IjIyY3MxNzciLCJhY2Nlc3NDb2RlIjoiWUNWc1N5IiwiY2xpZW50SUQiOiI2NWQ5ZDMwNC01OTUyLTQ4ZGItOTg0Zi1hZDFkYTljNDIzMGUiLCJjbGllbnRTZWNyZXQiOiJUZVJORVVTcUNzalJZWVN3In0.C-Aa9U4zkCed_JUH-ODukuxXhIGLdHaz-9dk1IsZC6Q';

const ALLOWED_STACKS = ['frontend', 'backend'];
const ALLOWED_LEVELS = ['error', 'warn', 'info', 'debug'];
const ALLOWED_PACKAGES = ['react', 'express', 'general'];

/**
 * Logs messages to the evaluation service
 * @param {string} stack - 'frontend' or 'backend'
 * @param {string} level - 'error', 'warn', 'info', or 'debug'
 * @param {string} package - 'react', 'express', or 'general'
 * @param {string} message - The log message
 */
async function log(stack, level, package, message) {
  try {
    // Validate inputs
    if (!ALLOWED_STACKS.includes(stack)) {
      console.error(`Invalid stack: ${stack}. Must be one of: ${ALLOWED_STACKS.join(', ')}`);
      return null;
    }
    
    if (!ALLOWED_LEVELS.includes(level)) {
      console.error(`Invalid level: ${level}. Must be one of: ${ALLOWED_LEVELS.join(', ')}`);
      return null;
    }
    
    if (!ALLOWED_PACKAGES.includes(package)) {
      console.error(`Invalid package: ${package}. Must be one of: ${ALLOWED_PACKAGES.join(', ')}`);
      return null;
    }
    
    if (!message || typeof message !== 'string') {
      console.error('Message must be a non-empty string');
      return null;
    }

    // Create log payload - match the format from your frontend
    const logData = {
      stack,
      level,
      package,
      message
    };

    console.log('Sending log:', logData); // Debug log

    const response = await axios.post(LOG_API_URL, logData, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000 // Increased timeout
    });

    console.log('Log sent successfully:', response.status);
    return response.data;

  } catch (error) {
    if (error.response) {
      console.error(`Failed to send log: ${error.response.status} ${error.response.statusText}`);
      console.error('Response data:', error.response.data);
      console.error('Request headers:', error.config?.headers);
      console.error('Request data:', error.config?.data);
    } else if (error.request) {
      console.error('Failed to send log: Network error - no response received');
      console.error('Request details:', error.request);
    } else {
      console.error('Failed to send log:', error.message);
    }
    return null;
  }
}

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error.message);
    return true;
  }
}

if (isTokenExpired(ACCESS_TOKEN)) {
  console.warn('WARNING: Access token appears to be expired. Please update the token.');
}

module.exports = log;