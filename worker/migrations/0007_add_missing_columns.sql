-- 只添加確實缺少的列

-- 檢查 notes 表，添加缺少的列
-- 從錯誤信息來看，缺少 is_pinned 和 creator_id

-- 為 notes 表添加缺少的列
ALTER TABLE notes ADD COLUMN is_todo INTEGER DEFAULT 0;
ALTER TABLE notes ADD COLUMN is_pinned INTEGER DEFAULT 0;
ALTER TABLE notes ADD COLUMN creator_id INTEGER REFERENCES users(id);
ALTER TABLE notes ADD COLUMN uid TEXT;
ALTER TABLE notes ADD COLUMN row_status TEXT DEFAULT 'NORMAL';

-- 為 users 表添加缺少的列
ALTER TABLE users ADD COLUMN nickname TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'USER';
ALTER TABLE users ADD COLUMN row_status TEXT DEFAULT 'NORMAL';

-- 更新現有數據
UPDATE notes SET creator_id = user_id WHERE creator_id IS NULL AND user_id IS NOT NULL;
UPDATE notes SET uid = 'memo-' || id || '-' || COALESCE(user_id, 1) WHERE uid IS NULL;

UPDATE users SET nickname = username WHERE nickname IS NULL AND username IS NOT NULL;
UPDATE users SET role = 'HOST' WHERE id = 1 AND role = 'USER'; 