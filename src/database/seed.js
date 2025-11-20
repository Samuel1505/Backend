#!/usr/bin/env node

/**
 * Database Seed Script
 * Adds sample/test data to the database for development and testing
 */

import Market from './models/Market.js';
import User from './models/User.js';
import Comment from './models/Comment.js';
import MarketHistory from './models/MarketHistory.js';
import { logger } from '../utils/logger.js';

/**
 * Generate a fake Ethereum address
 */
const fakeAddress = (index) => {
  return `0x${'0'.repeat(40 - index.toString().length)}${index.toString()}`;
};

/**
 * Seed markets
 */
const seedMarkets = async () => {
  logger.info('🌱 Seeding markets...');

  const markets = [
    {
      id: '0x1111111111111111111111111111111111111111',
      question: 'Will Bitcoin reach $100,000 by end of 2024?',
      description: 'Predict whether Bitcoin will hit the $100k milestone before December 31, 2024.',
      category: 'Cryptocurrency',
      status: 'active',
      resolutionTime: new Date('2024-12-31T23:59:59Z'),
      outcomeCount: 2,
      outcomes: [
        { id: 0, name: 'Yes' },
        { id: 1, name: 'No' }
      ],
      creatorAddress: fakeAddress(1),
      factoryAddress: fakeAddress(999),
      totalVolume: '1000000000000000000000', // 1000 tokens
      totalLiquidity: '500000000000000000000', // 500 tokens
    },
    {
      id: '0x2222222222222222222222222222222222222222',
      question: 'Who will win the 2024 NBA Championship?',
      description: 'Predict the winner of the 2024 NBA Finals.',
      category: 'Sports',
      status: 'active',
      resolutionTime: new Date('2024-06-30T23:59:59Z'),
      outcomeCount: 4,
      outcomes: [
        { id: 0, name: 'Lakers' },
        { id: 1, name: 'Warriors' },
        { id: 2, name: 'Celtics' },
        { id: 3, name: 'Bucks' }
      ],
      creatorAddress: fakeAddress(2),
      factoryAddress: fakeAddress(999),
      totalVolume: '2000000000000000000000', // 2000 tokens
      totalLiquidity: '1000000000000000000000', // 1000 tokens
    },
    {
      id: '0x3333333333333333333333333333333333333333',
      question: 'Will AI achieve AGI (Artificial General Intelligence) by 2025?',
      description: 'Predict if AGI will be achieved before the end of 2025.',
      category: 'Technology',
      status: 'active',
      resolutionTime: new Date('2025-12-31T23:59:59Z'),
      outcomeCount: 2,
      outcomes: [
        { id: 0, name: 'Yes' },
        { id: 1, name: 'No' }
      ],
      creatorAddress: fakeAddress(3),
      factoryAddress: fakeAddress(999),
      totalVolume: '500000000000000000000', // 500 tokens
      totalLiquidity: '250000000000000000000', // 250 tokens
    },
    {
      id: '0x4444444444444444444444444444444444444444',
      question: 'Will Ethereum complete the merge to Proof of Stake?',
      description: 'This market is already resolved.',
      category: 'Cryptocurrency',
      status: 'resolved',
      resolutionTime: new Date('2022-09-15T00:00:00Z'),
      outcomeCount: 2,
      outcomes: [
        { id: 0, name: 'Yes' },
        { id: 1, name: 'No' }
      ],
      creatorAddress: fakeAddress(4),
      factoryAddress: fakeAddress(999),
      totalVolume: '5000000000000000000000', // 5000 tokens
      totalLiquidity: '2500000000000000000000', // 2500 tokens
    },
  ];

  for (const marketData of markets) {
    try {
      await Market.upsert(marketData);
      logger.info(`✅ Created market: ${marketData.question.substring(0, 50)}...`);
    } catch (error) {
      logger.error(`❌ Failed to create market ${marketData.id}:`, error.message);
    }
  }

  logger.info(`✅ Seeded ${markets.length} markets`);
};

/**
 * Seed users
 */
const seedUsers = async () => {
  logger.info('🌱 Seeding users...');

  const users = [
    {
      address: fakeAddress(1),
      username: 'crypto_trader',
      reputationScore: 150,
    },
    {
      address: fakeAddress(2),
      username: 'sports_analyst',
      reputationScore: 200,
    },
    {
      address: fakeAddress(3),
      username: 'tech_predictor',
      reputationScore: 120,
    },
    {
      address: fakeAddress(4),
      username: 'market_maker',
      reputationScore: 300,
    },
  ];

  for (const userData of users) {
    try {
      await User.upsert(userData);
      // Update stats separately
      await User.updateStats(userData.address, {
        totalTrades: userData.address === fakeAddress(1) ? 45 : 
                     userData.address === fakeAddress(2) ? 78 :
                     userData.address === fakeAddress(3) ? 32 : 150,
        totalVolume: userData.address === fakeAddress(1) ? '5000000000000000000000' :
                     userData.address === fakeAddress(2) ? '8000000000000000000000' :
                     userData.address === fakeAddress(3) ? '3000000000000000000000' : '20000000000000000000000',
        totalProfit: userData.address === fakeAddress(1) ? '1000000000000000000000' :
                     userData.address === fakeAddress(2) ? '2000000000000000000000' :
                     userData.address === fakeAddress(3) ? '500000000000000000000' : '5000000000000000000000',
        winRate: userData.address === fakeAddress(1) ? 0.65 :
                userData.address === fakeAddress(2) ? 0.72 :
                userData.address === fakeAddress(3) ? 0.58 : 0.75,
      });
      logger.info(`✅ Created user: ${userData.username}`);
    } catch (error) {
      logger.error(`❌ Failed to create user ${userData.address}:`, error.message);
    }
  }

  logger.info(`✅ Seeded ${users.length} users`);
};

/**
 * Seed comments
 */
const seedComments = async () => {
  logger.info('🌱 Seeding comments...');

  const comments = [
    {
      marketId: '0x1111111111111111111111111111111111111111',
      author: fakeAddress(1),
      content: 'Bitcoin has been showing strong momentum. I think $100k is very achievable!',
    },
    {
      marketId: '0x1111111111111111111111111111111111111111',
      author: fakeAddress(2),
      content: 'I disagree. The market is too volatile right now. I\'m betting against this.',
    },
    {
      marketId: '0x2222222222222222222222222222222222222222',
      author: fakeAddress(2),
      content: 'The Lakers have the best roster this year. Easy win!',
    },
    {
      marketId: '0x2222222222222222222222222222222222222222',
      author: fakeAddress(4),
      content: 'Warriors are looking strong. Curry is in top form.',
    },
    {
      marketId: '0x3333333333333333333333333333333333333333',
      author: fakeAddress(3),
      content: 'AGI by 2025? That seems too optimistic. Maybe 2030.',
    },
  ];

  for (const commentData of comments) {
    try {
      await Comment.create(commentData);
      logger.info(`✅ Created comment for market ${commentData.marketId.substring(0, 10)}...`);
    } catch (error) {
      logger.error(`❌ Failed to create comment:`, error.message);
    }
  }

  logger.info(`✅ Seeded ${comments.length} comments`);
};

/**
 * Seed market history
 */
const seedMarketHistory = async () => {
  logger.info('🌱 Seeding market history...');

  const marketId = '0x1111111111111111111111111111111111111111';
  const now = new Date();
  
  // Create historical price data for the last 7 days
  const historyEntries = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Simulate price movement (Yes starts at 0.4, No at 0.6, gradually shifting)
    const yesPrice = 0.4 + (i * 0.05) + (Math.random() * 0.1 - 0.05);
    const noPrice = 1 - yesPrice;
    
    historyEntries.push({
      marketId,
      prices: [yesPrice, noPrice],
      volume: (1000000 + Math.random() * 500000).toString(),
      liquidity: (500000 + Math.random() * 250000).toString(),
      timestamp: date,
    });
  }

  for (const historyData of historyEntries) {
    try {
      await MarketHistory.create(historyData);
    } catch (error) {
      logger.error(`❌ Failed to create history entry:`, error.message);
    }
  }

  logger.info(`✅ Seeded ${historyEntries.length} history entries`);
};

/**
 * Main seed function
 */
const seed = async () => {
  try {
    logger.info('🚀 Starting database seeding...');
    
    await seedMarkets();
    await seedUsers();
    await seedComments();
    await seedMarketHistory();
    
    logger.info('✅ Database seeding completed successfully!');
    logger.info('');
    logger.info('📊 Summary:');
    logger.info('   - Markets: 4');
    logger.info('   - Users: 4');
    logger.info('   - Comments: 5');
    logger.info('   - History entries: 7');
    logger.info('');
    logger.info('🧪 You can now test the API endpoints with this data!');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run seed
seed();

