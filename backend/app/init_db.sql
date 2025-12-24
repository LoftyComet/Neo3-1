-- Initialize database with required extensions Deli added for wsl2
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "postgis_topology";

-- Add hashed_password column to users table
ALTER TABLE users ADD COLUMN hashed_password VARCHAR;

-- Update existing user with a default password (e.g., 'password')
-- You should generate a real hash using the backend utility if needed, 
-- but for now we can just set it to a known hash or leave it null and require password reset/re-register.
-- Here is a bcrypt hash for "password": $2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW
UPDATE users SET hashed_password = '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW' WHERE hashed_password IS NULL;

-- Make hashed_password not null after update
ALTER TABLE users ALTER COLUMN hashed_password SET NOT NULL;

UPDATE users 
SET hashed_password = '$2b$12$8dt28ppsL95X3Sy8y33fd.11VYcjXCLw6RUwYq5lzUXq2Xfz//4Ky' 
WHERE username = 'demo_user';
