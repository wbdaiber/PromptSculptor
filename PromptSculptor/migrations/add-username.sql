-- Add username column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);

-- Set default usernames for existing users based on their email
UPDATE users 
SET username = LOWER(SPLIT_PART(email, '@', 1) || '_' || SUBSTRING(id, 1, 8))
WHERE username IS NULL;

-- Make username NOT NULL after setting defaults
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- Add unique constraint to username
ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);