import { query } from '../config.js';
import { logger } from '../../utils/logger.js';

/**
 * Migration: Create comments table
 * Stores off-chain user comments for markets
 */
export const up = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        market_id VARCHAR(42) NOT NULL,
        author VARCHAR(42) NOT NULL,
        content TEXT NOT NULL,
        parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_comments_market_id ON comments(market_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id)
    `);

    logger.info('✅ Migration 003: comments table created');
  } catch (error) {
    logger.error('❌ Migration 003 failed:', error);
    throw error;
  }
};

export const down = async () => {
  try {
    await query(`DROP TABLE IF EXISTS comments CASCADE`);
    logger.info('✅ Migration 003: comments table dropped');
  } catch (error) {
    logger.error('❌ Migration 003 rollback failed:', error);
    throw error;
  }
};





