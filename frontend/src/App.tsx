import { useState, useEffect } from 'react';
import { authApi, type User } from './api';
import LoginPage from './components/LoginPage';
import { MainContent } from './components/MainContent';
import { Sidebar } from './components/Sidebar';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 搜索和过滤状态
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const initializeApp = async () => {
      // 应用保存的暗黑模式设置
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      if (savedDarkMode) {
        document.documentElement.classList.add('dark');
      }

      // 检查认证状态
      const token = localStorage.getItem('accessToken');
      const savedUser = localStorage.getItem('user');
      
      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // 验证 token 是否有效
          await authApi.getCurrentUser();
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeApp();
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleDateSelect = (date: Date | null) => {
    setSelectedDate(date);
  };

  const handleTagSelect = (tags: string[]) => {
    setSelectedTags(tags);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar
        user={user}
        onSearch={handleSearch}
        onDateSelect={handleDateSelect}
        onTagSelect={handleTagSelect}
        onLogout={handleLogout}
        onUserUpdate={handleUserUpdate}
        onFilterChange={handleFilterChange}
      />
      <MainContent
        searchQuery={searchQuery}
        selectedDate={selectedDate}
        selectedTags={selectedTags}
        activeFilter={activeFilter}
        onTagSelect={handleTagSelect}
      />
    </div>
  );
}

export default App;
