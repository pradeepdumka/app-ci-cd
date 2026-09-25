const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { COOKIE_NAME } = require('../utils/authCookie');

async function requireAuth(request, response, next) {
  try {
    const token = request.cookies[COOKIE_NAME];
    if (!token) {
      return response.status(401).json({ message: 'Please sign in to continue.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId);
    if (!user) {
      return response.status(401).json({ message: 'Your session is no longer valid.' });
    }

    request.user = user;
    next();
  } catch {
    return response.status(401).json({ message: 'Your session has expired.' });
  }
}

function requireAdmin(request, response, next) {
  if (request.user.role !== 'admin') {
    return response.status(403).json({ message: 'Admin access is required.' });
  }
  next();
}

module.exports = { requireAdmin, requireAuth };
