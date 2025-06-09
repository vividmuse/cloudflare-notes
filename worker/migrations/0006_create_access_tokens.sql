-- Create access_tokens table for memos-compatible token management
CREATE TABLE IF NOT EXISTS access_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,        -- Token name/description
    access_token TEXT NOT NULL UNIQUE, -- The actual JWT token
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,      -- Token expiration date
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_access_tokens_user_id ON access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON access_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_access_tokens_expires_at ON access_tokens(expires_at); 