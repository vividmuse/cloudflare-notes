import { API_BASE } from './config';

// Memos 兼容的数据类型定义
export interface Memo {
  id?: number;
  name: string;
  uid: string;
  content: string;
  visibility: 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';
  tags: string[];
  createTime: string;
  updateTime: string;
  displayTime?: string;
  pinned: boolean;
  parent?: number;
  resources?: Resource[];
  relations?: Relation[];
}

export interface Resource {
  id?: number;
  name: string;
  filename: string;
  type: string;
  size: string;
  memo?: number;
}

export interface Relation {
  memo: number;
  relatedMemo: number;
  type: 'REFERENCE' | 'COMMENT';
}

export interface User {
  id: number;
  name: string;
  username?: string;
  email?: string;
  nickname?: string;
  avatarUrl?: string;
  role: 'HOST' | 'ADMIN' | 'USER';
  rowStatus: 'NORMAL' | 'ARCHIVED';
  createTime: string;
  updateTime: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface Activity {
  id: number;
  name: string;
  type: string;
  level: string;
  createTime: string;
  payload?: any;
  resource?: {
    id: number;
    type: string;
  };
}

export interface SystemStats {
  users: number;
  memos: number;
  activities: number;
  timestamp: string;
}

export interface MemoStats {
  total: number;
  pinned: number;
  todo: number;
  public: number;
}

// 通用的认证请求包装器
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
  
  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
  
  return response;
};

// 认证相关 API
export const authApi = {
  signup: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    return response.json();
  },

  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await fetchWithAuth(`${API_BASE}/api/v1/user/me`);
    if (!response.ok) {
      throw new Error('Failed to get current user');
    }
    return response.json();
  },

  updateProfile: async (updates: {
    nickname?: string;
    email?: string;
    avatarUrl?: string;
  }): Promise<User> => {
    const response = await fetchWithAuth(`${API_BASE}/api/v1/users/me`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
    return response.json();
  },
};

// Memo 相关 API
export const memosApi = {
  getAll: async (params?: {
    pageSize?: number;
    pageToken?: string;
    filter?: string;
  }): Promise<{ memos: Memo[]; nextPageToken?: string }> => {
    const searchParams = new URLSearchParams();
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.pageToken) searchParams.set('pageToken', params.pageToken);
    if (params?.filter) searchParams.set('filter', params.filter);
    
    const url = `${API_BASE}/api/v1/memos${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetchWithAuth(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch memos');
    }
    return response.json();
  },

  create: async (memo: {
    content: string;
    visibility?: 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';
    pinned?: boolean;
  }): Promise<Memo> => {
    const response = await fetchWithAuth(`${API_BASE}/api/v1/memos`, {
      method: 'POST',
      body: JSON.stringify(memo),
    });
    if (!response.ok) {
      throw new Error('Failed to create memo');
    }
    return response.json();
  },

  update: async (id: number, updates: {
    content?: string;
    visibility?: 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';
    pinned?: boolean;
  }): Promise<Memo> => {
    const response = await fetchWithAuth(`${API_BASE}/api/v1/memos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error('Failed to update memo');
    }
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE}/api/v1/memos/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete memo');
    }
  },

  bulkDelete: async (ids: number[]): Promise<{ deletedCount: number }> => {
    const response = await fetchWithAuth(`${API_BASE}/api/v1/memos`, {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) {
      throw new Error('Failed to delete memos');
    }
    return response.json();
  },

  search: async (query: string, limit = 10): Promise<{ memos: Memo[] }> => {
    const searchParams = new URLSearchParams({ q: query, limit: limit.toString() });
    const response = await fetchWithAuth(`${API_BASE}/api/v1/memos/search?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to search memos');
    }
    return response.json();
  },

  getStats: async (): Promise<MemoStats> => {
    const response = await fetchWithAuth(`${API_BASE}/api/v1/memos/stats`);
    if (!response.ok) {
      throw new Error('Failed to get memo stats');
    }
    return response.json();
  },

  archive: async (id: number, archived: boolean): Promise<{ archived: boolean }> => {
    const response = await fetchWithAuth(`${API_BASE}/api/v1/memos/${id}/archive`, {
      method: 'PATCH',
      body: JSON.stringify({ archived }),
    });
    if (!response.ok) {
      throw new Error('Failed to archive memo');
    }
    return response.json();
  },
};

// 活动日志 API
export const activitiesApi = {
  getAll: async (params?: {
    pageSize?: number;
    pageToken?: string;
  }): Promise<{ activities: Activity[]; nextPageToken?: string }> => {
    const searchParams = new URLSearchParams();
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.pageToken) searchParams.set('pageToken', params.pageToken);
    
    const url = `${API_BASE}/api/v1/activities${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetchWithAuth(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }
    return response.json();
  },

  getSystemActivities: async (params?: {
    pageSize?: number;
    pageToken?: string;
  }): Promise<{ activities: Activity[]; nextPageToken?: string }> => {
    const searchParams = new URLSearchParams();
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.pageToken) searchParams.set('pageToken', params.pageToken);
    
    const url = `${API_BASE}/api/v1/system/activities${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetchWithAuth(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch system activities');
    }
    return response.json();
  },
};

// 系统管理 API
export const systemApi = {
  getStats: async (): Promise<SystemStats> => {
    const response = await fetchWithAuth(`${API_BASE}/api/v1/system/stats`);
    if (!response.ok) {
      throw new Error('Failed to get system stats');
    }
    return response.json();
  },

  getSettings: async (): Promise<any> => {
    const response = await fetchWithAuth(`${API_BASE}/api/v1/system/setting`);
    if (!response.ok) {
      throw new Error('Failed to get system settings');
    }
    return response.json();
  },

  updateSettings: async (settings: any): Promise<{ message: string }> => {
    const response = await fetchWithAuth(`${API_BASE}/api/v1/system/setting`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      throw new Error('Failed to update system settings');
    }
    return response.json();
  },

  // 管理员专属设置
  getAdminSettings: async (): Promise<{ allowRegistration: boolean }> => {
    const response = await fetchWithAuth(`${API_BASE}/api/v1/admin/settings`);
    if (!response.ok) {
      throw new Error('Failed to get admin settings');
    }
    return response.json();
  },

  updateAdminSettings: async (settings: { allowRegistration?: boolean }): Promise<{ message: string }> => {
    const response = await fetchWithAuth(`${API_BASE}/api/v1/admin/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      throw new Error('Failed to update admin settings');
    }
    return response.json();
  },
};

// 用户管理 API
export const usersApi = {
  getAll: async (): Promise<{ users: User[] }> => {
    const response = await fetchWithAuth(`${API_BASE}/api/v1/users`);
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return response.json();
  },

  getById: async (id: number): Promise<User> => {
    const response = await fetchWithAuth(`${API_BASE}/api/v1/users/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    return response.json();
  },
};

// 向后兼容的导出
export const notesApi = memosApi;

// 工具函数
export const utils = {
  formatTime: (timeString: string): string => {
    const date = new Date(timeString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    
    return date.toLocaleDateString('zh-CN');
  },

  extractTags: (content: string): string[] => {
    const tagRegex = /#([^\s#]+)/g;
    const tags: string[] = [];
    let match;
    while ((match = tagRegex.exec(content)) !== null) {
      tags.push(match[1]);
    }
    return tags;
  },

  generateMemoPreview: (content: string, maxLength = 100): string => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  },
}; 