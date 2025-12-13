# 🧪 Postman Testing Guide for PulseDelta Backend

This guide will help you test all API endpoints using Postman.

## 📋 Prerequisites

1. **Start the Backend Server**
   ```bash
   npm run dev
   # or
   npm start
   ```

2. **Verify Server is Running**
   - The server should start on port **5000** (default)
   - You should see: `🚀 PulseDelta Backend Server started`
   - Base URL: `http://localhost:5000`

3. **Install Postman** (if not already installed)
   - Download from: https://www.postman.com/downloads/

---

## 🔧 Postman Setup

### Step 1: Create a New Collection
1. Open Postman
2. Click **"New"** → **"Collection"**
3. Name it: `PulseDelta Backend API`
4. Click **"Create"**

### Step 2: Set Up Environment Variables (Optional but Recommended)
1. Click the **"Environments"** tab (left sidebar)
2. Click **"+"** to create a new environment
3. Name it: `PulseDelta Local`
4. Add these variables:
   - `base_url`: `http://localhost:5000`
   - `api_version`: `v1`
   - `api_base`: `{{base_url}}/api/{{api_version}}`
5. Click **"Save"**
6. Select this environment from the dropdown (top right)

---

## 🚀 Testing Endpoints

### Base URLs
- **Root**: `http://localhost:5000`
- **API Base**: `http://localhost:5000/api/v1`
- **Health Check**: `http://localhost:5000/health`

---

## 1️⃣ Health Check Endpoints

### GET /health
**Basic health check**

- **Method**: `GET`
- **URL**: `http://localhost:5000/health`
- **Headers**: None required
- **Body**: None

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### GET /health/detailed
**Detailed health check with service status**

- **Method**: `GET`
- **URL**: `http://localhost:5000/health/detailed`
- **Headers**: None required
- **Body**: None

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "connected",
    "blockchain": "connected",
    "oracle": "enabled",
    "ai": "enabled"
  } 
}
```

---

## 2️⃣ Markets Endpoints

### GET /api/v1/markets
**Get all markets (paginated)**

- **Method**: `GET`
- **URL**: `http://localhost:5000/api/v1/markets`
- **Query Parameters** (optional):
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `status`: Filter by status (e.g., `active`, `resolved`)
  - `category`: Filter by category
- **Headers**: None required
- **Body**: None

**Example with Query Params**:
```
http://localhost:5000/api/v1/markets?page=1&limit=20&status=active
```

---

### GET /api/v1/markets/:marketId
**Get single market details**

- **Method**: `GET`
- **URL**: `http://localhost:5000/api/v1/markets/{marketId}`
- **Path Variables**:
  - `marketId`: The market ID (replace `{marketId}` with actual ID)
- **Headers**: None required
- **Body**: None

**Example**:
```
http://localhost:5000/api/v1/markets/123
```

---

### GET /api/v1/markets/:marketId/prices
**Get current prices for market outcomes**

- **Method**: `GET`
- **URL**: `http://localhost:5000/api/v1/markets/{marketId}/prices`
- **Path Variables**:
  - `marketId`: The market ID
- **Headers**: None required
- **Body**: None

**Example**:
```
http://localhost:5000/api/v1/markets/123/prices
```

---

### GET /api/v1/markets/:marketId/history
**Get historical data for market**

- **Method**: `GET`
- **URL**: `http://localhost:5000/api/v1/markets/{marketId}/history`
- **Path Variables**:
  - `marketId`: The market ID
- **Query Parameters** (optional):
  - `startDate`: Start date (ISO format)
  - `endDate`: End date (ISO format)
  - `interval`: Time interval (e.g., `1h`, `1d`)
- **Headers**: None required
- **Body**: None

**Example**:
```
http://localhost:5000/api/v1/markets/123/history?startDate=2024-01-01&endDate=2024-01-31&interval=1d
```

---

### GET /api/v1/markets/:marketId/forecast
**Get AI forecast for market**

- **Method**: `GET`
- **URL**: `http://localhost:5000/api/v1/markets/{marketId}/forecast`
- **Path Variables**:
  - `marketId`: The market ID
- **Headers**: None required
- **Body**: None

**Example**:
```
http://localhost:5000/api/v1/markets/123/forecast
```

---

## 3️⃣ Users Endpoints

### GET /api/v1/users/:address
**Get user profile**

- **Method**: `GET`
- **URL**: `http://localhost:5000/api/v1/users/{address}`
- **Path Variables**:
  - `address`: User's wallet address (e.g., `0x1234...`)
- **Headers**: None required
- **Body**: None

**Example**:
```
http://localhost:5000/api/v1/users/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

---

### GET /api/v1/users/:address/positions
**Get user's open positions**

- **Method**: `GET`
- **URL**: `http://localhost:5000/api/v1/users/{address}/positions`
- **Path Variables**:
  - `address`: User's wallet address
- **Headers**: None required
- **Body**: None

**Example**:
```
http://localhost:5000/api/v1/users/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/positions
```

---

### GET /api/v1/users/:address/history
**Get user's trading history**

- **Method**: `GET`
- **URL**: `http://localhost:5000/api/v1/users/{address}/history`
- **Path Variables**:
  - `address`: User's wallet address
- **Query Parameters** (optional):
  - `page`: Page number
  - `limit`: Items per page
- **Headers**: None required
- **Body**: None

**Example**:
```
http://localhost:5000/api/v1/users/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/history?page=1&limit=10
```

---

## 4️⃣ Comments Endpoints

### GET /api/v1/comments/market/:marketId
**Get all comments for a market**

- **Method**: `GET`
- **URL**: `http://localhost:5000/api/v1/comments/market/{marketId}`
- **Path Variables**:
  - `marketId`: The market ID
- **Query Parameters** (optional):
  - `page`: Page number
  - `limit`: Items per page
- **Headers**: None required
- **Body**: None

**Example**:
```
http://localhost:5000/api/v1/comments/market/123?page=1&limit=20
```

---

### POST /api/v1/comments
**Create a new comment**

- **Method**: `POST`
- **URL**: `http://localhost:5000/api/v1/comments`
- **Headers**:
  - `Content-Type`: `application/json`
- **Body** (JSON):
```json
{
  "marketId": 123,
  "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "content": "This is my comment about the market",
  "parentId": null
}
```

**Fields**:
- `marketId` (required): The market ID
- `userAddress` (required): User's wallet address
- `content` (required): Comment text (3-1000 characters)
- `parentId` (optional): Parent comment ID for replies

---

### DELETE /api/v1/comments/:commentId
**Delete a comment**

- **Method**: `DELETE`
- **URL**: `http://localhost:5000/api/v1/comments/{commentId}`
- **Path Variables**:
  - `commentId`: The comment ID to delete
- **Headers**: None required
- **Body**: None

**Example**:
```
http://localhost:5000/api/v1/comments/456
```

---

## 5️⃣ Analytics Endpoints

### GET /api/v1/analytics/platform
**Get platform-wide statistics**

- **Method**: `GET`
- **URL**: `http://localhost:5000/api/v1/analytics/platform`
- **Headers**: None required
- **Body**: None

**Expected Response**:
```json
{
  "totalMarkets": 150,
  "activeMarkets": 45,
  "totalVolume": "1000000",
  "totalUsers": 500,
  "totalComments": 1200
}
```

---

### GET /api/v1/analytics/volume
**Get trading volume data**

- **Method**: `GET`
- **URL**: `http://localhost:5000/api/v1/analytics/volume`
- **Query Parameters** (optional):
  - `startDate`: Start date (ISO format)
  - `endDate`: End date (ISO format)
  - `interval`: Time interval (e.g., `1d`, `1w`, `1m`)
- **Headers**: None required
- **Body**: None

**Example**:
```
http://localhost:5000/api/v1/analytics/volume?startDate=2024-01-01&endDate=2024-01-31&interval=1d
```

---

### GET /api/v1/analytics/trending
**Get trending markets**

- **Method**: `GET`
- **URL**: `http://localhost:5000/api/v1/analytics/trending`
- **Query Parameters** (optional):
  - `limit`: Number of markets to return (default: 10)
- **Headers**: None required
- **Body**: None

**Example**:
```
http://localhost:5000/api/v1/analytics/trending?limit=20
```

---

## 📝 Postman Tips

### 1. Using Variables
If you set up environment variables, you can use:
- `{{api_base}}/markets` instead of typing the full URL
- `{{base_url}}/health` for health checks

### 2. Saving Requests
- Click **"Save"** after creating a request
- Add it to your collection for easy access later
- Add descriptions in the "Description" tab

### 3. Testing Collections
- You can run all requests in a collection at once
- Click the collection → **"Run"** → **"Run PulseDelta Backend API"**
- View results in the test results panel

### 4. Common Headers
For POST requests, always include:
```
Content-Type: application/json
```

### 5. Error Responses
If you get errors, check:
- Server is running (`npm run dev`)
- Correct port (default: 5000)
- Correct endpoint path
- Required fields in request body
- Database connection (if endpoints require it)

---

## 🐛 Troubleshooting

### Server Not Responding
1. Check if server is running: `npm run dev`
2. Check the port in config: `src/config/index.js` (default: 5000)
3. Check for errors in terminal

### 404 Not Found
- Verify the endpoint path is correct
- Check API version: `/api/v1/` (not `/api/v2/`)
- Ensure route is registered in `src/server.js`

### 500 Internal Server Error
- Check server logs in terminal
- Verify database connection (if required)
- Check environment variables in `.env` file

### CORS Errors
- Verify CORS origin in `src/config/index.js`
- Default allows: `http://localhost:3000`
- For Postman, CORS shouldn't be an issue

---

## 📚 Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Basic health check |
| `/health/detailed` | GET | Detailed health check |
| `/api/v1/markets` | GET | Get all markets |
| `/api/v1/markets/:id` | GET | Get market details |
| `/api/v1/markets/:id/prices` | GET | Get market prices |
| `/api/v1/markets/:id/history` | GET | Get market history |
| `/api/v1/markets/:id/forecast` | GET | Get AI forecast |
| `/api/v1/users/:address` | GET | Get user profile |
| `/api/v1/users/:address/positions` | GET | Get user positions |
| `/api/v1/users/:address/history` | GET | Get user history |
| `/api/v1/comments/market/:id` | GET | Get market comments |
| `/api/v1/comments` | POST | Create comment |
| `/api/v1/comments/:id` | DELETE | Delete comment |
| `/api/v1/analytics/platform` | GET | Platform stats |
| `/api/v1/analytics/volume` | GET | Volume data |
| `/api/v1/analytics/trending` | GET | Trending markets |

---

## ✅ Testing Checklist

- [ ] Server is running on port 5000
- [ ] Health check endpoint works (`/health`)
- [ ] All GET endpoints return data (or proper errors)
- [ ] POST endpoints accept JSON body
- [ ] Query parameters work correctly
- [ ] Path variables are replaced correctly
- [ ] Error responses are handled properly

---

Happy Testing! 🚀

