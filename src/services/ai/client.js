import { spawn } from 'child_process';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import Market from '../../database/models/Market.js';
import MarketHistory from '../../database/models/MarketHistory.js';

/**
 * AI Forecast Service Client (BE-4)
 * Node.js wrapper for Python ML model
 */
class AIClient {
  constructor() {
    this.enabled = config.ai.enabled;
    this.pythonPath = 'python3'; // or 'python' depending on system
  }

  /**
   * Generate forecast for a market
   */
  async generateForecast(marketId) {
    if (!this.enabled) {
      logger.debug('AI service is disabled');
      return this.getDefaultForecast(marketId);
    }

    try {
      // Get market data
      const market = await Market.findById(marketId);
      if (!market) {
        throw new Error(`Market ${marketId} not found`);
      }

      // Get historical data
      const history = await MarketHistory.findByMarketId(marketId, { limit: 50 });

      // Prepare market data for Python script
      const marketData = {
        id: market.id,
        question: market.question,
        totalVolume: market.totalVolume,
        totalLiquidity: market.totalLiquidity,
        outcomeCount: market.outcomeCount,
        outcomes: market.outcomes,
        prices: await this.getCurrentPrices(marketId, market.outcomeCount),
        resolutionTime: market.resolutionTime,
        history: history.map((h) => ({
          prices: h.prices,
          volume: h.volume,
          liquidity: h.liquidity,
          timestamp: h.timestamp,
        })),
      };

      // Call Python script
      const forecast = await this.callPythonModel(marketData);

      return {
        marketId,
        ...forecast,
      };
    } catch (error) {
      logger.error(`Error generating forecast for market ${marketId}:`, error);
      return this.getDefaultForecast(marketId);
    }
  }

  /**
   * Call Python ML model
   */
  async callPythonModel(marketData) {
    return new Promise((resolve, reject) => {
      // Get the directory of the current file
      const currentDir = new URL('.', import.meta.url).pathname;
      const scriptPath = `${currentDir}forecast.py`;
      const python = spawn(this.pythonPath, [scriptPath]);

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          logger.error(`Python script error: ${stderr}`);
          reject(new Error(`Python script exited with code ${code}`));
          return;
        }

        try {
          const forecast = JSON.parse(stdout);
          resolve(forecast);
        } catch (error) {
          logger.error('Error parsing Python output:', error);
          reject(error);
        }
      });

      python.on('error', (error) => {
        logger.error('Error spawning Python process:', error);
        reject(error);
      });

      // Send market data to Python script
      python.stdin.write(JSON.stringify(marketData));
      python.stdin.end();
    });
  }

  /**
   * Get current prices for market (from blockchain or database)
   */
  async getCurrentPrices(marketId, outcomeCount) {
    try {
      // Try to get latest prices from history
      const latest = await MarketHistory.findLatest(marketId);
      if (latest && latest.prices && latest.prices.length > 0) {
        return latest.prices;
      }

      // Fallback: return uniform distribution
      return Array(outcomeCount).fill(1.0 / outcomeCount);
    } catch (error) {
      logger.error(`Error getting prices for market ${marketId}:`, error);
      return Array(outcomeCount).fill(1.0 / outcomeCount);
    }
  }

  /**
   * Get default forecast (when AI is disabled or fails)
   */
  async getDefaultForecast(marketId) {
    try {
      const market = await Market.findById(marketId);
      if (!market) {
        throw new Error(`Market ${marketId} not found`);
      }

      const outcomeCount = market.outcomeCount || 2;
      const prices = await this.getCurrentPrices(marketId, outcomeCount);

      return {
        marketId,
        forecast: market.outcomes.map((outcome, index) => ({
          outcome: outcome.name || `Outcome ${index}`,
          outcomeId: index,
          probability: prices[index] || 1.0 / outcomeCount,
          confidence: 0.5,
        })),
        confidence: 0.5,
        modelVersion: '1.0.0',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Error getting default forecast:`, error);
      return {
        marketId,
        forecast: [],
        confidence: 0.0,
        modelVersion: '1.0.0',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Singleton instance
let aiClientInstance = null;

/**
 * Get or create AI client instance
 */
export const getAIClient = () => {
  if (!aiClientInstance) {
    aiClientInstance = new AIClient();
  }
  return aiClientInstance;
};

export default getAIClient;

