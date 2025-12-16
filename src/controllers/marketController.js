import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { NotFoundError } from '../utils/errors.js';
import Market from '../database/models/Market.js';
import MarketHistory from '../database/models/MarketHistory.js';
import { readContract } from '../services/blockchain/client.js';
import { loadABI } from '../utils/loadABI.js';

const CategoricalMarketABI = loadABI('CategoricalMarket.json');

/**
 * @desc    Get all markets with filters
 * @route   GET /api/v1/markets
 * @access  Public
 */
export const getAllMarkets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, category } = req.query;

  const result = await Market.findAll({
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    status,
    category,
  });

  sendPaginated(
    res,
    result.markets,
    result.page,
    result.limit,
    result.total,
    'Markets retrieved successfully'
  );
});

/**
 * @desc    Get single market details
 * @route   GET /api/v1/markets/:marketId
 * @access  Public
 */
export const getMarketById = asyncHandler(async (req, res) => {
  const { marketId } = req.params;

  const market = await Market.findById(marketId);
  if (!market) {
    throw new NotFoundError(`Market ${marketId} not found`);
  }

  sendSuccess(res, market, 'Market retrieved successfully');
});

/**
 * @desc    Get current prices for market outcomes
 * @route   GET /api/v1/markets/:marketId/prices
 * @access  Public
 */
export const getMarketPrices = asyncHandler(async (req, res) => {
  const { marketId } = req.params;

  const market = await Market.findById(marketId);
  if (!market) {
    throw new NotFoundError(`Market ${marketId} not found`);
  }

  // Try to get latest prices from history
  const latest = await MarketHistory.findLatest(marketId);
  let prices = latest?.prices || [];

  // If no history, try to fetch from blockchain
  if (prices.length === 0) {
    try {
      prices = [];
      for (let i = 0; i < market.outcomeCount; i++) {
        try {
          const price = await readContract({
            address: marketId,
            abi: CategoricalMarketABI,
            functionName: 'getPrice',
            args: [i],
          });
          prices.push(parseFloat(price.toString()) / 1e18);
        } catch (error) {
          prices.push(0);
        }
      }
    } catch (error) {
      // Fallback to uniform distribution
      prices = Array(market.outcomeCount).fill(1.0 / market.outcomeCount);
    }
  }

  const outcomePrices = market.outcomes.map((outcome, index) => ({
    id: outcome.id || index,
    name: outcome.name || `Outcome ${index}`,
    price: prices[index] || 0,
  }));

  sendSuccess(
    res,
    {
      marketId,
      outcomes: outcomePrices,
      timestamp: latest?.timestamp || new Date().toISOString(),
    },
    'Prices retrieved successfully'
  );
});

/**
 * @desc    Get historical data for market
 * @route   GET /api/v1/markets/:marketId/history
 * @access  Public
 */
export const getMarketHistory = asyncHandler(async (req, res) => {
  const { marketId } = req.params;
  const { interval = '1h', limit = 100 } = req.query;

  const market = await Market.findById(marketId);
  if (!market) {
    throw new NotFoundError(`Market ${marketId} not found`);
  }

  const history = await MarketHistory.findByMarketId(marketId, {
    interval,
    limit: parseInt(limit, 10),
  });

  sendSuccess(
    res,
    {
      marketId,
      interval,
      data: history,
    },
    'Historical data retrieved successfully'
  );
});

/**
 * @desc    Get AI forecast for market
 * @route   GET /api/v1/markets/:marketId/forecast
 * @access  Public
 */
export const getMarketAIForecast = asyncHandler(async (req, res) => {
  const { marketId } = req.params;

  const market = await Market.findById(marketId);
  if (!market) {
    throw new NotFoundError(`Market ${marketId} not found`);
  }

  const { getAIClient } = await import('../services/ai/client.js');
  const aiClient = getAIClient();
  const forecast = await aiClient.generateForecast(marketId);

  sendSuccess(res, forecast, 'AI forecast retrieved successfully');
});

