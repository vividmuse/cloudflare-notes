import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import * as jose from 'jose';

// 定义环境接口
interface Env {
  DB: D1Database;
  [key: string]: unknown;  // 添加索引签名
}

// 定义笔记接口
interface Note {
  id: string;
  user_id: number;
  content: string;
  tags: string[];
  created_at: number;
  updated_at: number;
  is_todo: boolean;
  is_pinned: boolean;
}

// 定义用户接口
interface User {
  id: number;
  username: string;
}

// 扩展 Hono 的类型
type Variables = {
  user: User;
};

// 创建应用实例，指定环境类型和变量类型
const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// JWT 密钥
const JWT_SECRET = new TextEncoder().encode('your-secret-key');

// 添加 CORS 支持
app.use('/*', cors());

// 添加 JWT 认证中间件
app.use('/api/*', async (c, next) => {
  // 跳过登录和注册接口的认证
  if (c.req.path === '/api/auth/login' || c.req.path === '/api/auth/register') {
    return next();
  }

  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  try {
    const token = auth.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    // 确保 payload 包含必要的用户信息
    if (typeof payload.id === 'number' && typeof payload.username === 'string') {
      c.set('user', { id: payload.id, username: payload.username });
    } else {
      throw new Error('Invalid token payload');
    }
    return next();
  } catch (err) {
    throw new HTTPException(401, { message: 'Invalid token' });
  }
});

// 用户认证相关 API
app.post('/api/auth/register', async (c) => {
  const { username, password } = await c.req.json<{
    username: string;
    password: string;
  }>();
  const db = c.env.DB;

  // 检查用户名是否已存在
  const existingUser = await db.prepare(
    'SELECT id FROM users WHERE username = ?'
  ).bind(username).first();

  if (existingUser) {
    throw new HTTPException(400, { message: 'Username already exists' });
  }

  // 创建密码哈希
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // 插入新用户
  const result = await db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  ).bind(username, passwordHash).run();

  const userId = (result.meta as { last_row_id?: number }).last_row_id || 0;

  // 生成 JWT token
  const token = await new jose.SignJWT({ id: userId, username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  return c.json({ 
    user: { id: userId, username },
    token 
  });
});

app.post('/api/auth/login', async (c) => {
  const { username, password } = await c.req.json();
  const db = c.env.DB;

  // 创建密码哈希
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // 获取用户信息
  const user = await db.prepare(
    'SELECT id, username FROM users WHERE username = ? AND password_hash = ?'
  ).bind(username, passwordHash).first();

  if (!user) {
    throw new HTTPException(401, { message: 'Invalid credentials' });
  }

  // 生成 JWT token
  const token = await new jose.SignJWT({ id: user.id, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  return c.json({ 
    user: { id: user.id, username: user.username },
    token 
  });
});

app.get('/api/auth/me', async (c) => {
  const user = c.get('user') as User;
  return c.json({ id: user.id, username: user.username });
});

// 修改笔记相关 API，添加用户关联
app.post('/api/notes', async (c) => {
  const user = c.get('user');
  const { content, tags = [], is_todo = false, is_pinned = false } = await c.req.json<{
    content: string;
    tags?: string[];
    is_todo?: boolean;
    is_pinned?: boolean;
  }>();
  const db = c.env.DB;

  // 使用 10 位时间戳（秒）
  const now = Math.floor(Date.now() / 1000);

  const result = await db.prepare(
    'INSERT INTO notes (user_id, content, tags, is_todo, is_pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    user.id, 
    content, 
    JSON.stringify(tags), 
    is_todo ? 1 : 0, 
    is_pinned ? 1 : 0,
    now,
    now
  ).run();

  const insertId = (result.meta as { last_row_id?: number }).last_row_id || 0;

  return c.json({ 
    id: insertId, 
    content, 
    tags,
    is_todo,
    is_pinned,
    created_at: now,
    updated_at: now
  });
});

app.get('/api/notes', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const notes = await db.prepare(
    'SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all();

  return c.json(notes.results);
});

app.put('/api/notes/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const { content, tags = [], is_todo, is_pinned } = await c.req.json();
  const db = c.env.DB;

  // 验证笔记所有权
  const note = await db.prepare(
    'SELECT id FROM notes WHERE id = ? AND user_id = ?'
  ).bind(id, user.id).first();

  if (!note) {
    throw new HTTPException(404, { message: 'Note not found' });
  }

  // 使用 10 位时间戳（秒）
  const now = Math.floor(Date.now() / 1000);

  await db.prepare(
    'UPDATE notes SET content = ?, tags = ?, is_todo = ?, is_pinned = ?, updated_at = ? WHERE id = ?'
  ).bind(
    content, 
    JSON.stringify(tags), 
    is_todo ? 1 : 0, 
    is_pinned ? 1 : 0,
    now,
    id
  ).run();

  return c.json({ 
    id, 
    content, 
    tags, 
    is_todo, 
    is_pinned,
    updated_at: now
  });
});

app.patch('/api/notes/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const updates = await c.req.json<{
    content?: string;
    tags?: string[];
    is_todo?: boolean;
    is_pinned?: boolean;
  }>();
  const db = c.env.DB;

  // 验证笔记所有权
  const note = await db.prepare(
    'SELECT * FROM notes WHERE id = ? AND user_id = ?'
  ).bind(id, user.id).first();

  if (!note) {
    throw new HTTPException(404, { message: 'Note not found' });
  }

  const fields: string[] = [];
  const values: (string | number | boolean)[] = [];
  for (const [key, value] of Object.entries(updates)) {
    if (['content', 'tags', 'is_todo', 'is_pinned'].includes(key)) {
      fields.push(`${key} = ?`);
      if (key === 'tags' && Array.isArray(value)) {
        values.push(JSON.stringify(value));
      } else {
        values.push(value as string | number | boolean);
      }
    }
  }

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(Math.floor(Date.now() / 1000));
    values.push(id);

    await db.prepare(
      `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();
  }

  return c.json({ ...note, ...updates });
});

app.delete('/api/notes/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = c.env.DB;

  // 验证笔记所有权
  const note = await db.prepare(
    'SELECT id FROM notes WHERE id = ? AND user_id = ?'
  ).bind(id, user.id).first();

  if (!note) {
    throw new HTTPException(404, { message: 'Note not found' });
  }

  await db.prepare('DELETE FROM notes WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default app;
