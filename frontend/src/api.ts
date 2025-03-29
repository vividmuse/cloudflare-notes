import { API_BASE } from './config';

export interface Note {
  id: string;
  content: string;
  tags: string | string[];
  created_at: number;
  updated_at: number;
  is_todo: boolean;
  is_pinned: boolean;
}

export interface User {
  id: string;
  username: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// 修改所有 API 调用，添加认证 token
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };
  
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem('token');
    // 只有在非登录请求时才刷新页面
    if (!url.includes('/auth/login')) {
      window.location.reload();
    }
  }
  return response;
};

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    return response.json();
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await fetchWithAuth(`${API_BASE}/auth/me`);
    if (!response.ok) {
      throw new Error('Failed to get current user');
    }
    return response.json();
  },
};

export const notesApi = {
  getAll: async (): Promise<Note[]> => {
    const response = await fetchWithAuth(`${API_BASE}/notes`);
    if (!response.ok) {
      throw new Error('Failed to fetch notes');
    }
    return response.json();
  },

  create: async (note: { content: string; tags: string[] }): Promise<Note> => {
    const response = await fetchWithAuth(`${API_BASE}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(note),
    });
    if (!response.ok) {
      throw new Error('Failed to create note');
    }
    return response.json();
  },

  update: async (id: string, note: { content: string; tags: string[] }): Promise<Note> => {
    const response = await fetchWithAuth(`${API_BASE}/notes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(note),
    });
    if (!response.ok) {
      throw new Error('Failed to update note');
    }
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE}/notes/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete note');
    }
  },

  toggleTodo: async ({ id, is_todo }: { id: string; is_todo: boolean }): Promise<Note> => {
    const response = await fetchWithAuth(`${API_BASE}/notes/${id}/todo`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_todo }),
    });
    if (!response.ok) {
      throw new Error('Failed to toggle todo status');
    }
    return response.json();
  },

  togglePin: async ({ id, is_pinned }: { id: string; is_pinned: boolean }): Promise<Note> => {
    const response = await fetchWithAuth(`${API_BASE}/notes/${id}/pin`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_pinned }),
    });
    if (!response.ok) {
      throw new Error('Failed to toggle pin status');
    }
    return response.json();
  },
}; 