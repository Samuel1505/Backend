import { query } from '../config.js';
import { logger } from '../../utils/logger.js';

/**
 * Migration: Create markets_history table
 * Stores historical price and volume snapshots
 */
export const up = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS markets_history (
        id SERIAL PRIMARY KEY,
        market_id VARCHAR(42) NOT NULL,
        prices JSONB NOT NULL,
        volume NUMERIC(78, 18) DEFAULT 0,
        liquidity NUMERIC(78, 18) DEFAULT 0,
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_markets_history_market_id ON markets_history(market_id, timestamp DESC)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_markets_history_timestamp ON markets_history(timestamp DESC)
    `);

    logger.info('✅ Migration 005: markets_history table created');
  } catch (error) {
    logger.error('❌ Migration 005 failed:', error);
    throw error;
  }
};

export const down = async () => {
  try {
    await query(`DROP TABLE IF EXISTS markets_history CASCADE`);
    logger.info('✅ Migration 005: markets_history table dropped');
  } catch (error) {
    logger.error('❌ Migration 005 rollback failed:', error);
    throw error;
  }
};





