#!/usr/bin/env node

/**
 * Database Migration Runner
 * Run this script to execute all pending migrations
 */

import { runMigrations } from './migrations/index.js';
import { logger } from '../utils/logger.js';

async function main() {
  try {
    logger.info('🔄 Running database migrations...');
    await runMigrations();
    logger.info('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();





