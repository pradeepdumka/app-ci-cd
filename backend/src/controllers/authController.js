const User = require('../models/User');
const { clearAuthCookie, setAuthCookie } = require('../utils/authCookie');

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    city: user.city,
    pincode: user.pincode,
    role: user.role,
    createdAt: user.createdAt,
  };
}

async function signup(request, response, next) {
  try {
    const { name, email, phone, city, pincode, password } = request.body;
    if (![name, email, phone, city, pincode, password].every(Boolean)) {
      return response.status(400).json({ message: 'All fields are required.' });
    }
    if (password.length < 8) {
      return response.status(400).json({ message: 'Password must have at least 8 characters.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return response.status(409).json({ message: 'An account with this email already exists.' });
    }

    const user = await User.create({ name, email, phone, city, pincode, password });
    setAuthCookie(response, user.id);
    return response.status(201).json({ message: 'Account created.', user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

async function login(request, response, next) {
  try {
    const { email, password } = request.body;
    if (!email || !password) {
      return response.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await user.matchesPassword(password))) {
      return response.status(401).json({ message: 'Email or password is incorrect.' });
    }

    setAuthCookie(response, user.id);
    return response.json({ message: 'Signed in successfully.', user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

function logout(_request, response) {
  clearAuthCookie(response);
  return response.json({ message: 'Signed out successfully.' });
}

function me(request, response) {
  return response.json({ user: publicUser(request.user) });
}

module.exports = { login, logout, me, publicUser, signup };
