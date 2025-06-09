-- 添加 memos 兼容字段
ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;

-- 更新现有用户的 created_at 为 ISO 8601 格式
UPDATE users SET created_at = datetime(created_at, 'unixepoch') WHERE typeof(created_at) = 'integer';

-- 为 notes 表添加 memos 兼容字段
ALTER TABLE notes ADD COLUMN visibility TEXT DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'WORKSPACE', 'PUBLIC'));

-- 更新现有笔记的时间戳格式（如果需要）
-- memos 使用 ISO 8601 格式，但我们在代码中会动态转换 