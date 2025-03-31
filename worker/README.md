# Cloudflare Notes Worker

这是 Cloudflare Notes 应用的后端 Worker 服务。使用 Cloudflare Workers 和 D1 数据库构建。

## 技术栈

- Cloudflare Workers
- D1 Database (SQLite)
- TypeScript
- Hono (Web Framework)
- JWT Authentication

## 开发环境设置

1. 安装依赖：
```bash
npm install
```

2. 启动本地开发服务器：
```bash
npm run dev
```

## 数据库迁移

1. 创建新的迁移：
```bash
wrangler d1 migrations create notes-db <migration-name>
```

2. 应用迁移：
```bash
wrangler d1 migrations apply notes-db
```

## 部署

1. 部署 Worker：
```bash
wrangler deploy
```

2. 部署数据库迁移：
```bash
wrangler d1 migrations apply notes-db --production
```

## API 端点

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 笔记相关

- `GET /api/notes` - 获取所有笔记
- `POST /api/notes` - 创建新笔记
- `GET /api/notes/:id` - 获取单个笔记
- `PATCH /api/notes/:id` - 更新笔记
- `DELETE /api/notes/:id` - 删除笔记

## 环境变量

在 `wrangler.toml` 中配置以下环境变量：

- `JWT_SECRET` - JWT 签名密钥
- `D1_DATABASE` - D1 数据库绑定

## 项目结构

```
worker/
├── src/                # 源代码目录
│   └── index.ts       # 主入口文件
├── migrations/         # 数据库迁移文件
├── wrangler.toml      # Wrangler 配置文件
├── package.json       # 项目依赖
└── tsconfig.json      # TypeScript 配置
```

## 开发注意事项

1. 所有新的数据库更改都应该通过迁移进行
2. 确保在部署前测试所有 API 端点
3. 保持环境变量的安全性
4. 遵循 TypeScript 类型定义 