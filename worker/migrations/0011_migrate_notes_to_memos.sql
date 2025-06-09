-- 迁移 notes 表数据到 memos 表
-- 首先确保 memos 表存在
CREATE TABLE IF NOT EXISTS memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  uid TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'PRIVATE',
  tags TEXT DEFAULT '[]',
  pinned BOOLEAN DEFAULT false,
  create_time TEXT NOT NULL DEFAULT (datetime('now')),
  update_time TEXT NOT NULL DEFAULT (datetime('now')),
  creator_id INTEGER,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

-- 迁移数据从 notes 到 memos
INSERT INTO memos (id, name, uid, content, visibility, tags, pinned, create_time, update_time, creator_id)
SELECT 
  n.id,
  'memo/' || n.id as name,
  'memo-' || n.id as uid,
  n.content,
  'PRIVATE' as visibility,
  COALESCE(n.tags, '[]') as tags,
  COALESCE(n.is_pinned, false) as pinned,
  datetime(n.created_at, 'unixepoch') as create_time,
  datetime(COALESCE(n.updated_at, n.created_at), 'unixepoch') as update_time,
  n.creator_id
FROM notes n
WHERE NOT EXISTS (SELECT 1 FROM memos m WHERE m.id = n.id);

-- 更新序列值
UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM memos) WHERE name = 'memos'; 