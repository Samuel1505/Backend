-- Create database
CREATE DATABASE pulsedelta_dev;

-- If you need to create a user (optional, postgres user usually works)
-- CREATE USER postgres WITH PASSWORD 'your_password';

-- Grant privileges (usually not needed for postgres superuser, but safe to run)
GRANT ALL PRIVILEGES ON DATABASE pulsedelta_dev TO postgres;

-- Connect to the new database
\c pulsedelta_dev

-- List databases to verify
\l

-- Exit
\q

