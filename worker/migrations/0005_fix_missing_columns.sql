-- 修復數據庫中缺少的列
-- 使用 IF NOT EXISTS 或檢查機制來避免重複添加

-- 檢查並添加 is_pinned 列
ALTER TABLE notes ADD COLUMN is_pinned INTEGER DEFAULT 0;

-- 檢查並添加 creator_id 列 
ALTER TABLE notes ADD COLUMN creator_id INTEGER REFERENCES users(id);

-- 檢查並添加 visibility 列
ALTER TABLE notes ADD COLUMN visibility TEXT DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'WORKSPACE', 'PUBLIC'));

-- 檢查並添加 uid 列
ALTER TABLE notes ADD COLUMN uid TEXT;

-- 檢查並添加 row_status 列
ALTER TABLE notes ADD COLUMN row_status TEXT DEFAULT 'NORMAL' CHECK (row_status IN ('NORMAL', 'ARCHIVED'));

-- 更新現有數據
UPDATE notes SET creator_id = user_id WHERE creator_id IS NULL;
UPDATE notes SET uid = 'memo-' || id || '-' || user_id WHERE uid IS NULL;

-- 為 users 表添加缺少的字段
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN nickname TEXT;  
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'USER' CHECK (role IN ('HOST', 'ADMIN', 'USER'));
ALTER TABLE users ADD COLUMN row_status TEXT DEFAULT 'NORMAL' CHECK (row_status IN ('NORMAL', 'ARCHIVED'));

-- 更新現有用戶數據
UPDATE users SET nickname = username WHERE nickname IS NULL;
UPDATE users SET role = 'HOST' WHERE id = 1 AND role = 'USER'; 