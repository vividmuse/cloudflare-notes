-- 最終遷移：只添加代碼實際需要的列

-- 為 notes 表添加必要的列
ALTER TABLE notes ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE notes ADD COLUMN created_at INTEGER DEFAULT (strftime('%s', 'now'));
ALTER TABLE notes ADD COLUMN updated_at INTEGER DEFAULT (strftime('%s', 'now'));
ALTER TABLE notes ADD COLUMN is_todo INTEGER DEFAULT 0;
ALTER TABLE notes ADD COLUMN is_pinned INTEGER DEFAULT 0;
ALTER TABLE notes ADD COLUMN creator_id INTEGER REFERENCES users(id);
ALTER TABLE notes ADD COLUMN visibility TEXT DEFAULT 'PRIVATE';
ALTER TABLE notes ADD COLUMN uid TEXT;

-- 為 users 表添加必要的列
ALTER TABLE users ADD COLUMN nickname TEXT;
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'USER';

-- 更新現有數據
UPDATE notes SET creator_id = user_id WHERE creator_id IS NULL AND user_id IS NOT NULL;
UPDATE notes SET uid = 'memo-' || id || '-' || COALESCE(user_id, 1) WHERE uid IS NULL;
UPDATE users SET nickname = username WHERE nickname IS NULL AND username IS NOT NULL;
UPDATE users SET role = 'HOST' WHERE id = 1; 