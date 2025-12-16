import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { writeContract } from '../blockchain/client.js';
import Market from '../../database/models/Market.js';
import { getSportsService } from '../external-api/sports.js';
import { loadABI } from '../../utils/loadABI.js';

const CategoricalMarketABI = loadABI('CategoricalMarket.json');

/**
 * Oracle/Resolver Service (BE-5)
 * Automatically resolves markets when resolution time is reached
 */
class OracleResolver {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
  }

  /**
   * Start the oracle service
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Oracle resolver is already running');
      return;
    }

    if (!config.oracle.enabled) {
      logger.info('Oracle resolver is disabled in configuration');
      return;
    }

    if (!config.oracle.privateKey) {
      logger.error('Oracle private key not configured');
      return;
    }

    logger.info('🔮 Starting oracle resolver service...');
    this.isRunning = true;

    // Run initial check
    await this.checkAndResolveMarkets();

    // Schedule periodic checks
    this.checkInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.checkAndResolveMarkets();
      }
    }, config.oracle.checkInterval);

    logger.info(`✅ Oracle resolver started (checking every ${config.oracle.checkInterval}ms)`);
  }

  /**
   * Stop the oracle service
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping oracle resolver...');
    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    logger.info('✅ Oracle resolver stopped');
  }

  /**
   * Check for markets that need resolution
   */
  async checkAndResolveMarkets() {
    try {
      logger.debug('🔍 Checking for markets to resolve...');

      // Find markets approaching or past resolution time
      const markets = await Market.findMarketsApproachingResolution(60); // 60 minutes threshold

      if (markets.length === 0) {
        logger.debug('No markets need resolution at this time');
        return;
      }

      logger.info(`Found ${markets.length} market(s) to check for resolution`);

      for (const market of markets) {
        try {
          await this.resolveMarketIfReady(market);
        } catch (error) {
          logger.error(`Error resolving market ${market.id}:`, error);
          // Continue with other markets even if one fails
        }
      }
    } catch (error) {
      logger.error('Error in market resolution check:', error);
    }
  }

  /**
   * Resolve a market if it's ready
   */
  async resolveMarketIfReady(market) {
    try {
      // Check if market is already resolved
      if (market.status === 'resolved') {
        logger.debug(`Market ${market.id} is already resolved`);
        return;
      }

      // Check if resolution time has passed
      const resolutionTime = new Date(market.resolutionTime);
      const now = new Date();

      if (now < resolutionTime) {
        logger.debug(`Market ${market.id} resolution time not reached yet`);
        return;
      }

      logger.info(`🔮 Resolving market: ${market.id}`);

      // Get outcome from external API
      const sportsService = getSportsService();
      const resolution = await sportsService.resolveMarket(market.id, market);

      if (!resolution.resolved) {
        logger.info(`Market ${market.id} not ready to resolve: ${resolution.reason}`);
        return;
      }

      // Call smart contract to resolve market
      await this.callResolveMarket(market.id, resolution.winningOutcome);

      // Update market status in database
      await Market.updateStatus(market.id, 'resolved');

      logger.info(`✅ Market ${market.id} resolved with outcome ${resolution.winningOutcome}`);
    } catch (error) {
      logger.error(`Error resolving market ${market.id}:`, error);
      throw error;
    }
  }

  /**
   * Call smart contract's resolveMarket function
   */
  async callResolveMarket(marketAddress, winningOutcome) {
    try {
      logger.info(`📝 Calling resolveMarket(${winningOutcome}) on ${marketAddress}`);

      const receipt = await writeContract({
        address: marketAddress,
        abi: CategoricalMarketABI,
        functionName: 'resolveMarket',
        args: [winningOutcome],
      });

      logger.info(`✅ Market resolved in transaction: ${receipt.transactionHash}`);
      return receipt;
    } catch (error) {
      logger.error('Error calling resolveMarket:', error);

      // Check if market is already resolved
      if (error.message.includes('already resolved') || error.message.includes('MarketResolved')) {
        logger.info('Market was already resolved on-chain');
        return null;
      }

      throw error;
    }
  }

  /**
   * Manually resolve a market (for testing or manual intervention)
   */
  async manuallyResolveMarket(marketId, winningOutcome) {
    try {
      const market = await Market.findById(marketId);
      if (!market) {
        throw new Error(`Market ${marketId} not found`);
      }

      if (market.status === 'resolved') {
        throw new Error('Market is already resolved');
      }

      await this.callResolveMarket(marketId, winningOutcome);
      await Market.updateStatus(marketId, 'resolved');

      logger.info(`✅ Market ${marketId} manually resolved with outcome ${winningOutcome}`);
      return true;
    } catch (error) {
      logger.error(`Error manually resolving market ${marketId}:`, error);
      throw error;
    }
  }
}

// Singleton instance
let resolverInstance = null;

/**
 * Get or create resolver instance
 */
export const getResolver = () => {
  if (!resolverInstance) {
    resolverInstance = new OracleResolver();
  }
  return resolverInstance;
};

/**
 * Start the oracle resolver
 */
export const startResolver = async () => {
  const resolver = getResolver();
  await resolver.start();
};

/**
 * Stop the oracle resolver
 */
export const stopResolver = async () => {
  const resolver = getResolver();
  await resolver.stop();
};

export default getResolver;


