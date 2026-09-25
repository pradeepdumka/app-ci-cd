const mongoose = require('mongoose');

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  const maxAttempts = 10;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const connection = await mongoose.connect(uri);
      console.log(`MongoDB connected: ${connection.connection.host}`);
      return connection;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
      if (attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

module.exports = connectDatabase;
