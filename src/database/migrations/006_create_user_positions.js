import { query } from '../config.js';
import { logger } from '../../utils/logger.js';

/**
 * Migration: Create user_positions table
 * Stores user's current positions in markets
 */
export const up = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_positions (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        market_id VARCHAR(42) NOT NULL,
        outcome_id INTEGER NOT NULL,
        shares NUMERIC(78, 18) NOT NULL DEFAULT 0,
        average_cost NUMERIC(78, 18) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_address, market_id, outcome_id),
        FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE,
        FOREIGN KEY (user_address) REFERENCES users(address) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_user_positions_user ON user_positions(user_address)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_user_positions_market ON user_positions(market_id)
    `);

    logger.info('✅ Migration 006: user_positions table created');
  } catch (error) {
    logger.error('❌ Migration 006 failed:', error);
    throw error;
  }
};

export const down = async () => {
  try {
    await query(`DROP TABLE IF EXISTS user_positions CASCADE`);
    logger.info('✅ Migration 006: user_positions table dropped');
  } catch (error) {
    logger.error('❌ Migration 006 rollback failed:', error);
    throw error;
  }
};





