# 📝 How to Add Content to the Database

This guide shows you different ways to add data to your database for testing.

---

## 🚀 Quick Method: Use the Seed Script

The easiest way to add test data is using the built-in seed script:

```bash
npm run db:seed
```

This will add:
- **4 sample markets** (Bitcoin, NBA, AI, Ethereum)
- **4 sample users** with trading stats
- **5 sample comments** on markets
- **7 days of historical price data** for one market

---

## 📋 What Gets Added

### Markets
1. **Bitcoin $100k Prediction** - Active market about Bitcoin reaching $100k
2. **NBA Championship 2024** - Sports prediction with 4 outcomes
3. **AGI by 2025** - Technology prediction
4. **Ethereum Merge** - Already resolved market

### Users
- `crypto_trader` - Active cryptocurrency trader
- `sports_analyst` - Sports prediction expert
- `tech_predictor` - Technology market participant
- `market_maker` - High-volume trader

### Comments
- Various comments on different markets
- Shows social interaction features

### History
- 7 days of price history for Bitcoin market
- Shows price movements over time

---

## 🔧 Manual Methods

### Method 1: Using SQL (PostgreSQL)

Connect to your database:

```bash
sudo -u postgres psql -d pulsedelta_dev
```

Then insert data:

```sql
-- Insert a market
INSERT INTO markets (
  id, question, description, category, status, outcome_count, outcomes, creator_address
) VALUES (
  '0x5555555555555555555555555555555555555555',
  'Will it rain tomorrow?',
  'Simple weather prediction',
  'Weather',
  'active',
  2,
  '[{"id": 0, "name": "Yes"}, {"id": 1, "name": "No"}]'::jsonb,
  '0x1111111111111111111111111111111111111111'
);

-- Insert a user
INSERT INTO users (address, username, reputation_score)
VALUES ('0x6666666666666666666666666666666666666666', 'new_user', 50);

-- Insert a comment
INSERT INTO comments (market_id, author, content)
VALUES (
  '0x5555555555555555555555555555555555555555',
  '0x6666666666666666666666666666666666666666',
  'I think it will rain!'
);
```

### Method 2: Using the API (Postman)

Once you have the server running, you can add data via API:

**Create a Comment:**
```bash
POST http://localhost:5000/api/v1/comments
Content-Type: application/json

{
  "marketId": "0x1111111111111111111111111111111111111111",
  "userAddress": "0x0000000000000000000000000000000000000001",
  "content": "This is my comment!"
}
```

**Note**: Markets and users are typically created by the blockchain indexer when events occur on-chain. For testing, use the seed script or SQL.

### Method 3: Using Node.js Script

Create a custom script:

```javascript
import Market from './src/database/models/Market.js';

const newMarket = await Market.upsert({
  id: '0x7777777777777777777777777777777777777777',
  question: 'Custom market question?',
  category: 'Custom',
  status: 'active',
  outcomeCount: 2,
  outcomes: [{ id: 0, name: 'Yes' }, { id: 1, name: 'No' }],
  creatorAddress: '0x1111111111111111111111111111111111111111',
});
```

---

## 🧹 Clear All Data

To start fresh, you can clear all data:

```bash
# Connect to database
sudo -u postgres psql -d pulsedelta_dev

# Delete all data (be careful!)
TRUNCATE TABLE comments CASCADE;
TRUNCATE TABLE markets_history CASCADE;
TRUNCATE TABLE market_events CASCADE;
TRUNCATE TABLE markets CASCADE;
TRUNCATE TABLE users CASCADE;
```

Then run the seed script again:
```bash
npm run db:seed
```

---

## 📊 Verify Data

Check what's in your database:

```bash
# Connect to database
sudo -u postgres psql -d pulsedelta_dev

# Count records
SELECT COUNT(*) FROM markets;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM comments;
SELECT COUNT(*) FROM markets_history;

# View markets
SELECT id, question, status FROM markets;

# View users
SELECT address, username, reputation_score FROM users;
```

Or test via API:

```bash
# Get all markets
curl http://localhost:5000/api/v1/markets

# Get a specific market
curl http://localhost:5000/api/v1/markets/0x1111111111111111111111111111111111111111

# Get comments for a market
curl http://localhost:5000/api/v1/comments/market/0x1111111111111111111111111111111111111111

# Get user profile
curl http://localhost:5000/api/v1/users/0x0000000000000000000000000000000000000001
```

---

## 🎯 Common Use Cases

### Add More Markets

Edit `src/database/seed.js` and add more market objects to the `markets` array, then run:
```bash
npm run db:seed
```

### Add Test Comments

Use Postman to POST comments:
```
POST /api/v1/comments
{
  "marketId": "0x1111111111111111111111111111111111111111",
  "userAddress": "0x0000000000000000000000000000000000000001",
  "content": "My test comment"
}
```

### Add Historical Data

The seed script adds 7 days of history. To add more, you can:

1. Use SQL to insert more history entries
2. Wait for the blockchain indexer to create snapshots automatically
3. Modify the seed script to generate more history

---

## 💡 Tips

- **Development**: Use the seed script for quick test data
- **Testing**: Clear and reseed before running tests
- **Production**: Data comes from blockchain events automatically
- **Custom Data**: Modify `src/database/seed.js` to add your own test scenarios

---

## 🐛 Troubleshooting

**Seed script fails:**
- Make sure database is running: `sudo systemctl status postgresql`
- Check database connection in `.env` file
- Ensure migrations have been run: `npm run db:migrate`

**Can't insert via API:**
- Make sure server is running: `npm run dev`
- Check that the market/user exists before creating comments
- Verify request format matches API documentation

**Data not showing:**
- Restart server after adding data
- Check database directly with `psql`
- Verify API endpoint is correct

---

Happy testing! 🚀

