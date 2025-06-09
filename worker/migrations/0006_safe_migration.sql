-- 安全的數據庫遷移腳本
-- 只添加實際缺少的列

-- 為 notes 表添加缺少的列
-- 添加 user_id 列（如果不存在）
ALTER TABLE notes ADD COLUMN user_id INTEGER REFERENCES users(id);

-- 添加 tags 列（如果不存在）  
ALTER TABLE notes ADD COLUMN tags TEXT DEFAULT '[]';

-- 添加 updated_at 列（如果不存在）
ALTER TABLE notes ADD COLUMN updated_at INTEGER DEFAULT (strftime('%s', 'now'));

-- 添加 is_todo 列（如果不存在）
ALTER TABLE notes ADD COLUMN is_todo INTEGER DEFAULT 0;

-- 添加 is_pinned 列（如果不存在）
ALTER TABLE notes ADD COLUMN is_pinned INTEGER DEFAULT 0;

-- 添加 creator_id 列（如果不存在）
ALTER TABLE notes ADD COLUMN creator_id INTEGER REFERENCES users(id);

-- 添加 visibility 列（如果不存在）
ALTER TABLE notes ADD COLUMN visibility TEXT DEFAULT 'PRIVATE';

-- 添加 uid 列（如果不存在）
ALTER TABLE notes ADD COLUMN uid TEXT;

-- 添加 row_status 列（如果不存在）
ALTER TABLE notes ADD COLUMN row_status TEXT DEFAULT 'NORMAL';

-- 為 users 表添加缺少的列
-- 添加 password_hash 列（如果不存在）
ALTER TABLE users ADD COLUMN password_hash TEXT;

-- 添加 created_at 列（如果不存在）
ALTER TABLE users ADD COLUMN created_at TEXT DEFAULT (datetime('now'));

-- 添加 email 列（如果不存在）
ALTER TABLE users ADD COLUMN email TEXT;

-- 添加 nickname 列（如果不存在）
ALTER TABLE users ADD COLUMN nickname TEXT;

-- 添加 avatar_url 列（如果不存在）
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- 添加 role 列（如果不存在）
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'USER';

-- 添加 row_status 列（如果不存在）
ALTER TABLE users ADD COLUMN row_status TEXT DEFAULT 'NORMAL';

-- 更新現有數據
UPDATE notes SET creator_id = user_id WHERE creator_id IS NULL AND user_id IS NOT NULL;
UPDATE notes SET uid = 'memo-' || id || '-' || COALESCE(user_id, 1) WHERE uid IS NULL;
UPDATE notes SET updated_at = created_at WHERE updated_at IS NULL;

UPDATE users SET nickname = username WHERE nickname IS NULL AND username IS NOT NULL;
UPDATE users SET role = 'HOST' WHERE id = 1 AND role = 'USER'; 