-- 只添加確實缺少的列

-- 為 notes 表添加 memos 兼容性所需的列
ALTER TABLE notes ADD COLUMN creator_id INTEGER REFERENCES users(id);
ALTER TABLE notes ADD COLUMN visibility TEXT DEFAULT 'PRIVATE';
ALTER TABLE notes ADD COLUMN uid TEXT;

-- 為 users 表添加 memos 兼容性所需的列
ALTER TABLE users ADD COLUMN nickname TEXT;
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'USER';

-- 更新現有數據
UPDATE notes SET creator_id = user_id WHERE creator_id IS NULL;
UPDATE notes SET uid = 'memo-' || id || '-' || user_id WHERE uid IS NULL;
UPDATE users SET nickname = username WHERE nickname IS NULL;
UPDATE users SET role = 'HOST' WHERE id = 1; 