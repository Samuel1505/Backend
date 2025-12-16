import { query } from '../config.js';
import { logger } from '../../utils/logger.js';

/**
 * Migration: Create market_events table
 * Stores all blockchain events indexed from smart contracts
 */
export const up = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS market_events (
        id SERIAL PRIMARY KEY,
        market_id VARCHAR(42) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        user_address VARCHAR(42),
        outcome_id INTEGER,
        shares NUMERIC(78, 18),
        cost NUMERIC(78, 18),
        data JSONB,
        block_number BIGINT NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        transaction_index INTEGER,
        log_index INTEGER,
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(transaction_hash, log_index)
      )
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_market_events_market_id ON market_events(market_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_market_events_type ON market_events(event_type)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_market_events_user ON market_events(user_address)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_market_events_block ON market_events(block_number DESC)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_market_events_timestamp ON market_events(timestamp DESC)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_market_events_tx_hash ON market_events(transaction_hash)
    `);

    logger.info('✅ Migration 004: market_events table created');
  } catch (error) {
    logger.error('❌ Migration 004 failed:', error);
    throw error;
  }
};

export const down = async () => {
  try {
    await query(`DROP TABLE IF EXISTS market_events CASCADE`);
    logger.info('✅ Migration 004: market_events table dropped');
  } catch (error) {
    logger.error('❌ Migration 004 rollback failed:', error);
    throw error;
  }
};





