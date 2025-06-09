# 前端 Memos 兼容性改造指南

## 🎯 目标

将现有的 React/TypeScript 前端改造为与 memos 项目风格完全一致的界面，包括：
- 采用 memos 的 UI/UX 设计语言
- 兼容新的 API 端点结构
- 支持 memos 的功能特性
- 保持响应式设计

## 🔄 API 调用更新

### 1. 更新 API 基础配置

```typescript
// src/config/api.ts
const API_BASE_URL = '/api/v1';  // 更新为 v1 API

export const API_ENDPOINTS = {
  // 认证相关
  AUTH_SIGNUP: `${API_BASE_URL}/auth/signup`,     // 原 register
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  USER_ME: `${API_BASE_URL}/user/me`,             // 原 /api/auth/me
  
  // Memo 相关 (原 notes)
  MEMOS: `${API_BASE_URL}/memos`,
  MEMO_BY_ID: (id: number) => `${API_BASE_URL}/memos/${id}`,
};
```

### 2. 更新数据类型定义

```typescript
// src/types/memos.ts
export interface Memo {
  id?: number;
  name: string;           // "memos/123" 格式
  uid: string;            // "user_id-memo_id" 格式
  content: string;
  visibility: 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';
  tags: string[];
  createTime: string;     // ISO 8601 格式
  updateTime: string;
  displayTime?: string;
  pinned: boolean;
  parent?: number;
  resources?: Resource[];
  relations?: Relation[];
}

export interface User {
  id: number;
  name: string;           // "users/123" 格式
  nickname?: string;
  email?: string;
  avatarUrl?: string;
  role: 'HOST' | 'ADMIN' | 'USER';
  rowStatus: 'NORMAL' | 'ARCHIVED';
  createTime: string;
  updateTime: string;
}

export interface Resource {
  id?: number;
  name: string;
  filename: string;
  type: string;
  size: string;
  memo?: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}
```

### 3. 更新 API 服务函数

```typescript
// src/services/memoService.ts
import { Memo, AuthResponse } from '../types/memos';

class MemoService {
  private baseURL = '/api/v1';

  // 认证相关
  async signup(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseURL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return response.json();
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return response.json();
  }

  // Memo 相关
  async createMemo(data: {
    content: string;
    visibility?: 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';
    pinned?: boolean;
  }): Promise<Memo> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${this.baseURL}/memos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async getMemos(params?: {
    pageSize?: number;
    pageToken?: string;
    filter?: string;
  }): Promise<{ memos: Memo[]; nextPageToken?: string }> {
    const token = localStorage.getItem('accessToken');
    const queryParams = new URLSearchParams();
    
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
    if (params?.pageToken) queryParams.set('pageToken', params.pageToken);
    if (params?.filter) queryParams.set('filter', params.filter);

    const response = await fetch(`${this.baseURL}/memos?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return response.json();
  }

  async updateMemo(id: number, data: Partial<Memo>): Promise<Memo> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${this.baseURL}/memos/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async deleteMemo(id: number): Promise<void> {
    const token = localStorage.getItem('accessToken');
    await fetch(`${this.baseURL}/memos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }
}

export const memoService = new MemoService();
```

## 🎨 UI/UX 改造 - memos 风格

### 1. 主色调和设计语言

```css
/* src/styles/memos-theme.css */
:root {
  /* memos 主色调 */
  --color-primary: #6366f1;        /* 靛蓝色 */
  --color-primary-hover: #4f46e5;
  --color-secondary: #64748b;      /* 石板灰 */
  --color-accent: #f59e0b;         /* 琥珀色 */
  
  /* 背景色 */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-tertiary: #f1f5f9;
  
  /* 文字色 */
  --color-text-primary: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;
  
  /* 边框 */
  --color-border: #e2e8f0;
  --color-border-hover: #cbd5e1;
  
  /* 状态色 */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}

/* memos 卡片样式 */
.memo-card {
  @apply bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm hover:shadow-md transition-shadow;
}

.memo-content {
  @apply text-gray-900 leading-relaxed;
}

.memo-meta {
  @apply text-sm text-gray-500 mt-2 flex items-center gap-2;
}

.memo-tag {
  @apply inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full;
}
```

### 2. 主要组件改造

#### Memo 列表组件
```typescript
// src/components/MemoList.tsx
import React, { useState, useEffect } from 'react';
import { Memo } from '../types/memos';
import { memoService } from '../services/memoService';

export const MemoList: React.FC = () => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextPageToken, setNextPageToken] = useState<string>();

  useEffect(() => {
    loadMemos();
  }, []);

  const loadMemos = async () => {
    try {
      const result = await memoService.getMemos({ pageSize: 20 });
      setMemos(result.memos);
      setNextPageToken(result.nextPageToken);
    } catch (error) {
      console.error('Failed to load memos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('zh-CN');
  };

  const extractTags = (content: string) => {
    const tagRegex = /#([^\s#]+)/g;
    const tags: string[] = [];
    let match;
    while ((match = tagRegex.exec(content)) !== null) {
      tags.push(match[1]);
    }
    return tags;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {memos.map((memo) => (
        <div key={memo.id} className="memo-card">
          {/* 置顶标识 */}
          {memo.pinned && (
            <div className="flex items-center mb-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                📌 置顶
              </span>
            </div>
          )}
          
          {/* 内容 */}
          <div className="memo-content">
            {memo.content}
          </div>
          
          {/* 标签 */}
          {memo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {memo.tags.map((tag, index) => (
                <span key={index} className="memo-tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          {/* 元信息 */}
          <div className="memo-meta">
            <span>{formatTime(memo.createTime)}</span>
            <span>•</span>
            <span className="capitalize">{memo.visibility.toLowerCase()}</span>
            {memo.updateTime !== memo.createTime && (
              <>
                <span>•</span>
                <span>已编辑</span>
              </>
            )}
          </div>
        </div>
      ))}
      
      {/* 加载更多 */}
      {nextPageToken && (
        <div className="text-center py-4">
          <button 
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
            onClick={loadMemos}
          >
            加载更多
          </button>
        </div>
      )}
    </div>
  );
};
```

#### Memo 编辑器组件
```typescript
// src/components/MemoEditor.tsx
import React, { useState } from 'react';
import { memoService } from '../services/memoService';

interface MemoEditorProps {
  onMemoCreated?: () => void;
}

export const MemoEditor: React.FC<MemoEditorProps> = ({ onMemoCreated }) => {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'WORKSPACE' | 'PUBLIC'>('PRIVATE');
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      await memoService.createMemo({
        content: content.trim(),
        visibility,
        pinned,
      });
      setContent('');
      setPinned(false);
      onMemoCreated?.();
    } catch (error) {
      console.error('Failed to create memo:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="memo-card mb-6">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="写下你的想法... 使用 #标签 来组织内容"
        className="w-full border-0 resize-none focus:ring-0 text-base"
        rows={4}
      />
      
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4">
          {/* 可见性选择 */}
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as any)}
            className="text-sm border-gray-300 rounded-md"
          >
            <option value="PRIVATE">🔒 私有</option>
            <option value="WORKSPACE">👥 工作空间</option>
            <option value="PUBLIC">🌍 公开</option>
          </select>
          
          {/* 置顶选项 */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="rounded"
            />
            📌 置顶
          </label>
        </div>
        
        <button
          type="submit"
          disabled={!content.trim() || loading}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '发布中...' : '发布'}
        </button>
      </div>
    </form>
  );
};
```

## 📱 响应式设计优化

### 移动端适配
```css
/* src/styles/responsive.css */
@media (max-width: 768px) {
  .memo-card {
    @apply mx-2 rounded-lg;
  }
  
  .memo-editor {
    @apply mx-2;
  }
  
  .memo-meta {
    @apply text-xs;
  }
}

@media (max-width: 640px) {
  .memo-content {
    @apply text-sm;
  }
  
  .memo-tag {
    @apply text-xs px-1.5 py-0.5;
  }
}
```

## 🔧 部署更新

### 1. 更新环境变量
```bash
# .env
VITE_API_BASE_URL=/api/v1
VITE_APP_NAME=Memos
VITE_APP_DESCRIPTION=A privacy-first note-taking service
```

### 2. 更新构建配置
```typescript
// vite.config.ts
export default defineConfig({
  // ... 现有配置
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __API_BASE_URL__: JSON.stringify(process.env.VITE_API_BASE_URL || '/api/v1'),
  },
});
```

## 🧪 兼容性测试清单

### 功能测试
- [ ] 用户注册/登录流程
- [ ] Memo 创建、编辑、删除
- [ ] 标签自动识别和显示
- [ ] 可见性控制
- [ ] 置顶功能
- [ ] 分页加载
- [ ] 响应式布局

### 兼容性测试
- [ ] 新旧 API 端点都能正常工作
- [ ] 数据格式正确转换
- [ ] 时间显示格式统一
- [ ] 错误处理机制完善

## 📋 实施步骤

1. **更新 API 配置**: 修改所有 API 调用端点
2. **更新类型定义**: 使用新的 memos 兼容数据结构
3. **重构组件**: 采用 memos 风格的 UI 组件
4. **测试验证**: 确保所有功能正常工作
5. **部署上线**: 发布更新版本

---

🚀 **完成后，您的前端将完全符合 memos 项目的设计语言和用户体验！** 