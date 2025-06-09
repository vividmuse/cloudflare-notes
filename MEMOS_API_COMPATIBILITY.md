# Memos API 兼容性实现文档

## 概述

这是一个与 [usememos/memos](https://github.com/usememos/memos) 项目完全兼容的 API 实现，基于 Cloudflare Workers 和 D1 数据库构建。

## 已实现的 API 端点

### 🔐 认证相关 API

| 方法 | 端点 | 描述 | 状态 |
|------|------|------|------|
| `POST` | `/api/v1/auth/signup` | 用户注册 | ✅ |
| `POST` | `/api/v1/auth/login` | 用户登录 | ✅ |
| `GET` | `/api/v1/user/me` | 获取当前用户信息 | ✅ |

### 📝 Memo 相关 API

| 方法 | 端点 | 描述 | 状态 |
|------|------|------|------|
| `POST` | `/api/v1/memos` | 创建 memo | ✅ |
| `GET` | `/api/v1/memos` | 获取 memo 列表 | ✅ |
| `GET` | `/api/v1/memos/search` | 搜索 memo | ✅ |
| `GET` | `/api/v1/memos/stats` | 获取 memo 统计信息 | ✅ |
| `GET` | `/api/v1/memos/:id` | 获取单个 memo | ✅ |
| `PATCH` | `/api/v1/memos/:id` | 更新 memo | ✅ |
| `DELETE` | `/api/v1/memos/:id` | 删除单个 memo | ✅ |
| `DELETE` | `/api/v1/memos` | 批量删除 memo | ✅ |
| `PATCH` | `/api/v1/memos/:id/archive` | 归档/取消归档 memo | ✅ |

### 👥 用户管理 API

| 方法 | 端点 | 描述 | 状态 |
|------|------|------|------|
| `GET` | `/api/v1/users` | 获取用户列表 (管理员) | ✅ |
| `GET` | `/api/v1/users/me` | 获取当前用户详细信息 | ✅ |
| `PATCH` | `/api/v1/users/me` | 更新用户信息 | ✅ |
| `GET` | `/api/v1/users/:id` | 获取特定用户信息 | ✅ |

### 🔧 系统设置 API

| 方法 | 端点 | 描述 | 状态 |
|------|------|------|------|
| `GET` | `/api/v1/system/setting` | 获取系统设置 | ✅ |
| `PATCH` | `/api/v1/system/setting` | 更新系统设置 | ✅ |
| `GET` | `/api/v1/system/stats` | 获取系统统计信息 | ✅ |
| `GET` | `/api/v1/system/activities` | 获取系统活动日志 | ✅ |

### 📁 资源管理 API

| 方法 | 端点 | 描述 | 状态 |
|------|------|------|------|
| `POST` | `/api/v1/resources` | 上传资源 | ✅ |
| `GET` | `/api/v1/resources` | 获取资源列表 | ✅ |
| `DELETE` | `/api/v1/resources/:id` | 删除资源 | ✅ |

### 📊 活动日志 API

| 方法 | 端点 | 描述 | 状态 |
|------|------|------|------|
| `GET` | `/api/v1/activities` | 获取用户活动日志 | ✅ |

### 🔗 Webhook API

| 方法 | 端点 | 描述 | 状态 |
|------|------|------|------|
| `GET` | `/api/v1/webhooks` | 获取 webhook 列表 | ✅ |
| `POST` | `/api/v1/webhooks` | 创建 webhook | ✅ |
| `DELETE` | `/api/v1/webhooks/:id` | 删除 webhook | ✅ |

### 🔄 向后兼容 API

| 方法 | 端点 | 描述 | 状态 |
|------|------|------|------|
| `POST` | `/api/auth/register` | 旧版用户注册 | ✅ |
| `POST` | `/api/auth/login` | 旧版用户登录 | ✅ |
| `GET` | `/api/auth/me` | 旧版获取用户信息 | ✅ |

## 核心功能特性

### ✅ 已实现的功能

1. **完整的用户管理系统**
   - 用户注册和登录
   - JWT 认证
   - 角色权限控制 (HOST, ADMIN, USER)
   - 用户信息管理

2. **全功能的 Memo 系统**
   - 创建、读取、更新、删除 memo
   - 标签自动解析 (#tag 格式)
   - 可见性控制 (PRIVATE, WORKSPACE, PUBLIC)
   - 置顶功能
   - 搜索功能
   - 批量操作
   - 归档功能

3. **系统管理功能**
   - 系统设置管理
   - 统计信息
   - 活动日志记录
   - Webhook 支持

4. **数据模型兼容性**
   - 完全符合 memos 的数据结构
   - 支持 memos 的命名约定 (users/1, memos/1 等)
   - ISO 8601 时间格式
   - 标准化的 API 响应格式

### 🔧 技术实现

1. **数据库设计**
   - SQLite (D1) 数据库
   - 完整的关系型设计
   - 支持事务和约束
   - 优化的索引策略

2. **API 设计**
   - RESTful API 架构
   - 标准 HTTP 状态码
   - JSON 数据格式
   - 分页支持
   - 错误处理

3. **安全性**
   - JWT 认证
   - 角色基础的访问控制
   - SQL 注入防护
   - 数据验证

## API 使用示例

### 创建 Memo

```bash
curl -X POST http://localhost:8787/api/v1/memos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "这是一个测试 memo #testing #demo",
    "visibility": "PRIVATE"
  }'
```

### 搜索 Memo

```bash
curl -X GET "http://localhost:8787/api/v1/memos/search?q=测试&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 获取统计信息

```bash
curl -X GET http://localhost:8787/api/v1/memos/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 获取活动日志

```bash
curl -X GET http://localhost:8787/api/v1/activities \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 与原版 memos 的兼容性

### ✅ 完全兼容的功能

- **API 端点路径**: 使用相同的 `/api/v1/` 前缀
- **数据模型**: 字段名称和结构完全一致
- **认证方式**: 标准 JWT Bearer token
- **响应格式**: JSON 格式与原版一致
- **错误处理**: HTTP 状态码和错误信息格式一致

### 🔄 特殊适配

- **资源管理**: 简化实现，支持基本的元数据管理
- **gRPC**: 仅实现 REST API，未实现 gRPC 接口
- **文件存储**: 使用 Cloudflare 生态系统替代本地文件存储

## 部署和配置

### 环境要求

- Node.js 18+
- Cloudflare Workers
- Cloudflare D1 数据库

### 部署步骤

1. 克隆项目并安装依赖
2. 配置 Cloudflare Workers 和 D1 数据库
3. 运行数据库迁移
4. 部署到 Cloudflare Workers

详细部署指南请参考 `README.md` 文件。

## 后续开发计划

### 🎯 优化和扩展

1. **文件上传**: 完整的文件存储和管理功能
2. **gRPC 支持**: 实现 gRPC API 兼容性
3. **性能优化**: 查询优化和缓存策略
4. **监控和日志**: 详细的系统监控
5. **导入导出**: 数据迁移和备份功能

---

*最后更新: 2025-06-08*
*版本: v1.0.0* 