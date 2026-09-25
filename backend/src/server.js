require('dotenv').config({ override: false });
const app = require('./app');
const connectDatabase = require('./config/database');

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || '0.0.0.0';

async function startServer() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    console.error('MONGODB_URI and JWT_SECRET must be set in the .env file.');
    process.exit(1);
  }

  try {
    await connectDatabase();
    const server = app.listen(port, host, () => {
      console.log(`API running at http://localhost:${port}`);
    });
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(
          `Port ${port} is already in use. On macOS, port 5000 is often taken by AirPlay Receiver — set PORT in .env to another value.`,
        );
      } else {
        console.error('Server failed to start:', error.message);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('Server failed to start:', error.message);
    process.exit(1);
  }
}

startServer();
