import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import {
  publicClient,
  getBlockNumber,
  readContract,
  watchContractEvent,
  getContractLogs,
} from './client.js';
import Market from '../../database/models/Market.js';
import MarketEvent from '../../database/models/MarketEvent.js';
import MarketHistory from '../../database/models/MarketHistory.js';
import User from '../../database/models/User.js';
import { loadABI } from '../../utils/loadABI.js';

const CategoricalMarketFactoryABI = loadABI('CategoricalMarketFactory.json');
const CategoricalMarketABI = loadABI('CategoricalMarket.json');

/**
 * Blockchain Indexer Service (BE-1)
 * Listens to smart contract events and indexes on-chain data
 */
class BlockchainIndexer {
  constructor() {
    this.isRunning = false;
    this.lastProcessedBlock = null;
    this.watchers = [];
    this.marketContracts = new Map(); // Cache of market contract addresses
  }

  /**
   * Start the indexer
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Indexer is already running');
      return;
    }

    logger.info('🚀 Starting blockchain indexer...');

    try {
      // Initialize last processed block
      if (config.indexer.startBlock === 'latest') {
        try {
          this.lastProcessedBlock = await getBlockNumber();
          logger.info(`Starting from latest block: ${this.lastProcessedBlock}`);
        } catch (error) {
          logger.warn('⚠️  Could not connect to blockchain RPC. Indexer will start in degraded mode.');
          logger.warn('   The API server will continue to work, but blockchain indexing is disabled.');
          logger.warn('   To enable indexing, check your RPC URL and network connection.');
          // Use a default block number to allow indexer to start
          this.lastProcessedBlock = 0n;
        }
      } else {
        this.lastProcessedBlock = BigInt(config.indexer.startBlock);
      }

      this.isRunning = true;

      // Only process historical events if we have a valid block number
      if (this.lastProcessedBlock > 0n || config.indexer.startBlock !== 'latest') {
        // Process historical events first
        await this.processHistoricalEvents();

        // Start watching for new events
        await this.startWatching();

        // Start polling for new blocks
        this.startPolling();

        logger.info('✅ Blockchain indexer started successfully');
      } else {
        logger.warn('⚠️  Blockchain indexer started in degraded mode (no blockchain connection)');
      }
    } catch (error) {
      logger.error('❌ Failed to start blockchain indexer:', error);
      logger.warn('⚠️  API server will continue to work without blockchain indexing');
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the indexer
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping blockchain indexer...');
    this.isRunning = false;

    // Unwatch all event watchers
    for (const unwatch of this.watchers) {
      if (typeof unwatch === 'function') {
        unwatch();
      }
    }
    this.watchers = [];

    logger.info('✅ Blockchain indexer stopped');
  }

  /**
   * Process historical events from the start block
   */
  async processHistoricalEvents() {
    if (!config.blockchain.contracts.marketFactory) {
      logger.warn('Market factory address not configured, skipping historical indexing');
      return;
    }

    try {
      logger.info('📚 Processing historical events...');
      const currentBlock = await getBlockNumber();
      const fromBlock = this.lastProcessedBlock;
      const toBlock = currentBlock;

      // Process in batches
      const batchSize = config.indexer.batchSize;
      let processed = 0;

      for (let start = fromBlock; start <= toBlock; start += BigInt(batchSize)) {
        const end = start + BigInt(batchSize) > toBlock ? toBlock : start + BigInt(batchSize);

        await this.processBlockRange(start, end);
        processed += Number(end - start);
        this.lastProcessedBlock = end;

        logger.info(`Processed blocks ${start} to ${end} (${processed} total)`);
      }

      logger.info('✅ Historical events processing completed');
    } catch (error) {
      logger.error('❌ Error processing historical events:', error);
      throw error;
    }
  }

  /**
   * Process a range of blocks
   */
  async processBlockRange(fromBlock, toBlock) {
    try {
      // Get MarketCreated events from factory
      if (config.blockchain.contracts.marketFactory) {
        await this.indexMarketCreatedEvents(fromBlock, toBlock);
      }

      // Get events from all known markets
      for (const [marketId, marketAddress] of this.marketContracts) {
        await this.indexMarketEvents(marketAddress, fromBlock, toBlock);
      }
    } catch (error) {
      logger.error(`Error processing block range ${fromBlock}-${toBlock}:`, error);
    }
  }

  /**
   * Index MarketCreated events from factory
   */
  async indexMarketCreatedEvents(fromBlock, toBlock) {
    try {
      const logs = await getContractLogs({
        address: config.blockchain.contracts.marketFactory,
        abi: CategoricalMarketFactoryABI,
        eventName: 'MarketCreated',
        fromBlock,
        toBlock,
      });

      for (const log of logs) {
        await this.handleMarketCreated(log);
      }
    } catch (error) {
      logger.error('Error indexing MarketCreated events:', error);
    }
  }

  /**
   * Handle MarketCreated event
   */
  async handleMarketCreated(log) {
    try {
      const { args, blockNumber, transactionHash, logIndex } = log;
      const block = await publicClient.getBlock({ blockNumber });

      // Extract market data from event
      const marketId = args.market || args.marketAddress;
      const creatorAddress = args.creator || args.creatorAddress;
      const question = args.question || '';
      const outcomes = args.outcomes || [];

      // Store market in database
      await Market.upsert({
        id: marketId,
        question,
        description: '',
        category: 'General',
        status: 'active',
        outcomeCount: outcomes.length,
        outcomes: outcomes.map((outcome, index) => ({ id: index, name: outcome })),
        creatorAddress,
        factoryAddress: config.blockchain.contracts.marketFactory,
      });

      // Store event
      await MarketEvent.create({
        marketId,
        eventType: 'MarketCreated',
        userAddress: creatorAddress,
        blockNumber: Number(blockNumber),
        transactionHash,
        logIndex: Number(logIndex),
        timestamp: new Date(Number(block.timestamp) * 1000),
        data: { outcomes },
      });

      // Cache market contract address
      this.marketContracts.set(marketId, marketId);

      logger.info(`✅ Indexed new market: ${marketId}`);
    } catch (error) {
      logger.error('Error handling MarketCreated event:', error);
    }
  }

  /**
   * Index events from a specific market contract
   */
  async indexMarketEvents(marketAddress, fromBlock, toBlock) {
    try {
      // Index SharesPurchased events
      await this.indexEventType(marketAddress, 'SharesPurchased', fromBlock, toBlock);
      
      // Index SharesSold events
      await this.indexEventType(marketAddress, 'SharesSold', fromBlock, toBlock);
      
      // Index LiquidityAdded events
      await this.indexEventType(marketAddress, 'LiquidityAdded', fromBlock, toBlock);
      
      // Index MarketResolved events
      await this.indexEventType(marketAddress, 'MarketResolved', fromBlock, toBlock);
    } catch (error) {
      logger.error(`Error indexing events for market ${marketAddress}:`, error);
    }
  }

  /**
   * Index a specific event type
   */
  async indexEventType(marketAddress, eventName, fromBlock, toBlock) {
    try {
      const logs = await getContractLogs({
        address: marketAddress,
        abi: CategoricalMarketABI,
        eventName,
        fromBlock,
        toBlock,
      });

      for (const log of logs) {
        await this.handleMarketEvent(eventName, log);
      }
    } catch (error) {
      // Event might not exist in ABI, skip silently
      if (!error.message.includes('not found')) {
        logger.error(`Error indexing ${eventName} events:`, error);
      }
    }
  }

  /**
   * Handle market event (SharesPurchased, SharesSold, etc.)
   */
  async handleMarketEvent(eventType, log) {
    try {
      const { args, blockNumber, transactionHash, logIndex } = log;
      const block = await publicClient.getBlock({ blockNumber });

      const marketId = log.address;
      const userAddress = args.user || args.buyer || args.seller || args.provider;
      const outcomeId = args.outcome !== undefined ? Number(args.outcome) : null;
      const shares = args.shares?.toString() || '0';
      const cost = args.cost?.toString() || args.amount?.toString() || '0';

      // Store event
      await MarketEvent.create({
        marketId,
        eventType,
        userAddress,
        outcomeId,
        shares,
        cost,
        blockNumber: Number(blockNumber),
        transactionHash,
        logIndex: Number(logIndex),
        timestamp: new Date(Number(block.timestamp) * 1000),
        data: args,
      });

      // Update user stats
      if (userAddress) {
        await User.upsert({ address: userAddress });
        if (eventType === 'SharesPurchased' || eventType === 'SharesSold') {
          await User.updateStats(userAddress, {
            totalTrades: 1,
            totalVolume: cost,
          });
        }
      }

      // Update market prices and volume periodically
      if (eventType === 'SharesPurchased' || eventType === 'SharesSold') {
        await this.updateMarketSnapshot(marketId, block.timestamp);
      }

      // Handle market resolution
      if (eventType === 'MarketResolved') {
        const winningOutcome = args.winningOutcome !== undefined ? Number(args.winningOutcome) : null;
        await Market.updateStatus(marketId, 'resolved');
        await MarketEvent.create({
          marketId,
          eventType: 'MarketResolved',
          userAddress: null,
          outcomeId: winningOutcome,
          blockNumber: Number(blockNumber),
          transactionHash,
          logIndex: Number(logIndex),
          timestamp: new Date(Number(block.timestamp) * 1000),
          data: { winningOutcome },
        });
      }

      logger.debug(`✅ Indexed ${eventType} event for market ${marketId}`);
    } catch (error) {
      logger.error(`Error handling ${eventType} event:`, error);
    }
  }

  /**
   * Update market snapshot (prices, volume, liquidity)
   */
  async updateMarketSnapshot(marketId, timestamp) {
    try {
      // Fetch current prices from contract
      const market = await Market.findById(marketId);
      if (!market) return;

      const prices = await this.fetchMarketPrices(marketId, market.outcomeCount);
      const volume = await this.fetchMarketVolume(marketId);
      const liquidity = await this.fetchMarketLiquidity(marketId);

      // Store snapshot
      await MarketHistory.create({
        marketId,
        prices,
        volume,
        liquidity,
        timestamp: new Date(Number(timestamp) * 1000),
      });

      // Update market totals
      await Market.updateVolume(marketId, volume, liquidity);
    } catch (error) {
      logger.error(`Error updating market snapshot for ${marketId}:`, error);
    }
  }

  /**
   * Fetch current prices from market contract
   */
  async fetchMarketPrices(marketId, outcomeCount) {
    try {
      const prices = [];
      for (let i = 0; i < outcomeCount; i++) {
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
      return prices;
    } catch (error) {
      logger.error(`Error fetching prices for market ${marketId}:`, error);
      return [];
    }
  }

  /**
   * Fetch market volume
   */
  async fetchMarketVolume(marketId) {
    try {
      const volume = await readContract({
        address: marketId,
        abi: CategoricalMarketABI,
        functionName: 'totalVolume',
      });
      return volume.toString();
    } catch (error) {
      return '0';
    }
  }

  /**
   * Fetch market liquidity
   */
  async fetchMarketLiquidity(marketId) {
    try {
      const liquidity = await readContract({
        address: marketId,
        abi: CategoricalMarketABI,
        functionName: 'totalLiquidity',
      });
      return liquidity.toString();
    } catch (error) {
      return '0';
    }
  }

  /**
   * Start watching for new events
   */
  async startWatching() {
    if (!config.blockchain.contracts.marketFactory) {
      logger.warn('Market factory address not configured, skipping event watching');
      return;
    }

    // Watch for new MarketCreated events
    const unwatchFactory = watchContractEvent({
      address: config.blockchain.contracts.marketFactory,
      abi: CategoricalMarketFactoryABI,
      eventName: 'MarketCreated',
      onLogs: async (logs) => {
        for (const log of logs) {
          await this.handleMarketCreated(log);
        }
      },
    });

    this.watchers.push(unwatchFactory);

    logger.info('👀 Watching for new contract events...');
  }

  /**
   * Start polling for new blocks
   */
  startPolling() {
    const pollInterval = config.indexer.pollInterval;

    this.pollInterval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        const currentBlock = await getBlockNumber();
        if (currentBlock > this.lastProcessedBlock) {
          const fromBlock = this.lastProcessedBlock + 1n;
          const toBlock = currentBlock;

          await this.processBlockRange(fromBlock, toBlock);
          this.lastProcessedBlock = toBlock;
        }
      } catch (error) {
        logger.error('Error in polling loop:', error);
      }
    }, pollInterval);

    logger.info(`🔄 Polling for new blocks every ${pollInterval}ms`);
  }
}

// Singleton instance
let indexerInstance = null;

/**
 * Get or create indexer instance
 */
export const getIndexer = () => {
  if (!indexerInstance) {
    indexerInstance = new BlockchainIndexer();
  }
  return indexerInstance;
};

/**
 * Start the indexer
 */
export const startIndexer = async () => {
  const indexer = getIndexer();
  await indexer.start();
};

/**
 * Stop the indexer
 */
export const stopIndexer = async () => {
  const indexer = getIndexer();
  await indexer.stop();
};

export default getIndexer;


