import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import User from '../database/models/User.js';
import MarketEvent from '../database/models/MarketEvent.js';
import { query } from '../database/config.js';

/**
 * @desc    Get user profile
 * @route   GET /api/v1/users/:address
 * @access  Public
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const { address } = req.params;

  let user = await User.findByAddress(address);
  
  // Create user if doesn't exist
  if (!user) {
    user = await User.upsert({ address });
  }

  // Get additional stats
  const eventsResult = await query(
    'SELECT COUNT(*) as total_trades, SUM(CAST(cost AS NUMERIC)) as total_volume FROM market_events WHERE user_address = $1 AND event_type IN ($2, $3)',
    [address, 'SharesPurchased', 'SharesSold']
  );

  const stats = eventsResult.rows[0] || {};
  const profile = {
    ...user,
    marketsTraded: parseInt(stats.total_trades || 0, 10),
    activePredictions: 0, // TODO: Calculate from positions
  };

  sendSuccess(res, profile, 'User profile retrieved successfully');
});

/**
 * @desc    Get user's open positions
 * @route   GET /api/v1/users/:address/positions
 * @access  Public
 */
export const getUserPositions = asyncHandler(async (req, res) => {
  const { address } = req.params;

  const result = await query(
    `
    SELECT 
      up.market_id,
      up.outcome_id,
      up.shares,
      up.average_cost,
      m.question as market_question,
      m.outcomes
    FROM user_positions up
    JOIN markets m ON up.market_id = m.id
    WHERE up.user_address = $1 AND up.shares > 0
    ORDER BY up.last_updated DESC
    `,
    [address]
  );

  const positions = result.rows.map((row) => {
    const outcomes = typeof row.outcomes === 'string' ? JSON.parse(row.outcomes) : row.outcomes;
    const outcome = outcomes[row.outcome_id] || { name: `Outcome ${row.outcome_id}` };

    return {
      marketId: row.market_id,
      marketQuestion: row.market_question,
      outcome: outcome.name,
      outcomeId: row.outcome_id,
      shares: row.shares?.toString() || '0',
      averageCost: row.average_cost?.toString() || '0',
    };
  });

  sendSuccess(res, positions, 'User positions retrieved successfully');
});

/**
 * @desc    Get user's trading history
 * @route   GET /api/v1/users/:address/history
 * @access  Public
 */
export const getUserHistory = asyncHandler(async (req, res) => {
  const { address } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const result = await query(
    `
    SELECT 
      me.id,
      me.event_type,
      me.market_id,
      me.outcome_id,
      me.shares,
      me.cost,
      me.timestamp,
      me.transaction_hash,
      m.question as market_question,
      m.outcomes
    FROM market_events me
    JOIN markets m ON me.market_id = m.id
    WHERE me.user_address = $1 
      AND me.event_type IN ('SharesPurchased', 'SharesSold')
    ORDER BY me.timestamp DESC
    LIMIT $2 OFFSET $3
    `,
    [address, limit, offset]
  );

  const countResult = await query(
    'SELECT COUNT(*) FROM market_events WHERE user_address = $1 AND event_type IN ($2, $3)',
    [address, 'SharesPurchased', 'SharesSold']
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const history = result.rows.map((row) => {
    const outcomes = typeof row.outcomes === 'string' ? JSON.parse(row.outcomes) : row.outcomes;
    const outcome = outcomes[row.outcome_id] || { name: `Outcome ${row.outcome_id}` };

    return {
      id: row.id,
      type: row.event_type === 'SharesPurchased' ? 'buy' : 'sell',
      marketId: row.market_id,
      marketQuestion: row.market_question,
      outcome: outcome.name,
      outcomeId: row.outcome_id,
      shares: row.shares?.toString() || '0',
      cost: row.cost?.toString() || '0',
      timestamp: row.timestamp,
      transactionHash: row.transaction_hash,
    };
  });

  sendPaginated(res, history, page, limit, total, 'User history retrieved successfully');
});

