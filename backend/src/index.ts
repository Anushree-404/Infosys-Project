/**
 * Server Entry Point
 * Starts the Express server and connects to the database
 */

import 'dotenv/config'; // Must be first import
import app from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 5000;

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════════════╗
║   🌱 AI Irrigation Management System API        ║
╠════════════════════════════════════════════════╣
║   Status:     Running                           ║
║   Port:       ${PORT}                               ║
║   Env:        ${process.env.NODE_ENV || 'development'}                   ║
║   Docs:       http://localhost:${PORT}/api/docs    ║
╚════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after 10s timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Rejection:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
