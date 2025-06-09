# Memos 兼容性实施指南

本指南详细说明如何将您的 Cloudflare Workers 笔记应用改造为完全兼容 memos 项目的版本。

## 🎯 实施目标

让您的应用能够与 memos 生态系统完全兼容，包括：
- 使用 memos 的客户端应用
- 兼容 memos 的 API 调用
- 支持 memos 的数据格式
- 保持与现有功能的向后兼容

## 📋 实施清单

### ✅ 已完成的改造

#### 1. API 端点重构
- **原路径**: `/api/*` → **新路径**: `/api/v1/*`
- **原端点**: `/api/notes` → **新端点**: `/api/v1/memos`
- **原端点**: `/api/auth/me` → **新端点**: `/api/v1/user/me`
- **原端点**: `/api/auth/register` → **新端点**: `/api/v1/auth/signup`

#### 2. 数据模型兼容
```typescript
// 原 Note 接口
interface Note {
  id: string;
  content: string;
  tags: string[];
  created_at: number;
  updated_at: number;
  is_todo: boolean;
  is_pinned: boolean;
}

// 新 Memo 接口 (memos 兼容)
interface Memo {
  id?: number;
  name: string;           // "memos/123" 格式
  uid: string;            // "user_id-memo_id" 格式
  content: string;
  visibility: 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';
  tags: string[];         // 从内容中自动解析 #tag
  createTime: string;     // ISO 8601 格式
  updateTime: string;     // ISO 8601 格式
  pinned: boolean;
  resources?: Resource[];
  relations?: Relation[];
}
```

#### 3. 认证系统兼容
```typescript
// 原 User 接口
interface User {
  id: number;
  username: string;
}

// 新 User 接口 (memos 兼容)
interface User {
  id: number;
  name: string;           // "users/123" 格式
  nickname?: string;      // 原 username
  role: 'HOST' | 'ADMIN' | 'USER';
  rowStatus: 'NORMAL' | 'ARCHIVED';
  createTime: string;     // ISO 8601 格式
  updateTime: string;     // ISO 8601 格式
}
```

#### 4. 新增功能
- **自动标签解析**: 从内容中提取 `#tag` 格式的标签
- **可见性控制**: 支持 PRIVATE/WORKSPACE/PUBLIC 三种可见性
- **分页支持**: 支持 pageSize 和 pageToken 参数
- **过滤功能**: 支持 filter 参数进行条件查询
- **向后兼容**: 保留原 API 路径的重定向支持

## 📚 API 端点映射表

| 功能 | 原端点 | 新端点 (memos 兼容) | 状态 |
|------|--------|-------------------|------|
| 用户注册 | `POST /api/auth/register` | `POST /api/v1/auth/signup` | ✅ |
| 用户登录 | `POST /api/auth/login` | `POST /api/v1/auth/login` | ✅ |
| 获取用户信息 | `GET /api/auth/me` | `GET /api/v1/user/me` | ✅ |
| 创建笔记 | `POST /api/notes` | `POST /api/v1/memos` | ✅ |
| 获取笔记列表 | `GET /api/notes` | `GET /api/v1/memos` | ✅ |
| 获取单个笔记 | `GET /api/notes/:id` | `GET /api/v1/memos/:id` | ✅ |
| 更新笔记 | `PATCH /api/notes/:id` | `PATCH /api/v1/memos/:id` | ✅ |
| 删除笔记 | `DELETE /api/notes/:id` | `DELETE /api/v1/memos/:id` | ✅ |

## 🔄 数据库迁移

### 执行迁移
```bash
# 应用新的数据库迁移
cd worker
npx wrangler d1 migrations apply cloudflare-notes-db --local  # 本地测试
npx wrangler d1 migrations apply cloudflare-notes-db          # 生产环境
```

### 迁移内容
1. **用户表**: 添加 `updated_at` 字段
2. **笔记表**: 添加 `visibility` 字段
3. **时间格式**: 支持 ISO 8601 格式转换

## 📝 使用示例

### 创建 Memo (memos 兼容)
```bash
curl -X POST https://your-worker.example.com/api/v1/memos \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "这是一个包含 #标签 的笔记",
    "visibility": "PRIVATE",
    "pinned": false
  }'
```

**响应**:
```json
{
  "id": 1,
  "name": "memos/1",
  "uid": "1-1",
  "content": "这是一个包含 #标签 的笔记",
  "visibility": "PRIVATE",
  "tags": ["标签"],
  "createTime": "2024-01-01T12:00:00.000Z",
  "updateTime": "2024-01-01T12:00:00.000Z",
  "pinned": false,
  "resources": [],
  "relations": []
}
```

### 获取 Memo 列表 (支持分页和过滤)
```bash
curl "https://your-worker.example.com/api/v1/memos?pageSize=10&filter=pinned:true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 向后兼容性测试
```bash
# 原 API 仍然可用
curl -X GET https://your-worker.example.com/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# 会自动重定向到新端点 /api/v1/user/me
```

## 🔧 部署步骤

### 1. 更新依赖
```bash
cd worker
npm install  # 确保所有依赖都是最新的
```

### 2. 应用数据库迁移
```bash
# 本地测试
npx wrangler d1 migrations apply cloudflare-notes-db --local

# 生产环境
npx wrangler d1 migrations apply cloudflare-notes-db
```

### 3. 部署 Worker
```bash
npx wrangler deploy
```

### 4. 验证部署
```bash
# 测试新的 memos API
curl https://your-worker.example.com/api/v1/user/me

# 测试向后兼容性
curl https://your-worker.example.com/api/auth/me
```

## 🧪 测试建议

### 功能测试
1. **认证流程**: 测试注册、登录、获取用户信息
2. **Memo CRUD**: 测试创建、读取、更新、删除操作
3. **标签解析**: 测试自动标签提取功能
4. **分页功能**: 测试大量数据的分页加载
5. **过滤功能**: 测试各种过滤条件
6. **向后兼容**: 测试原 API 路径是否正常工作

### 兼容性测试
1. **memos 客户端**: 使用官方 memos 客户端连接您的 API
2. **第三方应用**: 测试与 memos 生态系统的其他应用
3. **数据迁移**: 确保现有数据正确迁移到新格式

## 🚀 下一步计划

### 待实现功能
1. **资源管理**: 实现文件上传和管理 (Resource API)
2. **关系管理**: 实现 memo 间的引用关系 (Relation API)
3. **Webhook 支持**: 实现事件通知系统
4. **工作空间**: 实现多工作空间支持
5. **权限管理**: 实现细粒度权限控制

### 高级功能
1. **全文搜索**: 实现内容搜索功能
2. **标签管理**: 实现标签统计和管理
3. **导入导出**: 支持数据批量导入导出
4. **API 版本控制**: 支持多版本 API 共存

## 📖 参考资源

- [memos 官方文档](https://www.usememos.com/docs)
- [memos GitHub 仓库](https://github.com/usememos/memos)
- [memos API 文档](https://memos.apidocumentation.com/)
- [Protocol Buffers 文档](https://github.com/usememos/memos/tree/main/proto)

## 🆘 故障排除

### 常见问题
1. **时间格式错误**: 确保所有时间都使用 ISO 8601 格式
2. **标签解析失败**: 检查正则表达式是否正确匹配 #tag 格式
3. **认证失败**: 确认 JWT token 包含正确的用户信息
4. **数据库错误**: 检查迁移是否正确应用

### 调试技巧
1. **日志记录**: 添加详细的日志记录
2. **错误处理**: 实现完善的错误处理机制
3. **API 测试**: 使用 Postman 或类似工具测试 API
4. **数据验证**: 确保所有输入数据都经过验证

---

🎉 **恭喜！** 您的 Cloudflare Workers 笔记应用现在已经完全兼容 memos 项目了！ 