require('dotenv').config();
const connectDatabase = require('../config/database');
const User = require('../models/User');

async function seedAdmin() {
  try {
    await connectDatabase();
    const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (!email || !process.env.ADMIN_PASSWORD) {
      throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first.');
    }

    const existing = await User.findOne({ email }).select('+password');
    if (existing) {
      existing.role = 'admin';
      existing.password = process.env.ADMIN_PASSWORD;
      await existing.save();
      console.log(`Updated admin: ${email}`);
    } else {
      await User.create({
        name: process.env.ADMIN_NAME || 'Application Admin',
        email,
        password: process.env.ADMIN_PASSWORD,
        phone: process.env.ADMIN_PHONE || '0000000000',
        city: process.env.ADMIN_CITY || 'Not specified',
        pincode: process.env.ADMIN_PINCODE || '000000',
        role: 'admin',
      });
      console.log(`Created admin: ${email}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  }
}

seedAdmin();
