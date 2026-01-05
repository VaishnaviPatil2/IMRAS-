-- Connect to PostgreSQL as superuser and run these commands

-- Create the database
CREATE DATABASE imras;

-- Create a user for your application (optional, you can use postgres user)
CREATE USER imras_user WITH PASSWORD 'imras123';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE imras TO imras_user;

-- Connect to imras database and grant schema privileges
\c imras;
GRANT ALL ON SCHEMA public TO imras_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO imras_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO imras_user;