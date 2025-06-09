-- 创建活动日志表
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL REFERENCES users(id),
  created_ts INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  type TEXT NOT NULL, -- 活动类型: 'memo.created', 'memo.updated', 'memo.deleted', 'user.created' 等
  level TEXT NOT NULL DEFAULT 'INFO', -- 日志级别: 'INFO', 'WARN', 'ERROR'
  payload TEXT, -- JSON 格式的附加数据
  resource_id INTEGER, -- 关联的资源ID (memo_id, user_id 等)
  resource_type TEXT -- 资源类型: 'memo', 'user', 'resource' 等
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_activities_creator_id ON activities(creator_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_ts ON activities(created_ts);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_resource ON activities(resource_type, resource_id); 