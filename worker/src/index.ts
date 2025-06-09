import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import * as jose from 'jose';

// 定义环境接口
interface Env {
  DB: D1Database;
  [key: string]: unknown;  // 添加索引签名
}

// memos 兼容的数据结构
interface Memo {
  id?: number;
  name: string; // memos 使用 name 而不是 id
  uid: string;  // 用户唯一标识
  content: string;
  visibility: 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';
  tags: string[];
  createTime: string; // ISO 8601 格式
  updateTime: string; // ISO 8601 格式
  displayTime?: string;
  pinned: boolean;
  parent?: number;
  resources?: Resource[];
  relations?: Relation[];
}

interface Resource {
  id?: number;
  name: string;
  filename: string;
  type: string;
  size: string;
  memo?: number;
}

interface Relation {
  memo: number;
  relatedMemo: number;
  type: 'REFERENCE' | 'COMMENT';
}

// 用户相关接口 - 兼容 memos
interface User {
  id: number;
  name: string; // memos 使用 name 而不是 username
  email?: string;
  nickname?: string;
  avatarUrl?: string;
  role: 'HOST' | 'ADMIN' | 'USER';
  rowStatus: 'NORMAL' | 'ARCHIVED';
  createTime: string;
  updateTime: string;
}

// 认证响应接口
interface AuthResponse {
  user: User;
  accessToken: string;
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

// 健康检查端点
app.get('/health', (c) => {
  return c.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 数据库测试端点
app.get('/db-test', async (c) => {
  try {
    const db = c.env.DB;
    const result = await db.prepare('SELECT COUNT(*) as count FROM users').first();
    return c.json({ status: 'DB OK', userCount: result?.count || 0 });
  } catch (error) {
    return c.json({ status: 'DB Error', error: (error as Error).message }, 500);
  }
});

// 辅助函数：生成 memos 风格的资源名称
function generateMemoName(id: number): string {
  return `memos/${id}`;
}

function generateUserName(id: number): string {
  return `users/${id}`;
}

// 辅助函数：转换时间戳为 ISO 8601 格式
function timestampToISO(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

function isoToTimestamp(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

// 辅助函数：记录活动日志
async function logActivity(
  db: D1Database,
  creatorId: number,
  type: string,
  level: 'INFO' | 'WARN' | 'ERROR' = 'INFO',
  payload?: object,
  resourceId?: number,
  resourceType?: string
) {
  try {
    await db.prepare(
      'INSERT INTO activities (creator_id, type, level, payload, resource_id, resource_type) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      creatorId,
      type,
      level,
      payload ? JSON.stringify(payload) : null,
      resourceId || null,
      resourceType || null
    ).run();
  } catch (error) {
    console.warn('Failed to log activity:', error);
  }
}

// 根路径处理
app.get('/', (c) => {
  return c.json({
    name: 'Memos Lite API',
    version: '1.0.0',
    description: 'A lightweight, serverless memos API',
    frontend: 'https://main.memos-notes.pages.dev',
    endpoints: {
      auth: '/api/v1/auth/*',
      memos: '/api/v1/memos/*',
      users: '/api/v1/users/*'
    }
  });
});

// 添加 JWT 认证中间件
app.use('/api/v1/*', async (c, next) => {
  // 跳过登录和注册接口的认证
  if (c.req.path === '/api/v1/auth/login' || 
      c.req.path === '/api/v1/auth/signup' ||
      c.req.path.startsWith('/api/v1/auth/')) {
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
    if (typeof payload.id === 'number' && typeof payload.name === 'string') {
      const user: User = {
        id: payload.id,
        name: payload.name,
        role: payload.role as 'HOST' | 'ADMIN' | 'USER' || 'USER',
        rowStatus: 'NORMAL',
        createTime: payload.createTime as string || new Date().toISOString(),
        updateTime: new Date().toISOString()
      };
      c.set('user', user);
    } else {
      throw new Error('Invalid token payload');
    }
    return next();
  } catch (err) {
    throw new HTTPException(401, { message: 'Invalid token' });
  }
});

// ========== 认证相关 API (memos 兼容) ==========

// 用户注册 - memos 风格
app.post('/api/v1/auth/signup', async (c) => {
  try {
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
    const now = new Date().toISOString();
    const result = await db.prepare(
      'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)'
    ).bind(username, passwordHash, now).run();

    const userId = (result.meta as { last_row_id?: number }).last_row_id || 0;

    // 创建用户对象
    const user: User = {
      id: userId,
      name: generateUserName(userId),
      nickname: username,
      role: userId === 1 ? 'HOST' : 'USER', // 第一个用户为 HOST
      rowStatus: 'NORMAL',
      createTime: now,
      updateTime: now
    };

    // 生成 JWT token
    const token = await new jose.SignJWT({ 
      id: userId, 
      name: user.name,
      role: user.role,
      createTime: user.createTime
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('168h') // 7天，memos 默认
      .sign(JWT_SECRET);

    const response: AuthResponse = {
      user,
      accessToken: token
    };

    return c.json(response);
  } catch (error) {
    console.error('Signup error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    return c.json({ error: 'Internal server error', details: (error as Error).message }, 500);
  }
});

// 用户登录 - memos 风格
app.post('/api/v1/auth/login', async (c) => {
  const { username, password } = await c.req.json();
  const db = c.env.DB;

  // 创建密码哈希
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // 获取用户信息
  const userRecord = await db.prepare(
    'SELECT id, username, created_at FROM users WHERE username = ? AND password_hash = ?'
  ).bind(username, passwordHash).first() as any;

  if (!userRecord) {
    throw new HTTPException(401, { message: 'Invalid credentials' });
  }

  // 创建用户对象
  const user: User = {
    id: userRecord.id,
    name: generateUserName(userRecord.id),
    nickname: userRecord.username,
    role: userRecord.id === 1 ? 'HOST' : 'USER',
    rowStatus: 'NORMAL',
    createTime: userRecord.created_at,
    updateTime: new Date().toISOString()
  };

  // 生成 JWT token
  const token = await new jose.SignJWT({ 
    id: user.id, 
    name: user.name,
    role: user.role,
    createTime: user.createTime
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('168h') // 7天
    .sign(JWT_SECRET);

  const response: AuthResponse = {
    user,
    accessToken: token
  };

  return c.json(response);
});

// 获取当前用户信息 - memos 风格
app.get('/api/v1/user/me', async (c) => {
  const user = c.get('user') as User;
  return c.json(user);
});

// ========== Memo 相关 API (memos 兼容) ==========

// 创建 memo
app.post('/api/v1/memos', async (c) => {
  try {
    const user = c.get('user');
    const { 
      content, 
      visibility = 'PRIVATE', 
      pinned = false 
    } = await c.req.json<{
      content: string;
      visibility?: 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';
      pinned?: boolean;
    }>();
    const db = c.env.DB;

    // 解析标签（从内容中提取 #tag 格式）
    const tagRegex = /#([^\s#]+)/g;
    const tags: string[] = [];
    let match;
    while ((match = tagRegex.exec(content)) !== null) {
      tags.push(match[1]);
    }

    const now = new Date().toISOString();

    const result = await db.prepare(
      'INSERT INTO memos (name, uid, content, visibility, tags, pinned, create_time, update_time, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      '', // name 将在获取 ID 后设置
      '', // uid 将在获取 ID 后设置  
      content, 
      visibility,
      JSON.stringify(tags), 
      pinned,
      now,
      now,
      user.id
    ).run();

    const insertId = (result.meta as { last_row_id?: number }).last_row_id || 0;

    // 更新 name 和 uid
    await db.prepare(
      'UPDATE memos SET name = ?, uid = ? WHERE id = ?'
    ).bind(
      generateMemoName(insertId),
      `memo-${insertId}-${user.id}`,
      insertId
    ).run();

    const memo: Memo = {
      id: insertId,
      name: generateMemoName(insertId),
      uid: `memo-${insertId}-${user.id}`,
      content,
      visibility,
      tags,
      createTime: now,
      updateTime: now,
      pinned,
      resources: [],
      relations: []
    };

    // 记录活动日志
    await logActivity(
      db,
      user.id,
      'memo.created',
      'INFO',
      { content: content.substring(0, 100), tags },
      insertId,
      'memo'
    );

    return c.json(memo);
  } catch (error) {
    console.error('Create memo error:', error);
    return c.json({ error: 'Internal server error', details: (error as Error).message }, 500);
  }
});

// 获取 memo 列表
app.get('/api/v1/memos', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  // 获取查询参数
  const pageSize = parseInt(c.req.query('pageSize') || '10');
  const pageToken = c.req.query('pageToken') || '';
  const filter = c.req.query('filter') || '';

  let sql = 'SELECT * FROM memos WHERE creator_id = ?';
  const params: any[] = [user.id];

  // 处理分页
  if (pageToken) {
    sql += ' AND id < ?';
    params.push(parseInt(pageToken));
  }

  // 处理过滤
  if (filter) {
    if (filter.includes('pinned:true')) {
      sql += ' AND pinned = 1';
    }
    if (filter.includes('visibility:PRIVATE')) {
      sql += ' AND visibility = "PRIVATE"';
    }
  }

  sql += ' ORDER BY create_time DESC LIMIT ?';
  params.push(pageSize);

  const memos_result = await db.prepare(sql).bind(...params).all();

  const memos: Memo[] = (memos_result.results as any[]).map(memo => ({
    id: memo.id,
    name: memo.name || generateMemoName(memo.id),
    uid: memo.uid || `memo-${memo.id}-${memo.creator_id}`,
    content: memo.content,
    visibility: memo.visibility || 'PRIVATE',
    tags: JSON.parse(memo.tags || '[]'),
    createTime: memo.create_time,
    updateTime: memo.update_time,
    pinned: Boolean(memo.pinned),
    resources: [],
    relations: []
  }));

  // 构建响应，包含下一页token
  const response: any = { memos };
  if (memos.length === pageSize && memos.length > 0) {
    response.nextPageToken = memos[memos.length - 1].id?.toString();
  }

  return c.json(response);
});



// 获取单个 memo
app.get('/api/v1/memos/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = c.env.DB;

  const memo_record = await db.prepare(
    'SELECT * FROM memos WHERE id = ? AND creator_id = ?'
  ).bind(id, user.id).first() as any;

  if (!memo_record) {
    throw new HTTPException(404, { message: 'Memo not found' });
  }

  const memo: Memo = {
    id: memo_record.id,
    name: memo_record.name || generateMemoName(memo_record.id),
    uid: memo_record.uid || `memo-${memo_record.id}-${memo_record.creator_id}`,
    content: memo_record.content,
    visibility: memo_record.visibility || 'PRIVATE',
    tags: JSON.parse(memo_record.tags || '[]'),
    createTime: memo_record.create_time,
    updateTime: memo_record.update_time,
    pinned: Boolean(memo_record.pinned),
    resources: [],
    relations: []
  };

  return c.json(memo);
});

// 更新 memo
app.patch('/api/v1/memos/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const updates = await c.req.json<{
    content?: string;
    visibility?: 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';
    pinned?: boolean;
  }>();
  const db = c.env.DB;

  // 验证 memo 所有权
  const memo_record = await db.prepare(
    'SELECT * FROM memos WHERE id = ? AND creator_id = ?'
  ).bind(id, user.id).first() as any;

  if (!memo_record) {
    throw new HTTPException(404, { message: 'Memo not found' });
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.content !== undefined) {
    fields.push('content = ?');
    values.push(updates.content);
    
    // 重新解析标签
    const tagRegex = /#([^\s#]+)/g;
    const tags: string[] = [];
    let match;
    while ((match = tagRegex.exec(updates.content)) !== null) {
      tags.push(match[1]);
    }
    fields.push('tags = ?');
    values.push(JSON.stringify(tags));
  }

  if (updates.visibility !== undefined) {
    fields.push('visibility = ?');
    values.push(updates.visibility);
  }

  if (updates.pinned !== undefined) {
    fields.push('pinned = ?');
    values.push(updates.pinned);
  }

  if (fields.length > 0) {
    fields.push('update_time = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.prepare(
      `UPDATE memos SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();
  }

  // 获取更新后的memo
  const updatedMemo = await db.prepare(
    'SELECT * FROM memos WHERE id = ?'
  ).bind(id).first() as any;

  const memo: Memo = {
    id: updatedMemo.id,
    name: updatedMemo.name || generateMemoName(updatedMemo.id),
    uid: updatedMemo.uid || `memo-${updatedMemo.id}-${updatedMemo.creator_id}`,
    content: updatedMemo.content,
    visibility: updatedMemo.visibility || 'PRIVATE',
    tags: JSON.parse(updatedMemo.tags || '[]'),
    createTime: updatedMemo.create_time,
    updateTime: updatedMemo.update_time,
    pinned: Boolean(updatedMemo.pinned),
    resources: [],
    relations: []
  };

  return c.json(memo);
});

// 删除 memo
app.delete('/api/v1/memos/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = c.env.DB;

  // 验证 memo 所有权
  const memo = await db.prepare(
    'SELECT id FROM memos WHERE id = ? AND creator_id = ?'
  ).bind(id, user.id).first();

  if (!memo) {
    throw new HTTPException(404, { message: 'Memo not found' });
  }

  await db.prepare('DELETE FROM memos WHERE id = ?').bind(id).run();
  return c.json({});
});

// 批量删除 memos
app.delete('/api/v1/memos', async (c) => {
  const user = c.get('user');
  const { ids } = await c.req.json<{ ids: number[] }>();
  const db = c.env.DB;

  if (!ids || ids.length === 0) {
    throw new HTTPException(400, { message: 'No memo IDs provided' });
  }

  // 验证所有 memo 的所有权
  const placeholders = ids.map(() => '?').join(',');
  const memos = await db.prepare(
    `SELECT id FROM memos WHERE id IN (${placeholders}) AND creator_id = ?`
  ).bind(...ids, user.id).all();

  if ((memos.results as any[]).length !== ids.length) {
    throw new HTTPException(404, { message: 'Some memos not found or not owned by user' });
  }

  // 删除所有验证过的 memos
  await db.prepare(
    `DELETE FROM memos WHERE id IN (${placeholders})`
  ).bind(...ids).run();

  return c.json({ deletedCount: ids.length });
});

// 搜索 memos
app.get('/api/v1/memos/search', async (c) => {
  const user = c.get('user');
  const query = c.req.query('q') || '';
  const limit = parseInt(c.req.query('limit') || '10');
  const db = c.env.DB;

  if (!query.trim()) {
    return c.json({ memos: [] });
  }

  const search_results = await db.prepare(
    'SELECT * FROM memos WHERE creator_id = ? AND content LIKE ? ORDER BY create_time DESC LIMIT ?'
  ).bind(user.id, `%${query}%`, limit).all();

  const memos: Memo[] = (search_results.results as any[]).map(memo => ({
    id: memo.id,
    name: memo.name || generateMemoName(memo.id),
    uid: memo.uid || `memo-${memo.id}-${memo.creator_id}`,
    content: memo.content,
    visibility: memo.visibility || 'PRIVATE',
    tags: JSON.parse(memo.tags || '[]'),
    createTime: memo.create_time,
    updateTime: memo.update_time,
    pinned: Boolean(memo.pinned),
    resources: [],
    relations: []
  }));

  return c.json({ memos });
});

// 获取 memo 统计信息
app.get('/api/v1/memos/stats', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const stats = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN pinned = 1 THEN 1 END) as pinned,
      COUNT(CASE WHEN content LIKE '%- [ ]%' THEN 1 END) as todo,
      COUNT(CASE WHEN visibility = 'PUBLIC' THEN 1 END) as public
    FROM memos WHERE creator_id = ?
  `).bind(user.id).first() as any;

  return c.json({
    total: stats.total || 0,
    pinned: stats.pinned || 0,
    todo: stats.todo || 0,
    public: stats.public || 0
  });
});

// 归档/取消归档 memo
app.patch('/api/v1/memos/:id/archive', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const { archived } = await c.req.json<{ archived: boolean }>();
  const db = c.env.DB;

  // 验证 memo 所有权
  const memo = await db.prepare(
    'SELECT * FROM memos WHERE id = ? AND creator_id = ?'
  ).bind(id, user.id).first() as any;

  if (!memo) {
    throw new HTTPException(404, { message: 'Memo not found' });
  }

  // 由于新的表结构没有 row_status 字段，我们暂时使用删除来模拟归档
  if (archived) {
    await db.prepare('DELETE FROM memos WHERE id = ?').bind(id).run();
  }

  return c.json({ archived });
});

// ========== 用户管理 API (memos 兼容) ==========

// 获取用户列表 (管理员功能)
app.get('/api/v1/users', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  
  // 只有管理员和HOST可以查看用户列表
  if (user.role !== 'HOST' && user.role !== 'ADMIN') {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  const users = await db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  
  const userList = (users.results as any[]).map(u => ({
    id: u.id,
    name: generateUserName(u.id),
    username: u.username,
    email: u.email,
    nickname: u.nickname || u.username,
    avatarUrl: u.avatar_url,
    role: u.role || 'USER',
    rowStatus: u.row_status || 'NORMAL',
    createTime: u.created_at,
    updateTime: u.created_at
  }));

  return c.json({ users: userList });
});

// 获取当前用户信息
app.get('/api/v1/users/me', async (c) => {
  const user = c.get('user');
  return c.json({
    id: user.id,
    name: user.name,
    username: user.name.replace('users/', ''),
    email: user.email,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    role: user.role,
    rowStatus: user.rowStatus,
    createTime: user.createTime,
    updateTime: user.updateTime
  });
});

// 更新用户信息
app.patch('/api/v1/users/me', async (c) => {
  const user = c.get('user');
  const updates = await c.req.json<{
    nickname?: string;
    email?: string;
    avatarUrl?: string;
  }>();
  const db = c.env.DB;

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.nickname !== undefined) {
    fields.push('nickname = ?');
    values.push(updates.nickname);
  }

  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email);
  }

  if (updates.avatarUrl !== undefined) {
    fields.push('avatar_url = ?');
    values.push(updates.avatarUrl);
  }

  if (fields.length > 0) {
    values.push(user.id);
    await db.prepare(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();
  }

  // 获取更新后的用户信息
  const updatedUser = await db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(user.id).first() as any;

  return c.json({
    id: updatedUser.id,
    name: generateUserName(updatedUser.id),
    username: updatedUser.username,
    email: updatedUser.email,
    nickname: updatedUser.nickname || updatedUser.username,
    avatarUrl: updatedUser.avatar_url,
    role: updatedUser.role || 'USER',
    rowStatus: updatedUser.row_status || 'NORMAL',
    createTime: updatedUser.created_at,
    updateTime: updatedUser.created_at
  });
});

// 获取特定用户信息
app.get('/api/v1/users/:id', async (c) => {
  const currentUser = c.get('user');
  const userId = c.req.param('id');
  const db = c.env.DB;

  // 只有管理员、HOST或本人可以查看用户详细信息
  if (currentUser.role !== 'HOST' && currentUser.role !== 'ADMIN' && currentUser.id.toString() !== userId) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  const user = await db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(userId).first() as any;

  if (!user) {
    throw new HTTPException(404, { message: 'User not found' });
  }

  return c.json({
    id: user.id,
    name: generateUserName(user.id),
    username: user.username,
    email: user.email,
    nickname: user.nickname || user.username,
    avatarUrl: user.avatar_url,
    role: user.role || 'USER',
    rowStatus: user.row_status || 'NORMAL',
    createTime: user.created_at,
    updateTime: user.created_at
  });
});

// ========== 系统设置 API (memos 兼容) ==========

// 获取系统设置
app.get('/api/v1/system/setting', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  // 只有管理员和HOST可以查看系统设置
  if (user.role !== 'HOST' && user.role !== 'ADMIN') {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  const settings = await db.prepare('SELECT * FROM system_settings').all();
  
  const settingsObj: Record<string, any> = {};
  (settings.results as any[]).forEach(setting => {
    settingsObj[setting.name] = setting.value;
  });

  return c.json({
    allowSignUp: settingsObj['allow-signup'] === 'true',
    disablePasswordLogin: settingsObj['disable-password-login'] === 'true',
    additionalScript: settingsObj['additional-script'] || '',
    additionalStyle: settingsObj['additional-style'] || '',
    customizedProfile: JSON.parse(settingsObj['customized-profile'] || '{}'),
    storageServiceId: settingsObj['storage-service-id'] || '',
    localStoragePath: settingsObj['local-storage-path'] || '',
    memoDisplayWithUpdatedTs: settingsObj['memo-display-with-updated-ts'] === 'true'
  });
});

// 更新系统设置
app.patch('/api/v1/system/setting', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  // 只有HOST可以更新系统设置
  if (user.role !== 'HOST') {
    throw new HTTPException(403, { message: 'Only HOST can update system settings' });
  }

  const updates = await c.req.json<{
    allowSignUp?: boolean;
    disablePasswordLogin?: boolean;
    additionalScript?: string;
    additionalStyle?: string;
    customizedProfile?: object;
    storageServiceId?: string;
    localStoragePath?: string;
    memoDisplayWithUpdatedTs?: boolean;
  }>();

  const settingsMap = [
    ['allow-signup', updates.allowSignUp?.toString()],
    ['disable-password-login', updates.disablePasswordLogin?.toString()],
    ['additional-script', updates.additionalScript],
    ['additional-style', updates.additionalStyle],
    ['customized-profile', updates.customizedProfile ? JSON.stringify(updates.customizedProfile) : undefined],
    ['storage-service-id', updates.storageServiceId],
    ['local-storage-path', updates.localStoragePath],
    ['memo-display-with-updated-ts', updates.memoDisplayWithUpdatedTs?.toString()]
  ];

  for (const [key, value] of settingsMap) {
    if (value !== undefined) {
      await db.prepare(
        'INSERT OR REPLACE INTO system_settings (name, value) VALUES (?, ?)'
      ).bind(key, value).run();
    }
  }

  return c.json({ message: 'Settings updated successfully' });
});

// ========== 资源管理 API (memos 兼容) ==========

// 上传资源 (简化版本，不包含实际文件存储)
app.post('/api/v1/resources', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  // 这里简化处理，实际应该处理文件上传
  const { filename, type, size } = await c.req.json<{
    filename: string;
    type: string;
    size: number;
  }>();

  const now = Math.floor(Date.now() / 1000);
  const result = await db.prepare(
    'INSERT INTO resources (creator_id, created_ts, updated_ts, filename, type, size) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(user.id, now, now, filename, type, size).run();

  const resourceId = (result.meta as { last_row_id?: number }).last_row_id || 0;

  return c.json({
    id: resourceId,
    name: `resources/${resourceId}`,
    filename: filename,
    type: type,
    size: size.toString(),
    createTime: timestampToISO(now),
    updateTime: timestampToISO(now)
  });
});

// 获取资源列表
app.get('/api/v1/resources', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const resources = await db.prepare(
    'SELECT * FROM resources WHERE creator_id = ? ORDER BY created_ts DESC'
  ).bind(user.id).all();

  const resourceList = (resources.results as any[]).map(r => ({
    id: r.id,
    name: `resources/${r.id}`,
    filename: r.filename,
    type: r.type,
    size: r.size.toString(),
    createTime: timestampToISO(r.created_ts),
    updateTime: timestampToISO(r.updated_ts)
  }));

  return c.json({ resources: resourceList });
});

// 删除资源
app.delete('/api/v1/resources/:id', async (c) => {
  const user = c.get('user');
  const resourceId = c.req.param('id');
  const db = c.env.DB;

  // 验证资源所有权
  const resource = await db.prepare(
    'SELECT creator_id FROM resources WHERE id = ?'
  ).bind(resourceId).first() as any;

  if (!resource) {
    throw new HTTPException(404, { message: 'Resource not found' });
  }

  if (resource.creator_id !== user.id && user.role !== 'HOST' && user.role !== 'ADMIN') {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  await db.prepare('DELETE FROM resources WHERE id = ?').bind(resourceId).run();
  return c.json({});
});

// ========== 活动日志 API (memos 兼容) ==========

// 获取活动日志列表
app.get('/api/v1/activities', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  
  const pageSize = parseInt(c.req.query('pageSize') || '20');
  const pageToken = c.req.query('pageToken') || '';
  
  let sql = 'SELECT * FROM activities WHERE creator_id = ?';
  const params: any[] = [user.id];
  
  if (pageToken) {
    sql += ' AND id < ?';
    params.push(parseInt(pageToken));
  }
  
  sql += ' ORDER BY created_ts DESC LIMIT ?';
  params.push(pageSize);
  
  const activities = await db.prepare(sql).bind(...params).all();
  
  const activityList = (activities.results as any[]).map(activity => ({
    id: activity.id,
    name: `activities/${activity.id}`,
    type: activity.type,
    level: activity.level,
    createTime: timestampToISO(activity.created_ts),
    payload: activity.payload ? JSON.parse(activity.payload) : null,
    resource: activity.resource_id ? {
      id: activity.resource_id,
      type: activity.resource_type
    } : null
  }));
  
  const response: any = { activities: activityList };
  if (activityList.length === pageSize && activityList.length > 0) {
    response.nextPageToken = activityList[activityList.length - 1].id?.toString();
  }
  
  return c.json(response);
});

// 获取系统范围的活动日志 (仅管理员)
app.get('/api/v1/system/activities', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  
  // 只有管理员和HOST可以查看系统活动
  if (user.role !== 'HOST' && user.role !== 'ADMIN') {
    throw new HTTPException(403, { message: 'Forbidden' });
  }
  
  const pageSize = parseInt(c.req.query('pageSize') || '50');
  const pageToken = c.req.query('pageToken') || '';
  
  let sql = 'SELECT a.*, u.username FROM activities a LEFT JOIN users u ON a.creator_id = u.id';
  const params: any[] = [];
  
  if (pageToken) {
    sql += ' WHERE a.id < ?';
    params.push(parseInt(pageToken));
  }
  
  sql += ' ORDER BY a.created_ts DESC LIMIT ?';
  params.push(pageSize);
  
  const activities = await db.prepare(sql).bind(...params).all();
  
  const activityList = (activities.results as any[]).map(activity => ({
    id: activity.id,
    name: `activities/${activity.id}`,
    type: activity.type,
    level: activity.level,
    createTime: timestampToISO(activity.created_ts),
    creator: {
      id: activity.creator_id,
      username: activity.username
    },
    payload: activity.payload ? JSON.parse(activity.payload) : null,
    resource: activity.resource_id ? {
      id: activity.resource_id,
      type: activity.resource_type
    } : null
  }));
  
  const response: any = { activities: activityList };
  if (activityList.length === pageSize && activityList.length > 0) {
    response.nextPageToken = activityList[activityList.length - 1].id?.toString();
  }
  
  return c.json(response);
});

// ========== 统计信息 API (memos 兼容) ==========

// 获取系统统计信息
app.get('/api/v1/system/stats', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  
  // 只有管理员和HOST可以查看系统统计
  if (user.role !== 'HOST' && user.role !== 'ADMIN') {
    throw new HTTPException(403, { message: 'Forbidden' });
  }
  
  const [userStats, memoStats, activityStats] = await Promise.all([
    db.prepare('SELECT COUNT(*) as total FROM users').first(),
    db.prepare('SELECT COUNT(*) as total FROM notes').first(),
    db.prepare('SELECT COUNT(*) as total FROM activities').first()
  ]);
  
  return c.json({
    users: (userStats as any)?.total || 0,
    memos: (memoStats as any)?.total || 0,
    activities: (activityStats as any)?.total || 0,
    timestamp: new Date().toISOString()
  });
});

// ========== Webhook API (memos 兼容) ==========

// 获取 webhook 列表
app.get('/api/v1/webhooks', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  
  // 只有管理员和HOST可以管理 webhooks
  if (user.role !== 'HOST' && user.role !== 'ADMIN') {
    throw new HTTPException(403, { message: 'Forbidden' });
  }
  
  const webhooks = await db.prepare(
    'SELECT * FROM webhooks WHERE creator_id = ? ORDER BY created_ts DESC'
  ).bind(user.id).all();
  
  const webhookList = (webhooks.results as any[]).map(webhook => ({
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    createTime: timestampToISO(webhook.created_ts),
    updateTime: timestampToISO(webhook.updated_ts),
    rowStatus: webhook.row_status || 'NORMAL'
  }));
  
  return c.json({ webhooks: webhookList });
});

// 创建 webhook
app.post('/api/v1/webhooks', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  
  // 只有管理员和HOST可以创建 webhooks
  if (user.role !== 'HOST' && user.role !== 'ADMIN') {
    throw new HTTPException(403, { message: 'Forbidden' });
  }
  
  const { name, url } = await c.req.json<{
    name: string;
    url: string;
  }>();
  
  const now = Math.floor(Date.now() / 1000);
  const result = await db.prepare(
    'INSERT INTO webhooks (creator_id, name, url, created_ts, updated_ts) VALUES (?, ?, ?, ?, ?)'
  ).bind(user.id, name, url, now, now).run();
  
  const webhookId = (result.meta as { last_row_id?: number }).last_row_id || 0;
  
  // 记录活动日志
  await logActivity(
    db,
    user.id,
    'webhook.created',
    'INFO',
    { name, url },
    webhookId,
    'webhook'
  );
  
  return c.json({
    id: webhookId,
    name,
    url,
    createTime: timestampToISO(now),
    updateTime: timestampToISO(now),
    rowStatus: 'NORMAL'
  });
});

// 删除 webhook
app.delete('/api/v1/webhooks/:id', async (c) => {
  const user = c.get('user');
  const webhookId = c.req.param('id');
  const db = c.env.DB;
  
  // 只有管理员和HOST可以删除 webhooks
  if (user.role !== 'HOST' && user.role !== 'ADMIN') {
    throw new HTTPException(403, { message: 'Forbidden' });
  }
  
  // 验证 webhook 存在
  const webhook = await db.prepare(
    'SELECT name FROM webhooks WHERE id = ? AND creator_id = ?'
  ).bind(webhookId, user.id).first() as any;
  
  if (!webhook) {
    throw new HTTPException(404, { message: 'Webhook not found' });
  }
  
  await db.prepare('DELETE FROM webhooks WHERE id = ?').bind(webhookId).run();
  
  // 记录活动日志
  await logActivity(
    db,
    user.id,
    'webhook.deleted',
    'INFO',
    { name: webhook.name },
    parseInt(webhookId),
    'webhook'
  );
  
  return c.json({});
});

// ========== 保持向后兼容的旧API ==========

// 向后兼容：重定向旧的认证API
app.post('/api/auth/register', async (c) => {
  const { username, password } = await c.req.json<{
    username: string;
    password: string;
  }>();
  
  // 直接调用新的注册逻辑
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
  const now = new Date().toISOString();
  const result = await db.prepare(
    'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)'
  ).bind(username, passwordHash, now).run();

  const userId = (result.meta as { last_row_id?: number }).last_row_id || 0;

  // 生成 JWT token
  const token = await new jose.SignJWT({ 
    id: userId, 
    name: generateUserName(userId),
    role: userId === 1 ? 'HOST' : 'USER',
    createTime: now
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('168h')
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
  const userRecord = await db.prepare(
    'SELECT id, username, created_at FROM users WHERE username = ? AND password_hash = ?'
  ).bind(username, passwordHash).first() as any;

  if (!userRecord) {
    throw new HTTPException(401, { message: 'Invalid credentials' });
  }

  // 生成 JWT token
  const token = await new jose.SignJWT({ 
    id: userRecord.id, 
    name: generateUserName(userRecord.id),
    role: userRecord.id === 1 ? 'HOST' : 'USER',
    createTime: userRecord.created_at
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('168h')
    .sign(JWT_SECRET);

  return c.json({ 
    user: { id: userRecord.id, username: userRecord.username },
    token 
  });
});

app.get('/api/auth/me', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }

  try {
    const token = auth.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    
    if (typeof payload.id === 'number' && typeof payload.name === 'string') {
      return c.json({ 
        id: payload.id, 
        username: payload.name.replace('users/', '') 
      });
    } else {
      throw new Error('Invalid token payload');
    }
  } catch (err) {
    throw new HTTPException(401, { message: 'Invalid token' });
  }
});



export default app;
