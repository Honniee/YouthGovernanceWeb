#!/usr/bin/env node

/**
 * Production Startup Script
 * Handles graceful startup and shutdown for production deployments
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Production startup configuration
const config = {
  maxRestarts: 5,
  restartDelay: 5000,
  healthCheckInterval: 30000,
  healthCheckTimeout: 10000
};

let restartCount = 0;
let serverProcess = null;
let healthCheckInterval = null;

/**
 * Start the server process
 */
function startServer() {
  console.log(`🚀 Starting server (attempt ${restartCount + 1}/${config.maxRestarts})`);
  
  serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`📴 Server exited with code ${code} and signal ${signal}`);
    
    if (code !== 0 && restartCount < config.maxRestarts) {
      restartCount++;
      console.log(`🔄 Restarting server in ${config.restartDelay}ms...`);
      setTimeout(startServer, config.restartDelay);
    } else if (restartCount >= config.maxRestarts) {
      console.error('❌ Maximum restart attempts reached. Exiting.');
      process.exit(1);
    }
  });

  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });

  // Start health checks after a delay
  setTimeout(startHealthChecks, 10000);
}

/**
 * Start health check monitoring
 */
function startHealthChecks() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  const port = process.env.PORT || 3001;
  healthCheckInterval = setInterval(async () => {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`, {
        timeout: config.healthCheckTimeout
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      console.log('✅ Health check passed');
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      
      // If health check fails multiple times, restart the server
      if (restartCount < config.maxRestarts) {
        console.log('🔄 Restarting server due to health check failure...');
        serverProcess?.kill('SIGTERM');
      }
    }
  }, config.healthCheckInterval);
}

/**
 * Graceful shutdown handler
 */
function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    
    // Force kill after 10 seconds
    setTimeout(() => {
      console.log('⚠️ Force killing server process...');
      serverProcess.kill('SIGKILL');
      process.exit(0);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Setup signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
console.log('🌟 Starting Youth Governance Web API in production mode...');
startServer();
