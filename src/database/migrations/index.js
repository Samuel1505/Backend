import { logger } from '../../utils/logger.js';
import * as migration001 from './001_create_markets.js';
import * as migration002 from './002_create_users.js';
import * as migration003 from './003_create_comments.js';
import * as migration004 from './004_create_market_events.js';
import * as migration005 from './005_create_markets_history.js';
import * as migration006 from './006_create_user_positions.js';
import * as migration007 from './007_create_external_data.js';
import { query } from '../config.js';

/**
 * Migration runner
 * Runs all migrations in order
 */
const migrations = [
  { name: '001_create_markets', ...migration001 },
  { name: '002_create_users', ...migration002 },
  { name: '003_create_comments', ...migration003 },
  { name: '004_create_market_events', ...migration004 },
  { name: '005_create_markets_history', ...migration005 },
  { name: '006_create_user_positions', ...migration006 },
  { name: '007_create_external_data', ...migration007 },
];

/**
 * Create migrations tracking table
 */
const createMigrationsTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);
};

/**
 * Check if migration has been executed
 */
const isMigrationExecuted = async (name) => {
  const result = await query(
    'SELECT * FROM migrations WHERE name = $1',
    [name]
  );
  return result.rows.length > 0;
};

/**
 * Mark migration as executed
 */
const markMigrationExecuted = async (name) => {
  await query(
    'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
    [name]
  );
};

/**
 * Run all pending migrations
 */
export const runMigrations = async () => {
  try {
    logger.info('🔄 Starting database migrations...');
    await createMigrationsTable();

    for (const migration of migrations) {
      if (await isMigrationExecuted(migration.name)) {
        logger.info(`⏭️  Migration ${migration.name} already executed, skipping`);
        continue;
      }

      logger.info(`▶️  Running migration: ${migration.name}`);
      await migration.up();
      await markMigrationExecuted(migration.name);
      logger.info(`✅ Migration ${migration.name} completed`);
    }

    logger.info('✅ All migrations completed successfully');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  }
};

/**
 * Rollback last migration (for development)
 */
export const rollbackLastMigration = async () => {
  try {
    const result = await query(
      'SELECT name FROM migrations ORDER BY executed_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      logger.info('No migrations to rollback');
      return;
    }

    const lastMigration = result.rows[0].name;
    const migration = migrations.find((m) => m.name === lastMigration);

    if (migration && migration.down) {
      logger.info(`🔄 Rolling back migration: ${lastMigration}`);
      await migration.down();
      await query('DELETE FROM migrations WHERE name = $1', [lastMigration]);
      logger.info(`✅ Migration ${lastMigration} rolled back`);
    }
  } catch (error) {
    logger.error('❌ Rollback failed:', error);
    throw error;
  }
};

export default {
  runMigrations,
  rollbackLastMigration,
};


