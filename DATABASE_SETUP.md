# 🗄️ Database Setup Guide

Your backend requires PostgreSQL to be installed and running. This guide will help you set it up.

## 📋 Prerequisites

- Ubuntu/Debian-based Linux system (or similar)
- sudo/root access

---

## 🚀 Quick Setup

### Step 1: Install PostgreSQL

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Enable auto-start on boot
```

### Step 2: Verify Installation

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# You should see: "Active: active (running)"
```

### Step 3: Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE pulsedelta_dev;
CREATE USER postgres WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE pulsedelta_dev TO postgres;
\q
```

**Note**: Replace `'your_password_here'` with a secure password, or leave it empty if you want to use passwordless authentication.

### Step 4: Configure Environment Variables

Create a `.env` file in the project root:

```bash
cd /home/admin/Desktop/dev/Backend
touch .env
```

Add these database settings to `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pulsedelta_dev
DB_USER=postgres
DB_PASSWORD=your_password_here
```

**If using passwordless authentication** (default on many systems), you can omit `DB_PASSWORD` or leave it empty.

### Step 5: Run Database Migrations

```bash
# Run migrations to create tables
npm run db:migrate
```

Or manually run the migration script:

```bash
node src/database/migrations/index.js
```

### Step 6: Verify Database Connection

Restart your server and test:

```bash
npm run dev
```

Then test the health endpoint:
```bash
curl http://localhost:5000/health
```

---

## 🔧 Alternative: Using Docker

If you prefer using Docker:

```bash
# Run PostgreSQL in Docker
docker run --name pulsedelta-postgres \
  -e POSTGRES_DB=pulsedelta_dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15

# Wait a few seconds for PostgreSQL to start, then run migrations
npm run db:migrate
```

Update your `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pulsedelta_dev
DB_USER=postgres
DB_PASSWORD=postgres
```

---

## 🐛 Troubleshooting

### Error: "Connection refused"

**Problem**: PostgreSQL is not running or not accessible.

**Solution**:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql

# Check if it's listening on port 5432
sudo netstat -tlnp | grep 5432
```

### Error: "Database does not exist"

**Problem**: The database `pulsedelta_dev` hasn't been created.

**Solution**:
```bash
sudo -u postgres psql
CREATE DATABASE pulsedelta_dev;
\q
```

### Error: "Password authentication failed"

**Problem**: Wrong password or authentication method.

**Solution**:
1. Check your `.env` file has the correct password
2. Or configure passwordless authentication:

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Change this line:
# local   all             all                                     peer
# To:
local   all             all                                     trust

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Error: "Table does not exist"

**Problem**: Migrations haven't been run.

**Solution**:
```bash
npm run db:migrate
```

---

## ✅ Verification Checklist

- [ ] PostgreSQL is installed
- [ ] PostgreSQL service is running (`systemctl status postgresql`)
- [ ] Database `pulsedelta_dev` exists
- [ ] User has proper permissions
- [ ] `.env` file is configured
- [ ] Migrations have been run
- [ ] Server starts without database errors
- [ ] Health endpoint returns success

---

## 📚 Useful Commands

```bash
# Connect to PostgreSQL
sudo -u postgres psql
sudo -u postgres psql -d pulsedelta_dev

# List all databases
sudo -u postgres psql -l

# Check PostgreSQL version
sudo -u postgres psql -c "SELECT version();"

# View all tables in database
sudo -u postgres psql -d pulsedelta_dev -c "\dt"

# Stop PostgreSQL
sudo systemctl stop postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## 🎯 Next Steps

Once PostgreSQL is set up:

1. **Test the API**: Use Postman to test endpoints
2. **Seed Data** (optional): Add sample data for testing
3. **Monitor**: Check logs for any database issues

---

## 💡 Tips

- **Development**: You can use passwordless authentication for easier local development
- **Production**: Always use strong passwords and secure authentication
- **Backup**: Regularly backup your database
- **Performance**: Adjust connection pool settings in `src/config/index.js` if needed

---

Need help? Check the server logs for detailed error messages!

