-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- 添加默认管理员用户 (用户名: admin, 密码: admin123)
INSERT INTO users (username, password_hash) 
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');

-- 为笔记表添加用户外键
ALTER TABLE notes ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE; 