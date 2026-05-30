import dotenv from 'dotenv';

// Load environment variables BEFORE importing app. ES `import` statements are
// hoisted and would otherwise run app's module-level code (CORS origins, etc.)
// before dotenv populates process.env. Using require here defers app loading
// until after dotenv.config() has run.
dotenv.config();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('./app').default as import('express').Application;

const PORT = process.env.PORT || 4000;

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Tryhardly API Server`);
  console.log(`⚔️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎯 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`\n🏰 Ready to accept quests!\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});
