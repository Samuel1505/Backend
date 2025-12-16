import { query } from '../config.js';
import { logger } from '../../utils/logger.js';

/**
 * Migration: Create external_data table
 * Stores cached responses from external APIs
 */
export const up = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS external_data (
        id SERIAL PRIMARY KEY,
        market_id VARCHAR(42),
        data_type VARCHAR(50) NOT NULL,
        source VARCHAR(100) NOT NULL,
        data JSONB NOT NULL,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_external_data_market_id ON external_data(market_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_external_data_type ON external_data(data_type)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_external_data_expires ON external_data(expires_at)
    `);

    logger.info('✅ Migration 007: external_data table created');
  } catch (error) {
    logger.error('❌ Migration 007 failed:', error);
    throw error;
  }
};

export const down = async () => {
  try {
    await query(`DROP TABLE IF EXISTS external_data CASCADE`);
    logger.info('✅ Migration 007: external_data table dropped');
  } catch (error) {
    logger.error('❌ Migration 007 rollback failed:', error);
    throw error;
  }
};





