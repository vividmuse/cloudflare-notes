-- 使数据库完全兼容 memos 项目
-- 参考 memos 官方数据库结构

-- 1. 添加 memos 表缺失的字段
ALTER TABLE notes ADD COLUMN visibility TEXT DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'WORKSPACE', 'PUBLIC'));
ALTER TABLE notes ADD COLUMN is_pinned INTEGER DEFAULT 0;
ALTER TABLE notes ADD COLUMN row_status TEXT DEFAULT 'NORMAL' CHECK (row_status IN ('NORMAL', 'ARCHIVED'));
ALTER TABLE notes ADD COLUMN creator_id INTEGER REFERENCES users(id);
ALTER TABLE notes ADD COLUMN uid TEXT;

-- 2. 更新现有数据以匹配 memos 格式
UPDATE notes SET creator_id = user_id WHERE creator_id IS NULL;
UPDATE notes SET uid = 'memo-' || id WHERE uid IS NULL;

-- 3. 为 users 表添加 memos 兼容字段
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN nickname TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'USER' CHECK (role IN ('HOST', 'ADMIN', 'USER'));
ALTER TABLE users ADD COLUMN row_status TEXT DEFAULT 'NORMAL' CHECK (row_status IN ('NORMAL', 'ARCHIVED'));

-- 4. 更新现有用户数据
UPDATE users SET nickname = username WHERE nickname IS NULL;
UPDATE users SET role = 'HOST' WHERE id = 1 AND role = 'USER';

-- 5. 创建 memos 资源表 (resources)
CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL REFERENCES users(id),
  created_ts INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_ts INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  filename TEXT NOT NULL,
  blob BLOB,
  external_link TEXT,
  type TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  memo_id INTEGER REFERENCES notes(id) ON DELETE CASCADE
);

-- 6. 创建 memo_resource 关联表
CREATE TABLE IF NOT EXISTS memo_resources (
  memo_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  created_ts INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_ts INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (memo_id, resource_id)
);

-- 7. 创建标签表 (memo_organizer) 
CREATE TABLE IF NOT EXISTS memo_organizers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memo_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pinned INTEGER DEFAULT 0,
  created_ts INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_ts INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- 8. 创建系统设置表
CREATE TABLE IF NOT EXISTS system_settings (
  name TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);

-- 9. 插入默认系统设置
INSERT OR IGNORE INTO system_settings (name, value, description) VALUES 
('allow-signup', 'true', 'Allow user signup'),
('disable-password-login', 'false', 'Disable password login'),
('additional-script', '', 'Additional script'),
('additional-style', '', 'Additional style'),
('customized-profile', '{}', 'Customized profile'),
('storage-service-id', '', 'Storage service ID'),
('local-storage-path', '', 'Local storage path'),
('memo-display-with-updated-ts', 'false', 'Display memo with updated timestamp');

-- 10. 创建索引以提高性能
CREATE INDEX IF NOT EXISTS idx_notes_creator_id ON notes(creator_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_visibility ON notes(visibility);
CREATE INDEX IF NOT EXISTS idx_resources_creator_id ON resources(creator_id);
CREATE INDEX IF NOT EXISTS idx_memo_resources_memo_id ON memo_resources(memo_id);

-- 11. 创建 webhook 表 (如果需要)
CREATE TABLE IF NOT EXISTS webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL REFERENCES users(id),
  created_ts INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_ts INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  row_status TEXT DEFAULT 'NORMAL' CHECK (row_status IN ('NORMAL', 'ARCHIVED')),
  name TEXT NOT NULL,
  url TEXT NOT NULL
); 