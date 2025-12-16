import { query } from '../config.js';
import { logger } from '../../utils/logger.js';

/**
 * Migration: Create users table
 * Stores user profiles and statistics
 */
export const up = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        address VARCHAR(42) PRIMARY KEY,
        username VARCHAR(100),
        avatar_url TEXT,
        reputation_score INTEGER DEFAULT 0,
        total_trades INTEGER DEFAULT 0,
        total_volume NUMERIC(78, 18) DEFAULT 0,
        total_profit NUMERIC(78, 18) DEFAULT 0,
        win_rate NUMERIC(5, 4) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        metadata JSONB
      )
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_reputation ON users(reputation_score DESC)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_users_volume ON users(total_volume DESC)
    `);

    logger.info('✅ Migration 002: users table created');
  } catch (error) {
    logger.error('❌ Migration 002 failed:', error);
    throw error;
  }
};

export const down = async () => {
  try {
    await query(`DROP TABLE IF EXISTS users CASCADE`);
    logger.info('✅ Migration 002: users table dropped');
  } catch (error) {
    logger.error('❌ Migration 002 rollback failed:', error);
    throw error;
  }
};





