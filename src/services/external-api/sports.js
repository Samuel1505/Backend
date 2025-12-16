import axios from 'axios';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { query } from '../../database/config.js';

/**
 * External API Integration Service (BE-2)
 * Fetches real-world data for market resolution
 */
class SportsDataService {
  constructor() {
    this.baseURL = config.externalApi.baseUrl;
    this.apiKey = config.externalApi.key;
    this.rateLimit = config.externalApi.rateLimit;
    this.requestCount = 0;
    this.requestWindowStart = Date.now();
    this.cache = new Map();
  }

  /**
   * Check rate limit
   */
  checkRateLimit() {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes

    if (now - this.requestWindowStart > windowMs) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }

    if (this.requestCount >= this.rateLimit) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    this.requestCount++;
  }

  /**
   * Get cached data
   */
  async getCachedData(marketId, dataType) {
    try {
      const result = await query(
        `
        SELECT data, expires_at FROM external_data
        WHERE market_id = $1 AND data_type = $2 AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `,
        [marketId, dataType]
      );

      if (result.rows.length > 0) {
        return result.rows[0].data;
      }
    } catch (error) {
      logger.error('Error getting cached data:', error);
    }
    return null;
  }

  /**
   * Cache data
   */
  async cacheData(marketId, dataType, data, ttlMinutes = 60) {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      await query(
        `
        INSERT INTO external_data (market_id, data_type, source, data, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `,
        [marketId, dataType, 'sportsdata', JSON.stringify(data), expiresAt]
      );
    } catch (error) {
      logger.error('Error caching data:', error);
    }
  }

  /**
   * Make API request with error handling
   */
  async makeRequest(endpoint, params = {}) {
    this.checkRateLimit();

    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
        },
        params,
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        logger.error(`API error: ${error.response.status} - ${error.response.statusText}`);
        throw new Error(`API request failed: ${error.response.statusText}`);
      } else if (error.request) {
        logger.error('API request timeout or network error');
        throw new Error('Network error: Unable to reach API');
      } else {
        logger.error('API error:', error.message);
        throw error;
      }
    }
  }

  /**
   * Get game outcome (for sports markets)
   */
  async getGameOutcome(gameId, sport = 'nfl') {
    try {
      // Check cache first
      const cached = await this.getCachedData(gameId, 'game_outcome');
      if (cached) {
        return cached;
      }

      // Fetch from API based on sport
      let endpoint = '';
      let data = null;

      switch (sport.toLowerCase()) {
        case 'nfl':
          endpoint = `/nfl/scores/json/Scores/${gameId}`;
          data = await this.makeRequest(endpoint);
          break;
        case 'nba':
          endpoint = `/nba/scores/json/Game/${gameId}`;
          data = await this.makeRequest(endpoint);
          break;
        case 'mlb':
          endpoint = `/mlb/scores/json/Game/${gameId}`;
          data = await this.makeRequest(endpoint);
          break;
        default:
          throw new Error(`Unsupported sport: ${sport}`);
      }

      // Extract outcome
      const outcome = this.extractGameOutcome(data, sport);

      // Cache result
      await this.cacheData(gameId, 'game_outcome', outcome, 1440); // 24 hours

      return outcome;
    } catch (error) {
      logger.error(`Error getting game outcome for ${gameId}:`, error);
      throw error;
    }
  }

  /**
   * Extract game outcome from API response
   */
  extractGameOutcome(data, sport) {
    // This is a simplified extraction - adjust based on actual API response structure
    if (Array.isArray(data) && data.length > 0) {
      data = data[0];
    }

    const homeScore = data.HomeTeamScore || data.HomeScore || 0;
    const awayScore = data.AwayTeamScore || data.AwayScore || 0;
    const isFinished = data.IsClosed || data.Status === 'Final' || data.GameStatus === 'Final';

    if (!isFinished) {
      return {
        status: 'pending',
        homeScore,
        awayScore,
        winner: null,
      };
    }

    let winner = null;
    if (homeScore > awayScore) {
      winner = 'home';
    } else if (awayScore > homeScore) {
      winner = 'away';
    } else {
      winner = 'draw';
    }

    return {
      status: 'finished',
      homeScore,
      awayScore,
      winner,
      finishedAt: data.DateTime || new Date().toISOString(),
    };
  }

  /**
   * Get upcoming games (for market creation)
   */
  async getUpcomingGames(sport = 'nfl', days = 7) {
    try {
      const cached = await this.getCachedData('upcoming', `upcoming_${sport}`);
      if (cached) {
        return cached;
      }

      let endpoint = '';
      switch (sport.toLowerCase()) {
        case 'nfl':
          endpoint = `/nfl/scores/json/Schedules/${days}`;
          break;
        case 'nba':
          endpoint = `/nba/scores/json/Schedules/${days}`;
          break;
        case 'mlb':
          endpoint = `/mlb/scores/json/Schedules/${days}`;
          break;
        default:
          throw new Error(`Unsupported sport: ${sport}`);
      }

      const data = await this.makeRequest(endpoint);
      
      // Cache for 1 hour
      await this.cacheData('upcoming', `upcoming_${sport}`, data, 60);

      return data;
    } catch (error) {
      logger.error(`Error getting upcoming games for ${sport}:`, error);
      throw error;
    }
  }

  /**
   * Resolve market based on external data
   * Returns the winning outcome index
   */
  async resolveMarket(marketId, marketData) {
    try {
      const { category, question, metadata } = marketData;

      // Extract resolution parameters from metadata
      const { gameId, sport, outcomeType } = metadata || {};

      if (!gameId) {
        throw new Error('Game ID not found in market metadata');
      }

      // Get game outcome
      const outcome = await this.getGameOutcome(gameId, sport || 'nfl');

      if (outcome.status !== 'finished') {
        return {
          resolved: false,
          reason: 'Game not finished yet',
        };
      }

      // Map outcome to market outcome index
      // This depends on how the market outcomes are structured
      let winningOutcome = null;

      if (outcomeType === 'winner') {
        // Market: "Who will win?"
        // Outcomes: ["Home Team", "Away Team", "Draw"]
        if (outcome.winner === 'home') {
          winningOutcome = 0;
        } else if (outcome.winner === 'away') {
          winningOutcome = 1;
        } else {
          winningOutcome = 2; // Draw
        }
      } else if (outcomeType === 'spread') {
        // Market: "Will Home Team win by X points?"
        // Outcomes: ["Yes", "No"]
        const spread = metadata.spread || 0;
        const actualSpread = outcome.homeScore - outcome.awayScore;
        winningOutcome = actualSpread >= spread ? 0 : 1;
      } else if (outcomeType === 'over_under') {
        // Market: "Will total points be over X?"
        // Outcomes: ["Over", "Under"]
        const total = outcome.homeScore + outcome.awayScore;
        const threshold = metadata.threshold || 0;
        winningOutcome = total > threshold ? 0 : 1;
      }

      return {
        resolved: true,
        winningOutcome,
        outcome,
      };
    } catch (error) {
      logger.error(`Error resolving market ${marketId}:`, error);
      throw error;
    }
  }
}

// Singleton instance
let sportsServiceInstance = null;

/**
 * Get or create sports service instance
 */
export const getSportsService = () => {
  if (!sportsServiceInstance) {
    sportsServiceInstance = new SportsDataService();
  }
  return sportsServiceInstance;
};

export default getSportsService;





