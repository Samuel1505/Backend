import { query } from '../config.js';
import { logger } from '../../utils/logger.js';

/**
 * Migration: Create markets table
 * Stores market information indexed from blockchain
 */
export const up = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS markets (
        id VARCHAR(42) PRIMARY KEY,
        question TEXT NOT NULL,
        description TEXT,
        category VARCHAR(50),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        resolution_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        total_volume NUMERIC(78, 18) DEFAULT 0,
        total_liquidity NUMERIC(78, 18) DEFAULT 0,
        outcome_count INTEGER DEFAULT 2,
        outcomes JSONB,
        creator_address VARCHAR(42),
        factory_address VARCHAR(42),
        collateral_token VARCHAR(42),
        fee_rate NUMERIC(5, 4) DEFAULT 0,
        metadata JSONB
      )
    `);

    // Create indexes for common queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_markets_resolution_time ON markets(resolution_time)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at DESC)
    `);

    logger.info('✅ Migration 001: markets table created');
  } catch (error) {
    logger.error('❌ Migration 001 failed:', error);
    throw error;
  }
};

export const down = async () => {
  try {
    await query(`DROP TABLE IF EXISTS markets CASCADE`);
    logger.info('✅ Migration 001: markets table dropped');
  } catch (error) {
    logger.error('❌ Migration 001 rollback failed:', error);
    throw error;
  }
};





