-- Database already created: pulsedelta_dev ✅

-- Set password for existing postgres user (optional)
ALTER USER postgres WITH PASSWORD 'pulsedelta';

-- Grant privileges (usually not needed for postgres superuser, but safe to run)
GRANT ALL PRIVILEGES ON DATABASE pulsedelta_dev TO postgres;

-- Verify database exists
\l

-- Exit
\q

