const mongoose = require('mongoose');
const User = require('../models/User');
const { publicUser } = require('./authController');

async function listUsers(request, response, next) {
  try {
    const search = String(request.query.search || '').trim();
    const city = String(request.query.city || '').trim();
    const page = Math.max(Number(request.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(request.query.limit) || 10, 1), 50);

    const filter = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { pincode: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (city) filter.city = { $regex: `^${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };

    const [users, total, cities] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
      User.distinct('city'),
    ]);

    return response.json({
      users: users.map(publicUser),
      pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
      cities: cities.sort(),
    });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(request, response, next) {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ message: 'Invalid user id.' });
    }
    if (request.user.id === request.params.id) {
      return response.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    const deletedUser = await User.findByIdAndDelete(request.params.id);
    if (!deletedUser) return response.status(404).json({ message: 'User not found.' });
    return response.json({ message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

async function adminSummary(_request, response, next) {
  try {
    const [totalUsers, totalAdmins, cityCount] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'admin' }),
      User.distinct('city'),
    ]);
    return response.json({ totalUsers, totalAdmins, totalCities: cityCount.length });
  } catch (error) {
    next(error);
  }
}

module.exports = { adminSummary, deleteUser, listUsers };
